import { Module } from '@nestjs/common';
import { MobileAnalyticsService } from './mobile-analytics.service';
import { MobileAnalyticsController } from './mobile-analytics.controller';

@Module({
  controllers: [MobileAnalyticsController],
  providers: [MobileAnalyticsService],
  exports: [MobileAnalyticsService],
})
export class MobileAnalyticsModule {}
