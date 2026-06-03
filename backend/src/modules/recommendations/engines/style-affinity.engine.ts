import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationPrompts } from '../prompt-builders/recommendation-prompts';
import { cleanJsonString } from '../../ai/utils/json-cleaner';


@Injectable()
export class StyleAffinityEngine {
  private readonly logger = new Logger(StyleAffinityEngine.name);
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

  async getOrComputeUserProfile(userId: string): Promise<any> {
    const existingProfile = await this.prisma.userStyleProfile.findUnique({
      where: { userId },
    });

    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (existingProfile && existingProfile.updatedAt > dayAgo) {
      this.logger.log(`[STYLISIT TELEMETRY] - cache usage: HIT for user style profile ${userId}`);
      return existingProfile;
    }
    this.logger.log(`[STYLISIT TELEMETRY] - cache usage: MISS for user style profile ${userId}`);

    const [orders, wishlist, analyses] = await Promise.all([
      this.prisma.order.findMany({
        where: { userId, paymentStatus: 'paid' },
        include: {
          items: {
            include: {
              product: { include: { category: true, aiMetadata: true } },
            },
          },
        },
      }),
      this.prisma.wishlistItem.findMany({
        where: { userId },
        include: { product: { include: { category: true, aiMetadata: true } } },
      }),
      this.prisma.outfitAnalysis.findMany({
        where: { userId },
        take: 5,
      }),
    ]);

    const itemsDescription: string[] = [];
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (item.product) {
          itemsDescription.push(
            `- Purchased: ${item.product.name} (Category: ${item.product.category?.slug}, Aesthetic: ${item.product.aiMetadata?.styleAesthetic || 'Techwear'})`,
          );
        }
      });
    });

    wishlist.forEach((w) => {
      itemsDescription.push(
        `- Wishlist: ${w.product.name} (Category: ${w.product.category?.slug}, Aesthetic: ${w.product.aiMetadata?.styleAesthetic || 'Techwear'})`,
      );
    });

    analyses.forEach((a) => {
      itemsDescription.push(
        `- Outfit Analysis Score: ${a.overallScore} | Category: ${a.styleCategory} | Aesthetic: ${a.aestheticType}`,
      );
    });

    const userLogsStr =
      itemsDescription.join('\n') || '- No interactions recorded yet';

    const prompt = this.promptRegistry.getStyleAffinityPrompt(userLogsStr);

    let profileResult: {
      dominantAesthetic: string;
      preferredColors: string[];
      preferredCategories: string[];
      styleEvolutionSummary: string;
      confidenceScore: number;
    };

    if (!this.isConfigured) {
      profileResult = this.generateMockStyleProfile();
    } else {
      try {
        const response = await axios.post(
          this.groqEndpoint,
          {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.2,
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
        this.logger.log(`Raw style affinity response length: ${raw?.length || 0}`);
        const cleaned = cleanJsonString(raw);
        profileResult = JSON.parse(cleaned);
      } catch (e: any) {
        this.logger.error(
          `Groq style affinity calculation failed: ${e.message}`,
        );
        profileResult = this.generateMockStyleProfile();
      }
    }

    return this.prisma.userStyleProfile.upsert({
      where: { userId },
      create: {
        userId,
        dominantAesthetic: profileResult.dominantAesthetic,
        preferredColors: profileResult.preferredColors.join(','),
        preferredCategories: profileResult.preferredCategories.join(','),
        styleEvolution: profileResult.styleEvolutionSummary,
        confidenceScore: profileResult.confidenceScore,
      },
      update: {
        dominantAesthetic: profileResult.dominantAesthetic,
        preferredColors: profileResult.preferredColors.join(','),
        preferredCategories: profileResult.preferredCategories.join(','),
        styleEvolution: profileResult.styleEvolutionSummary,
        confidenceScore: profileResult.confidenceScore,
      },
    });
  }

  private generateMockStyleProfile() {
    return {
      dominantAesthetic: 'Performance Athlete',
      preferredColors: ['Onyx Black', 'Slate Gray', 'Volt Yellow'],
      preferredCategories: ['tops', 'bottoms', 'footwear'],
      styleEvolutionSummary:
        'Focuses strictly on compression clothing and streamlined shell jackets. Proportions indicate high interest in aerodynamics and thermo-regulation fits.',
      confidenceScore: 92,
    };
  }
}
