import { Controller, Get, Post, Body, Inject } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { AiPricingService } from './services/pricing.service';
import { AiForecastingService } from './services/forecasting.service';
import { AiCustomerFraudService } from './services/customer-fraud.service';
import { AiCampaignService } from './services/campaign.service';
import { AiExecutiveService } from './services/executive.service';
import { AiTrendMerchandisingService } from './services/trend-merchandising.service';

@Controller('ai-intelligence')
export class AiIntelligenceController {
  constructor(
    private readonly redis: RedisService,
    private readonly pricingService: AiPricingService,
    private readonly forecastingService: AiForecastingService,
    private readonly customerFraudService: AiCustomerFraudService,
    private readonly campaignService: AiCampaignService,
    private readonly executiveService: AiExecutiveService,
    private readonly trendService: AiTrendMerchandisingService,
    @InjectQueue('ai-intelligence') private readonly queue: Queue,
  ) {}

  @Get('executive')
  async getExecutiveDashboard() {
    const cached = await this.redis.get<any>('ai:executive-dashboard');
    if (cached) return { ...cached, cached: true };

    const report = await this.executiveService.compileExecutiveDashboard();
    await this.redis.set('ai:executive-dashboard', report, 86400);
    return { ...report, cached: false };
  }

  @Get('pricing')
  async getPricingAdvice() {
    const cached = await this.redis.get<any>('ai:pricing-recommendations');
    if (cached) return { pricingAdvice: cached, cached: true };

    const advice = await this.pricingService.generatePricingRecommendations();
    await this.redis.set('ai:pricing-recommendations', advice, 86400);
    return { pricingAdvice: advice, cached: false };
  }

  @Get('forecasting')
  async getForecasts() {
    const cached = await this.redis.get<any>('ai:demand-forecasting');
    if (cached) return { ...cached, cached: true };

    const forecasts = await this.forecastingService.generateGlobalForecasting();
    await this.redis.set('ai:demand-forecasting', forecasts, 86400);
    return { ...forecasts, cached: false };
  }

  @Get('segmentation')
  async getCustomerSegmentation() {
    const cached = await this.redis.get<any>('ai:customer-segmentation');
    if (cached) return { customerSegments: cached, cached: true };

    const segments = await this.customerFraudService.segmentCustomers();
    await this.redis.set('ai:customer-segmentation', segments, 86400);
    return { customerSegments: segments, cached: false };
  }

  @Get('fraud')
  async getFraudAnalysis() {
    const cached = await this.redis.get<any>('ai:fraud-analysis');
    if (cached) return { fraudLog: cached, cached: true };

    const fraudLogs = await this.customerFraudService.auditFraudRisk();
    await this.redis.set('ai:fraud-analysis', fraudLogs, 86400);
    return { fraudLog: fraudLogs, cached: false };
  }

  @Get('trends')
  async getTrendReport() {
    const cached = await this.redis.get<any>('ai:trend-intelligence');
    if (cached) return { ...cached, cached: true };

    const trends =
      await this.trendService.generateTrendAndMerchandisingReport();
    await this.redis.set('ai:trend-intelligence', trends, 86400);
    return { ...trends, cached: false };
  }

  @Post('campaign')
  async generateCampaign(
    @Body()
    body: {
      campaignName: string;
      targetAudience: string;
      promotedProducts: string[];
      incentiveDescription: string;
    },
  ) {
    return this.campaignService.generateCampaignCopy(body);
  }

  @Post('refresh')
  async triggerRefresh() {
    const job = await this.queue.add('ai-intelligence-refresh', {});
    return {
      queued: true,
      jobId: job.id,
      message: 'Asynchronous AI Intelligence re-computation scheduled.',
    };
  }
}
