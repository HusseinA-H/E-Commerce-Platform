import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { MobileAnalyticsService } from './mobile-analytics.service';
import {
  CurrentUser,
  RequestUser,
} from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('mobile-analytics')
export class MobileAnalyticsController {
  constructor(private readonly analyticsService: MobileAnalyticsService) {}

  @Post('event')
  async logEvent(
    @Body()
    body: {
      eventType: string;
      deviceType: string;
      metadata?: any;
      userId?: string;
    },
  ) {
    return this.analyticsService.logEvent(
      body.userId || null,
      body.eventType,
      body.deviceType,
      body.metadata,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('metrics')
  async getMetrics(@CurrentUser() user: RequestUser) {
    return this.analyticsService.getAggregatedMetrics();
  }
}
