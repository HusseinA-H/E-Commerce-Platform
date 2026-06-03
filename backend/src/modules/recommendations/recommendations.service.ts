import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordEvent(
    productId: string,
    engineType: string,
    eventType: string,
    userId?: string,
  ) {
    this.logger.debug(
      `Recording recommendation event: Product ${productId} | Engine ${engineType} | Event ${eventType} | User ${userId || 'anonymous'}`,
    );
    return this.prisma.recommendationEvent.create({
      data: {
        productId,
        engineType,
        eventType,
        userId: userId || null,
      },
    });
  }

  async recordFeedback(
    productId: string,
    feedbackType: string,
    userId: string,
  ) {
    this.logger.log(
      `Recording recommendation feedback: Product ${productId} | Type ${feedbackType} | User ${userId}`,
    );
    return this.prisma.recommendationFeedback.create({
      data: {
        productId,
        feedbackType,
        userId,
      },
    });
  }

  async getStyleProfile(userId: string) {
    return this.prisma.userStyleProfile.findUnique({
      where: { userId },
    });
  }

  async getAdminAnalytics() {
    const [eventsCount, feedbackCount, conversionEvents] = await Promise.all([
      this.prisma.recommendationEvent.count(),
      this.prisma.recommendationFeedback.count(),
      this.prisma.recommendationEvent.findMany({
        where: {
          eventType: { in: ['click', 'cart_add', 'purchase', 'impression'] },
        },
        select: {
          engineType: true,
          eventType: true,
        },
      }),
    ]);

    const engineStats: Record<
      string,
      { impressions: number; clicks: number; carts: number; purchases: number }
    > = {};
    conversionEvents.forEach((ev) => {
      if (!engineStats[ev.engineType]) {
        engineStats[ev.engineType] = {
          impressions: 0,
          clicks: 0,
          carts: 0,
          purchases: 0,
        };
      }
      if (ev.eventType === 'impression')
        engineStats[ev.engineType].impressions++;
      if (ev.eventType === 'click') engineStats[ev.engineType].clicks++;
      if (ev.eventType === 'cart_add') engineStats[ev.engineType].carts++;
      if (ev.eventType === 'purchase') engineStats[ev.engineType].purchases++;
    });

    const performanceMetrics = Object.entries(engineStats).map(
      ([engine, stats]) => {
        const ctr =
          stats.impressions > 0
            ? Number(((stats.clicks / stats.impressions) * 100).toFixed(1))
            : 0.0;
        const conversionRate =
          stats.impressions > 0
            ? Number(((stats.purchases / stats.impressions) * 100).toFixed(1))
            : 0.0;
        return {
          engine,
          ctr,
          conversionRate,
          ...stats,
        };
      },
    );

    const topRecommendedProducts = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        images: true,
        category: true,
        recommendationEvents: {
          where: { eventType: 'click' },
        },
      },
      take: 5,
    });

    const productRanking = topRecommendedProducts
      .map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        slug: p.slug,
        categoryName: p.category?.name,
        clickCount: p.recommendationEvents.length,
      }))
      .sort((a, b) => b.clickCount - a.clickCount);

    return {
      totalInteractions: eventsCount,
      totalFeedback: feedbackCount,
      performanceMetrics,
      topProducts: productRanking,
    };
  }
}
