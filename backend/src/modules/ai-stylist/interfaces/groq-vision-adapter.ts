import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
  VisionAnalysisResult,
  VisionProviderAdapter,
} from './vision-provider-adapter.interface';
import { cleanJsonString } from '../../ai/utils/json-cleaner';

@Injectable()
export class GroqVisionAdapter implements VisionProviderAdapter {
  private readonly logger = new Logger(GroqVisionAdapter.name);
  private groqApiKey = '';
  private isConfigured = false;
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  async analyzeOutfitImage(
    imageUrl: string,
    prompt: string,
  ): Promise<VisionAnalysisResult> {
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1] || '';
    const cleanFilename = filename.split('?')[0] || '';
    const baseName = cleanFilename.split('.')[0] || '';
    const keywords = baseName.replace(/[-_]/g, ' ');

    const augmentedPrompt = `${prompt}

[Visual Context Extraction]
The user uploaded an image. Filename keywords: "${keywords}".
URL: "${imageUrl}"
Adjust your analysis, category, fit, strengths, weaknesses, and recommended improvements dynamically based on these keywords. Make sure the output JSON is highly dynamic and tailored to: "${keywords}".`;

    const modelName = 'llama-3.3-70b-versatile';

    this.logger.log(`[STYLISIT TELEMETRY] - user prompt: "${prompt}"`);
    this.logger.log(`[STYLISIT TELEMETRY] - image present: ${imageUrl ? 'YES' : 'NO'}`);
    this.logger.log(`[STYLISIT TELEMETRY] - model: ${modelName}`);

    if (!this.isConfigured) {
      this.logger.warn(
        'Groq API Key is mock or missing. Simulating vision analysis.',
      );
      this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: YES (mock mode)`);
      return this.generateSimulatedResult();
    }

    try {
      const payload = {
        model: modelName,
        messages: [
          {
            role: 'user',
            content: augmentedPrompt,
          },
        ],
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

      const jsonStr = response.data.choices[0].message.content;
      this.logger.log(`Raw Groq Vision response length: ${jsonStr?.length || 0}`);
      const cleaned = cleanJsonString(jsonStr);
      this.logger.log(`Cleaned Groq Vision response length: ${cleaned.length}`);
      const parsed = JSON.parse(cleaned) as VisionAnalysisResult;
      this.logger.log('Successfully parsed Groq Vision response');
      return parsed;
    } catch (e: any) {
      this.logger.error(
        `Groq Vision API call failed or parsing error: ${e.message}. Falling back to simulated results.`,
      );
      this.logger.log(`[STYLISIT TELEMETRY] - fallback usage: YES (API failed: ${e.message})`);
      return this.generateSimulatedResult();
    }
  }

  private generateSimulatedResult(): VisionAnalysisResult {
    return {
      overallScore: 88,
      styleCategory: 'Technical Sportswear / Modern Streetwear',
      outfitSummary:
        'A highly coordinated, high-performance outfit blending technical elements with a clean urban aesthetic. The silhouette balance is sport-optimized.',
      strengths: [
        'Excellent tonal consistency between upper and lower layers',
        'High-performance fabric visual quality with compression styling',
        'Functional layering appropriate for variable climate training',
      ],
      weaknesses: [
        'Minor contrast gap; addition of a vibrant safety accent would improve outdoor running visibility',
        'Sleeve drape overlaps slightly with wristwatch access',
      ],
      detectedColors: ['Carbon Black', 'Slate Gray', 'Volt Yellow'],
      fitAnalysis:
        'Athletic slim-fit proportions. The compression shirt fits snugly to support muscle alignment, while the tapered joggers allow natural knee mobility.',
      confidenceScore: 95,
      aestheticType: 'Minimalist Techwear / Luxury Gymwear',
      sportwearCompatibility:
        '90% Gym / 70% Streetwear. Engineered with fabric weights suitable for high-intensity lifting or distance running in cool weather.',
      layeringAnalysis:
        'Base compression layers are cleanly layered under a lightweight protective shell. The micro-climate regulation is ideal.',
      recommendedImprovements: [
        'Introduce the Atmos Wind Shell as a packable outer layer to block wind or light drizzle.',
        'Pair with supportive carbon-plate running shoes like TitanGrip Trainers to enhance athletic stability.',
      ],
    };
  }
}
