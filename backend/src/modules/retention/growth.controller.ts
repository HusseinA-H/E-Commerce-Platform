import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import {
  GrowthIntelligenceService,
  GrowthProfile,
} from './growth-intelligence.service';
import { AbandonedCartService } from './abandoned-cart.service';

@Controller('growth')
@UseGuards(JwtAuthGuard, AdminGuard)
export class GrowthController {
  constructor(
    private readonly growthIntelligence: GrowthIntelligenceService,
    private readonly abandonedCart: AbandonedCartService,
  ) {}

  /** GET /growth/intelligence/:userId — AI growth profile for a customer */
  @Get('intelligence/:userId')
  getProfile(@Param('userId') userId: string): Promise<GrowthProfile> {
    return this.growthIntelligence.getProfile(userId);
  }

  /** GET /growth/retention-analytics — Platform-wide retention analytics */
  @Get('retention-analytics')
  getRetentionAnalytics() {
    return this.growthIntelligence.getRetentionAnalytics();
  }

  /** POST /growth/scan-abandoned-carts — Manual trigger for cart scan */
  @Get('scan-abandoned-carts')
  scanAbandonedCarts() {
    return this.abandonedCart.scanAbandonedCarts();
  }
}
