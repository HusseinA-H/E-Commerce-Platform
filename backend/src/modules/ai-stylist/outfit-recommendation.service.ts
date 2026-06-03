import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PromptRegistry } from './prompt-builders/prompt-registry';
import { cleanJsonString } from '../ai/utils/json-cleaner';

@Injectable()
export class OutfitRecommendationService {
  private readonly logger = new Logger(OutfitRecommendationService.name);
  private groqApiKey = '';
  private isConfigured = false;
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptRegistry: PromptRegistry,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  async recommendProductsForOutfit(analysisId: string) {
    const analysis = await this.prisma.outfitAnalysis.findUnique({
      where: { id: analysisId },
    });
    if (!analysis) {
      throw new Error(`Outfit analysis ${analysisId} not found`);
    }

    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        aiMetadata: true,
        images: true,
      },
      take: 12,
    });

    const catalogStr = products
      .map(
        (p) =>
          `ID: ${p.id} | Name: ${p.name} | Category: ${p.category?.name || 'Sportswear'} | Price: $${p.price} | Aesthetic: ${p.aiMetadata?.styleAesthetic || 'Techwear'} | Tags: ${p.aiMetadata?.aiTags || ''}`,
      )
      .join('\n');

    const prompt = this.promptRegistry.getProductMatchingPrompt(
      analysis,
      catalogStr,
    );

    let matchingResult: {
      recommendations: {
        productId: string;
        reason: string;
        matchScore: number;
      }[];
    };

    const modelName = 'llama-3.3-70b-versatile';
    this.logger.log(`[STYLISIT TELEMETRY] - user prompt: "${prompt}"`);
    this.logger.log(`[STYLISIT TELEMETRY] - image present: NO`);
    this.logger.log(`[STYLISIT TELEMETRY] - model: ${modelName}`);

    if (!this.isConfigured) {
      this.logger.warn(
        'Groq AI not configured. Simulating product recommendations.',
      );
      this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: YES (mock mode)`);
      matchingResult = this.generateMockRecommendations(products);
    } else {
      try {
        const payload = {
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          response_format: { type: 'json_object' },
        };
        this.logger.log(`[STYLISIT TELEMETRY] - Groq request payload: ${JSON.stringify(payload)}`);

        const response = await axios.post(
          this.groqEndpoint,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        this.logger.log(`[STYLISIT TELEMETRY] - Groq response payload: ${JSON.stringify(response.data)}`);
        this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: NO`);

        const raw = response.data.choices[0].message.content;
        this.logger.log(`Raw Groq matching response length: ${raw?.length || 0}`);
        const cleaned = cleanJsonString(raw);
        this.logger.log(`Cleaned Groq matching response length: ${cleaned.length}`);
        matchingResult = JSON.parse(cleaned);
        this.logger.log('Successfully parsed Groq matching response');
      } catch (e: any) {
        this.logger.error(
          `Groq product matching failed or parsing error: ${e.message}. Using fallback.`,
        );
        this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: YES (API failed: ${e.message})`);
        matchingResult = this.generateMockRecommendations(products);
      }
    }

    const savedRecs: any[] = [];
    if (matchingResult && matchingResult.recommendations) {
      for (const rec of matchingResult.recommendations) {
        const exists = products.some((p) => p.id === rec.productId);
        if (exists) {
          // Clear any existing recommendation for this product in this analysis to prevent duplication
          await this.prisma.outfitRecommendation.deleteMany({
            where: {
              analysisId,
              productId: rec.productId,
            },
          });

          const dbRec = await this.prisma.outfitRecommendation.create({
            data: {
              analysisId,
              productId: rec.productId,
              reason: rec.reason,
              matchScore: rec.matchScore,
            },
            include: {
              product: {
                include: {
                  images: true,
                  category: true,
                },
              },
            },
          });
          savedRecs.push(dbRec);
        }
      }
    }

    return savedRecs;
  }

  async generateCompleteOutfit(outfitType: string, personaKey?: string) {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        aiMetadata: true,
        images: true,
      },
    });

    const catalogStr = products
      .map(
        (p) =>
          `ID: ${p.id} | Name: ${p.name} | Category: ${p.category?.name || 'Sportswear'} | Price: $${p.price} | Aesthetic: ${p.aiMetadata?.styleAesthetic || 'Techwear'}`,
      )
      .join('\n');

    const prompt = this.promptRegistry.getOutfitGenerationPrompt(
      outfitType,
      catalogStr,
      personaKey,
    );

    let result: {
      theme: string;
      description: string;
      itemIds: string[];
      overallScore: number;
    };

    const modelName = 'llama-3.3-70b-versatile';
    this.logger.log(`[STYLISIT TELEMETRY] - user prompt: "${prompt}"`);
    this.logger.log(`[STYLISIT TELEMETRY] - image present: NO`);
    this.logger.log(`[STYLISIT TELEMETRY] - model: ${modelName}`);

    if (!this.isConfigured) {
      this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: YES (mock mode)`);
      result = this.generateMockOutfit(outfitType, products);
    } else {
      try {
        const payload = {
          model: modelName,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        };
        this.logger.log(`[STYLISIT TELEMETRY] - Groq request payload: ${JSON.stringify(payload)}`);

        const response = await axios.post(
          this.groqEndpoint,
          payload,
          {
            headers: {
              Authorization: `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        this.logger.log(`[STYLISIT TELEMETRY] - Groq response payload: ${JSON.stringify(response.data)}`);
        this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: NO`);

        const raw = response.data.choices[0].message.content;
        this.logger.log(`Raw Groq outfit generation response length: ${raw?.length || 0}`);
        const cleaned = cleanJsonString(raw);
        this.logger.log(`Cleaned Groq outfit generation response length: ${cleaned.length}`);
        result = JSON.parse(cleaned);
        this.logger.log('Successfully parsed Groq outfit generation response');
      } catch (e: any) {
        this.logger.error(
          `Groq outfit generation failed or parsing error: ${e.message}. Using fallback.`,
        );
        this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: YES (API failed: ${e.message})`);
        result = this.generateMockOutfit(outfitType, products);
      }
    }

    const matchedProducts = await this.prisma.product.findMany({
      where: { id: { in: result.itemIds } },
      include: { images: true, category: true },
    });

    return {
      theme: result.theme,
      description: result.description,
      overallScore: result.overallScore,
      items: matchedProducts,
    };
  }

  private generateMockRecommendations(products: any[]) {
    const sampleProducts = products.slice(0, 3);
    return {
      recommendations: sampleProducts.map((p, idx) => ({
        productId: p.id,
        reason:
          idx === 0
            ? `Pairing this outfit with the ${p.name} will elevate the technical performance silhouette. Its breathable weave complements the athletic ventilation of your top, bringing unified styling.`
            : idx === 1
              ? `The color tone of the ${p.name} beautifully anchors the palette of your outfit. It provides structural balance and coordinates with your base layer aesthetics.`
              : `The lightweight properties of the ${p.name} align perfectly with your technical styling goals, giving you transitional versatility for urban movement.`,
        matchScore: 94 - idx * 4,
      })),
    };
  }

  private generateMockOutfit(outfitType: string, products: any[]) {
    const tops = products.filter((p) => p.category?.slug === 'tops');
    const bottoms = products.filter((p) => p.category?.slug === 'bottoms');
    const footwear = products.filter((p) => p.category?.slug === 'footwear');

    const ids = [tops[0]?.id, bottoms[0]?.id, footwear[0]?.id].filter(Boolean);

    return {
      theme: `${outfitType.charAt(0).toUpperCase() + outfitType.slice(1)} Active Ensemble`,
      description: `A fully engineered sportswear outfit tailored for ${outfitType}. Features sweat-wicking lightweight tops, ergonomic tapered bottoms, and premium high-traction footwear.`,
      itemIds: ids,
      overallScore: 92,
    };
  }
}
