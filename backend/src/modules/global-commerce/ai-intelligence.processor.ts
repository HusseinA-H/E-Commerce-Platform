import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { RedisService } from '../redis/redis.service';
import { AiExecutiveService } from './services/executive.service';
import { AiPricingService } from './services/pricing.service';
import { AiForecastingService } from './services/forecasting.service';
import { AiCustomerFraudService } from './services/customer-fraud.service';
import { AiTrendMerchandisingService } from './services/trend-merchandising.service';

@Processor('ai-intelligence')
export class AiIntelligenceProcessor extends WorkerHost {
  private readonly logger = new Logger(AiIntelligenceProcessor.name);

  constructor(
    private readonly redis: RedisService,
    private readonly executiveService: AiExecutiveService,
    private readonly pricingService: AiPricingService,
    private readonly forecastingService: AiForecastingService,
    private readonly customerFraudService: AiCustomerFraudService,
    private readonly trendService: AiTrendMerchandisingService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(
      `[AI Intelligence Processor] Starting analytics computation [JobId: ${job.id}]`,
    );

    try {
      // 1. Run Executive summary
      this.logger.log('Calculating executive dashboard...');
      const execReport =
        await this.executiveService.compileExecutiveDashboard();
      await this.redis.set('ai:executive-dashboard', execReport, 86400);

      // 2. Run Pricing analysis
      this.logger.log('Calculating dynamic pricing recommendations...');
      const pricingAdvice =
        await this.pricingService.generatePricingRecommendations();
      await this.redis.set('ai:pricing-recommendations', pricingAdvice, 86400);

      // 3. Run Forecasts
      this.logger.log('Calculating demand & inventory forecasting...');
      const forecasts =
        await this.forecastingService.generateGlobalForecasting();
      await this.redis.set('ai:demand-forecasting', forecasts, 86400);

      // 4. Run Customer segmentation
      this.logger.log('Calculating RFM customer segmentation...');
      const segments = await this.customerFraudService.segmentCustomers();
      await this.redis.set('ai:customer-segmentation', segments, 86400);

      // 5. Run Fraud risk audit
      this.logger.log('Auditing transaction fraud risk...');
      const fraudLogs = await this.customerFraudService.auditFraudRisk();
      await this.redis.set('ai:fraud-analysis', fraudLogs, 86400);

      // 6. Run Trend analysis
      this.logger.log('Calculating trend & merchandising metrics...');
      const trends =
        await this.trendService.generateTrendAndMerchandisingReport();
      await this.redis.set('ai:trend-intelligence', trends, 86400);

      this.logger.log(
        `[AI Intelligence Processor] Successfully finished all analytics. Caches updated. [JobId: ${job.id}]`,
      );
      return { status: 'completed' };
    } catch (err: any) {
      this.logger.error(
        `[AI Intelligence Processor] Job execution failed: ${err.message}`,
      );
      throw err;
    }
  }
}
