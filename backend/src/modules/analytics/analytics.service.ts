import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private aiService: AiService,
  ) {}

  async getAIInsights() {
    const cacheKey = 'analytics:ai-insights';
    const cached = await this.redisService.get<string>(cacheKey);
    if (cached) {
      return { insights: cached, source: 'cache' };
    }

    const [
      totalOrders,
      totalRevenueData,
      lowStockProducts,
      outOfStockProducts,
      categoryDistributionData,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'paid' },
        _sum: { total: true },
        _avg: { total: true },
      }),
      this.prisma.product.findMany({
        where: { deletedAt: null, inventoryStatus: 'LOW_STOCK' },
        select: { name: true, stockQuantity: true, sku: true },
      }),
      this.prisma.product.findMany({
        where: { deletedAt: null, inventoryStatus: 'OUT_OF_STOCK' },
        select: { name: true, sku: true },
      }),
      this.getSalesOverview(),
    ]);

    const lowStockList =
      lowStockProducts
        .map(
          (p) =>
            `- ${p.name} (${p.sku || 'N/A'}): ${p.stockQuantity} remaining`,
        )
        .join('\n') || 'None';
    const outOfStockList =
      outOfStockProducts
        .map((p) => `- ${p.name} (${p.sku || 'N/A'})`)
        .join('\n') || 'None';
    const categoryBreakdownList =
      categoryDistributionData.categoryDistribution
        .map((c) => `- ${c.name}: ${c.value} items sold (${c.percentage}%)`)
        .join('\n') || 'None';

    const telemetryData = `
Total Orders Placed: ${totalOrders}
Total Business Revenue: $${(totalRevenueData._sum.total || 0).toFixed(2)}
Average Order Value: $${(totalRevenueData._avg.total || 0).toFixed(2)}

Category Sales Performance:
${categoryBreakdownList}

Out Of Stock Products:
${outOfStockList}

Low Stock Alerts:
${lowStockList}
`;

    const insights =
      await this.aiService.generateAnalyticsInsights(telemetryData);
    await this.redisService.set(cacheKey, insights, 1800); // 30 minutes cache

    return { insights, source: 'groq_api' };
  }

  async getSalesOverview() {
    // 1. Fetch sales aggregate data grouped by month
    const paidOrders = await this.prisma.order.findMany({
      where: { paymentStatus: 'paid' },
      select: { total: true, createdAt: true },
    });

    const monthlySales: Record<string, number> = {
      Jan: 0,
      Feb: 0,
      Mar: 0,
      Apr: 0,
      May: 0,
      Jun: 0,
      Jul: 0,
      Aug: 0,
      Sep: 0,
      Oct: 0,
      Nov: 0,
      Dec: 0,
    };

    paidOrders.forEach((order) => {
      const monthName = order.createdAt.toLocaleString('default', {
        month: 'short',
      });
      if (monthlySales[monthName] !== undefined) {
        monthlySales[monthName] += order.total;
      }
    });

    const chartData = Object.keys(monthlySales).map((month) => ({
      label: month.toUpperCase(),
      value: Number(monthlySales[month].toFixed(2)),
    }));

    // 2. Fetch sales by product category
    const orderItems = await this.prisma.orderItem.findMany({
      where: { order: { paymentStatus: 'paid' } },
      include: {
        product: { select: { category: { select: { name: true } } } },
      },
    });

    const categoryDistribution: Record<string, number> = {};
    let totalItemsQuantity = 0;

    orderItems.forEach((item) => {
      const categoryName = item.product?.category?.name || 'Uncategorized';
      categoryDistribution[categoryName] =
        (categoryDistribution[categoryName] || 0) + item.quantity;
      totalItemsQuantity += item.quantity;
    });

    const distributionData = Object.keys(categoryDistribution).map((name) => ({
      name,
      value: categoryDistribution[name],
      percentage: Number(
        ((categoryDistribution[name] / totalItemsQuantity) * 100).toFixed(1),
      ),
    }));

    // 3. Traffic sources analytics (standard mock dataset)
    const trafficSources = [
      { source: 'Direct', visitors: 14200, conversionRate: 3.2 },
      { source: 'Organic Search', visitors: 28400, conversionRate: 2.8 },
      { source: 'Social Media', visitors: 9800, conversionRate: 1.9 },
      { source: 'Referrals', visitors: 4500, conversionRate: 4.1 },
    ];

    return {
      monthlySales: chartData,
      categoryDistribution: distributionData,
      trafficSources,
    };
  }
}
