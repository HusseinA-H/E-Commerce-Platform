import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

@Processor('stripe-webhooks')
export class WebhooksProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhooksProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ordersService: OrdersService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const event = job.data;
    this.logger.log(
      `Processing Stripe Event: ${event.type} [JobId: ${job.id}]`,
    );

    try {
      // 1. Idempotency Check in Database
      const existingEvent = await this.prisma.webhookEvent.findUnique({
        where: { stripeEventId: event.id },
      });

      if (existingEvent && existingEvent.status === 'processed') {
        this.logger.warn(`Event ${event.id} already processed. Skipping.`);
        return { status: 'skipped', reason: 'already_processed' };
      }

      if (!existingEvent) {
        await this.prisma.webhookEvent.create({
          data: {
            stripeEventId: event.id,
            type: event.type,
            status: 'pending',
          },
        });
      }

      // 2. Delegate event processing
      await this.handleEvent(event);

      // 3. Mark as processed safely using transaction
      await this.prisma.webhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: 'processed',
          processedAt: new Date(),
        },
      });

      this.logger.log(
        `Successfully processed event ${event.type} [JobId: ${job.id}]`,
      );
      return { status: 'success' };
    } catch (error: any) {
      this.logger.error(
        `Failed to process event ${event.id}: ${error.message}`,
      );

      // Update database status on failure
      await this.prisma.webhookEvent.update({
        where: { stripeEventId: event.id },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      });
      throw error; // Let BullMQ handle retry backoff
    }
  }

  private async handleEvent(event: any) {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        this.logger.log(
          `[Stripe Webhook] Handling payment_intent.succeeded for Event: ${event.id}, Order ID: ${orderId}`,
        );
        if (orderId) {
          await this.ordersService.markOrderAsPaid(orderId, paymentIntent.id);
        } else {
          this.logger.warn(
            `[Stripe Webhook] payment_intent.succeeded event ${event.id} missing metadata.orderId.`,
          );
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.orderId;
        const errorMessage = paymentIntent.last_payment_error?.message || 'Payment attempt failed.';
        this.logger.log(
          `[Stripe Webhook] Handling payment_intent.payment_failed for Event: ${event.id}, Order ID: ${orderId}`,
        );
        if (orderId) {
          await this.ordersService.markOrderAsFailed(orderId, errorMessage);
        } else {
          this.logger.warn(
            `[Stripe Webhook] payment_intent.payment_failed event ${event.id} missing metadata.orderId.`,
          );
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentIntentId = charge.payment_intent;
        this.logger.log(
          `[Stripe Webhook] Handling charge.refunded for Event: ${event.id}, Payment Intent: ${paymentIntentId}`,
        );
        if (paymentIntentId) {
          const order = await this.prisma.order.findUnique({
            where: { paymentIntentId },
          });
          if (order) {
            const refundAmount = charge.amount_refunded / 100;
            await this.ordersService.processRefund(order.id, refundAmount, 'Stripe auto-refund processed.');
          } else {
            this.logger.warn(
              `[Stripe Webhook] charge.refunded event ${event.id} could not find matching order for Payment Intent: ${paymentIntentId}.`,
            );
          }
        } else {
          this.logger.warn(
            `[Stripe Webhook] charge.refunded event ${event.id} missing payment_intent.`,
          );
        }
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId =
          session.metadata?.orderId || session.client_reference_id;
        const paymentIntentId = session.payment_intent;
        this.logger.log(
          `[Stripe Webhook] Handling checkout.session.completed for Event: ${event.id}, Order ID: ${orderId}, Payment Intent: ${paymentIntentId}`,
        );
        if (orderId && paymentIntentId) {
          await this.ordersService.markOrderAsPaid(orderId, paymentIntentId);
        } else {
          this.logger.warn(
            `[Stripe Webhook] checkout.session.completed event ${event.id} missing orderId or paymentIntentId.`,
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const sub = event.data.object;
        const userId = sub.metadata?.userId;
        if (userId) {
          await this.prisma.subscription.upsert({
            where: { stripeSubscriptionId: sub.id },
            create: {
              userId,
              stripeSubscriptionId: sub.id,
              stripePriceId: sub.items?.data[0]?.price?.id || '',
              stripeProductId: sub.items?.data[0]?.price?.product || '',
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
            update: {
              status: sub.status,
              currentPeriodStart: new Date(sub.current_period_start * 1000),
              currentPeriodEnd: new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
          this.logger.log(
            `Successfully synced subscription ${sub.id} for user ${userId}`,
          );
        } else {
          this.logger.warn(`Subscription ${sub.id} missing userId metadata.`);
        }
        break;

      default:
        this.logger.log(
          `Unhandled event type: ${event.type}. Ignoring safely.`,
        );
    }
  }
}
