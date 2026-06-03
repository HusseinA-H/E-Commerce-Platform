import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PLAN_LIMITS } from './billing.service';

export interface SaaSAnalyticsReport {
  mrr: number;
  arr: number;
  activeSubscriptionsCount: number;
  planBreakdown: Record<string, number>;
  totalTenants: number;
  recentSubscribers: Array<{
    tenantId: string;
    storeName: string;
    planCode: string;
    status: string;
    createdAt: string;
  }>;
  aiUsageAudit: Array<{
    action: string;
    totalTokens: number;
    callCount: number;
    avgLatency: number;
  }>;
}

@Injectable()
export class SaaSAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async compilePlatformAnalytics(): Promise<SaaSAnalyticsReport> {
    // 1. Fetch all tenant subscriptions
    const subscriptions = await this.prisma.tenantSubscription.findMany({
      include: {
        tenant: {
          include: { settings: true },
        },
      },
    });

    const activeSubs = subscriptions.filter((s) => s.status === 'active');
    const totalTenants = await this.prisma.tenant.count();

    // 2. Compute MRR and ARR
    let mrr = 0;
    const planBreakdown: Record<string, number> = {
      starter: 0,
      growth: 0,
      pro: 0,
      enterprise: 0,
    };

    activeSubs.forEach((sub) => {
      const plan = sub.planCode.toLowerCase();
      const planCost = PLAN_LIMITS[plan]?.priceAmount || 0;
      mrr += planCost;
      planBreakdown[plan] = (planBreakdown[plan] || 0) + 1;
    });

    const arr = mrr * 12;

    // 3. Compile recent subscribers list
    const recentSubscribers = subscriptions
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 10)
      .map((s) => ({
        tenantId: s.tenantId,
        storeName: s.tenant.settings?.storeName || s.tenant.name,
        planCode: s.planCode,
        status: s.status,
        createdAt: s.tenant.createdAt.toISOString(),
      }));

    // 4. Fetch platform-wide AI usage stats
    const telemetry = await this.prisma.aiTelemetry.findMany({
      take: 500, // sample audit logs
    });

    const aiUsageMap: Record<
      string,
      { totalTokens: number; count: number; totalLatency: number }
    > = {};
    telemetry.forEach((t) => {
      if (!aiUsageMap[t.action]) {
        aiUsageMap[t.action] = { totalTokens: 0, count: 0, totalLatency: 0 };
      }
      aiUsageMap[t.action].totalTokens += t.totalTokens;
      aiUsageMap[t.action].count++;
      aiUsageMap[t.action].totalLatency += t.latencySeconds;
    });

    const aiUsageAudit = Object.entries(aiUsageMap).map(([action, stats]) => ({
      action,
      totalTokens: stats.totalTokens,
      callCount: stats.count,
      avgLatency: Number((stats.totalLatency / stats.count).toFixed(3)),
    }));

    return {
      mrr,
      arr,
      activeSubscriptionsCount: activeSubs.length,
      planBreakdown,
      totalTenants,
      recentSubscribers,
      aiUsageAudit,
    };
  }
}
