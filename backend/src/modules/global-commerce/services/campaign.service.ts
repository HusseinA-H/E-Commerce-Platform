import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../../ai/ai.service';

import { cleanJsonString } from '../../ai/utils/json-cleaner';
export interface CampaignOutput {
  subject: string;
  emailBodyHtml: string;
  bannerHeader: string;
  bannerSubheader: string;
  smsBody: string;
  socialAdCopy: string;
}

@Injectable()
export class AiCampaignService {
  private readonly logger = new Logger(AiCampaignService.name);

  constructor(private readonly aiService: AiService) {}

  async generateCampaignCopy(params: {
    campaignName: string;
    targetAudience: string;
    promotedProducts: string[];
    incentiveDescription: string;
  }): Promise<CampaignOutput> {
    this.logger.log(
      `Generating marketing campaign materials for "${params.campaignName}"...`,
    );

    try {
      const messages = [
        {
          role: 'system',
          content: `You are an elite, high-converting digital copywriter for APEX LUXE, an ultra-premium technical sportswear brand.
Generate complete marketing materials for a new campaign.
You must output a JSON object matching this exact schema:
{
  "subject": "Email Subject Line",
  "emailBodyHtml": "Complete HTML email with luxury aesthetics, inline styles, dark theme, and placeholders for product images.",
  "bannerHeader": "Hero Banner Text (5-7 words maximum)",
  "bannerSubheader": "Hero Banner Tagline",
  "smsBody": "Short SMS text including call-to-action (160 characters max)",
  "socialAdCopy": "Instagram/TikTok ad description including hashtags"
}`,
        },
        {
          role: 'user',
          content: `Campaign Parameters:
- Campaign Name: ${params.campaignName}
- Target Segment: ${params.targetAudience}
- Featured Products: ${params.promotedProducts.join(', ')}
- Promotion Offer: ${params.incentiveDescription}`,
        },
      ];

      const response = (await this.aiService.executeGroqCall(
        'llama-3.1-8b-instant',
        messages,
        'marketing_campaign_generation',
        { type: 'json_object' },
        0.7, // higher temperature for creative copywriting
      )) as { data: { choices: { message: { content: string } }[] } };

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw campaign copy response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      return JSON.parse(cleaned) as CampaignOutput;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.logger.error(`AI Campaign Generation failed: ${errMsg}`);

      // Fallback high-end copy
      return {
        subject: `APEX LUXE: Elevate Your Training — ${params.campaignName}`,
        emailBodyHtml: `
          <div style="background-color: #0b0b0b; color: #ffffff; font-family: sans-serif; padding: 40px; text-align: center;">
            <h1 style="color: #add500; font-size: 32px; letter-spacing: -1px; text-transform: uppercase;">APEX LUXE</h1>
            <hr style="border: 0; border-top: 1px solid #222; margin: 30px 0;" />
            <h2 style="font-size: 24px; text-transform: uppercase; margin-bottom: 20px;">${params.campaignName}</h2>
            <p style="color: #888; font-size: 14px; line-height: 1.6; max-width: 500px; margin: 0 auto 30px;">
              Engineered with technical precision for the elite. Designed to optimize thermal performance and style affinity during extreme workouts.
            </p>
            <p style="font-size: 18px; font-weight: bold; color: #add500;">
              Use code: ${params.incentiveDescription} at checkout.
            </p>
            <div style="margin-top: 40px;">
              <a href="https://apexluxe.com/shop" style="background-color: #ffffff; color: #000000; padding: 15px 30px; text-decoration: none; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; border-radius: 4px;">Shop The Drop</a>
            </div>
          </div>
        `,
        bannerHeader: `THE NEXT EVOLUTION IN PERFORMANCE.`,
        bannerSubheader: `Unlock technical superiority. Code: ${params.incentiveDescription}`,
        smsBody: `APEX LUXE: Discover the elite sportswear drop. Claim ${params.incentiveDescription} now. Shop: apex.luxe/shop`,
        socialAdCopy: `Technical apparel designed for absolute performance. Discover the ${params.campaignName} drop featuring our latest high-compression fabrics. Code: ${params.incentiveDescription} #ApexLuxe #TechnicalSportswear #ElitePerformance`,
      };
    }
  }
}
