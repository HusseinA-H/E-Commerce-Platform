import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';
import { PayoutsService } from './payouts.service';
import { MarketplaceAiService } from './marketplace-ai.service';
import { RealtimeService } from '../realtime/realtime.service';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly payoutsService: PayoutsService,
    private readonly marketplaceAiService: MarketplaceAiService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * Registers a user as a vendor and creates a Stripe Connect Custom/Express account.
   */
  async registerVendor(userId: string, storeName: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });
    if (!user) throw new NotFoundException('User not found');
    if (user.vendor) throw new BadRequestException('User is already a vendor.');

    const stripe = this.stripeService.getClient();

    try {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        business_type: 'individual',
        business_profile: {
          name: storeName,
        },
      });

      const vendor = await this.prisma.vendor.create({
        data: {
          userId: user.id,
          storeName,
          stripeAccountId: account.id,
          isVerified: false,
          status: 'pending',
          commissionRate: 15.0,
        },
      });

      // Initialize vendor profile
      await this.prisma.vendorProfile.create({
        data: {
          vendorId: vendor.id,
          supportEmail: user.email,
        },
      });

      return vendor;
    } catch (e: any) {
      this.logger.error(`Stripe Connect Error: ${e.message}`);
      throw new BadRequestException(`Stripe error: ${e.message}`);
    }
  }

  /**
   * Generates a Stripe Connect onboarding link for the vendor.
   */
  async createOnboardingLink(
    userId: string,
    refreshUrl: string,
    returnUrl: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });
    if (!user?.vendor?.stripeAccountId) {
      throw new BadRequestException(
        'Vendor account not found or not initialized with Stripe.',
      );
    }

    const stripe = this.stripeService.getClient();
    try {
      const accountLink = await stripe.accountLinks.create({
        account: user.vendor.stripeAccountId,
        refresh_url: refreshUrl,
        return_url: returnUrl,
        type: 'account_onboarding',
      });
      return { url: accountLink.url };
    } catch (e: any) {
      throw new BadRequestException(`Stripe error: ${e.message}`);
    }
  }

  /**
   * Checks the status of a Stripe Connect account.
   */
  async checkVerificationStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { vendor: true },
    });
    if (!user?.vendor?.stripeAccountId)
      throw new BadRequestException('Vendor account not found.');

    const stripe = this.stripeService.getClient();
    const account = await stripe.accounts.retrieve(user.vendor.stripeAccountId);

    const isVerified = account.details_submitted && account.charges_enabled;
    const currentStatus = isVerified ? 'verified' : 'pending';

    if (user.vendor.isVerified !== isVerified) {
      await this.prisma.vendor.update({
        where: { id: user.vendor.id },
        data: {
          isVerified,
          status: currentStatus,
        },
      });

      // If they just got verified, process their backlog payouts
      if (isVerified) {
        await this.payoutsService.retryPendingPayouts(user.vendor.id);
      }
    }

    return {
      isVerified,
      status: currentStatus,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    };
  }

  /**
   * Aggregates Vendor dashboard metrics and pulls AI operational insights.
   */
  async getDashboardStats(userId: string) {
    const vendor = await this.getVendorByUserId(userId);

    const orders = await this.prisma.vendorOrder.findMany({
      where: { vendorId: vendor.id },
    });

    const grossRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const commissionPaid = orders.reduce((sum, o) => sum + o.commission, 0);
    const netEarnings = orders.reduce((sum, o) => sum + o.payoutAmount, 0);

    const products = await this.prisma.product.findMany({
      where: { vendorId: vendor.id, deletedAt: null },
    });
    const lowStockCount = products.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold,
    ).length;

    const payoutsSummary = await this.payoutsService.getPayoutSummary(
      vendor.id,
    );
    const aiInsights =
      await this.marketplaceAiService.generateInsightsForVendor(vendor.id);

    return {
      storeName: vendor.storeName,
      isVerified: vendor.isVerified,
      status: vendor.status,
      metrics: {
        grossRevenue: parseFloat(grossRevenue.toFixed(2)),
        commissionPaid: parseFloat(commissionPaid.toFixed(2)),
        netEarnings: parseFloat(netEarnings.toFixed(2)),
        totalOrders: orders.length,
        activeProducts: products.length,
        lowStockCount,
        totalPaid: payoutsSummary.totalPaid,
        pendingPayout: payoutsSummary.pendingPayout,
      },
      aiInsights,
    };
  }

  /**
   * CRUD: Get active vendor catalog products.
   */
  async getProducts(userId: string) {
    const vendor = await this.getVendorByUserId(userId);
    return this.prisma.product.findMany({
      where: { vendorId: vendor.id, deletedAt: null },
      include: { images: true, category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * CRUD: Create vendor catalog product.
   */
  async createProduct(userId: string, data: any) {
    const vendor = await this.getVendorByUserId(userId);
    const slug =
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    const product = await this.prisma.product.create({
      data: {
        vendorId: vendor.id,
        categoryId: data.categoryId,
        name: data.name,
        slug,
        description: data.description || '',
        price: parseFloat(data.price),
        compareAtPrice: data.compareAtPrice
          ? parseFloat(data.compareAtPrice)
          : null,
        stockQuantity: parseInt(data.stockQuantity || '0'),
        stock: parseInt(data.stockQuantity || '0'),
        lowStockThreshold: parseInt(data.lowStockThreshold || '5'),
        inventoryStatus:
          parseInt(data.stockQuantity || '0') > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
      },
    });

    if (data.images && Array.isArray(data.images)) {
      await this.prisma.productImage.createMany({
        data: data.images.map((img: string, i: number) => ({
          productId: product.id,
          url: img,
          isPrimary: i === 0,
        })),
      });
    }

    if (data.sizes && Array.isArray(data.sizes)) {
      await this.prisma.productSize.createMany({
        data: data.sizes.map((s: string) => ({
          productId: product.id,
          size: s,
        })),
      });
    }

    if (data.colors && Array.isArray(data.colors)) {
      await this.prisma.productColor.createMany({
        data: data.colors.map((c: string) => ({
          productId: product.id,
          color: c,
        })),
      });
    }

    return this.prisma.product.findUnique({
      where: { id: product.id },
      include: { images: true, sizes: true, colors: true },
    });
  }

  /**
   * CRUD: Update vendor catalog product details.
   */
  async updateProduct(userId: string, productId: string, data: any) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id },
    });

    if (!product)
      throw new UnauthorizedException(
        'Product does not exist or not owned by vendor.',
      );

    const price = data.price ? parseFloat(data.price) : product.price;
    const stockQuantity = data.stockQuantity
      ? parseInt(data.stockQuantity)
      : product.stockQuantity;

    let inventoryStatus = product.inventoryStatus;
    if (stockQuantity === 0) {
      inventoryStatus = 'OUT_OF_STOCK';
    } else if (
      stockQuantity <= (data.lowStockThreshold || product.lowStockThreshold)
    ) {
      inventoryStatus = 'LOW_STOCK';
    } else {
      inventoryStatus = 'IN_STOCK';
    }

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: data.name || product.name,
        description: data.description || product.description,
        price,
        compareAtPrice: data.compareAtPrice
          ? parseFloat(data.compareAtPrice)
          : product.compareAtPrice,
        stockQuantity,
        stock: stockQuantity,
        lowStockThreshold: data.lowStockThreshold
          ? parseInt(data.lowStockThreshold)
          : product.lowStockThreshold,
        inventoryStatus,
        categoryId: data.categoryId || product.categoryId,
      },
    });

    return this.prisma.product.findUnique({
      where: { id: productId },
      include: { images: true, category: true },
    });
  }

  /**
   * CRUD: Soft-delete product.
   */
  async deleteProduct(userId: string, productId: string) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findFirst({
      where: { id: productId, vendorId: vendor.id },
    });

    if (!product)
      throw new UnauthorizedException(
        'Product not found or not owned by vendor.',
      );

    await this.prisma.product.update({
      where: { id: productId },
      data: { deletedAt: new Date() },
    });

    return { success: true };
  }

  /**
   * Retrieves split vendor orders.
   */
  async getOrders(userId: string) {
    const vendor = await this.getVendorByUserId(userId);
    return this.prisma.vendorOrder.findMany({
      where: { vendorId: vendor.id },
      include: {
        order: {
          include: {
            shippingAddress: true,
            user: { select: { name: true, email: true } },
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Split fulfillment shipment updating.
   */
  async fulfillOrder(
    userId: string,
    vendorOrderId: string,
    trackingNumber: string,
    carrier: string,
  ) {
    const vendor = await this.getVendorByUserId(userId);
    const vendorOrder = await this.prisma.vendorOrder.findFirst({
      where: { id: vendorOrderId, vendorId: vendor.id },
      include: { order: true },
    });

    if (!vendorOrder) throw new NotFoundException('Vendor order not found.');
    if (
      vendorOrder.status === 'shipped' ||
      vendorOrder.status === 'delivered'
    ) {
      throw new BadRequestException('Order is already fulfilled.');
    }

    // Update vendor sub-order
    await this.prisma.vendorOrder.update({
      where: { id: vendorOrderId },
      data: {
        status: 'shipped',
        trackingNumber,
        carrier,
        shippedAt: new Date(),
      },
    });

    // Notify vendor and customer about the shipment status change
    try {
      this.realtimeService.publishOrderUpdated(
        vendorOrder.orderId,
        'shipped',
        vendorOrder.order.userId,
        vendor.id,
      );
    } catch (e: any) {
      this.logger.error(
        `Realtime error for vendor suborder update: ${e.message}`,
      );
    }

    // Determine if all vendor orders in the master purchase have been shipped
    const allSubOrders = await this.prisma.vendorOrder.findMany({
      where: { orderId: vendorOrder.orderId },
    });
    const allShipped = allSubOrders.every(
      (so) => so.status === 'shipped' || so.status === 'delivered',
    );

    if (allShipped) {
      await this.prisma.order.update({
        where: { id: vendorOrder.orderId },
        data: {
          status: 'shipped',
          trackingNumber,
          carrier,
          estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      });

      await this.prisma.orderEvent.create({
        data: {
          orderId: vendorOrder.orderId,
          status: 'shipped',
          notes: `Fulfillment completed. Combined shipment via ${carrier.toUpperCase()} Tracking: #${trackingNumber}.`,
        },
      });

      // Notify customer that their complete package has shipped
      try {
        this.realtimeService.publishOrderUpdated(
          vendorOrder.orderId,
          'shipped',
          vendorOrder.order.userId,
        );
      } catch (e: any) {
        this.logger.error(
          `Realtime error for master order update: ${e.message}`,
        );
      }
    }

    return { success: true };
  }

  /**
   * Gets current vendor settings.
   */
  async getSettings(userId: string) {
    const vendor = await this.getVendorByUserId(userId);
    return {
      storeName: vendor.storeName,
      profile: vendor.profile || null,
    };
  }

  /**
   * Updates store profile descriptions and info.
   */
  async updateSettings(userId: string, data: any) {
    const vendor = await this.getVendorByUserId(userId);

    if (data.storeName) {
      await this.prisma.vendor.update({
        where: { id: vendor.id },
        data: { storeName: data.storeName },
      });
    }

    const updatedProfile = await this.prisma.vendorProfile.upsert({
      where: { vendorId: vendor.id },
      create: {
        vendorId: vendor.id,
        description: data.description,
        supportEmail: data.supportEmail,
        supportPhone: data.supportPhone,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        website: data.website,
        address: data.address,
        city: data.city,
        country: data.country,
      },
      update: {
        description: data.description,
        supportEmail: data.supportEmail,
        supportPhone: data.supportPhone,
        logoUrl: data.logoUrl,
        bannerUrl: data.bannerUrl,
        website: data.website,
        address: data.address,
        city: data.city,
        country: data.country,
      },
    });

    return {
      storeName: data.storeName || vendor.storeName,
      profile: updatedProfile,
    };
  }

  /**
   * Retrieves Connected account payout list.
   */
  async getPayouts(userId: string) {
    const vendor = await this.getVendorByUserId(userId);
    return this.payoutsService.getPayoutSummary(vendor.id);
  }

  /**
   * Internal helper to fetch vendor row securely.
   */
  private async getVendorByUserId(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId },
      include: { profile: true },
    });
    if (!vendor)
      throw new NotFoundException(
        'Authenticated user is not registered as a marketplace vendor.',
      );
    return vendor;
  }
}
