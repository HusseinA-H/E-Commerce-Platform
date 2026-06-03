import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationPrompts } from '../prompt-builders/recommendation-prompts';
import { cleanJsonString } from '../../ai/utils/json-cleaner';


@Injectable()
export class CompleteTheLookEngine {
  private readonly logger = new Logger(CompleteTheLookEngine.name);
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

  async getRecommendations(productId: string): Promise<any[]> {
    const sourceProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, aiMetadata: true },
    });

    if (!sourceProduct) return [];

    const candidates = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        categoryId: { not: sourceProduct.categoryId },
        deletedAt: null,
      },
      include: { category: true, aiMetadata: true, images: true },
      take: 12,
    });

    if (candidates.length === 0) return [];

    const catalogStr = candidates
      .map(
        (p) =>
          `ID: ${p.id} | Name: ${p.name} | Category: ${p.category?.slug || 'Garment'} | Price: $${p.price} | Aesthetic: ${p.aiMetadata?.styleAesthetic || 'Techwear'}`,
      )
      .join('\n');

    const prompt = this.promptRegistry.getCompleteTheLookPrompt(
      {
        name: sourceProduct.name,
        categoryName: sourceProduct.category?.name,
        description: sourceProduct.description,
        styleAesthetic:
          sourceProduct.aiMetadata?.styleAesthetic || 'Tech Sportswear',
      },
      catalogStr,
    );

    let matchingResult: {
      recommendations: {
        productId: string;
        reason: string;
        matchScore: number;
      }[];
    };

    if (!this.isConfigured) {
      this.logger.warn(
        'Groq AI not configured. Simulating Complete the Look results.',
      );
      matchingResult = this.generateMockMatches(sourceProduct, candidates);
    } else {
      try {
        const response = await axios.post(
          this.groqEndpoint,
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
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
        this.logger.log(`Raw complete-the-look response length: ${raw?.length || 0}`);
        const cleaned = cleanJsonString(raw);
        matchingResult = JSON.parse(cleaned);
      } catch (e: any) {
        this.logger.error(`Groq complete-the-look failed: ${e.message}`);
        matchingResult = this.generateMockMatches(sourceProduct, candidates);
      }
    }

    const output: any[] = [];
    if (matchingResult && matchingResult.recommendations) {
      for (const rec of matchingResult.recommendations) {
        const fullProd = candidates.find((c) => c.id === rec.productId);
        if (fullProd) {
          output.push({
            productId: rec.productId,
            reason: rec.reason,
            matchScore: rec.matchScore,
            product: fullProd,
          });
        }
      }
    }

    return output;
  }

  private generateMockMatches(source: any, candidates: any[]) {
    const selected = candidates.slice(0, 3);
    return {
      recommendations: selected.map((c, idx) => ({
        productId: c.id,
        reason:
          idx === 0
            ? `Pairing the ${source.name} with the ${c.name} creates a perfect styling silhouette. The fabric technologies sync seamlessly to provide maximum climate performance.`
            : idx === 1
              ? `The color harmony of the ${c.name} anchors the base coordinate profile of the ${source.name}. This is a highly recommended layout.`
              : `For a complete urban transit look, layer the setup with the ${c.name} for aerodynamic wind protection.`,
        matchScore: 96 - idx * 4,
      })),
    };
  }
}
