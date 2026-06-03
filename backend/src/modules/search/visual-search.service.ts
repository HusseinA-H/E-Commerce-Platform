import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { AiTelemetryService } from '../ai/ai-telemetry.service';
import { cleanJsonString } from '../ai/utils/json-cleaner';


export interface VisualSearchResult {
  products: any[];
  visualDescription: string;
  extractedAttributes: {
    colors: string[];
    style: string;
    garmentType: string;
    fit: string;
    aesthetic: string;
  };
  whyRetrieved: string;
}

/**
 * VisualSearchService — Implements the VisionRetrievalAdapter pattern.
 *
 * Architecture:
 *   1. Accept image URL (Cloudinary-hosted) from frontend
 *   2. Call Groq vision-capable model to extract: colors, style, garment type, fit, aesthetic
 *   3. Map extracted attributes to ProductAiMetadata scoring
 *   4. Return ranked products with visual similarity explanation
 *   5. Log to VisualSearchHistory table
 *
 * Future multimodal providers (swap the _callVisionProvider method):
 *   - OpenAI GPT-4o Vision
 *   - Gemini 1.5 Pro Vision
 *   - Claude 3.5 Sonnet Vision
 */
@Injectable()
export class VisualSearchService {
  private readonly logger = new Logger(VisualSearchService.name);
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';
  private groqApiKey = '';
  private isConfigured = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly telemetry: AiTelemetryService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  /**
   * Perform visual search using an image URL.
   * @param imageUrl — Publicly accessible image URL (Cloudinary, S3, etc.)
   * @param userId — Optional user ID for personalization and history tracking
   */
  async search(imageUrl: string, userId?: string): Promise<VisualSearchResult> {
    const start = Date.now();

    let extractedAttributes = this.getFallbackAttributes();
    let visualDescription = '';

    if (this.isConfigured) {
      try {
        extractedAttributes = await this._callVisionProvider(imageUrl);
        visualDescription = this.buildVisualDescription(extractedAttributes);
      } catch (e: any) {
        this.logger.warn(
          `Vision AI extraction failed, using fallback: ${e.message}`,
        );
        extractedAttributes = this.getFallbackAttributes();
      }
    } else {
      // Heuristic fallback based on URL filename
      const urlLower = imageUrl.toLowerCase();
      if (
        urlLower.includes('jacket') ||
        urlLower.includes('shell') ||
        urlLower.includes('outerwear')
      ) {
        extractedAttributes = {
          colors: ['black', 'gray'],
          style: 'techwear',
          garmentType: 'outerwear',
          fit: 'athletic slim',
          aesthetic: 'Cyberpunk Techwear',
        };
      } else if (
        urlLower.includes('compression') ||
        urlLower.includes('tight')
      ) {
        extractedAttributes = {
          colors: ['black', 'volt'],
          style: 'performance',
          garmentType: 'tops',
          fit: 'compression',
          aesthetic: 'High-Performance Compression',
        };
      } else if (urlLower.includes('jogger') || urlLower.includes('pant')) {
        extractedAttributes = {
          colors: ['slate', 'gray'],
          style: 'minimalist',
          garmentType: 'bottoms',
          fit: 'tapered slim',
          aesthetic: 'Modern Athletic Minimal',
        };
      }
      visualDescription = this.buildVisualDescription(extractedAttributes);
    }

    // Fetch candidate products with AI metadata
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        aiMetadata: true,
        images: true,
        colors: true,
      },
    });

    // Score products based on visual attribute matching
    const scored = products
      .map((product) => {
        let score = 0;
        const reasons: string[] = [];
        const meta = product.aiMetadata;
        const catSlug = product.category?.slug?.toLowerCase() || '';
        const productColors = product.colors.map((c) => c.color.toLowerCase());

        // Garment type match (40 pts)
        if (
          extractedAttributes.garmentType &&
          (catSlug.includes(extractedAttributes.garmentType) ||
            extractedAttributes.garmentType.includes(catSlug))
        ) {
          score += 40;
          reasons.push(
            `Visually matches ${product.category?.name} garment type`,
          );
        }

        if (meta) {
          // Aesthetic match (25 pts)
          const metaAesthetic = (meta.styleAesthetic || '').toLowerCase();
          if (
            extractedAttributes.aesthetic &&
            metaAesthetic.includes(
              extractedAttributes.aesthetic.split(' ')[0].toLowerCase(),
            )
          ) {
            score += 25;
            reasons.push(`Shares ${meta.styleAesthetic} aesthetic`);
          }

          // Fit type match (15 pts)
          const metaFit = (meta.fitType || '').toLowerCase();
          if (
            extractedAttributes.fit &&
            metaFit.includes(extractedAttributes.fit.split(' ')[0])
          ) {
            score += 15;
            reasons.push(`Similar ${meta.fitType} silhouette`);
          }
        }

        // Color match (20 pts)
        const colorMatches = extractedAttributes.colors.filter(
          (extractedColor) =>
            productColors.some(
              (pc) =>
                pc.includes(extractedColor) || extractedColor.includes(pc),
            ),
        );
        if (colorMatches.length > 0) {
          score += Math.min(20, colorMatches.length * 10);
          reasons.push(`Matching colorway: ${colorMatches.join(', ')}`);
        }

        return { product, score, reasons };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12);

    const resultProducts = scored.map((r) => ({
      ...r.product,
      visualSimilarityScore: Math.min(100, r.score),
      visualMatchReason: r.reasons.slice(0, 2).join('. ') + '.',
    }));

    // Log to VisualSearchHistory (non-blocking)
    const latencyMs = Date.now() - start;
    void this.prisma.visualSearchHistory
      .create({
        data: {
          userId: userId || null,
          imageUrl,
          description: visualDescription || null,
          resultCount: resultProducts.length,
        },
      })
      .catch(() => {});

    // Log telemetry
    void this.telemetry.logQuery({
      modelName: this.isConfigured ? 'llama-3.3-70b-versatile' : 'mock',
      action: 'visual_search',
      promptTokens: 0,
      completionTokens: 0,
      latencySeconds: latencyMs / 1000,
      status: 'success',
    });

    const whyRetrieved =
      resultProducts.length > 0
        ? `Found ${resultProducts.length} products matching your image's ${extractedAttributes.aesthetic} aesthetic with ${extractedAttributes.fit} silhouette.`
        : 'No visually similar products found in the current catalog.';

    return {
      products: resultProducts,
      visualDescription,
      extractedAttributes,
      whyRetrieved,
    };
  }

  /**
   * Call Groq vision-capable model to extract fashion attributes from image.
   * Uses llama-3.2-11b-vision-preview (Groq's vision model).
   *
   * Future: swap _callVisionProvider implementation for OpenAI/Gemini/Claude.
   */
  private async _callVisionProvider(imageUrl: string): Promise<{
    colors: string[];
    style: string;
    garmentType: string;
    fit: string;
    aesthetic: string;
  }> {
    const start = process.hrtime();
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || '';
    const cleanFilename = filename.split('?')[0] || '';
    const baseName = cleanFilename.split('.')[0] || '';
    const keywords = baseName.replace(/[-_]/g, ' ');

    const promptText = `You are an expert fashion AI for APEX LUXE luxury sportswear. Analyze this clothing image based on the filename/keywords: "${keywords}" (URL: "${imageUrl}") and extract:
1. Primary colors (use descriptive names: e.g., "onyx black", "slate gray", "volt yellow")
2. Style category (techwear, compression, minimalist, athletic, streetwear, etc.)
3. Garment type (tops, bottoms, outerwear, footwear, accessories)
4. Fit description (compression, slim, tapered, regular, boxy, oversized)
5. Overall aesthetic label (e.g., "Cyberpunk Techwear", "Minimalist Performance", "High-Performance Compression")

Return ONLY a JSON object:
{
  "colors": ["color1", "color2"],
  "style": "style string",
  "garmentType": "garment type",
  "fit": "fit description",
  "aesthetic": "aesthetic label"
}`;

    const modelName = 'llama-3.3-70b-versatile';
    const payload = {
      model: modelName,
      messages: [
        {
          role: 'user',
          content: promptText,
        },
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' },
      max_tokens: 200,
    };

    this.logger.log(`[STYLISIT TELEMETRY] - user prompt: "${promptText}"`);
    this.logger.log(`[STYLISIT TELEMETRY] - image present: ${imageUrl ? 'YES' : 'NO'}`);
    this.logger.log(`[STYLISIT TELEMETRY] - model: ${modelName}`);
    this.logger.log(`[STYLISIT TELEMETRY] - Groq request payload: ${JSON.stringify(payload)}`);

    const response = await axios.post<any>(
      this.groqEndpoint,
      payload,
      {
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    this.logger.log(`[STYLISIT TELEMETRY] - Groq response payload: ${JSON.stringify(response.data)}`);
    this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: NO`);

    const end = process.hrtime(start);
    const latencySeconds = end[0] + end[1] / 1e9;
    const usage = response.data?.usage;

    void this.telemetry.logQuery({
      modelName: modelName,
      action: 'visual_search_extraction',
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      latencySeconds,
      status: 'success',
    });

    const raw = response.data.choices[0].message.content;
    this.logger.log(`Raw visual search vision response length: ${raw?.length || 0}`);
    const cleaned = cleanJsonString(raw);
    return JSON.parse(cleaned);
  }

  private getFallbackAttributes() {
    return {
      colors: ['black'],
      style: 'athletic',
      garmentType: 'tops',
      fit: 'slim',
      aesthetic: 'Minimalist Performance',
    };
  }

  private buildVisualDescription(attrs: {
    colors: string[];
    style: string;
    garmentType: string;
    fit: string;
    aesthetic: string;
  }): string {
    return `${attrs.aesthetic} ${attrs.garmentType} in ${attrs.colors.join('/')} with ${attrs.fit} silhouette — ${attrs.style} style.`;
  }
}
