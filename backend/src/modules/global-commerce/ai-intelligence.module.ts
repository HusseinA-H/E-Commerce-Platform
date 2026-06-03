import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AiModule } from '../ai/ai.module';

import { AiPricingService } from './services/pricing.service';
import { AiForecastingService } from './services/forecasting.service';
import { AiTrendMerchandisingService } from './services/trend-merchandising.service';
import { AiCustomerFraudService } from './services/customer-fraud.service';
import { AiCampaignService } from './services/campaign.service';
import { AiExecutiveService } from './services/executive.service';
import { AiIntelligenceProcessor } from './ai-intelligence.processor';
import { AiIntelligenceController } from './ai-intelligence.controller';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AiModule,
    BullModule.registerQueue({
      name: 'ai-intelligence',
    }),
  ],
  controllers: [AiIntelligenceController],
  providers: [
    AiPricingService,
    AiForecastingService,
    AiTrendMerchandisingService,
    AiCustomerFraudService,
    AiCampaignService,
    AiExecutiveService,
    AiIntelligenceProcessor,
  ],
  exports: [
    AiPricingService,
    AiForecastingService,
    AiTrendMerchandisingService,
    AiCustomerFraudService,
    AiCampaignService,
    AiExecutiveService,
  ],
})
export class AiIntelligenceModule {}
