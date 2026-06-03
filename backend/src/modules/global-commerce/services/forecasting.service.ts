import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { cleanJsonString } from '../../ai/utils/json-cleaner';

export interface ProductDemandForecast {
  productId: string;
  name: string;
  category: string;
  unitsSold90Days: number;
  predictedUnitsNext30Days: number;
  confidenceScore: number;
}

export interface CategoryForecast {
  categoryName: string;
  unitsSold90Days: number;
  predictedGrowthPercent: number;
}

export interface RegionalForecast {
  regionName: string;
  unitsSold90Days: number;
  predictedGrowthPercent: number;
}

export interface InventoryForecast {
  productId: string;
  productName: string;
  warehouseCode: string;
  currentStock: number;
  predictedDepletionDays: number;
  reorderRecommendationDate: string;
  reorderQuantity: number;
  healthScore: number;
}

export interface ForecastsReport {
  demandForecasts: ProductDemandForecast[];
  categoryForecasts: CategoryForecast[];
  regionalForecasts: RegionalForecast[];
  inventoryForecasts: InventoryForecast[];
}

@Injectable()
export class AiForecastingService {
  private readonly logger = new Logger(AiForecastingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async generateGlobalForecasting(): Promise<ForecastsReport> {
    this.logger.log(
      'Aggregating historical commerce data for demand and inventory forecasting...',
    );

    // 1. Fetch products & inventory levels
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        warehouseInventories: {
          include: { warehouse: true },
        },
      },
    });

    // 2. Fetch order sales details over last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: cutoffDate },
        status: { notIn: ['cancelled'] },
      },
      include: {
        items: true,
      },
    });

    const regions = await this.prisma.region.findMany();
    const regionMap = new Map(regions.map((r) => [r.id, r.name]));

    // Aggregate statistics
    const productSalesMap: Record<string, number> = {};
    const categorySalesMap: Record<string, number> = {};
    const regionSalesMap: Record<string, number> = {};

    orders.forEach((ord) => {
      const regionName = ord.regionId
        ? regionMap.get(ord.regionId) || 'Other'
        : 'Other';
      ord.items.forEach((item) => {
        productSalesMap[item.productId] =
          (productSalesMap[item.productId] || 0) + item.quantity;

        // Find category
        const prod = products.find((p) => p.id === item.productId);
        const catName = prod?.category?.name || 'Uncategorized';
        categorySalesMap[catName] =
          (categorySalesMap[catName] || 0) + item.quantity;

        regionSalesMap[regionName] =
          (regionSalesMap[regionName] || 0) + item.quantity;
      });
    });

    const dataset = {
      productSales: products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category.name,
        unitsSold90Days: productSalesMap[p.id] || 0,
        inventories: p.warehouseInventories.map((i) => ({
          warehouseCode: i.warehouse.code,
          quantity: i.quantity,
          reserved: i.reservedQty,
        })),
      })),
      categorySales: Object.entries(categorySalesMap).map(([name, count]) => ({
        name,
        count,
      })),
      regionalSales: Object.entries(regionSalesMap).map(([name, count]) => ({
        name,
        count,
      })),
    };

    if (products.length === 0) {
      return {
        demandForecasts: [],
        categoryForecasts: [],
        regionalForecasts: [],
        inventoryForecasts: [],
      };
    }

    try {
      const messages = [
        {
          role: 'system',
          content: `You are an elite supply chain forecasting AI.
Analyze 90-day historical unit sales across products, categories, and regional setups.
Generate:
1. Product demand prediction (predicted units next 30 days) and confidence level (0 to 1).
2. Category and regional growth projections (predictedGrowthPercent, e.g. 5 for +5%, -10 for -10%).
3. Inventory stock depletion forecasts (predictedDepletionDays, reorderRecommendationDate in YYYY-MM-DD, reorderQuantity, and healthScore 0-100 where low stock/high demand = low health).
You MUST return a JSON response matching this exact structure:
{
  "demandForecasts": [
    {
      "productId": "string",
      "name": "string",
      "category": "string",
      "unitsSold90Days": 0,
      "predictedUnitsNext30Days": 0,
      "confidenceScore": 0.0
    }
  ],
  "categoryForecasts": [
    {
      "categoryName": "string",
      "unitsSold90Days": 0,
      "predictedGrowthPercent": 0.0
    }
  ],
  "regionalForecasts": [
    {
      "regionName": "string",
      "unitsSold90Days": 0,
      "predictedGrowthPercent": 0.0
    }
  ],
  "inventoryForecasts": [
    {
      "productId": "string",
      "productName": "string",
      "warehouseCode": "string",
      "currentStock": 0,
      "predictedDepletionDays": 0,
      "reorderRecommendationDate": "YYYY-MM-DD",
      "reorderQuantity": 0,
      "healthScore": 0
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Here is the current sales velocity and warehouse status dataset: ${JSON.stringify(dataset)}`,
        },
      ];

      const response = (await this.aiService.executeGroqCall(
        'llama-3.3-70b-versatile',
        messages,
        'forecasting_generation',
        { type: 'json_object' },
        0.2,
      )) as { data: { choices: { message: { content: string } }[] } };

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw forecasting generation response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      return JSON.parse(cleaned) as ForecastsReport;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Forecasting generation failed: ${errMsg}`);

      // Fallback rule-based forecasting
      const demandForecasts = dataset.productSales.map((p) => {
        const estDemand = Math.ceil(p.unitsSold90Days / 3);
        return {
          productId: p.id,
          name: p.name,
          category: p.category,
          unitsSold90Days: p.unitsSold90Days,
          predictedUnitsNext30Days: estDemand + 5,
          confidenceScore: 0.75,
        };
      });

      const categoryForecasts = dataset.categorySales.map((c) => ({
        categoryName: c.name,
        unitsSold90Days: c.count,
        predictedGrowthPercent: 4.2,
      }));

      const regionalForecasts = dataset.regionalSales.map((r) => ({
        regionName: r.name,
        unitsSold90Days: r.count,
        predictedGrowthPercent: 5.5,
      }));

      const inventoryForecasts: InventoryForecast[] = [];
      dataset.productSales.forEach((p) => {
        const velocityPerDay = p.unitsSold90Days / 90 || 0.1;
        p.inventories.forEach((inv) => {
          const daysLeft = Math.ceil(inv.quantity / velocityPerDay);
          const depletionDays = isNaN(daysLeft) ? 365 : Math.min(daysLeft, 365);

          const reorderDate = new Date();
          reorderDate.setDate(
            reorderDate.getDate() + Math.max(1, depletionDays - 7),
          ); // order 7 days before empty

          let healthScore = 100;
          if (depletionDays < 14) healthScore = 20;
          else if (depletionDays < 30) healthScore = 60;

          inventoryForecasts.push({
            productId: p.id,
            productName: p.name,
            warehouseCode: inv.warehouseCode,
            currentStock: inv.quantity,
            predictedDepletionDays: depletionDays,
            reorderRecommendationDate: reorderDate.toISOString().slice(0, 10),
            reorderQuantity: Math.ceil(velocityPerDay * 30),
            healthScore,
          });
        });
      });

      return {
        demandForecasts,
        categoryForecasts,
        regionalForecasts,
        inventoryForecasts,
      };
    }
  }
}
