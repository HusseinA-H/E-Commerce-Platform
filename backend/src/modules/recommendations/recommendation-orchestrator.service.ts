import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { RecommendationsService } from './recommendations.service';
import { RelatedProductsEngine } from './engines/related-products.engine';
import { CompleteTheLookEngine } from './engines/complete-the-look.engine';
import { PersonalizedRecommendationsEngine } from './engines/personalized-recommendations.engine';
import { TrendingProductsEngine } from './engines/trending-products.engine';
import { FrequentlyBoughtTogetherEngine } from './engines/frequently-bought-together.engine';
import { StyleAffinityEngine } from './engines/style-affinity.engine';
import { SmartCrossSellEngine } from './engines/smart-cross-sell.engine';
import { OutfitCompatibilityEngine } from './engines/outfit-compatibility.engine';

@Injectable()
export class RecommendationOrchestratorService {
  private readonly logger = new Logger(RecommendationOrchestratorService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly dbService: RecommendationsService,
    private readonly relatedEngine: RelatedProductsEngine,
    private readonly completeEngine: CompleteTheLookEngine,
    private readonly personalEngine: PersonalizedRecommendationsEngine,
    private readonly trendingEngine: TrendingProductsEngine,
    private readonly boughtTogetherEngine: FrequentlyBoughtTogetherEngine,
    private readonly styleEngine: StyleAffinityEngine,
    private readonly crossSellEngine: SmartCrossSellEngine,
    private readonly compatEngine: OutfitCompatibilityEngine,
  ) {}

  async getRelatedProducts(productId: string, userId?: string): Promise<any[]> {
    const cacheKey = `recommendations:related:${productId}`;
    let result = await this.redisService.get<any[]>(cacheKey);

    if (!result) {
      result = await this.relatedEngine.getRecommendations(productId);
      await this.redisService.set(cacheKey, result, 3600);
    }

    this.recordImpressions(result, 'related', userId);
    return result;
  }

  async getCompleteTheLook(productId: string, userId?: string): Promise<any[]> {
    const cacheKey = `recommendations:complete:${productId}`;
    let result = await this.redisService.get<any[]>(cacheKey);

    if (!result) {
      result = await this.completeEngine.getRecommendations(productId);
      await this.redisService.set(cacheKey, result, 3600);
    }

    const products = result.map((r) => r.product);
    this.recordImpressions(products, 'complete_the_look', userId);
    return result;
  }

  async getPersonalizedRecommendations(userId: string): Promise<any[]> {
    const cacheKey = `recommendations:personalized:${userId}`;
    let result = await this.redisService.get<any[]>(cacheKey);

    if (!result) {
      await this.styleEngine.getOrComputeUserProfile(userId);
      result = await this.personalEngine.getRecommendations(userId);
      await this.redisService.set(cacheKey, result, 1800);
    }

    this.recordImpressions(result, 'personalized', userId);
    return result;
  }

  async getTrendingProducts(userId?: string): Promise<any[]> {
    const cacheKey = 'recommendations:trending';
    let result = await this.redisService.get<any[]>(cacheKey);

    if (!result) {
      result = await this.trendingEngine.getRecommendations();
      await this.redisService.set(cacheKey, result, 7200);
    }

    this.recordImpressions(result, 'trending', userId);
    return result;
  }

  async getFrequentlyBoughtTogether(
    productId: string,
    userId?: string,
  ): Promise<any[]> {
    const cacheKey = `recommendations:bought_together:${productId}`;
    let result = await this.redisService.get<any[]>(cacheKey);

    if (!result) {
      result = await this.boughtTogetherEngine.getRecommendations(productId);
      await this.redisService.set(cacheKey, result, 14400);
    }

    this.recordImpressions(result, 'bought_together', userId);
    return result;
  }

  async getSmartCrossSells(productId: string, userId?: string): Promise<any[]> {
    const cacheKey = `recommendations:cross:${productId}`;
    let result = await this.redisService.get<any[]>(cacheKey);

    if (!result) {
      result = await this.crossSellEngine.getRecommendations(productId);
      await this.redisService.set(cacheKey, result, 14400);
    }

    this.recordImpressions(result, 'cross_sell', userId);
    return result;
  }

  async getStyleProfile(userId: string): Promise<any> {
    const cacheKey = `recommendations:profile:${userId}`;
    let result = await this.redisService.get<any>(cacheKey);

    if (!result) {
      result = await this.styleEngine.getOrComputeUserProfile(userId);
      await this.redisService.set(cacheKey, result, 86400);
    }

    return result;
  }

  async getProductCompatibility(
    productAId: string,
    productBId: string,
  ): Promise<any> {
    const [first, second] =
      productAId < productBId
        ? [productAId, productBId]
        : [productBId, productAId];
    const cacheKey = `recommendations:compat:${first}:${second}`;
    let result = await this.redisService.get<any>(cacheKey);

    if (!result) {
      result = await this.compatEngine.getCompatibility(first, second);
      await this.redisService.set(cacheKey, result, 86400);
    }

    return result;
  }

  private recordImpressions(
    products: any[],
    engineType: string,
    userId?: string,
  ) {
    if (!products || products.length === 0) return;
    Promise.all(
      products.map((p) =>
        this.dbService
          .recordEvent(p.id, engineType, 'impression', userId)
          .catch((err) =>
            this.logger.debug(`Failed to log impression: ${err.message}`),
          ),
      ),
    );
  }
}
