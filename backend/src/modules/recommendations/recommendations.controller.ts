import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationOrchestratorService } from './recommendation-orchestrator.service';
import { RecommendationsService } from './recommendations.service';
import { TrendingProductsEngine } from './engines/trending-products.engine';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/user.decorator';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(
    private readonly orchestrator: RecommendationOrchestratorService,
    private readonly dbService: RecommendationsService,
    private readonly trendingEngine: TrendingProductsEngine,
  ) {}

  @Get('related/:productId')
  @ApiOperation({
    summary: 'Retrieve related items based on tags and category',
  })
  async getRelated(
    @Param('productId') productId: string,
    @Query('userId') userId?: string,
  ) {
    return this.orchestrator.getRelatedProducts(productId, userId);
  }

  @Get('complete-the-look/:productId')
  @ApiOperation({
    summary:
      'Retrieve complete activewear outfit coordinates matching source item',
  })
  async getCompleteLook(
    @Param('productId') productId: string,
    @Query('userId') userId?: string,
  ) {
    return this.orchestrator.getCompleteTheLook(productId, userId);
  }

  @Get('personalized')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Retrieve personalized style coordinates based on user profile history',
  })
  async getPersonalized(@CurrentUser() user: RequestUser) {
    return this.orchestrator.getPersonalizedRecommendations(user.id);
  }

  @Get('trending')
  @ApiOperation({
    summary: 'Retrieve trending products with high conversion velocity',
  })
  async getTrending(@Query('userId') userId?: string) {
    return this.orchestrator.getTrendingProducts(userId);
  }

  @Get('bought-together/:productId')
  @ApiOperation({
    summary: 'Retrieve product bundles frequently purchased together',
  })
  async getBoughtTogether(
    @Param('productId') productId: string,
    @Query('userId') userId?: string,
  ) {
    return this.orchestrator.getFrequentlyBoughtTogether(productId, userId);
  }

  @Get('cross-sell/:productId')
  @ApiOperation({
    summary: 'Retrieve accessories or bags coordinates to cross-sell',
  })
  async getCrossSells(
    @Param('productId') productId: string,
    @Query('userId') userId?: string,
  ) {
    return this.orchestrator.getSmartCrossSells(productId, userId);
  }

  @Get('style-profile')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve user activewear style DNA profile' })
  async getStyleProfile(@CurrentUser() user: RequestUser) {
    return this.orchestrator.getStyleProfile(user.id);
  }

  @Get('compatibility/:productAId/:productBId')
  @ApiOperation({
    summary: 'Compute coordinate style compatibility between two garments',
  })
  async getCompatibility(
    @Param('productAId') productAId: string,
    @Param('productBId') productBId: string,
  ) {
    return this.orchestrator.getProductCompatibility(productAId, productBId);
  }

  @Post('event')
  @ApiOperation({
    summary: 'Log a recommendation CTR click or transaction event',
  })
  async logEvent(
    @Body('productId') productId: string,
    @Body('engineType') engineType: string,
    @Body('eventType') eventType: string,
    @Body('userId') userId?: string,
  ) {
    return this.dbService.recordEvent(productId, engineType, eventType, userId);
  }

  @Post('feedback')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Log direct thumbs up/down user feedback' })
  async logFeedback(
    @Body('productId') productId: string,
    @Body('feedbackType') feedbackType: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.dbService.recordFeedback(productId, feedbackType, user.id);
  }

  @Get('admin/analytics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary:
      'Fetch AI Recommendation platform telemetry analytics (Admin only)',
  })
  async getAdminAnalytics() {
    return this.dbService.getAdminAnalytics();
  }

  @Post('admin/warm-trending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Re-compute daily trending velocity snapshots (Admin only)',
  })
  async warmTrendingSnapshots() {
    await this.trendingEngine.computeAndSaveTrendingSnapshots();
    return { success: true, message: 'Trending snapshot cached.' };
  }
}
