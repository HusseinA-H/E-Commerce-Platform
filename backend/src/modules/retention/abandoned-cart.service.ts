import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

export const ABANDONED_CART_QUEUE = 'abandoned-cart';
export const CART_ABANDONMENT_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * AbandonedCartService — Detects carts idle > 1 hour and schedules recovery.
 *
 * Flow:
 *   1. Hourly cron (AbandonedCartScheduler) calls scanAbandonedCarts()
 *   2. Finds users with CartItems.updatedAt > 1h ago and no recent order
 *   3. For each: creates/updates AbandonedCartJob record + enqueues BullMQ job
 *   4. AbandonedCartProcessor handles the job: Groq generates message, sends email + in-app notification
 */
@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    @InjectQueue(ABANDONED_CART_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Scan all active carts and schedule recovery for abandoned ones.
   * Called by the hourly cron scheduler.
   */
  async scanAbandonedCarts(): Promise<{ scheduled: number }> {
    const cutoff = new Date(Date.now() - CART_ABANDONMENT_THRESHOLD_MS);

    // Find users with cart items older than threshold, no pending reminder
    const abandonedCarts = await this.prisma.cartItem.findMany({
      where: {
        updatedAt: { lt: cutoff },
      },
      select: {
        userId: true,
        updatedAt: true,
        user: { select: { email: true, name: true } },
      },
      distinct: ['userId'],
    });

    let scheduled = 0;

    for (const cart of abandonedCarts) {
      try {
        // Check user has no order placed in the last 24h (means they recovered)
        const recentOrder = await this.prisma.order.findFirst({
          where: {
            userId: cart.userId,
            createdAt: { gte: cutoff },
          },
        });

        if (recentOrder) {
          // Cart was recovered — mark as recovered
          await this.prisma.abandonedCartJob.updateMany({
            where: { userId: cart.userId, status: 'pending' },
            data: { status: 'recovered' },
          });
          continue;
        }

        // Check existing job record
        const existing = await this.prisma.abandonedCartJob.findUnique({
          where: { userId: cart.userId },
        });

        if (existing?.status === 'sent') continue; // Already sent reminder

        // Upsert AbandonedCartJob record
        await this.prisma.abandonedCartJob.upsert({
          where: { userId: cart.userId },
          create: {
            userId: cart.userId,
            lastCartUpdate: cart.updatedAt,
            status: 'pending',
          },
          update: {
            lastCartUpdate: cart.updatedAt,
            status: 'pending',
          },
        });

        // Enqueue BullMQ job with deduplication by userId
        const job = await this.queue.add(
          'send-cart-reminder',
          { userId: cart.userId, email: cart.user.email, name: cart.user.name },
          {
            jobId: `cart-${cart.userId}`,
            delay: 0,
            removeOnComplete: true,
            removeOnFail: false,
          },
        );

        // Store BullMQ job ID
        await this.prisma.abandonedCartJob.update({
          where: { userId: cart.userId },
          data: { jobId: job.id?.toString() || null },
        });

        scheduled++;
      } catch (e: any) {
        this.logger.warn(
          `Failed to schedule cart recovery for ${cart.userId}: ${e.message}`,
        );
      }
    }

    this.logger.log(`Abandoned cart scan: ${scheduled} reminders scheduled`);
    return { scheduled };
  }

  /**
   * Get cart items for a user (used by the processor).
   */
  async getCartItems(userId: string) {
    return this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: { include: { images: true } },
      },
    });
  }

  /**
   * Mark a cart reminder as sent.
   */
  async markReminderSent(userId: string) {
    await this.prisma.abandonedCartJob.updateMany({
      where: { userId },
      data: { status: 'sent', reminderSentAt: new Date() },
    });
  }
}
