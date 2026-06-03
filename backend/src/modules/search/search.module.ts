import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';

// Adapters
import { TextEmbeddingProvider } from './adapters/text-embedding.provider';
import { InMemoryVectorAdapter } from './adapters/in-memory-vector.adapter';

// Services
import { RankingService } from './ranking.service';
import { SearchAnalyticsService } from './search-analytics.service';
import { VisualSearchService } from './visual-search.service';
import { SearchRetrievalService } from './search-retrieval.service';

// Controller
import { SearchController } from './search.controller';

/**
 * SearchModule — Phase F: AI Search, Discovery & Retrieval Platform
 *
 * Exports:
 *   - SearchRetrievalService (for cross-module retrieval use)
 *   - SearchAnalyticsService (for order/recommendation modules to log conversions)
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    RedisModule,
    AiModule, // Provides AiTelemetryService
  ],
  controllers: [SearchController],
  providers: [
    // Vector Abstraction Layer (F.3)
    TextEmbeddingProvider,
    InMemoryVectorAdapter,

    // Search Services (F.1, F.2, F.4, F.5, F.6, F.7, F.8)
    RankingService,
    SearchAnalyticsService,
    VisualSearchService,
    SearchRetrievalService,
  ],
  exports: [SearchRetrievalService, SearchAnalyticsService],
})
export class SearchModule {}
