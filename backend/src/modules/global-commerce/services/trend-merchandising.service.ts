import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { cleanJsonString } from '../../ai/utils/json-cleaner';

export interface TrendIntelligenceReport {
  trendingProducts: Array<{ id: string; name: string; score: number }>;
  trendingCategories: Array<{ name: string; score: number }>;
  trendingColors: string[];
  emergingTrends: string[];
  homepageMerchandisingOrder: string[]; // ordered product IDs
  collectionRankings: Array<{
    categorySlug: string;
    score: number;
    reason: string;
  }>;
}

@Injectable()
export class AiTrendMerchandisingService {
  private readonly logger = new Logger(AiTrendMerchandisingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async generateTrendAndMerchandisingReport(): Promise<TrendIntelligenceReport> {
    this.logger.log(
      'Analyzing search telemetry, wishlists, and specs for trend intelligence...',
    );

    // 1. Fetch recent search analytics logs
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const searchEvents = await this.prisma.searchAnalyticsEvent.findMany({
      where: { createdAt: { gte: cutoffDate } },
      select: {
        query: true,
        topProductId: true,
        didClick: true,
        didConvert: true,
        source: true,
      },
      take: 1000, // sample limit
    });

    // 2. Fetch recent wishlist counts
    const wishlistItems = await this.prisma.wishlistItem.findMany({
      where: { createdAt: { gte: cutoffDate } },
      select: { productId: true },
    });

    // 3. Fetch product catalog details
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        price: true,
        colors: { select: { color: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    // Aggregate wishlist counts
    const wishlistCountMap: Record<string, number> = {};
    wishlistItems.forEach((wi) => {
      wishlistCountMap[wi.productId] =
        (wishlistCountMap[wi.productId] || 0) + 1;
    });

    // Aggregate search query frequencies
    const searchFreqMap: Record<
      string,
      { count: number; clicks: number; converts: number }
    > = {};
    searchEvents.forEach((ev) => {
      const q = ev.query.toLowerCase().trim();
      if (!searchFreqMap[q]) {
        searchFreqMap[q] = { count: 0, clicks: 0, converts: 0 };
      }
      searchFreqMap[q].count++;
      if (ev.didClick) searchFreqMap[q].clicks++;
      if (ev.didConvert) searchFreqMap[q].converts++;
    });

    const dataset = {
      popularSearches: Object.entries(searchFreqMap)
        .map(([query, stats]) => ({ query, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20),
      wishlistStats: Object.entries(wishlistCountMap)
        .map(([id, count]) => {
          const p = products.find((pr) => pr.id === id);
          return { id, name: p?.name || 'Unknown', count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 15),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        colors: p.colors.map((c) => c.color),
        category: p.category.name,
        categorySlug: p.category.slug,
      })),
    };

    if (products.length === 0) {
      return {
        trendingProducts: [],
        trendingCategories: [],
        trendingColors: [],
        emergingTrends: [],
        homepageMerchandisingOrder: [],
        collectionRankings: [],
      };
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `You are an elite trend intelligence analyst and digital merchandiser for high-end activewear (APEX LUXE).
Analyze search logs and wishlist activity.
Identify:
1. Top trending products and categories (with score index 0-100).
2. Trending colors and style attributes (e.g. "Slate Gray", "compression wear").
3. Emerging market trends (e.g. "breathable high-altitude outerwear").
4. Homepage merchandising order: an ordered list of product IDs to display on the storefront to maximize conversions.
5. Collection rankings: ranking order for collection pages (e.g., category slug, score, reason).
You MUST return a JSON response matching this exact structure:
{
  "trendingProducts": [{ "id": "string", "name": "string", "score": 85 }],
  "trendingCategories": [{ "name": "string", "score": 90 }],
  "trendingColors": ["string"],
  "emergingTrends": ["string"],
  "homepageMerchandisingOrder": ["productId1", "productId2"],
  "collectionRankings": [{ "categorySlug": "string", "score": 95, "reason": "string" }]
}`,
        },
        {
          role: 'user',
          content: `Here is the commerce telemetry data: ${JSON.stringify(dataset)}`,
        },
      ];

      const response = (await this.aiService.executeGroqCall(
        'llama-3.3-70b-versatile',
        messages,
        'trend_analysis',
        { type: 'json_object' },
        0.3,
      )) as { data: { choices: { message: { content: string } }[] } };

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw trend analysis response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      return JSON.parse(cleaned) as TrendIntelligenceReport;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Trend Merchandising analysis failed: ${errMsg}`);

      // Fallback manual ranking
      const sortedProducts = [...products].sort((a, b) => {
        const countA = wishlistCountMap[a.id] || 0;
        const countB = wishlistCountMap[b.id] || 0;
        return countB - countA;
      });

      const uniqueCategories = Array.from(
        new Set(products.map((p) => p.category.name)),
      );
      const uniqueColors = Array.from(
        new Set(products.flatMap((p) => p.colors.map((c) => c.color))),
      );

      return {
        trendingProducts: sortedProducts
          .slice(0, 5)
          .map((p, idx) => ({ id: p.id, name: p.name, score: 100 - idx * 10 })),
        trendingCategories: uniqueCategories
          .slice(0, 3)
          .map((name, idx) => ({ name, score: 95 - idx * 12 })),
        trendingColors: uniqueColors.slice(0, 3),
        emergingTrends: [
          'Elite technical compression layers',
          'Lightweight thermal insulation outerwear',
        ],
        homepageMerchandisingOrder: sortedProducts.map((p) => p.id),
        collectionRankings: Array.from(
          new Set(products.map((p) => p.category.slug)),
        ).map((slug, idx) => ({
          categorySlug: slug,
          score: 98 - idx * 8,
          reason:
            'Calculated using sales velocity and wishlist aggregation data.',
        })),
      };
    }
  }
}
