import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TrendingProductsEngine {
  private readonly logger = new Logger(TrendingProductsEngine.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(limit = 6): Promise<any[]> {
    const snapshots = await this.prisma.trendingSnapshot.findMany({
      orderBy: { score: 'desc' },
      include: {
        product: {
          include: {
            images: true,
            category: true,
          },
        },
      },
      take: limit,
    });

    if (snapshots.length > 0) {
      return snapshots.map((s) => s.product);
    }

    this.logger.warn(
      'No trending snapshots found. Generating dynamic trend list.',
    );

    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        images: true,
        category: true,
        orderItems: { take: 10 },
        recommendationEvents: { take: 20 },
      },
    });

    const scored = products.map((p) => {
      const purchaseScore = p.orderItems.length * 30;
      const clickEvents = p.recommendationEvents.filter(
        (e) => e.eventType === 'click',
      );
      const clickScore = clickEvents.length * 5;
      const totalScore = purchaseScore + clickScore + (p.isFeatured ? 20 : 0);

      return { product: p, score: totalScore };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.product);
  }

  async computeAndSaveTrendingSnapshots(): Promise<void> {
    this.logger.log('Re-computing trending product snapshots...');
    await this.prisma.trendingSnapshot.deleteMany({});

    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        orderItems: { take: 50 },
        recommendationEvents: {
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    });

    for (const p of products) {
      const purchaseScore = p.orderItems.length * 15;
      const clickScore =
        p.recommendationEvents.filter((e) => e.eventType === 'click').length *
        2.5;
      const score = purchaseScore + clickScore + (p.isFeatured ? 10 : 0);

      if (score > 0) {
        await this.prisma.trendingSnapshot.create({
          data: {
            productId: p.id,
            score,
          },
        });
      }
    }
  }
}
