import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiService } from '../../ai/ai.service';
import { cleanJsonString } from '../../ai/utils/json-cleaner';

export interface PricingAdvice {
  productId: string;
  productName: string;
  currentPrice: number;
  recommendedPrice: number;
  suggestedDiscountPercent: number;
  inventoryLevel: number;
  velocity30Days: number;
  reasoning: string;
}

@Injectable()
export class AiPricingService {
  private readonly logger = new Logger(AiPricingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async generatePricingRecommendations(): Promise<PricingAdvice[]> {
    this.logger.log(
      'Aggregating product metrics for AI dynamic pricing optimization...',
    );

    // 1. Fetch products
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        price: true,
        stockQuantity: true,
        category: { select: { name: true } },
      },
    });

    // 2. Fetch sales velocity over last 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: { gte: cutoffDate },
          status: { notIn: ['cancelled'] },
        },
      },
      select: {
        productId: true,
        quantity: true,
      },
    });

    // Map velocity
    const salesMap: Record<string, number> = {};
    orderItems.forEach((item) => {
      salesMap[item.productId] =
        (salesMap[item.productId] || 0) + item.quantity;
    });

    // Compile pricing statistics input
    const productStats = products.map((p) => {
      const velocity = salesMap[p.id] || 0;
      return {
        id: p.id,
        name: p.name,
        category: p.category.name,
        price: p.price,
        stock: p.stockQuantity,
        salesVelocity30d: velocity,
      };
    });

    if (productStats.length === 0) {
      return [];
    }

    // 3. Prompt Groq LLM
    try {
      const messages = [
        {
          role: 'system',
          content: `You are an elite retail pricing scientist. Analyze the product inventory level, default price, and sales velocity over the past 30 days.
Optimize prices to maximize margins for high-demand, low-stock items (increase prices slightly) and liquidate/clearance low-demand, high-stock items (suggest discounts).
You MUST return a JSON response containing an array named "pricingAdvice" where each item exactly matches this schema:
{
  "productId": "string",
  "productName": "string",
  "currentPrice": 0.0,
  "recommendedPrice": 0.0,
  "suggestedDiscountPercent": 0,
  "inventoryLevel": 0,
  "velocity30Days": 0,
  "reasoning": "string"
}`,
        },
        {
          role: 'user',
          content: `Here is the current catalog status and 30-day velocity stats: ${JSON.stringify(productStats)}`,
        },
      ];

      const response = (await this.aiService.executeGroqCall(
        'llama-3.3-70b-versatile',
        messages,
        'pricing_optimization',
        { type: 'json_object' },
        0.2,
      )) as { data: { choices: { message: { content: string } }[] } };

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw pricing optimization response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      const parsed = JSON.parse(cleaned) as {
        pricingAdvice?: PricingAdvice[];
      };
      return parsed.pricingAdvice || [];
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Dynamic Pricing failed: ${errMsg}`);
      // Fallback fallback rule-based suggestions if LLM is offline
      return productStats.map((p) => {
        let recommendedPrice = p.price;
        let suggestedDiscountPercent = 0;
        let reasoning = 'Catalog demand stable. Price remains unchanged.';

        if (p.salesVelocity30d > 20 && p.stock < 10) {
          recommendedPrice = Number((p.price * 1.05).toFixed(2)); // +5%
          reasoning =
            'High velocity with low stock. Increased margin opportunity.';
        } else if (p.salesVelocity30d < 3 && p.stock > 50) {
          suggestedDiscountPercent = 15;
          recommendedPrice = Number((p.price * 0.85).toFixed(2)); // -15%
          reasoning =
            'Slow inventory rotation. Recommended markdown to clear storage.';
        }

        return {
          productId: p.id,
          productName: p.name,
          currentPrice: p.price,
          recommendedPrice,
          suggestedDiscountPercent,
          inventoryLevel: p.stock,
          velocity30Days: p.salesVelocity30d,
          reasoning,
        };
      });
    }
  }
}
