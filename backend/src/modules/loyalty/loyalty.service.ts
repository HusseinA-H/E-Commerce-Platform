import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export const TIER_THRESHOLDS = {
  Bronze: 0,
  Silver: 500,
  Gold: 2000,
  Platinum: 5000,
};

export const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum'];

export function computeTier(lifetimePoints: number): string {
  if (lifetimePoints >= TIER_THRESHOLDS.Platinum) return 'Platinum';
  if (lifetimePoints >= TIER_THRESHOLDS.Gold) return 'Gold';
  if (lifetimePoints >= TIER_THRESHOLDS.Silver) return 'Silver';
  return 'Bronze';
}

export function pointsToNextTier(lifetimePoints: number): {
  nextTier: string | null;
  pointsNeeded: number;
} {
  if (lifetimePoints >= TIER_THRESHOLDS.Platinum)
    return { nextTier: null, pointsNeeded: 0 };
  if (lifetimePoints >= TIER_THRESHOLDS.Gold)
    return {
      nextTier: 'Platinum',
      pointsNeeded: TIER_THRESHOLDS.Platinum - lifetimePoints,
    };
  if (lifetimePoints >= TIER_THRESHOLDS.Silver)
    return {
      nextTier: 'Gold',
      pointsNeeded: TIER_THRESHOLDS.Gold - lifetimePoints,
    };
  return {
    nextTier: 'Silver',
    pointsNeeded: TIER_THRESHOLDS.Silver - lifetimePoints,
  };
}

/**
 * LoyaltyService — Core loyalty engine for APEX LUXE.
 *
 * Tier system (lifetime points):
 *   Bronze:   0 – 499 pts
 *   Silver:   500 – 1,999 pts
 *   Gold:     2,000 – 4,999 pts
 *   Platinum: 5,000+ pts
 *
 * Points rate: 1pt per $1 spent
 */
@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Get or create a loyalty account for a user.
   */
  async getOrCreateAccount(userId: string) {
    const existing = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
    });
    if (existing) return existing;

    return this.prisma.loyaltyAccount.create({
      data: { userId, points: 0, lifetimePoints: 0, tier: 'Bronze' },
      include: { transactions: true },
    });
  }

  /**
   * Get full account with tier progress info.
   */
  async getAccountWithProgress(userId: string) {
    const account = await this.getOrCreateAccount(userId);
    const { nextTier, pointsNeeded } = pointsToNextTier(account.lifetimePoints);

    const tierPct = (() => {
      const current =
        TIER_THRESHOLDS[account.tier as keyof typeof TIER_THRESHOLDS] ?? 0;
      const next = nextTier
        ? TIER_THRESHOLDS[nextTier as keyof typeof TIER_THRESHOLDS]
        : account.lifetimePoints;
      const range = next - current;
      return range > 0
        ? Math.min(
            100,
            Math.round(((account.lifetimePoints - current) / range) * 100),
          )
        : 100;
    })();

    return {
      ...account,
      nextTier,
      pointsNeeded,
      tierProgressPct: tierPct,
    };
  }

  /**
   * Award points to a user. Updates balance + lifetime total + recalculates tier.
   */
  async awardPoints(
    userId: string,
    points: number,
    reason: string,
    referenceId?: string,
  ) {
    const account = await this.getOrCreateAccount(userId);
    const newPoints = account.points + points;
    const newLifetime = account.lifetimePoints + points;
    const newTier = computeTier(newLifetime);
    const tierChanged = newTier !== account.tier;

    const [updated] = await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newPoints, lifetimePoints: newLifetime, tier: newTier },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'earned',
          points,
          reason,
          referenceId: referenceId || null,
        },
      }),
    ]);

    // Fire tier-up notification
    if (tierChanged) {
      void this.notifications.trigger(
        `Welcome to ${newTier}! 🏆`,
        `You've reached ${newTier} tier with ${newLifetime} lifetime points. Unlock exclusive rewards!`,
        'PERSONALIZED_PROMO',
        userId,
      );
      this.logger.log(`User ${userId} advanced to ${newTier} tier`);
    }

    return updated;
  }

  /**
   * Spend points for a reward redemption. Returns false if insufficient balance.
   */
  async spendPoints(
    userId: string,
    points: number,
    reason: string,
    referenceId?: string,
  ): Promise<boolean> {
    const account = await this.getOrCreateAccount(userId);
    if (account.points < points) return false;

    await this.prisma.$transaction([
      this.prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: account.points - points },
      }),
      this.prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          type: 'spent',
          points: -points,
          reason,
          referenceId: referenceId || null,
        },
      }),
    ]);

    return true;
  }

  /**
   * Award points for a completed order (1pt per $1).
   */
  async awardOrderPoints(userId: string, orderId: string, orderTotal: number) {
    const points = Math.floor(orderTotal);
    if (points <= 0) return;
    await this.awardPoints(userId, points, 'purchase', orderId);
  }

  /**
   * Get paginated transaction history.
   */
  async getTransactions(userId: string, page = 1, limit = 20) {
    const account = await this.getOrCreateAccount(userId);
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.loyaltyTransaction.findMany({
        where: { accountId: account.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.loyaltyTransaction.count({
        where: { accountId: account.id },
      }),
    ]);

    return { transactions, total, page, limit };
  }

  /**
   * Get available rewards for a user (filtered by their tier eligibility).
   */
  async getAvailableRewards(userId: string) {
    const account = await this.getOrCreateAccount(userId);
    const userTierIndex = TIER_ORDER.indexOf(account.tier);

    const rewards = await this.prisma.loyaltyReward.findMany({
      where: { isActive: true },
      orderBy: { pointsCost: 'asc' },
    });

    return rewards.map((r) => ({
      ...r,
      canAfford: account.points >= r.pointsCost,
      tierEligible: TIER_ORDER.indexOf(r.minTier) <= userTierIndex,
    }));
  }

  /**
   * Redeem a reward. Deducts points, creates redemption record.
   */
  async redeemReward(userId: string, rewardId: string) {
    const account = await this.getOrCreateAccount(userId);
    const reward = await this.prisma.loyaltyReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward || !reward.isActive)
      throw new NotFoundException('Reward not found or inactive');
    if (account.points < reward.pointsCost)
      throw new BadRequestException('Insufficient points');

    const tierEligible =
      TIER_ORDER.indexOf(account.tier) >= TIER_ORDER.indexOf(reward.minTier);
    if (!tierEligible)
      throw new BadRequestException(
        `This reward requires ${reward.minTier} tier or higher`,
      );

    if (reward.totalStock !== null && reward.usedCount >= reward.totalStock) {
      throw new BadRequestException('This reward is sold out');
    }

    // Generate a unique coupon code for discount rewards
    const couponCode = reward.rewardType.startsWith('discount')
      ? `APEX-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${userId.substring(0, 4).toUpperCase()}`
      : null;

    const spent = await this.spendPoints(
      userId,
      reward.pointsCost,
      'redemption',
      rewardId,
    );
    if (!spent) throw new BadRequestException('Failed to deduct points');

    const [redemption] = await this.prisma.$transaction([
      this.prisma.loyaltyRedemption.create({
        data: {
          accountId: account.id,
          rewardId,
          couponCode,
          status: 'active',
        },
      }),
      this.prisma.loyaltyReward.update({
        where: { id: rewardId },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    void this.notifications.trigger(
      'Reward Redeemed! 🎁',
      `You redeemed "${reward.name}". ${couponCode ? `Use code: ${couponCode}` : 'Enjoy your reward!'}`,
      'PERSONALIZED_PROMO',
      userId,
    );

    return { ...redemption, reward, couponCode };
  }

  /**
   * Admin: Summary stats for loyalty dashboard.
   */
  async getAdminStats() {
    const [tierCounts, totalAccounts, totalPointsIssued, totalRedemptions] =
      await Promise.all([
        this.prisma.loyaltyAccount.groupBy({ by: ['tier'], _count: true }),
        this.prisma.loyaltyAccount.count(),
        this.prisma.loyaltyTransaction.aggregate({
          where: { type: 'earned' },
          _sum: { points: true },
        }),
        this.prisma.loyaltyRedemption.count(),
      ]);

    return {
      totalAccounts,
      tierDistribution: tierCounts.reduce(
        (acc, t) => ({ ...acc, [t.tier]: t._count }),
        {},
      ),
      totalPointsIssued: totalPointsIssued._sum.points || 0,
      totalRedemptions,
    };
  }
}
