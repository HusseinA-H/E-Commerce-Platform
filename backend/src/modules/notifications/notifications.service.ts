import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PushService } from './push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private pushService: PushService,
  ) {}

  // List of active callbacks for WebSocket/SSE transport handlers
  private handlers: Array<(notification: any) => void> = [];

  // Register real-time push callback handlers (e.g. from a WebSocket Gateway)
  registerTransportHandler(handler: (notification: any) => void) {
    this.handlers.push(handler);
  }

  unregisterTransportHandler(handler: (notification: any) => void) {
    this.handlers = this.handlers.filter((h) => h !== handler);
  }

  private mapTypeToPreference(
    type:
      | 'LOW_STOCK'
      | 'ORDER_STATUS'
      | 'SYSTEM_ALERT'
      | 'WISHLIST_RESTOCK'
      | 'PRICE_DROP'
      | 'AI_RECOMMENDATION'
      | 'PERSONALIZED_PROMO',
  ): string {
    switch (type) {
      case 'ORDER_STATUS':
        return 'order_updates';
      case 'WISHLIST_RESTOCK':
      case 'PRICE_DROP':
        return 'wishlist_alerts';
      case 'AI_RECOMMENDATION':
        return 'ai_recommendations';
      case 'PERSONALIZED_PROMO':
      case 'LOW_STOCK':
        return 'promotions';
      case 'SYSTEM_ALERT':
      default:
        return 'loyalty_alerts';
    }
  }

  // Push notification to database AND trigger registered push transport handlers, email, and mobile push
  async trigger(
    title: string,
    message: string,
    type:
      | 'LOW_STOCK'
      | 'ORDER_STATUS'
      | 'SYSTEM_ALERT'
      | 'WISHLIST_RESTOCK'
      | 'PRICE_DROP'
      | 'AI_RECOMMENDATION'
      | 'PERSONALIZED_PROMO',
    userId?: string,
  ) {
    let inAppEnabled = true;
    let emailEnabled = true;
    let pushEnabled = true;
    const prefType = this.mapTypeToPreference(type);

    if (userId) {
      // Fetch user preferences
      const preferences = await this.prisma.notificationPreference.findMany({
        where: { userId, type: prefType },
      });

      for (const pref of preferences) {
        if (pref.channel === 'in_app') inAppEnabled = pref.isEnabled;
        if (pref.channel === 'email') emailEnabled = pref.isEnabled;
        if (pref.channel === 'push') pushEnabled = pref.isEnabled;
      }
    }

    let notification: any = null;

    // 1. Save in-app notification if enabled (or if no userId is provided, i.e., system notification)
    if (inAppEnabled || !userId) {
      notification = await this.prisma.notification.create({
        data: {
          title,
          message,
          type,
          userId: userId || null,
        },
      });

      // Fire callback handlers for future WebSocket/SSE real-time broadcast
      this.handlers.forEach((handler) => {
        try {
          handler(notification);
        } catch (err) {
          this.logger.error(`Realtime notification dispatch failed: ${err}`);
        }
      });
    }

    // 2. Dispatch push notification if enabled
    if (userId && pushEnabled) {
      try {
        await this.pushService.sendToUser(userId, title, message, prefType);
      } catch (err) {
        this.logger.error(`Failed to dispatch push notification: ${err}`);
      }
    }

    // 3. Dispatch email notification if enabled
    if (userId && emailEnabled) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });

        if (user && user.email) {
          // Map specialized email templates if appropriate, otherwise fallback to generic
          if (type === 'WISHLIST_RESTOCK') {
            await this.mailService.sendWishlistRestockEmail(
              user.email,
              user.name,
              { name: title, price: 0 },
            );
          } else if (type === 'PRICE_DROP') {
            await this.mailService.sendPriceDropEmail(
              user.email,
              user.name,
              { name: title },
              0,
              0,
            );
          } else if (
            (type === 'PERSONALIZED_PROMO' || type === 'SYSTEM_ALERT') &&
            (title.toLowerCase().includes('referral') || message.toLowerCase().includes('referral code'))
          ) {
            // Referral notification
            let refereeName = 'A referred friend';
            if (message.toLowerCase().includes('someone signed up')) {
              refereeName = 'Someone';
            } else if (message.toLowerCase().includes('your referral')) {
              refereeName = 'Your referred friend';
            }
            
            let rewardDescription = 'Bonus Points';
            const pointsMatch = message.match(/(\d+)\s*(?:bonus\s*)?points/i);
            if (pointsMatch) {
              rewardDescription = `${pointsMatch[1]} Points`;
            }
            
            await this.mailService.sendReferralNotification(
              user.email,
              user.name,
              refereeName,
              rewardDescription,
            );
          } else if (
            (type === 'PERSONALIZED_PROMO' || type === 'SYSTEM_ALERT') &&
            ((title.toLowerCase().includes('welcome to') && title.toLowerCase().includes('🏆')) ||
             title.toLowerCase().includes('reward redeemed') ||
             title.toLowerCase().includes('loyalty') ||
             message.toLowerCase().includes('points'))
          ) {
            // Loyalty notification
            let pointsEarned = 0;
            let totalPoints = 0;
            let tier = 'Bronze';
            let reason = 'Loyalty Activity';

            // 1. Tier-up scenario: "Welcome to Silver! 🏆"
            if (title.toLowerCase().includes('welcome to')) {
              const tierMatch = title.match(/Welcome to\s+([\w]+)/i);
              if (tierMatch) {
                tier = tierMatch[1];
              }
              const ptsMatch = message.match(/(\d+)\s+lifetime\s+points/i);
              if (ptsMatch) {
                totalPoints = parseInt(ptsMatch[1], 10);
              }
              reason = `Achieving ${tier} Tier`;
            }
            // 2. Redemption scenario: "Reward Redeemed! 🎁"
            else if (title.toLowerCase().includes('reward redeemed')) {
              const rewardMatch = message.match(/"([^"]+)"/);
              reason = rewardMatch ? `Redeemed: ${rewardMatch[1]}` : 'Reward Redemption';
              const account = await this.prisma.loyaltyAccount.findUnique({
                where: { userId },
              });
              if (account) {
                totalPoints = account.points;
                tier = account.tier;
              }
            }
            // 3. General points earning or fallbacks
            else {
              const earnedMatch = message.match(/(?:earned|awarded)\s+(\d+)/i) || message.match(/\+(\d+)/);
              if (earnedMatch) {
                pointsEarned = parseInt(earnedMatch[1], 10);
              }
              const account = await this.prisma.loyaltyAccount.findUnique({
                where: { userId },
              });
              if (account) {
                totalPoints = account.points;
                tier = account.tier;
              }
              reason = message;
            }

            await this.mailService.sendLoyaltyNotification(
              user.email,
              user.name,
              pointsEarned,
              totalPoints,
              tier,
              reason,
            );
          } else {
            await this.mailService.sendGenericNotification(
              user.email,
              user.name,
              title,
              message,
            );
          }
        }
      } catch (err) {
        this.logger.error(`Failed to dispatch email notification: ${err}`);
      }
    }

    return notification;
  }

  async findAll(userId?: string) {
    return this.prisma.notification.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId?: string) {
    const record = await this.prisma.notification.findFirst({
      where: userId ? { id, userId } : { id },
    });
    if (!record) {
      throw new NotFoundException('Notification alert not found.');
    }
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId?: string) {
    return this.prisma.notification.updateMany({
      where: userId ? { userId, isRead: false } : { isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async deleteOne(id: string, userId: string) {
    await this.prisma.notification.deleteMany({
      where: { id, userId },
    });
    return { success: true };
  }

  // --- Omnichannel Preference Management ---

  async getPreferences(userId: string) {
    const userPrefs = await this.prisma.notificationPreference.findMany({
      where: { userId },
    });
    const channels = ['email', 'push', 'in_app'];
    const types = [
      'order_updates',
      'wishlist_alerts',
      'loyalty_alerts',
      'promotions',
      'ai_recommendations',
    ];

    const prefsMap = new Map(
      userPrefs.map((p) => [`${p.channel}:${p.type}`, p.isEnabled]),
    );

    const result: Array<{ channel: string; type: string; isEnabled: boolean }> =
      [];
    for (const channel of channels) {
      for (const type of types) {
        const key = `${channel}:${type}`;
        const isEnabled = prefsMap.has(key)
          ? (prefsMap.get(key) ?? true)
          : true;
        result.push({ channel, type, isEnabled });
      }
    }
    return result;
  }

  async updatePreference(
    userId: string,
    channel: string,
    type: string,
    isEnabled: boolean,
  ) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_channel_type: { userId, channel, type },
      },
      update: { isEnabled, updatedAt: new Date() },
      create: { userId, channel, type, isEnabled },
    });
  }
}
