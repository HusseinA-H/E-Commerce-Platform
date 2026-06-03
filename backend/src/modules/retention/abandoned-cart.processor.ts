import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  AbandonedCartService,
  ABANDONED_CART_QUEUE,
} from './abandoned-cart.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

interface CartReminderJob {
  userId: string;
  email: string;
  name: string;
}

/**
 * AbandonedCartProcessor — BullMQ worker for cart recovery.
 *
 * Steps:
 *  1. Fetch cart items for the user
 *  2. Call Groq for personalized luxury reminder copy
 *  3. Send email via MailService
 *  4. Create in-app notification
 *  5. Mark reminder as sent
 */
@Processor(ABANDONED_CART_QUEUE)
export class AbandonedCartProcessor extends WorkerHost {
  private readonly logger = new Logger(AbandonedCartProcessor.name);
  private groqApiKey = '';
  private isConfigured = false;
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly cartService: AbandonedCartService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    super();
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  async process(job: Job<CartReminderJob>) {
    const { userId, email, name } = job.data;
    this.logger.log(`Processing cart recovery for user: ${userId}`);

    try {
      const cartItems = await this.cartService.getCartItems(userId);
      if (!cartItems.length) {
        this.logger.log(`Cart empty for ${userId}, skipping reminder`);
        return;
      }

      const cartSummary = cartItems
        .slice(0, 5)
        .map(
          (item: any) =>
            `${item.product.name} (${item.size}, ${item.color}) ×${item.quantity}`,
        )
        .join(', ');

      const totalValue = cartItems.reduce(
        (sum: number, item: any) => sum + item.product.price * item.quantity,
        0,
      );

      // Groq generates personalized luxury reminder
      let aiMessage = `Your curated selection is waiting, ${name}. Don't let these exclusive pieces slip away.`;

      if (this.isConfigured) {
        try {
          const resp = await axios.post(
            this.groqEndpoint,
            {
              model: 'llama-3.1-8b-instant',
              messages: [
                {
                  role: 'user',
                  content: `You are the AI concierge for APEX LUXE, a premium athletic fashion brand.
Write a short, luxurious, personalized cart reminder message (2-3 sentences max) for ${name}.
Their cart contains: ${cartSummary} (total value: $${totalValue.toFixed(2)}).
Tone: sophisticated, exclusive, urgent but not pushy. Reference the specific items naturally.
Do not include any emojis or markdown. Output only the message text.`,
                },
              ],
              temperature: 0.7,
              max_tokens: 150,
            },
            {
              headers: {
                Authorization: `Bearer ${this.groqApiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 10000,
            },
          );
          const content = resp.data?.choices?.[0]?.message?.content?.trim();
          if (content) aiMessage = content;
        } catch (e: any) {
          this.logger.warn(
            `Groq cart copy failed, using fallback: ${e.message}`,
          );
        }
      }

      // Send email and in-app notification
      await this.mail.sendAbandonedCartEmail(email, name, cartItems, aiMessage);
      await this.notifications.trigger(
        'Your cart is waiting ⏳',
        aiMessage,
        'PERSONALIZED_PROMO',
        userId,
      );

      await this.cartService.markReminderSent(userId);
      this.logger.log(`Cart recovery reminder sent to ${email}`);
    } catch (e: any) {
      this.logger.error(`Cart recovery failed for ${userId}: ${e.message}`);
      throw e;
    }
  }
}
