import {
  Injectable,
  BadRequestException,
  NotFoundException,
  OnApplicationBootstrap,
  Logger,
} from '@nestjs/common';
import {
  Order,
  OrderItem,
  ShippingAddress,
  Coupon,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PayoutsService } from '../vendor/payouts.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ExchangeRateService } from '../global-commerce/currency.service';
import { RegionService } from '../global-commerce/region.service';
import { WarehouseService } from '../global-commerce/warehouse.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReferralService } from '../referral/referral.service';

export type OrderWithDetails = Order & {
  items: OrderItem[];
  shippingAddress: ShippingAddress | null;
  coupon: Coupon | null;
  events?: any[];
  user?: {
    name: string;
    email: string;
  } | null;
};

export type OrderHistoryItem = Order & {
  items: OrderItem[];
  shippingAddress: ShippingAddress | null;
  events?: any[];
};

@Injectable()
export class OrdersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
    private payoutsService: PayoutsService,
    private realtimeService: RealtimeService,
    private exchangeRateService: ExchangeRateService,
    private regionService: RegionService,
    private warehouseService: WarehouseService,
    private loyaltyService: LoyaltyService,
    private referralService: ReferralService,
  ) {}

  async onApplicationBootstrap() {
    // Run an initial scan to release any stale reservations from prior sessions
    this.releaseExpiredReservations().catch((err) => {
      this.logger.error(
        `Failed running initial reservation cleanups: ${err.message}`,
      );
    });

    // Schedule reservation sweeps every 10 minutes
    setInterval(
      () => {
        this.releaseExpiredReservations().catch((err) => {
          this.logger.error(`Stale reservation cleanup failed: ${err.message}`);
        });
      },
      10 * 60 * 1000,
    );
  }

  async createOrder(
    userId: string,
    dto: CreateOrderDto,
  ): Promise<OrderWithDetails> {
    // 1. Get user cart items
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
          },
        },
      },
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Shopping cart is empty. Cannot checkout.');
    }

    // 2. Validate available stock levels (available = stockQuantity - reservedStock)
    for (const item of cartItems) {
      const availableStock =
        item.product.stockQuantity - item.product.reservedStock;
      if (availableStock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for product "${item.product.name}" due to active reservations. Available: ${availableStock}`,
        );
      }
    }

    // 3. Resolve region, currency, tax rate, shipping rates, and warehouse routing
    const region = await this.regionService.getRegionByCountry(dto.country);
    const taxRateObj = await this.regionService.calculateTax(dto.country);
    const taxRate = taxRateObj.taxRate;
    const shippingRates = await this.regionService.getShippingRates(
      dto.country,
    );
    const shippingCost =
      shippingRates.length > 0 ? shippingRates[0].baseCost : 10.0;
    const currency = region ? region.currencyCode : 'USD';

    // Calculate financial totals in region's currency
    let subtotal = 0;
    const itemsWithPrices: any[] = [];
    for (const item of cartItems) {
      const priceDetails = await this.regionService.getProductPriceForRegion(
        item.productId,
        dto.country,
      );
      let localizedPrice = priceDetails.price;

      if (priceDetails.currency !== currency) {
        localizedPrice = await this.exchangeRateService.convert(
          priceDetails.price,
          priceDetails.currency,
          currency,
        );
      }

      subtotal += localizedPrice * item.quantity;
      itemsWithPrices.push({
        ...item,
        resolvedPrice: localizedPrice,
      });
    }

    let discount = 0;
    let couponId: string | null = null;

    if (dto.couponCode) {
      const coupon = await this.couponsService.validateCoupon(dto.couponCode);
      discount = (subtotal * coupon.discountPercent) / 100;
      couponId = coupon.id;
    }

    const taxableSubtotal = Math.max(0, subtotal - discount);
    const tax = taxableSubtotal * taxRate;
    const total = taxableSubtotal + tax + shippingCost;

    const orderNumber = `APX-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Solve warehouse routing
    const routingResult = await this.warehouseService.routeOrder(
      cartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      dto.country,
    );

    // 4. Create Order Transaction with Serializable isolation to block race conditions
    const order = await this.prisma.$transaction(
      async (tx) => {
        // Create the order row
        const ord = await tx.order.create({
          data: {
            orderNumber,
            userId,
            subtotal,
            discount,
            tax,
            total,
            couponId,
            status: 'pending',
            paymentStatus: 'unpaid',
            currency,
            taxRate,
            shippingCost,
            regionId: region ? region.id : null,
          },
        });

        // Create order items (handle warehouse splits if any)
        for (const item of itemsWithPrices) {
          const itemRoutes = routingResult.routing.filter(
            (r) => r.productId === item.productId,
          );
          const primaryImg =
            item.product.images.find((img) => img.isPrimary) ||
            item.product.images[0];
          const imgUrl = primaryImg
            ? primaryImg.url
            : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff';

          for (const route of itemRoutes) {
            await tx.orderItem.create({
              data: {
                orderId: ord.id,
                productId: item.productId,
                productName: item.product.name,
                productPrice: item.resolvedPrice,
                size: item.size,
                color: item.color,
                quantity: route.quantity,
                image: imgUrl,
                warehouseId: route.warehouseId,
              },
            });
          }
        }

        // Create shipping address
        await tx.shippingAddress.create({
          data: {
            orderId: ord.id,
            address: dto.address,
            city: dto.city,
            country: dto.country,
            postalCode: dto.postalCode,
            phone: dto.phone,
          },
        });

        // Increment coupon usage if coupon applied
        if (couponId) {
          await tx.coupon.update({
            where: { id: couponId },
            data: { usesCount: { increment: 1 } },
          });
        }

        // Reserve stock in database (both global product reservedStock and local WarehouseInventory reservedQty)
        for (const route of routingResult.routing) {
          await tx.product.update({
            where: { id: route.productId },
            data: {
              reservedStock: {
                increment: route.quantity,
              },
            },
          });

          await tx.warehouseInventory.update({
            where: {
              warehouseId_productId: {
                warehouseId: route.warehouseId,
                productId: route.productId,
              },
            },
            data: {
              reservedQty: {
                increment: route.quantity,
              },
            },
          });
        }

        // Log initial timeline event
        await tx.orderEvent.create({
          data: {
            orderId: ord.id,
            status: 'pending',
            notes: `Checkout session initialized in ${currency}. Routing solved across ${routingResult.isSplit ? 'multiple warehouses' : 'nearest warehouse'}.`,
          },
        });

        return ord;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    return this.findOrderById(order.id);
  }

  async findUserOrders(userId: string): Promise<OrderHistoryItem[]> {
    return this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        shippingAddress: true,
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOrderById(id: string): Promise<OrderWithDetails> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        shippingAddress: true,
        coupon: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        events: {
          orderBy: { createdAt: 'asc' },
        },
        refunds: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order record not found.');
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    notes?: string,
  ): Promise<Order> {
    const order = await this.findOrderById(orderId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status,
          notes: notes || `Order status updated to ${status.toUpperCase()}.`,
        },
      });

      return updated;
    });
  }

  async updateOrderTracking(
    orderId: string,
    trackingNumber: string,
    carrier: string,
    estimatedDeliveryDays = 5,
  ): Promise<Order> {
    const order = await this.findOrderById(orderId);
    const estimatedDelivery = new Date();
    estimatedDelivery.setDate(
      estimatedDelivery.getDate() + estimatedDeliveryDays,
    );

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'shipped',
          trackingNumber,
          carrier,
          estimatedDelivery,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: 'shipped',
          notes: `Tracking registered: ${carrier.toUpperCase()} #${trackingNumber}. Estimated delivery: ${estimatedDelivery.toLocaleDateString()}`,
        },
      });

      // Dispatch order status email update to client asynchronously
      this.mailService
        .sendResetPasswordEmail(
          order.user?.email || 'customer@apexluxe.com',
          `APEX LUXE: Order #${order.orderNumber} is now SHIPPED with tracking number ${trackingNumber}`,
        )
        .catch(() => {});

      return updated;
    });
  }

  async cancelOrder(orderId: string, notes?: string): Promise<Order> {
    const order = await this.findOrderById(orderId);
    if (order.status === 'cancelled') {
      return order;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Release reserved stock if order was unpaid (pending status)
      if (order.status === 'pending' && order.paymentStatus !== 'paid') {
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (product) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                reservedStock: {
                  decrement: Math.min(item.quantity, product.reservedStock),
                },
              },
            });
          }
          if (item.warehouseId) {
            const whInv = await tx.warehouseInventory.findUnique({
              where: {
                warehouseId_productId: {
                  warehouseId: item.warehouseId,
                  productId: item.productId,
                },
              },
            });
            if (whInv) {
              await tx.warehouseInventory.update({
                where: {
                  warehouseId_productId: {
                    warehouseId: item.warehouseId,
                    productId: item.productId,
                  },
                },
                data: {
                  reservedQty: {
                    decrement: Math.min(item.quantity, whInv.reservedQty),
                  },
                },
              });
            }
          }
        }
      } else if (order.paymentStatus === 'paid') {
        // If it was already paid, we are reversing catalog inventory levels
        for (const item of order.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });
          if (product) {
            const newStockQuantity = product.stockQuantity + item.quantity;
            let newStatus = 'IN_STOCK';
            if (newStockQuantity <= product.lowStockThreshold) {
              newStatus = 'LOW_STOCK';
            }
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: newStockQuantity,
                stock: newStockQuantity,
                inventoryStatus: newStatus,
              },
            });
          }
          if (item.warehouseId) {
            await tx.warehouseInventory.update({
              where: {
                warehouseId_productId: {
                  warehouseId: item.warehouseId,
                  productId: item.productId,
                },
              },
              data: {
                quantity: {
                  increment: item.quantity,
                },
              },
            });
          }
        }
      }

      // 2. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'cancelled' },
      });

      // 3. Log event
      await tx.orderEvent.create({
        data: {
          orderId,
          status: 'cancelled',
          notes: notes || 'Order cancelled by administrator.',
        },
      });

      return updatedOrder;
    });
  }

  async processRefund(
    orderId: string,
    amount?: number,
    reason?: string,
  ): Promise<Order> {
    const order = await this.findOrderById(orderId);
    const refundAmount = amount ?? order.total;

    return this.prisma.$transaction(async (tx) => {
      // 1. Log the Stripe/System refund record
      await tx.refund.create({
        data: {
          orderId: order.id,
          stripeRefundId: `ref_mock_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          amount: refundAmount,
          reason: reason || 'Customer requested return',
          status: 'succeeded',
        },
      });

      // 2. Return products to inventory stockQuantity levels
      for (const item of order.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });
        if (product) {
          const newStockQuantity = product.stockQuantity + item.quantity;
          let newStatus = 'IN_STOCK';
          if (newStockQuantity <= product.lowStockThreshold) {
            newStatus = 'LOW_STOCK';
          }
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: newStockQuantity,
              stock: newStockQuantity,
              inventoryStatus: newStatus,
            },
          });
        }
        if (item.warehouseId) {
          await tx.warehouseInventory.update({
            where: {
              warehouseId_productId: {
                warehouseId: item.warehouseId,
                productId: item.productId,
              },
            },
            data: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }
      }

      // 3. Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'refunded',
        },
      });

      // 4. Log event
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: 'refunded',
          notes: `Refund of $${refundAmount.toFixed(2)} processed successfully. Items restored to warehouse catalog.`,
        },
      });

      return updatedOrder;
    });
  }

  async markOrderAsPaid(
    orderId: string,
    paymentIntentId: string,
  ): Promise<Order & { items: OrderItem[] }> {
    const order = await this.findOrderById(orderId);

    if (order.paymentStatus === 'paid') {
      return order;
    }

    const {
      updatedOrder,
      payoutsToExecute,
      vendorGroups,
      inventoryUpdates,
      lowStockAlerts,
    } = await this.prisma.$transaction(async (tx) => {
      // 1. Update payment details
      const updatedOrd = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'paid',
          status: 'processing',
          paymentIntentId,
        },
        include: {
          items: true,
        },
      });

      const payouts: Array<{
        vendorId: string;
        amount: number;
        categorySlug?: string;
      }> = [];
      const vendorGroups: Record<
        string,
        Array<{ product: any; item: OrderItem }>
      > = {};
      const lowStockAlerts: Array<{
        productId: string;
        name: string;
        stock: number;
        threshold: number;
        vendorId: string;
      }> = [];
      const inventoryUpdates: Array<{
        productId: string;
        name: string;
        stock: number;
        status: string;
        vendorId: string;
      }> = [];

      // 2. Finalize stock reservation: subtract from physical stock and release reservation
      for (const item of updatedOrd.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          include: { category: true },
        });
        if (product) {
          const newStockQuantity = Math.max(
            0,
            product.stockQuantity - item.quantity,
          );
          const newReservedStock = Math.max(
            0,
            product.reservedStock - item.quantity,
          );

          let newStatus = 'IN_STOCK';
          if (newStockQuantity === 0) {
            newStatus = 'OUT_OF_STOCK';
          } else if (newStockQuantity <= product.lowStockThreshold) {
            newStatus = 'LOW_STOCK';
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: newStockQuantity,
              reservedStock: newReservedStock,
              stock: newStockQuantity, // Sync legacy stock
              inventoryStatus: newStatus,
            },
          });

          // Deduct from physical stock and release reservation in WarehouseInventory
          if (item.warehouseId) {
            const whInv = await tx.warehouseInventory.findUnique({
              where: {
                warehouseId_productId: {
                  warehouseId: item.warehouseId,
                  productId: item.productId,
                },
              },
            });
            if (whInv) {
              await tx.warehouseInventory.update({
                where: {
                  warehouseId_productId: {
                    warehouseId: item.warehouseId,
                    productId: item.productId,
                  },
                },
                data: {
                  quantity: {
                    decrement: item.quantity,
                  },
                  reservedQty: {
                    decrement: Math.min(item.quantity, whInv.reservedQty),
                  },
                },
              });
            }
          }

          // Trigger notifications on stock threshold alerts
          if (
            newStatus !== product.inventoryStatus &&
            (newStatus === 'LOW_STOCK' || newStatus === 'OUT_OF_STOCK')
          ) {
            await this.notificationsService.trigger(
              `Inventory Warning: ${newStatus}`,
              `Product "${product.name}" (${product.sku || 'N/A'}) is now ${newStatus.replace('_', ' ')}. Current stock: ${newStockQuantity}.`,
              'LOW_STOCK',
            );

            // Dispatch low stock email asynchronously
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@apexluxe.com';
            this.mailService
              .sendResetPasswordEmail(
                adminEmail,
                `APEX LUXE LOW STOCK WARNING: "${product.name}" is now ${newStatus}. Stock level: ${newStockQuantity}`,
              )
              .catch(() => {});
          }

          // Group by vendor for split order fulfillment
          if (product.vendorId) {
            inventoryUpdates.push({
              productId: product.id,
              name: product.name,
              stock: newStockQuantity,
              status: newStatus,
              vendorId: product.vendorId,
            });

            if (
              newStatus !== product.inventoryStatus &&
              (newStatus === 'LOW_STOCK' || newStatus === 'OUT_OF_STOCK')
            ) {
              lowStockAlerts.push({
                productId: product.id,
                name: product.name,
                stock: newStockQuantity,
                threshold: product.lowStockThreshold,
                vendorId: product.vendorId,
              });
            }

            if (!vendorGroups[product.vendorId]) {
              vendorGroups[product.vendorId] = [];
            }
            vendorGroups[product.vendorId].push({ product, item });
          }
        }
      }

      // Create VendorOrders and VendorOrderItems
      for (const [vendorId, group] of Object.entries(vendorGroups)) {
        const vendor = await tx.vendor.findUnique({ where: { id: vendorId } });
        if (vendor) {
          const groupTotal = group.reduce(
            (sum, g) => sum + g.item.productPrice * g.item.quantity,
            0,
          );
          const hasPromo = updatedOrd.couponId !== null;
          const categorySlug = group[0]?.product?.category?.slug;

          const { commission, payoutAmount } =
            this.payoutsService.calculateCommission(
              groupTotal,
              vendor.commissionRate,
              categorySlug,
              hasPromo,
            );

          const vendorOrder = await tx.vendorOrder.create({
            data: {
              orderId: updatedOrd.id,
              vendorId,
              total: groupTotal,
              commission,
              payoutAmount,
              status: 'processing',
            },
          });

          for (const g of group) {
            await tx.vendorOrderItem.create({
              data: {
                vendorOrderId: vendorOrder.id,
                orderItemId: g.item.id,
                productId: g.item.productId,
                quantity: g.item.quantity,
                price: g.item.productPrice,
                size: g.item.size,
                color: g.item.color,
              },
            });
          }

          payouts.push({
            vendorId,
            amount: payoutAmount,
            categorySlug,
          });
        }
      }

      // 3. Log event
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: 'processing',
          notes:
            'Stripe transaction verified. Order payment confirmed. Logistics processing has begun.',
        },
      });

      // 4. Empty the user's cart in the database
      await tx.cartItem.deleteMany({
        where: { userId: order.userId },
      });

      return {
        updatedOrder: updatedOrd,
        payoutsToExecute: payouts,
        vendorGroups,
        lowStockAlerts,
        inventoryUpdates,
      };
    });

    // 5. Asynchronously trigger Stripe Connect transfers
    for (const p of payoutsToExecute) {
      this.payoutsService
        .transferToVendor(
          p.vendorId,
          updatedOrder.id,
          p.amount,
          updatedOrder.orderNumber,
        )
        .catch((err) => {
          this.logger.error(
            `Stripe Connect transfer error for vendor ${p.vendorId}: ${err.message}`,
          );
        });
    }

    // 6. Asynchronously trigger Realtime Notifications
    try {
      const vendorItemsMap: Record<string, any[]> = {};
      for (const [vendorId, group] of Object.entries(vendorGroups)) {
        vendorItemsMap[vendorId] = group.map((g) => ({
          price: g.item.productPrice,
          quantity: g.item.quantity,
        }));
      }
      this.realtimeService.publishOrderCreated(updatedOrder, vendorItemsMap);

      for (const inv of inventoryUpdates) {
        this.realtimeService.publishInventoryUpdated(
          inv.productId,
          inv.name,
          inv.stock,
          inv.status,
          inv.vendorId,
        );
      }

      for (const alert of lowStockAlerts) {
        this.realtimeService.publishLowStock(
          alert.productId,
          alert.name,
          alert.stock,
          alert.threshold,
          alert.vendorId,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Failed publishing realtime order notifications: ${err.message}`,
      );
    }

    // 7. Asynchronously award loyalty points and process referral purchase rewards
    this.loyaltyService
      .awardOrderPoints(updatedOrder.userId, updatedOrder.id, updatedOrder.total)
      .catch((err) => {
        this.logger.error(
          `Failed to award loyalty points for order ${updatedOrder.id}: ${err.message}`,
        );
      });

    this.referralService
      .onReferredUserPurchase(updatedOrder.userId, updatedOrder.id)
      .catch((err) => {
        this.logger.error(
          `Failed to award referral purchase points for order ${updatedOrder.id}: ${err.message}`,
        );
      });

    return updatedOrder;
  }

  async markOrderAsFailed(
    orderId: string,
    errorMsg?: string,
  ): Promise<Order> {
    const order = await this.findOrderById(orderId);

    if (order.paymentStatus === 'failed') {
      return order;
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedOrd = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'failed',
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          status: order.status,
          notes: `Stripe transaction failed. Error: ${errorMsg || 'Unknown payment error.'}`,
        },
      });

      return updatedOrd;
    });
  }

  async releaseExpiredReservations() {
    const cutoff = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago
    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: 'pending',
        paymentStatus: 'unpaid',
        createdAt: { lte: cutoff },
      },
      include: { items: true },
    });

    if (expiredOrders.length === 0) return;

    this.logger.log(
      `ADMIN SYSTEM: Found ${expiredOrders.length} expired pending reservations. Releasing stock...`,
    );

    for (const order of expiredOrders) {
      try {
        await this.cancelOrder(
          order.id,
          'Unpaid checkout reservation expired. Stock released.',
        );
      } catch (err: any) {
        this.logger.error(
          `ADMIN SYSTEM: Failed to auto-cancel expired order ${order.id}: ${err.message}`,
        );
      }
    }
  }
}
