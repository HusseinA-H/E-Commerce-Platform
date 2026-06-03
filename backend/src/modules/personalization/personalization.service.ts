import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { StyleDnaService } from './style-dna.service';
import { PrismaService } from '../prisma/prisma.service';
import { cleanJsonString } from '../ai/utils/json-cleaner';


@Injectable()
export class PersonalizationService {
  private readonly logger = new Logger(PersonalizationService.name);
  private groqApiKey = '';
  private isConfigured = false;
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly config: ConfigService,
    private readonly styleDna: StyleDnaService,
    private readonly prisma: PrismaService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  async getPersonalizedBanners(userId: string): Promise<any> {
    const dna = await this.styleDna.getOrComputeStyleDna(userId);
    const aesthetic = dna ? dna.dominantAesthetic : 'Minimalist Performance';

    let title = 'PERFORMANCE UNCOMPROMISED';
    let subtitle =
      'Technically superior athletic apparel designed for the modern elite.';

    if (!this.isConfigured) {
      // Custom heuristic fallbacks when Groq is not set up
      if (aesthetic === 'Onyx Luxury Gymwear') {
        title = 'THE APEX OF LUXURY STYLING';
        subtitle =
          'Sophisticated technical activewear and black compression pieces tailored to your high-intensity routine.';
      } else if (aesthetic === 'Volt Brutalism') {
        title = 'ENERGY CONVERTED';
        subtitle =
          'High-visibility neon highlights combined with heavy-duty construction elements.';
      } else if (aesthetic === 'Functional Runner') {
        title = 'RUN UNBOUNDED';
        subtitle =
          'Engineered thermal grid linings and secure accessory storage systems designed to stretch your distance.';
      }
      return { title, subtitle, styleAesthetic: aesthetic };
    }

    try {
      const payload = {
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are an elite, copywriting concierge for APEX LUXE, a high-end luxury activewear brand.
Your tone is bold, minimalist, direct, sophisticated, and premium.
Generate ONE short uppercase headline (max 4-5 words) and ONE clean, elegant, inspiring subtitle sentence (max 15 words) tailored specifically to the user's style aesthetic: "${aesthetic}".
Return JSON format ONLY:
{
  "title": "HEADLINE HERE",
  "subtitle": "Subtitle description here."
}`,
          },
        ],
        temperature: 0.8,
        response_format: { type: 'json_object' },
      };

      const res = await axios.post(this.groqEndpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const raw = res.data?.choices?.[0]?.message?.content || '{}';
      this.logger.log(`Raw personalized banners response length: ${raw.length}`);
      const cleaned = cleanJsonString(raw);
      const parsed = JSON.parse(cleaned);
      return {
        title: parsed.title || title,
        subtitle: parsed.subtitle || subtitle,
        styleAesthetic: aesthetic,
      };
    } catch (e: any) {
      this.logger.warn(`Failed to generate dynamic Groq copy: ${e.message}`);
      return { title, subtitle, styleAesthetic: aesthetic };
    }
  }

  async getPersonalizedProducts(userId: string): Promise<any[]> {
    const dna = await this.styleDna.getOrComputeStyleDna(userId);
    if (!dna) return [];

    const categories = dna.preferredCategories
      .split(',')
      .map((c: string) => c.trim());

    // Fetch products belonging to user's favorite categories
    return this.prisma.product.findMany({
      where: {
        category: {
          slug: { in: categories },
        },
        deletedAt: null,
      },
      include: { images: true, category: true },
      take: 6,
    });
  }
}
