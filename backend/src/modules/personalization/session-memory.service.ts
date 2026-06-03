import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class SessionMemoryService {
  constructor(private readonly redis: RedisService) {}

  async recordProductView(userId: string, productId: string): Promise<void> {
    const key = `user:${userId}:recent_views`;
    let views = await this.redis.get<string[]>(key);
    if (!views) {
      views = [];
    }
    // Filter out duplicate if it already exists and prepend to front
    views = [productId, ...views.filter((id) => id !== productId)].slice(0, 10);
    await this.redis.set(key, views, 86400 * 7); // Cache for 7 days
  }

  async getRecentProductViews(userId: string): Promise<string[]> {
    const key = `user:${userId}:recent_views`;
    return (await this.redis.get<string[]>(key)) || [];
  }

  async recordOutfitActivity(
    userId: string,
    outfitAnalysisId: string,
  ): Promise<void> {
    const key = `user:${userId}:recent_outfits`;
    let outfits = await this.redis.get<string[]>(key);
    if (!outfits) {
      outfits = [];
    }
    outfits = [
      outfitAnalysisId,
      ...outfits.filter((id) => id !== outfitAnalysisId),
    ].slice(0, 5);
    await this.redis.set(key, outfits, 86400 * 7);
  }

  async getRecentOutfits(userId: string): Promise<string[]> {
    const key = `user:${userId}:recent_outfits`;
    return (await this.redis.get<string[]>(key)) || [];
  }
}
