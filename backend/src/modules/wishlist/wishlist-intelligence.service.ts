import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';

/**
 * WishlistIntelligenceService — AI-powered wishlist monitoring.
 *
 * Runs daily (via WishlistScheduler):
 *  1. Restock alerts: Products back IN_STOCK that users have a restock alert for
 *  2. Price drop alerts: Products whose price fell below a user's threshold
 *  3. AI suggestions: Groq generates complementary product recommendations based on wishlist
 */
@Injectable()
export class WishlistIntelligenceService {
  private readonly logger = new Logger(WishlistIntelligenceService.name);
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';
  private groqApiKey = '';
  private isConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  // ─── Restock Alerts ───────────────────────────────────────────────────────

  /**
   * Scan active restock alerts. Notify users whose wishlisted products are back in stock.
   */
  async checkRestockAlerts(): Promise<{ notified: number }> {
    const alerts = await this.prisma.wishlistAlert.findMany({
      where: { alertType: 'restock', isActive: true },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    let notified = 0;

    for (const alert of alerts) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: alert.productId },
          include: { images: { where: { isPrimary: true }, take: 1 } },
        });

        if (!product || product.inventoryStatus !== 'IN_STOCK') continue;

        // Don't re-notify within 7 days
        if (alert.lastTriggeredAt) {
          const daysSince =
            (Date.now() - alert.lastTriggeredAt.getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSince < 7) continue;
        }

        // In-app notification
        await this.notifications.trigger(
          'Back in Stock! 🔥',
          `${product.name} is back in stock. Add it to your cart before it sells out again.`,
          'WISHLIST_RESTOCK',
          alert.user.id,
        );

        // Email notification
        await this.mail.sendWishlistRestockEmail(
          alert.user.email,
          alert.user.name,
          product,
        );

        // Update last triggered
        await this.prisma.wishlistAlert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        });

        notified++;
      } catch (e: any) {
        this.logger.warn(
          `Restock alert failed for ${alert.userId}/${alert.productId}: ${e.message}`,
        );
      }
    }

    this.logger.log(`Restock alerts: ${notified} notifications sent`);
    return { notified };
  }

  // ─── Price Drop Alerts ────────────────────────────────────────────────────

  /**
   * Scan active price drop alerts. Notify users when price fell to/below their threshold.
   */
  async checkPriceDropAlerts(): Promise<{ notified: number }> {
    const alerts = await this.prisma.wishlistAlert.findMany({
      where: {
        alertType: 'price_drop',
        isActive: true,
        priceThreshold: { not: null },
      },
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    });

    let notified = 0;

    for (const alert of alerts) {
      try {
        const product = await this.prisma.product.findUnique({
          where: { id: alert.productId },
          include: { images: { where: { isPrimary: true }, take: 1 } },
        });

        if (!product || !alert.priceThreshold) continue;
        if (product.price > alert.priceThreshold) continue;

        // Don't re-notify within 3 days
        if (alert.lastTriggeredAt) {
          const daysSince =
            (Date.now() - alert.lastTriggeredAt.getTime()) /
            (1000 * 60 * 60 * 24);
          if (daysSince < 3) continue;
        }

        const oldPrice = alert.priceThreshold; // treated as "was expecting <= this"

        await this.notifications.trigger(
          'Price Drop Alert 📉',
          `${product.name} is now $${product.price.toFixed(2)}. Grab it at this price before it goes back up!`,
          'PRICE_DROP',
          alert.user.id,
        );

        await this.mail.sendPriceDropEmail(
          alert.user.email,
          alert.user.name,
          product,
          oldPrice,
          product.price,
        );

        await this.prisma.wishlistAlert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        });

        notified++;
      } catch (e: any) {
        this.logger.warn(
          `Price drop alert failed for ${alert.userId}/${alert.productId}: ${e.message}`,
        );
      }
    }

    this.logger.log(`Price drop alerts: ${notified} notifications sent`);
    return { notified };
  }

  // ─── AI Suggestions ───────────────────────────────────────────────────────

  /**
   * Generate AI-powered product suggestions based on a user's wishlist.
   * Returns up to 6 product IDs from the catalog.
   */
  async generateAISuggestions(userId: string): Promise<string[]> {
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { category: true, aiMetadata: true },
        },
      },
      take: 10,
    });

    if (!wishlistItems.length) return [];

    const wishlistSummary = wishlistItems
      .map(
        (w) =>
          `${w.product.name} (${w.product.category?.name || 'uncategorized'})`,
      )
      .join(', ');

    // Candidate products to recommend (not already in wishlist)
    const existingIds = wishlistItems.map((w) => w.productId);
    const candidates = await this.prisma.product.findMany({
      where: { id: { notIn: existingIds }, inventoryStatus: 'IN_STOCK' },
      include: { category: true, aiMetadata: true },
      take: 40,
    });

    if (!candidates.length) return [];

    const candidateSummary = candidates
      .map((p) => `${p.id}:${p.name}(${p.category?.name || ''})`)
      .join(', ');

    if (!this.isConfigured) {
      return candidates.slice(0, 4).map((p) => p.id);
    }

    try {
      const resp = await axios.post(
        this.groqEndpoint,
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'user',
              content: `A customer's wishlist includes: ${wishlistSummary}.

From these catalog products: ${candidateSummary}

Return ONLY a JSON array of up to 6 product IDs that would best complement their wishlist. 
Consider style compatibility, category variety, and brand cohesion.
Output ONLY the JSON array, no other text. Example: ["id1","id2","id3"]`,
            },
          ],
          temperature: 0.4,
          max_tokens: 200,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      const content = resp.data?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      // Handle both {"ids": [...]} and direct array responses
      const ids: string[] = Array.isArray(parsed)
        ? parsed
        : parsed.ids || parsed.productIds || [];
      return ids
        .filter((id: string) => candidates.some((c) => c.id === id))
        .slice(0, 6);
    } catch (e: any) {
      this.logger.warn(`AI suggestions failed for ${userId}: ${e.message}`);
      return candidates.slice(0, 4).map((p) => p.id);
    }
  }

  // ─── Alert Management ─────────────────────────────────────────────────────

  async setAlert(
    userId: string,
    productId: string,
    alertType: 'restock' | 'price_drop',
    priceThreshold?: number,
  ) {
    return this.prisma.wishlistAlert.upsert({
      where: { userId_productId_alertType: { userId, productId, alertType } },
      create: {
        userId,
        productId,
        alertType,
        priceThreshold: priceThreshold || null,
        isActive: true,
      },
      update: { isActive: true, priceThreshold: priceThreshold || null },
    });
  }

  async removeAlert(
    userId: string,
    productId: string,
    alertType: 'restock' | 'price_drop',
  ) {
    return this.prisma.wishlistAlert.updateMany({
      where: { userId, productId, alertType },
      data: { isActive: false },
    });
  }

  async getUserAlerts(userId: string) {
    return this.prisma.wishlistAlert.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
