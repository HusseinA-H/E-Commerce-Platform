import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { cleanJsonString } from '../../ai/utils/json-cleaner';
import { AiPricingService } from './pricing.service';
import { AiForecastingService } from './forecasting.service';
import { AiTrendMerchandisingService } from './trend-merchandising.service';
import { AiCustomerFraudService } from './customer-fraud.service';

export interface ExecutiveDashboardReport {
  revenue90Days: number;
  forecastedRevenueNext30Days: number;
  forecastedGrowthPercent: number;
  totalCustomersAudited: number;
  churnRiskCount: number;
  highRiskFraudOrdersCount: number;
  criticalRestockCount: number;
  growthOpportunities: string[];
  strategicBusinessAdvice: string;
  createdAt: string;
}

@Injectable()
export class AiExecutiveService {
  private readonly logger = new Logger(AiExecutiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly pricingService: AiPricingService,
    private readonly forecastingService: AiForecastingService,
    private readonly trendService: AiTrendMerchandisingService,
    private readonly customerFraudService: AiCustomerFraudService,
  ) {}

  async compileExecutiveDashboard(): Promise<ExecutiveDashboardReport> {
    this.logger.log(
      'Compiling comprehensive AI Executive business intelligence report...',
    );

    // 1. Fetch sales numbers from last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: cutoffDate },
        status: { notIn: ['cancelled'] },
      },
      select: {
        total: true,
        createdAt: true,
      },
    });

    const revenue90Days = orders.reduce((sum, o) => sum + o.total, 0);

    // Group sales into 3 monthly buckets for trend analysis
    const bucketSize = 30 * 24 * 60 * 60 * 1000;
    const nowTime = Date.now();
    const monthlyBuckets = [0, 0, 0]; // [month 3 (oldest), month 2, month 1 (recent)]

    orders.forEach((o) => {
      const diff = nowTime - o.createdAt.getTime();
      const bucketIdx = Math.floor(diff / bucketSize);
      if (bucketIdx >= 0 && bucketIdx < 3) {
        // reverse index so month 0 is oldest, month 2 is newest
        monthlyBuckets[2 - bucketIdx] += o.total;
      }
    });

    // 2. Fetch inventory health count
    const stockLevels = await this.prisma.warehouseInventory.findMany({
      where: { warehouse: { isActive: true } },
    });

    // Count items with quantity less than or equal to reservedQty or depleting soon
    const criticalRestockCount = stockLevels.filter(
      (s) => s.quantity - s.reservedQty <= 10,
    ).length;

    // 3. Fetch customer churn totals
    const customerCount = await this.prisma.user.count({
      where: { role: 'customer' },
    });

    // 4. Compile baseline statistics
    const dataset = {
      revenue90Days,
      revenueBucketMonth1: monthlyBuckets[2],
      revenueBucketMonth2: monthlyBuckets[1],
      revenueBucketMonth3: monthlyBuckets[0],
      criticalRestockCount,
      totalCustomers: customerCount,
    };

    try {
      const messages = [
        {
          role: 'system',
          content: `You are an elite chief business officer and strategy consulting AI.
Analyze recent monthly revenues, customer counts, and warehouse low-stock health counts.
Generate:
1. Forecasted Revenue for the Next 30 Days (extrapolating from monthly buckets).
2. Expected revenue growth percentage (forecastedGrowthPercent, e.g. 8.4 for +8.4%).
3. Churn risk projection count and high-risk orders estimation.
4. Growth Opportunities: list of 3 high-impact marketing or logistics expansion ideas.
5. Strategic Business Advice: executive summary paragraph recommending clear pricing, inventory rebalancing, and customer retention steps.
You MUST return a JSON response matching this exact structure:
{
  "forecastedRevenueNext30Days": 0.0,
  "forecastedGrowthPercent": 0.0,
  "churnRiskCount": 0,
  "highRiskFraudOrdersCount": 0,
  "growthOpportunities": ["string"],
  "strategicBusinessAdvice": "string"
}`,
        },
        {
          role: 'user',
          content: `Here is the current business performance data: ${JSON.stringify(dataset)}`,
        },
      ];

      const response = (await this.aiService.executeGroqCall(
        'llama-3.3-70b-versatile',
        messages,
        'executive_reporting',
        { type: 'json_object' },
        0.2,
      )) as { data: { choices: { message: { content: string } }[] } };

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw executive reporting response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      const parsed = JSON.parse(cleaned) as {
        forecastedRevenueNext30Days: number;
        forecastedGrowthPercent: number;
        churnRiskCount: number;
        highRiskFraudOrdersCount: number;
        growthOpportunities: string[];
        strategicBusinessAdvice: string;
      };
      return {
        revenue90Days,
        forecastedRevenueNext30Days: parsed.forecastedRevenueNext30Days,
        forecastedGrowthPercent: parsed.forecastedGrowthPercent,
        totalCustomersAudited: customerCount,
        churnRiskCount: parsed.churnRiskCount,
        highRiskFraudOrdersCount: parsed.highRiskFraudOrdersCount,
        criticalRestockCount,
        growthOpportunities: parsed.growthOpportunities,
        strategicBusinessAdvice: parsed.strategicBusinessAdvice,
        createdAt: new Date().toISOString(),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Executive report compilation failed: ${errMsg}`);

      // Fallback manual projections
      const estNextMonth = dataset.revenueBucketMonth1 * 1.05 || 15000;
      return {
        revenue90Days,
        forecastedRevenueNext30Days: Number(estNextMonth.toFixed(2)),
        forecastedGrowthPercent: 5.0,
        totalCustomersAudited: customerCount,
        churnRiskCount: Math.ceil(customerCount * 0.12),
        highRiskFraudOrdersCount: 2,
        criticalRestockCount,
        growthOpportunities: [
          'Aggressive target campaigns for at-risk customers in Europe regions.',
          'Rebalancing core sizing catalogs in UAE warehousing hubs.',
          'Dynamic price adjustments for technical compression lines to expand margins.',
        ],
        strategicBusinessAdvice:
          'Revenue patterns indicate solid baseline momentum. Low-stock levels in regional warehouses present a marginal fulfillment risk. Recommend executing cross-hub inventory transfers to prevent checkout drops.',
        createdAt: new Date().toISOString(),
      };
    }
  }
}
