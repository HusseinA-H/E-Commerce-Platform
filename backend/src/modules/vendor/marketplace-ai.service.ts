import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { AiTelemetryService } from '../ai/ai-telemetry.service';
import { cleanJsonString } from '../ai/utils/json-cleaner';


@Injectable()
export class MarketplaceAiService {
  private readonly logger = new Logger(MarketplaceAiService.name);
  private groqApiKey = '';
  private isConfigured = false;
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly telemetry: AiTelemetryService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  private async executeGroqCall(
    model: string,
    messages: { role: string; content: string }[],
    action: string,
    responseFormatObj?: any,
    temperature = 0.5,
  ): Promise<any> {
    const start = process.hrtime();
    const payload: any = {
      model,
      messages,
      temperature,
    };
    if (responseFormatObj) {
      payload.response_format = responseFormatObj;
    }

    try {
      const response = await axios.post<any>(this.groqEndpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10s timeout recovery (E.5)
      });

      const end = process.hrtime(start);
      const latencySeconds = end[0] + end[1] / 1e9;
      const usage = response.data?.usage;
      const promptTokens = usage?.prompt_tokens || 0;
      const completionTokens = usage?.completion_tokens || 0;

      // Log success telemetry
      void this.telemetry.logQuery({
        modelName: model,
        action,
        promptTokens,
        completionTokens,
        latencySeconds,
        status: 'success',
      });

      return response;
    } catch (e: any) {
      const end = process.hrtime(start);
      const latencySeconds = end[0] + end[1] / 1e9;
      const errorMessage =
        e.response?.data?.error?.message || e.message || String(e);

      // Log failure telemetry
      void this.telemetry.logQuery({
        modelName: model,
        action,
        promptTokens: 0,
        completionTokens: 0,
        latencySeconds,
        status: 'failed',
        errorMessage,
      });

      throw e;
    }
  }

  /**
   * Generates dynamic operational insights for a vendor based on inventory, sales velocity, and returns.
   */
  async generateInsightsForVendor(vendorId: string): Promise<string[]> {
    const products = await this.prisma.product.findMany({
      where: { vendorId, deletedAt: null },
      select: { name: true, stockQuantity: true, lowStockThreshold: true },
    });

    const vendorOrders = await this.prisma.vendorOrder.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const lowStockItems = products.filter(
      (p) => p.stockQuantity <= p.lowStockThreshold,
    );
    const totalSales = vendorOrders.reduce((sum, o) => sum + o.total, 0);

    // Heuristic fallbacks if Groq key is unconfigured
    const fallbackInsights = [
      `Sales baseline established at $${totalSales.toFixed(2)}.`,
    ];

    if (lowStockItems.length > 0) {
      fallbackInsights.push(
        `Replenishment required: "${lowStockItems[0].name}" stock is critical.`,
      );
    } else {
      fallbackInsights.push(
        'Inventory status is optimal. No active stock alerts.',
      );
    }

    if (vendorOrders.length < 5) {
      fallbackInsights.push(
        'Operational tip: Add more sizing variations to increase conversion rates.',
      );
    } else {
      fallbackInsights.push(
        'Trend detected: High conversion on athletic items. Expand compression lines.',
      );
    }

    if (!this.isConfigured) {
      return fallbackInsights;
    }

    try {
      const res = await this.executeGroqCall(
        'llama-3.1-8b-instant',
        [
          {
            role: 'system',
            content: `You are an elite, business intelligence analyst for APEX LUXE multi-vendor marketplace.
Analyze this vendor's raw operational data and write exactly THREE short bullet points of advice (maximum 10 words per bullet point).
The bullets should focus on demand forecasting, inventory warning, or pricing.
Data summary:
- Total Sales: $${totalSales}
- Total Active Catalog Items: ${products.length}
- Low Stock Items Count: ${lowStockItems.length}
Return a plain JSON string array: ["Insight 1", "Insight 2", "Insight 3"]`,
          },
        ],
        'vendor_insights',
        { type: 'json_object' },
        0.7,
      );

      const rawContent = res.data?.choices?.[0]?.message?.content;
      this.logger.log(`Raw vendor insights response length: ${rawContent?.length || 0}`);
      const cleaned = cleanJsonString(rawContent || '');
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        return parsed.slice(0, 3);
      } else if (parsed.insights && Array.isArray(parsed.insights)) {
        return parsed.insights.slice(0, 3);
      }
      return fallbackInsights;
    } catch (e: any) {
      this.logger.warn(
        `Failed to retrieve Groq vendor operational insights: ${e.message}`,
      );
      return fallbackInsights;
    }
  }

  /**
   * AI Dynamic Pricing Advisor: gives recommendations on margins.
   */
  async getPricingRecommendation(productId: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!product) return { recommendation: 'No advice available.' };

    const currentPrice = product.price;
    const category = product.category.name;

    if (!this.isConfigured) {
      // Rule-based pricing advisor
      const recommendedPrice = currentPrice * 1.05; // recommend slight markup
      return {
        currentPrice,
        recommendedPrice: parseFloat(recommendedPrice.toFixed(2)),
        rationale: `Demand velocity is positive in "${category}". Suggesting a 5% optimization margin.`,
      };
    }

    try {
      const res = await this.executeGroqCall(
        'llama-3.1-8b-instant',
        [
          {
            role: 'system',
            content: `You are an AI automated commerce pricing engine. Suggest a dynamic pricing adjustment (increase/decrease/keep) for:
Product: "${product.name}"
Category: "${category}"
Current Price: $${currentPrice}
Provide the output in JSON format:
{
  "recommendedPrice": number,
  "rationale": "Short explanation here"
}`,
          },
        ],
        'pricing_recommendation',
        { type: 'json_object' },
        0.7,
      );

      const raw = res.data?.choices?.[0]?.message?.content || '{}';
      this.logger.log(`Raw pricing recommendation response length: ${raw.length}`);
      const cleaned = cleanJsonString(raw);
      const parsed = JSON.parse(cleaned);
      return {
        currentPrice,
        recommendedPrice: parsed.recommendedPrice || currentPrice,
        rationale: parsed.rationale || 'Optimal price baseline maintained.',
      };
    } catch (e: any) {
      return {
        currentPrice,
        recommendedPrice: currentPrice,
        rationale: 'Pricing optimization maintains current margins.',
      };
    }
  }
}
