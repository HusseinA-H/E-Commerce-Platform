import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SearchEventDto {
  query: string;
  userId?: string;
  sessionId?: string;
  resultCount: number;
  topProductId?: string;
  intentJson?: string;
  latencyMs: number;
  source: 'semantic' | 'visual' | 'personalized' | 'trending' | 'autocomplete';
}

export interface SearchAnalyticsSummary {
  totalSearches: number;
  uniqueQueries: number;
  zeroResultRate: number;
  avgResultCount: number;
  avgLatencyMs: number;
  topQueries: { query: string; count: number; avgResultCount: number }[];
  zeroResultQueries: { query: string; count: number }[];
  sourceBreakdown: Record<string, number>;
  clickThroughRate: number;
  conversionRate: number;
  recentSearches: {
    query: string;
    resultCount: number;
    source: string;
    createdAt: Date;
  }[];
}

/**
 * SearchAnalyticsService — Logs and aggregates all search interaction data.
 * Tracks: queries, intents, result counts, latency, click-throughs, conversions.
 */
@Injectable()
export class SearchAnalyticsService {
  private readonly logger = new Logger(SearchAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a search event (non-blocking — fire and forget).
   */
  async logSearchEvent(dto: SearchEventDto): Promise<void> {
    try {
      await this.prisma.searchAnalyticsEvent.create({
        data: {
          query: dto.query.slice(0, 500),
          userId: dto.userId || null,
          sessionId: dto.sessionId || null,
          resultCount: dto.resultCount,
          topProductId: dto.topProductId || null,
          intentJson: dto.intentJson || null,
          latencyMs: dto.latencyMs,
          source: dto.source,
        },
      });
    } catch (e: any) {
      this.logger.warn(`Failed to log search analytics event: ${e.message}`);
    }
  }

  /**
   * Track a click event on a search result product.
   */
  async trackClick(query: string, userId?: string): Promise<void> {
    try {
      // Find the most recent matching event and mark didClick = true
      const event = await this.prisma.searchAnalyticsEvent.findFirst({
        where: {
          query: { contains: query.slice(0, 100) },
          userId: userId || null,
          didClick: false,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (event) {
        await this.prisma.searchAnalyticsEvent.update({
          where: { id: event.id },
          data: { didClick: true },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Failed to track search click: ${e.message}`);
    }
  }

  /**
   * Track a conversion event (purchase) from a search session.
   */
  async trackConversion(query: string, userId?: string): Promise<void> {
    try {
      const event = await this.prisma.searchAnalyticsEvent.findFirst({
        where: {
          query: { contains: query.slice(0, 100) },
          userId: userId || null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (event) {
        await this.prisma.searchAnalyticsEvent.update({
          where: { id: event.id },
          data: { didClick: true, didConvert: true },
        });
      }
    } catch (e: any) {
      this.logger.warn(`Failed to track search conversion: ${e.message}`);
    }
  }

  /**
   * Generate full search analytics summary for the admin dashboard.
   * Looks at last 30 days of events.
   */
  async getAnalyticsSummary(): Promise<SearchAnalyticsSummary> {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [allEvents, recentRaw] = await Promise.all([
      this.prisma.searchAnalyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          query: true,
          resultCount: true,
          didClick: true,
          didConvert: true,
          latencyMs: true,
          source: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.searchAnalyticsEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          query: true,
          resultCount: true,
          source: true,
          createdAt: true,
        },
      }),
    ]);

    const totalSearches = allEvents.length;
    if (totalSearches === 0) {
      return this.emptyAnalytics();
    }

    // Aggregate by query
    const queryMap = new Map<string, { count: number; totalResults: number }>();
    for (const e of allEvents) {
      const existing = queryMap.get(e.query) || { count: 0, totalResults: 0 };
      queryMap.set(e.query, {
        count: existing.count + 1,
        totalResults: existing.totalResults + e.resultCount,
      });
    }

    const queryEntries = Array.from(queryMap.entries());
    const topQueries = queryEntries
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([query, data]) => ({
        query,
        count: data.count,
        avgResultCount: Math.round(data.totalResults / data.count),
      }));

    const zeroResultQueries = queryEntries
      .filter(([_, data]) => data.totalResults === 0)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([query, data]) => ({ query, count: data.count }));

    // Source breakdown
    const sourceBreakdown: Record<string, number> = {};
    for (const e of allEvents) {
      sourceBreakdown[e.source] = (sourceBreakdown[e.source] || 0) + 1;
    }

    const zeroResultCount = allEvents.filter((e) => e.resultCount === 0).length;
    const clickCount = allEvents.filter((e) => e.didClick).length;
    const conversionCount = allEvents.filter((e) => e.didConvert).length;
    const totalLatency = allEvents.reduce((sum, e) => sum + e.latencyMs, 0);
    const totalResults = allEvents.reduce((sum, e) => sum + e.resultCount, 0);

    return {
      totalSearches,
      uniqueQueries: queryMap.size,
      zeroResultRate: parseFloat(
        ((zeroResultCount / totalSearches) * 100).toFixed(1),
      ),
      avgResultCount: parseFloat((totalResults / totalSearches).toFixed(1)),
      avgLatencyMs: parseFloat((totalLatency / totalSearches).toFixed(0)),
      topQueries,
      zeroResultQueries,
      sourceBreakdown,
      clickThroughRate: parseFloat(
        ((clickCount / totalSearches) * 100).toFixed(1),
      ),
      conversionRate: parseFloat(
        ((conversionCount / totalSearches) * 100).toFixed(1),
      ),
      recentSearches: recentRaw,
    };
  }

  private emptyAnalytics(): SearchAnalyticsSummary {
    return {
      totalSearches: 0,
      uniqueQueries: 0,
      zeroResultRate: 0,
      avgResultCount: 0,
      avgLatencyMs: 0,
      topQueries: [],
      zeroResultQueries: [],
      sourceBreakdown: {},
      clickThroughRate: 0,
      conversionRate: 0,
      recentSearches: [],
    };
  }
}
