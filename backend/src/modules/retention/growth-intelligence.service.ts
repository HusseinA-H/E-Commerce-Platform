import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import { cleanJsonString } from '../ai/utils/json-cleaner';


const CACHE_TTL_SECONDS = 86400; // 24 hours

export interface GrowthProfile {
  userId: string;
  churnRiskScore: number; // 0-100 (higher = more at risk)
  churnRiskLabel: string; // 'Low' | 'Medium' | 'High' | 'Critical'
  estimatedCLV: number; // Estimated customer lifetime value in USD
  reEngagementSuggestions: string[];
  personalizedPromo: string;
  analyzedAt: string;
}

/**
 * GrowthIntelligenceService — AI-powered customer retention intelligence.
 *
 * Uses Groq Llama3 to generate per-user:
 *   - Churn risk score (0-100)
 *   - CLV estimate ($)
 *   - Re-engagement suggestions (3 items)
 *   - Personalized promo copy
 *
 * Results cached in Redis for 24 hours.
 */
@Injectable()
export class GrowthIntelligenceService {
  private readonly logger = new Logger(GrowthIntelligenceService.name);
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';
  private groqApiKey = '';
  private isConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  /**
   * Generate (or return cached) growth intelligence profile for a user.
   */
  async getProfile(userId: string): Promise<GrowthProfile> {
    const cacheKey = `growth:profile:${userId}`;

    try {
      const cached = await this.redis.get<GrowthProfile>(cacheKey);
      if (cached) return cached;
    } catch {}

    const profile = await this.computeProfile(userId);

    try {
      await this.redis.set(cacheKey, profile, CACHE_TTL_SECONDS);
    } catch {}

    return profile;
  }

  /**
   * Invalidate cached profile (call after significant user activity).
   */
  async invalidateCache(userId: string) {
    try {
      await this.redis.del(`growth:profile:${userId}`);
    } catch {}
  }

  /**
   * Admin: Retention analytics across all users.
   */
  async getRetentionAnalytics() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalCustomers,
      activeCustomers30d,
      activeCustomers60d,
      avgOrderValue,
      newCustomers30d,
      topSpenders,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'customer' } }),
      this.prisma.user.count({
        where: {
          role: 'customer',
          orders: { some: { createdAt: { gte: thirtyDaysAgo } } },
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'customer',
          orders: {
            some: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
          },
        },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'paid', createdAt: { gte: thirtyDaysAgo } },
        _avg: { total: true },
      }),
      this.prisma.user.count({
        where: { role: 'customer', createdAt: { gte: thirtyDaysAgo } },
      }),
      this.prisma.order.groupBy({
        by: ['userId'],
        where: { paymentStatus: 'paid' },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 10,
      }),
    ]);

    const retentionRate =
      activeCustomers60d > 0
        ? Math.round((activeCustomers30d / activeCustomers60d) * 100)
        : 0;

    const avgCLV =
      topSpenders.length > 0
        ? topSpenders.reduce((s, u) => s + (u._sum.total || 0), 0) /
          topSpenders.length
        : 0;

    return {
      totalCustomers,
      activeCustomers30d,
      newCustomers30d,
      retentionRate,
      avgOrderValue: avgOrderValue._avg.total || 0,
      avgCLV: Math.round(avgCLV),
      topSpenders: topSpenders.map((s) => ({
        userId: s.userId,
        totalSpend: s._sum.total || 0,
      })),
    };
  }

  private async computeProfile(userId: string): Promise<GrowthProfile> {
    // Gather signals
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: { orderBy: { createdAt: 'desc' }, take: 20 },
        cartItems: true,
        wishlistItems: true,
        loyaltyAccount: true,
      },
    });

    if (!user) {
      return this.fallbackProfile(userId);
    }

    const daysSinceLastOrder = user.orders.length
      ? Math.floor(
          (Date.now() - user.orders[0].createdAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 999;

    const totalSpend = user.orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0);

    const orderCount = user.orders.filter(
      (o) => o.paymentStatus === 'paid',
    ).length;
    const avgOrderValue = orderCount > 0 ? totalSpend / orderCount : 0;

    const tenureMonths = Math.max(
      1,
      Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30),
      ),
    );

    // Heuristic churn risk (before AI enrichment)
    const heuristicChurnScore = Math.min(
      100,
      (daysSinceLastOrder > 60 ? 40 : 0) +
        (daysSinceLastOrder > 90 ? 30 : 0) +
        (orderCount === 0 ? 30 : 0) +
        (user.cartItems.length > 0 ? -10 : 0),
    );

    const heuristicCLV = Math.round(
      avgOrderValue *
        (orderCount > 0 ? (orderCount / tenureMonths) * 12 : 0) *
        3,
    );

    // AI enrichment
    if (!this.isConfigured) {
      return this.buildProfile(userId, heuristicChurnScore, heuristicCLV, user);
    }

    const prompt = `You are a customer retention analyst for APEX LUXE, a premium athletic fashion brand.

Customer signals:
- Days since last order: ${daysSinceLastOrder}
- Total lifetime spend: $${totalSpend.toFixed(2)}
- Number of orders: ${orderCount}
- Average order value: $${avgOrderValue.toFixed(2)}
- Account age: ${tenureMonths} months
- Wishlist items: ${user.wishlistItems.length}
- Items in cart: ${user.cartItems.length}
- Loyalty tier: ${user.loyaltyAccount?.tier || 'None'}

Respond with ONLY valid JSON (no markdown), no extra text:
{
  "churnRiskScore": <integer 0-100>,
  "churnRiskLabel": "<Low|Medium|High|Critical>",
  "estimatedCLV": <integer USD>,
  "reEngagementSuggestions": ["<suggestion1>", "<suggestion2>", "<suggestion3>"],
  "personalizedPromo": "<2 sentence personalized promo offer>"
}`;

    try {
      const resp = await axios.post(
        this.groqEndpoint,
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
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

      const raw = resp.data.choices[0].message.content;
      this.logger.log(`Raw growth intelligence response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      const parsed = JSON.parse(cleaned);
      return {
        userId,
        churnRiskScore: parsed.churnRiskScore ?? heuristicChurnScore,
        churnRiskLabel: parsed.churnRiskLabel ?? 'Medium',
        estimatedCLV: parsed.estimatedCLV ?? heuristicCLV,
        reEngagementSuggestions: parsed.reEngagementSuggestions ?? [],
        personalizedPromo: parsed.personalizedPromo ?? '',
        analyzedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      this.logger.warn(
        `Groq growth profile failed for ${userId}: ${e.message}`,
      );
      return this.buildProfile(userId, heuristicChurnScore, heuristicCLV, user);
    }
  }

  private buildProfile(
    userId: string,
    churnScore: number,
    clv: number,
    user: any,
  ): GrowthProfile {
    const label =
      churnScore >= 70
        ? 'Critical'
        : churnScore >= 50
          ? 'High'
          : churnScore >= 25
            ? 'Medium'
            : 'Low';
    return {
      userId,
      churnRiskScore: churnScore,
      churnRiskLabel: label,
      estimatedCLV: clv,
      reEngagementSuggestions: [
        'Send an exclusive early-access offer for new arrivals',
        'Share a personalised lookbook based on their purchase history',
        'Offer a loyalty points bonus for their next purchase',
      ],
      personalizedPromo: `Welcome back, ${user?.name || 'valued member'}. Your next purchase earns double loyalty points — a token of appreciation from APEX LUXE.`,
      analyzedAt: new Date().toISOString(),
    };
  }

  private fallbackProfile(userId: string): GrowthProfile {
    return {
      userId,
      churnRiskScore: 50,
      churnRiskLabel: 'Medium',
      estimatedCLV: 0,
      reEngagementSuggestions: [
        'Send a welcome back offer',
        'Showcase new arrivals',
        'Offer loyalty bonus',
      ],
      personalizedPromo: 'Exclusive offer for valued APEX LUXE members.',
      analyzedAt: new Date().toISOString(),
    };
  }
}
