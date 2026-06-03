import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HealthService, HealthReport } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * GET /api/v1/health
   * Returns infrastructure health status.
   * Always returns 200 — callers should inspect the `status` field per service.
   */
  @Get()
  @ApiOperation({
    summary: 'Infrastructure health check',
    description:
      'Returns the live status of Database, Redis, and application. ' +
      'Always returns HTTP 200; inspect `status` fields to detect degraded services.',
  })
  check(): Promise<HealthReport> {
    return this.healthService.check();
  }
}
