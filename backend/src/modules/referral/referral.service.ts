import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * ReferralService — Referral program for APEX LUXE.
 *
 * Flow:
 *   1. User A shares their link: apexluxe.com/ref/{code}
 *   2. User B registers → calls POST /referral/apply with code
 *   3. User A earns 200 pts (referral signup bonus)
 *   4. User B places first order → User A earns 500 pts (purchase bonus)
 */
@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);
  private readonly BASE_URL = 'https://apexluxe.com';

  constructor(
    private readonly prisma: PrismaService,
    private readonly loyalty: LoyaltyService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Get (or create) the referral code for a user.
   */
  async getMyCode(userId: string) {
    const existing = await this.prisma.referralCode.findUnique({
      where: { userId },
    });
    if (existing) {
      return {
        ...existing,
        referralLink: `${this.BASE_URL}/ref/${existing.code}`,
      };
    }

    const code = this.generateCode(userId);
    const created = await this.prisma.referralCode.create({
      data: { userId, code },
    });

    return { ...created, referralLink: `${this.BASE_URL}/ref/${code}` };
  }

  /**
   * Apply a referral code when a new user registers.
   * Awards signup bonus to the referrer.
   */
  async applyReferralCode(newUserId: string, code: string) {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
      include: { user: true },
    });

    if (!referralCode) throw new NotFoundException('Invalid referral code');
    if (referralCode.userId === newUserId) {
      throw new ConflictException('You cannot use your own referral code');
    }

    // Check not already referred
    const alreadyReferred = await this.prisma.referralEvent.findFirst({
      where: { referredId: newUserId },
    });
    if (alreadyReferred)
      throw new ConflictException('Referral already applied to this account');

    // Record the referral event
    const event = await this.prisma.referralEvent.create({
      data: {
        referralCodeId: referralCode.id,
        referrerId: referralCode.userId,
        referredId: newUserId,
        status: 'registered',
      },
    });

    // Increment uses count
    await this.prisma.referralCode.update({
      where: { id: referralCode.id },
      data: { usesCount: { increment: 1 } },
    });

    // Award signup bonus to referrer (200 pts)
    await this.loyalty.awardPoints(
      referralCode.userId,
      200,
      'referral',
      event.id,
    );

    void this.notifications.trigger(
      'Referral Bonus Earned! 🎉',
      `Someone signed up with your referral code. You earned 200 points!`,
      'PERSONALIZED_PROMO',
      referralCode.userId,
    );

    this.logger.log(
      `Referral applied: ${referralCode.userId} referred ${newUserId}`,
    );
    return { success: true, referrerId: referralCode.userId };
  }

  /**
   * Called when a referred user completes their first purchase.
   * Awards purchase bonus (500 pts) to the referrer.
   */
  async onReferredUserPurchase(referredUserId: string, orderId: string) {
    const event = await this.prisma.referralEvent.findFirst({
      where: { referredId: referredUserId, status: 'registered' },
    });
    if (!event) return;

    await this.prisma.referralEvent.update({
      where: { id: event.id },
      data: { status: 'purchased', rewardedAt: new Date() },
    });

    await this.loyalty.awardPoints(
      event.referrerId,
      500,
      'referral_purchase',
      orderId,
    );

    void this.notifications.trigger(
      'Referral Purchase Bonus! 🏆',
      `Your referral made their first purchase. You earned 500 bonus points!`,
      'PERSONALIZED_PROMO',
      event.referrerId,
    );

    // Update status to rewarded
    await this.prisma.referralEvent.update({
      where: { id: event.id },
      data: { status: 'rewarded' },
    });
  }

  /**
   * Get referral analytics for a user.
   */
  async getMyAnalytics(userId: string) {
    const referralCode = await this.prisma.referralCode.findUnique({
      where: { userId },
      include: {
        events: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            referred: { select: { name: true, email: true, createdAt: true } },
          },
        },
      },
    });

    if (!referralCode) {
      return {
        code: null,
        referralLink: null,
        totalReferrals: 0,
        convertedReferrals: 0,
        totalPointsEarned: 0,
        events: [],
      };
    }

    const converted = referralCode.events.filter(
      (e) => e.status === 'rewarded',
    ).length;
    const totalPts =
      referralCode.events.filter((e) =>
        ['purchased', 'rewarded'].includes(e.status),
      ).length *
        500 +
      referralCode.events.length * 200;

    return {
      code: referralCode.code,
      referralLink: `${this.BASE_URL}/ref/${referralCode.code}`,
      totalReferrals: referralCode.usesCount,
      convertedReferrals: converted,
      conversionRate:
        referralCode.usesCount > 0
          ? Math.round((converted / referralCode.usesCount) * 100)
          : 0,
      totalPointsEarned: totalPts,
      events: referralCode.events,
    };
  }

  /**
   * Admin: Platform-wide referral stats.
   */
  async getAdminStats() {
    const [totalCodes, totalEvents, convertedEvents] = await Promise.all([
      this.prisma.referralCode.count(),
      this.prisma.referralEvent.count(),
      this.prisma.referralEvent.count({ where: { status: 'rewarded' } }),
    ]);

    const topReferrers = await this.prisma.referralCode.findMany({
      orderBy: { usesCount: 'desc' },
      take: 10,
      include: { user: { select: { name: true, email: true } } },
    });

    return {
      totalCodes,
      totalReferrals: totalEvents,
      convertedReferrals: convertedEvents,
      conversionRate:
        totalEvents > 0 ? Math.round((convertedEvents / totalEvents) * 100) : 0,
      topReferrers,
    };
  }

  private generateCode(userId: string): string {
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `APEX${userId.substring(0, 4).toUpperCase()}${suffix}`;
  }
}
