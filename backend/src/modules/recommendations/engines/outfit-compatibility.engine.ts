import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationPrompts } from '../prompt-builders/recommendation-prompts';
import { cleanJsonString } from '../../ai/utils/json-cleaner';


@Injectable()
export class OutfitCompatibilityEngine {
  private readonly logger = new Logger(OutfitCompatibilityEngine.name);
  private groqApiKey = '';
  private isConfigured = false;
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly prisma: PrismaService,
    private readonly promptRegistry: RecommendationPrompts,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  async getCompatibility(productAId: string, productBId: string): Promise<any> {
    const [firstId, secondId] =
      productAId < productBId
        ? [productAId, productBId]
        : [productBId, productAId];

    const cached = await this.prisma.productCompatibility.findUnique({
      where: {
        productAId_productBId: {
          productAId: firstId,
          productBId: secondId,
        },
      },
    });

    if (cached) {
      this.logger.log(`[STYLISIT TELEMETRY] - cache usage: HIT for compatibility ${firstId}<->${secondId}`);
      return cached;
    }
    this.logger.log(`[STYLISIT TELEMETRY] - cache usage: MISS for compatibility ${firstId}<->${secondId}`);

    const [prodA, prodB] = await Promise.all([
      this.prisma.product.findUnique({
        where: { id: firstId },
        include: { category: true, aiMetadata: true },
      }),
      this.prisma.product.findUnique({
        where: { id: secondId },
        include: { category: true, aiMetadata: true },
      }),
    ]);

    if (!prodA || !prodB) {
      throw new Error('Product not found for compatibility analysis');
    }

    const prompt = this.promptRegistry.getOutfitCompatibilityPrompt(
      {
        name: prodA.name,
        categoryName: prodA.category?.name,
        styleAesthetic: prodA.aiMetadata?.styleAesthetic || 'Techwear',
        description: prodA.description,
      },
      {
        name: prodB.name,
        categoryName: prodB.category?.name,
        styleAesthetic: prodB.aiMetadata?.styleAesthetic || 'Techwear',
        description: prodB.description,
      },
    );

    let result: { compatibilityScore: number; reason: string };

    if (!this.isConfigured) {
      result = this.generateMockCompatibility(prodA, prodB);
    } else {
      try {
        const response = await axios.post(
          this.groqEndpoint,
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${this.groqApiKey}`,
              'Content-Type': 'application/json',
            },
          },
        );
        const raw = response.data.choices[0].message.content;
        this.logger.log(`Raw outfit compatibility response length: ${raw?.length || 0}`);
        const cleaned = cleanJsonString(raw);
        result = JSON.parse(cleaned);
      } catch (e: any) {
        this.logger.error(`Groq outfit compatibility failed: ${e.message}`);
        result = this.generateMockCompatibility(prodA, prodB);
      }
    }

    return this.prisma.productCompatibility.upsert({
      where: {
        productAId_productBId: {
          productAId: firstId,
          productBId: secondId,
        },
      },
      create: {
        productAId: firstId,
        productBId: secondId,
        compatibilityScore: result.compatibilityScore,
        reason: result.reason,
      },
      update: {
        compatibilityScore: result.compatibilityScore,
        reason: result.reason,
      },
    });
  }

  private generateMockCompatibility(a: any, b: any) {
    const isSameCategory = a.categoryId === b.categoryId;
    const score = isSameCategory ? 45 : 88;
    return {
      compatibilityScore: score,
      reason: isSameCategory
        ? `These items belong to the same category (${a.category?.name}). Generally, styling advises layering base performance pieces under outer jackets rather than doubling items of the same category.`
        : `The technical drape of ${a.name} coordinates perfectly with the silhouette of ${b.name}. Fabrics share matching weight density for cohesive performance dynamics.`,
    };
  }
}
