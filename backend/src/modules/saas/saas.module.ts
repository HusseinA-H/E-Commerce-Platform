import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { StripeModule } from '../stripe/stripe.module';
import { TenantContext } from './tenant-context';
import { TenantService } from './tenant.service';
import { BillingService } from './billing.service';
import { CmsService } from './cms.service';
import { DomainService } from './domain.service';
import { SaaSAnalyticsService } from './saas-analytics.service';
import { SaaSController } from './saas.controller';

@Module({
  imports: [RedisModule, StripeModule],
  controllers: [SaaSController],
  providers: [
    TenantContext,
    TenantService,
    BillingService,
    CmsService,
    DomainService,
    SaaSAnalyticsService,
  ],
  exports: [
    TenantContext,
    TenantService,
    BillingService,
    CmsService,
    DomainService,
    SaaSAnalyticsService,
  ],
})
export class SaaSModule {}
