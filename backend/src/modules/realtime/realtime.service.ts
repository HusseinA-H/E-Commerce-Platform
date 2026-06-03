import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  constructor(private readonly gateway: RealtimeGateway) {}

  /**
   * Publishes new order notifications to relevant vendors and administrators.
   */
  publishOrderCreated(order: any, vendorItemsMap: Record<string, any[]>) {
    this.logger.log(`Publishing order.created event for Order #${order.id}`);

    // Notify Admins
    this.gateway.sendToAdmin('order.created', {
      orderId: order.id,
      total: order.total,
      customerName: order.user?.name || 'Customer',
      createdAt: order.createdAt,
    });

    // Notify each vendor about their portion of the split order
    Object.entries(vendorItemsMap).forEach(([vendorId, items]) => {
      this.gateway.sendToVendor(vendorId, 'order.created', {
        orderId: order.id,
        itemsCount: items.length,
        payoutShare: items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        createdAt: order.createdAt,
      });
    });

    // Broadcast update to public marketplace analytics
    this.gateway.broadcast('marketplace.activity', {
      type: 'purchase',
      timestamp: new Date(),
    });
  }

  /**
   * Publishes updates on master orders or sub-orders.
   */
  publishOrderUpdated(
    orderId: string,
    status: string,
    userId: string,
    vendorId?: string,
  ) {
    this.logger.log(
      `Publishing order.updated event for Order #${orderId} (Status: ${status})`,
    );

    // Notify customer
    this.gateway.sendToUser(userId, 'order.updated', { orderId, status });

    // Notify admins
    this.gateway.sendToAdmin('order.updated', { orderId, status });

    // Notify vendor if relevant
    if (vendorId) {
      this.gateway.sendToVendor(vendorId, 'order.updated', { orderId, status });
    }
  }

  /**
   * Publishes general inventory stock revisions.
   */
  publishInventoryUpdated(
    productId: string,
    name: string,
    stock: number,
    status: string,
    vendorId: string,
  ) {
    this.gateway.sendToVendor(vendorId, 'inventory.updated', {
      productId,
      name,
      stock,
      status,
    });

    // Broadcast globally to keep shop layouts updated
    this.gateway.broadcast('inventory.updated', {
      productId,
      stock,
      status,
    });
  }

  /**
   * Triggered when a product drops below the seller's warning cap.
   */
  publishLowStock(
    productId: string,
    name: string,
    stock: number,
    threshold: number,
    vendorId: string,
  ) {
    this.logger.warn(
      `Inventory low stock threshold triggered for Product: ${name} (Stock: ${stock})`,
    );
    this.gateway.sendToVendor(vendorId, 'inventory.low_stock', {
      productId,
      name,
      stock,
      threshold,
    });
  }

  /**
   * Emits dynamic stream chunks of AI shopping suggestions to client sessions.
   */
  publishAiResponseStream(
    userId: string,
    sessionId: string,
    textChunk: string,
  ) {
    this.gateway.sendToUser(userId, 'ai.response.streaming', {
      sessionId,
      textChunk,
    });
  }

  /**
   * Triggered when Stripe Connect transfer completes successfully.
   */
  publishVendorPayoutCompleted(
    vendorId: string,
    amount: number,
    payoutId: string,
  ) {
    this.gateway.sendToVendor(vendorId, 'vendor.payout.completed', {
      amount,
      payoutId,
      timestamp: new Date(),
    });
  }

  /**
   * Publishes telemetry analytics snapshots.
   */
  publishAnalyticsUpdated(metrics: any) {
    this.gateway.sendToAdmin('analytics.updated', metrics);
  }
}
