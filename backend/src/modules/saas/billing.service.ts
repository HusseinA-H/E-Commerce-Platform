import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

export interface PlanLimits {
  maxProducts: number;
  maxWarehouses: number;
  allowCustomDomain: boolean;
  allowAiFeatures: boolean;
  priceAmount: number;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  starter: {
    maxProducts: 100,
    maxWarehouses: 1,
    allowCustomDomain: false,
    allowAiFeatures: false,
    priceAmount: 49,
  },
  growth: {
    maxProducts: 500,
    maxWarehouses: 2,
    allowCustomDomain: true,
    allowAiFeatures: true,
    priceAmount: 149,
  },
  pro: {
    maxProducts: 2000,
    maxWarehouses: 5,
    allowCustomDomain: true,
    allowAiFeatures: true,
    priceAmount: 499,
  },
  enterprise: {
    maxProducts: 999999, // Unlimited
    maxWarehouses: 999999,
    allowCustomDomain: true,
    allowAiFeatures: true,
    priceAmount: 1999,
  },
};

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  async getSubscription(tenantId: string) {
    const sub = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
    });
    if (!sub) throw new NotFoundException('Subscription profile not found.');
    return sub;
  }

  async verifyProductQuota(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    const limits = PLAN_LIMITS[sub.planCode] || PLAN_LIMITS.starter;

    const count = await this.prisma.product.count({
      where: { tenantId, deletedAt: null },
    });

    if (count >= limits.maxProducts) {
      throw new ForbiddenException(
        `Plan quota exceeded. Your current plan (${sub.planCode.toUpperCase()}) allows a maximum of ${limits.maxProducts} active products. Please upgrade your subscription.`,
      );
    }
    return { count, max: limits.maxProducts };
  }

  async verifyWarehouseQuota(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    const limits = PLAN_LIMITS[sub.planCode] || PLAN_LIMITS.starter;

    const count = await this.prisma.warehouse.count({
      where: { tenantId, isActive: true },
    });

    if (count >= limits.maxWarehouses) {
      throw new ForbiddenException(
        `Plan quota exceeded. Your current plan (${sub.planCode.toUpperCase()}) allows a maximum of ${limits.maxWarehouses} active warehouses.`,
      );
    }
    return { count, max: limits.maxWarehouses };
  }

  async verifyDomainQuota(tenantId: string) {
    const sub = await this.getSubscription(tenantId);
    const limits = PLAN_LIMITS[sub.planCode] || PLAN_LIMITS.starter;

    if (!limits.allowCustomDomain) {
      throw new ForbiddenException(
        `Plan restriction. Custom domains are not available on the ${sub.planCode.toUpperCase()} plan. Please upgrade to Growth or Pro.`,
      );
    }
    return true;
  }

  async createCheckoutSession(
    tenantId: string,
    planCode: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { subscription: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found.');

    const cleanPlan = planCode.toLowerCase().trim();
    if (!PLAN_LIMITS[cleanPlan])
      throw new NotFoundException('Invalid SaaS plan code.');

    // Fallback if Stripe is offline/mock
    if (!this.stripeService.isConfigured) {
      // Simulate successful checkout directly in DB
      await this.prisma.tenantSubscription.update({
        where: { tenantId },
        data: {
          planCode: cleanPlan,
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
      });
      return { url: `${successUrl}?session_id=mock_session_${Date.now()}` };
    }

    const stripe = this.stripeService.getClient();

    // Map plans to Stripe product prices (dynamic creation or static mock)
    // Here we use ad-hoc checkout price creation to bypass static priceId requirements
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `APEX LUXE SaaS - ${cleanPlan.toUpperCase()} Plan`,
              description: `Maximum ${PLAN_LIMITS[cleanPlan].maxProducts} products, ${PLAN_LIMITS[cleanPlan].maxWarehouses} warehouses.`,
            },
            unit_amount: PLAN_LIMITS[cleanPlan].priceAmount * 100, // in cents
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenantId,
        planCode: cleanPlan,
      },
    });

    return { url: session.url };
  }

  async createPortalSession(tenantId: string, returnUrl: string) {
    const sub = await this.getSubscription(tenantId);

    if (!this.stripeService.isConfigured || !sub.stripeCustomerId) {
      // Fallback directly to settings return URL
      return { url: returnUrl };
    }

    const stripe = this.stripeService.getClient();
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });

    return { url: portal.url };
  }

  async handleStripeWebhookEvent(event: any) {
    const type = event.type;
    const data = event.data.object;

    if (type === 'checkout.session.completed') {
      const tenantId = data.metadata?.tenantId;
      const planCode = data.metadata?.planCode;
      const stripeSubId = data.subscription as string;
      const stripeCustId = data.customer as string;

      if (tenantId && planCode) {
        await this.prisma.tenantSubscription.update({
          where: { tenantId },
          data: {
            planCode,
            status: 'active',
            stripeSubscriptionId: stripeSubId,
            stripeCustomerId: stripeCustId,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default 30 day period
          },
        });
      }
    } else if (type === 'customer.subscription.updated') {
      const stripeSubId = data.id as string;
      const status = data.status as string;
      const periodEnd = new Date(data.current_period_end * 1000);

      await this.prisma.tenantSubscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: {
          status: status === 'active' ? 'active' : 'past_due',
          currentPeriodEnd: periodEnd,
        },
      });
    } else if (type === 'customer.subscription.deleted') {
      const stripeSubId = data.id as string;
      await this.prisma.tenantSubscription.updateMany({
        where: { stripeSubscriptionId: stripeSubId },
        data: {
          status: 'canceled',
          planCode: 'starter', // revert to starter limitations
        },
      });
    }
  }
}
