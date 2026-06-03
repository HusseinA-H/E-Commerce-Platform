import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('sales')
  @ApiOperation({
    summary:
      'Get business analytics sales, traffic, and category chart records',
  })
  async getSalesOverview() {
    return this.analyticsService.getSalesOverview();
  }

  @Get('ai-insights')
  @ApiOperation({
    summary: 'Get Groq-powered natural language executive briefing summaries',
  })
  async getAIInsights() {
    return this.analyticsService.getAIInsights();
  }
}
