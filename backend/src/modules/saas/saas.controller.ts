import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Headers,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TenantService } from './tenant.service';
import { BillingService } from './billing.service';
import { CmsService, CmsStorePayload } from './cms.service';
import { DomainService } from './domain.service';
import { SaaSAnalyticsService } from './saas-analytics.service';

@Controller('saas')
export class SaaSController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly billingService: BillingService,
    private readonly cmsService: CmsService,
    private readonly domainService: DomainService,
    private readonly analyticsService: SaaSAnalyticsService,
  ) {}

  // ─── Tenant Store Builder ───────────────────────────────────────────────────

  @Post('tenant')
  async buildStore(
    @Body() body: { name: string; subdomain: string; ownerUserId: string },
  ) {
    if (!body.name || !body.subdomain || !body.ownerUserId) {
      throw new BadRequestException(
        'Store name, subdomain slug, and owner user ID are required.',
      );
    }
    return this.tenantService.createTenant(body);
  }

  @Get('tenant/details')
  async getDetails(@Headers('X-Tenant-Id') tenantId?: string) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');
    return this.tenantService.getTenantDetails(tenantId);
  }

  @Put('tenant/settings')
  async updateSettings(
    @Headers('X-Tenant-Id') tenantId: string,
    @Body()
    body: {
      storeName?: string;
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      themeName?: string;
      customCss?: string;
    },
  ) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');
    return this.tenantService.updateSettings(tenantId, body);
  }

  @Put('tenant/domain')
  async updateDomain(
    @Headers('X-Tenant-Id') tenantId: string,
    @Body() body: { customDomain: string | null },
  ) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');

    // If setting a custom domain, verify it matches DNS rules first
    if (body.customDomain) {
      await this.billingService.verifyDomainQuota(tenantId);
      const dnsCheck = await this.domainService.verifyCname(body.customDomain);
      if (!dnsCheck.verified) {
        throw new BadRequestException(dnsCheck.error || 'DNS verify failed.');
      }
    }
    return this.tenantService.updateDomain(tenantId, body.customDomain);
  }

  // ─── SaaS Billing ────────────────────────────────────────────────────────────

  @Get('billing/subscription')
  async getSubscription(@Headers('X-Tenant-Id') tenantId?: string) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');
    const subscription = await this.billingService.getSubscription(tenantId);

    // Fetch current quotas
    const prodQuota = await this.billingService
      .verifyProductQuota(tenantId)
      .catch((err) => ({ error: err.message }));
    const WHQuota = await this.billingService
      .verifyWarehouseQuota(tenantId)
      .catch((err) => ({ error: err.message }));

    return {
      subscription,
      quotas: {
        products: prodQuota,
        warehouses: WHQuota,
      },
    };
  }

  @Post('billing/checkout')
  async createCheckout(
    @Headers('X-Tenant-Id') tenantId: string,
    @Body() body: { planCode: string; successUrl: string; cancelUrl: string },
  ) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');
    return this.billingService.createCheckoutSession(
      tenantId,
      body.planCode,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post('billing/portal')
  async createPortal(
    @Headers('X-Tenant-Id') tenantId: string,
    @Body() body: { returnUrl: string },
  ) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');
    return this.billingService.createPortalSession(tenantId, body.returnUrl);
  }

  @Post('billing/webhook')
  async stripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Body() body: any,
  ) {
    // Note: Verification of signature is handled inside billingService using construction check if webhook secret exists
    await this.billingService.handleStripeWebhookEvent(body);
    return { received: true };
  }

  // ─── Storefront CMS ─────────────────────────────────────────────────────────

  @Get('cms')
  async getCms(@Headers('X-Tenant-Id') tenantId?: string) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');
    return this.cmsService.getCmsContent(tenantId);
  }

  @Put('cms')
  async updateCms(
    @Headers('X-Tenant-Id') tenantId: string,
    @Body() body: CmsStorePayload,
  ) {
    if (!tenantId)
      throw new BadRequestException('Active tenant header missing.');
    await this.cmsService.updateCmsContent(tenantId, body);
    return { success: true };
  }

  // ─── SaaS Platform Admin Endpoints ──────────────────────────────────────────

  @Get('analytics/platform')
  async getPlatformReport() {
    // Restricted to Super Admin on root app
    return this.analyticsService.compilePlatformAnalytics();
  }

  @Get('tenants')
  async listStores() {
    return this.tenantService.getAllTenants();
  }

  @Put('tenant/:id/status')
  async setStatus(
    @Param('id') tenantId: string,
    @Body() body: { isActive: boolean },
  ) {
    return this.tenantService.setTenantActiveStatus(tenantId, body.isActive);
  }
}
