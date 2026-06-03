import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';
import { RecommendationOrchestratorService } from './recommendation-orchestrator.service';
import { RecommendationEmbeddingAdapter } from './interfaces/recommendation-embedding-adapter.interface';
import { RecommendationPrompts } from './prompt-builders/recommendation-prompts';
import { RelatedProductsEngine } from './engines/related-products.engine';
import { CompleteTheLookEngine } from './engines/complete-the-look.engine';
import { PersonalizedRecommendationsEngine } from './engines/personalized-recommendations.engine';
import { TrendingProductsEngine } from './engines/trending-products.engine';
import { FrequentlyBoughtTogetherEngine } from './engines/frequently-bought-together.engine';
import { StyleAffinityEngine } from './engines/style-affinity.engine';
import { SmartCrossSellEngine } from './engines/smart-cross-sell.engine';
import { OutfitCompatibilityEngine } from './engines/outfit-compatibility.engine';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [RecommendationsController],
  providers: [
    RecommendationPrompts,
    RecommendationEmbeddingAdapter,
    RelatedProductsEngine,
    CompleteTheLookEngine,
    PersonalizedRecommendationsEngine,
    TrendingProductsEngine,
    FrequentlyBoughtTogetherEngine,
    StyleAffinityEngine,
    SmartCrossSellEngine,
    OutfitCompatibilityEngine,
    RecommendationsService,
    RecommendationOrchestratorService,
  ],
  exports: [RecommendationOrchestratorService, RecommendationsService],
})
export class RecommendationsModule {}
