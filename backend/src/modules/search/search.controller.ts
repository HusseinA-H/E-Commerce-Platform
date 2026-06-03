import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { SearchRetrievalService } from './search-retrieval.service';
import { VisualSearchService } from './visual-search.service';
import { SearchAnalyticsService } from './search-analytics.service';

import { IsNotEmpty, IsString, IsUrl, IsIn } from 'class-validator';

class VisualSearchDto {
  @IsNotEmpty()
  @IsString()
  @IsUrl()
  imageUrl: string;
}

class TrackSearchDto {
  @IsNotEmpty()
  @IsString()
  query: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['click', 'convert'])
  type: 'click' | 'convert';
}

/**
 * SearchController — Exposes Phase F search, discovery, and analytics endpoints.
 *
 * Public endpoints (no auth required):
 *   GET  /search                  — Full semantic + personalized retrieval
 *   GET  /search/autocomplete     — Fast intent-aware suggestion list
 *   POST /search/visual           — Visual product search by image URL
 *   GET  /search/trending         — AI-ranked trending products
 *   POST /search/track            — Track search click/conversion events
 *
 * Admin endpoints (JWT + admin role required):
 *   GET  /search/analytics        — 30-day search intelligence summary
 *   POST /search/index/rebuild    — Trigger vector index rebuild
 */
@Controller('search')
export class SearchController {
  private readonly logger = new Logger(SearchController.name);

  constructor(
    private readonly searchService: SearchRetrievalService,
    private readonly visualSearchService: VisualSearchService,
    private readonly analyticsService: SearchAnalyticsService,
  ) {}

  /**
   * F.1, F.2, F.6 — Full AI semantic search with personalization
   * GET /search?q=luxury+black+hoodie&userId=xxx&sessionId=yyy
   */
  @Get()
  async search(
    @Query('q') query: string = '',
    @Query('userId') userId?: string,
    @Query('sessionId') sessionId?: string,
    @Req() req?: any,
  ) {
    // Resolve userId from JWT token if available (optional auth)
    const resolvedUserId = userId || req?.user?.id;
    return this.searchService.search(query, resolvedUserId, sessionId);
  }

  /**
   * F.1 — Fast semantic autocomplete suggestions
   * GET /search/autocomplete?q=cold+weat
   */
  @Get('autocomplete')
  async autocomplete(@Query('q') partial: string = '') {
    return this.searchService.autocomplete(partial);
  }

  /**
   * F.4 — Visual product search by image URL
   * POST /search/visual
   * Body: { imageUrl: string }
   */
  @Post('visual')
  @HttpCode(HttpStatus.OK)
  async visualSearch(@Body() dto: VisualSearchDto, @Req() req?: any) {
    const userId = req?.user?.id;
    return this.visualSearchService.search(dto.imageUrl, userId);
  }

  /**
   * F.5 — AI-ranked trending products
   * GET /search/trending?limit=12
   */
  @Get('trending')
  async trending(@Query('limit') limit = '12') {
    return this.searchService.getTrending(Math.min(Number(limit) || 12, 24));
  }

  /**
   * F.7 — Track search result interactions (click or conversion)
   * POST /search/track
   * Body: { query: string, type: 'click' | 'convert' }
   */
  @Post('track')
  @HttpCode(HttpStatus.NO_CONTENT)
  async track(@Body() dto: TrackSearchDto, @Req() req?: any) {
    const userId = req?.user?.id;
    if (dto.type === 'convert') {
      void this.analyticsService.trackConversion(dto.query, userId);
    } else {
      void this.analyticsService.trackClick(dto.query, userId);
    }
  }

  /**
   * F.7 — Admin: Full search intelligence analytics summary
   * GET /search/analytics (Admin only)
   */
  @Get('analytics')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async analytics() {
    return this.analyticsService.getAnalyticsSummary();
  }

  /**
   * F.3 — Admin: Rebuild the product vector index
   * POST /search/index/rebuild (Admin only)
   */
  @Post('index/rebuild')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async rebuildIndex() {
    return this.searchService.buildProductIndex();
  }
}
