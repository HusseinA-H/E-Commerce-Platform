import { Injectable } from '@nestjs/common';

@Injectable()
export class RecommendationPrompts {
  getStyleAffinityPrompt(userLogsSummary: string): string {
    return `You are the APEX LUXE AI Style Profiler.
Analyze the following user shopping history, telemetry, and previous style analyses:
${userLogsSummary}

Determine their dominant activewear style aesthetic and style DNA preferences.
Aesthetics must be one of: "Luxury Minimalist", "Performance Athlete", "Streetwear Hybrid", "Monochrome Gymwear", or "Oversized Urban".

Return ONLY a valid JSON object matching the following structure (no markdown wrappers, no backticks, no other text):
{
  "dominantAesthetic": "aesthetic-name",
  "preferredColors": ["Color1", "Color2"],
  "preferredCategories": ["category-slug-1", "category-slug-2"],
  "styleEvolutionSummary": "A concise breakdown of their style trajectory and why they fit this profile.",
  "confidenceScore": 85
}`;
  }

  getOutfitCompatibilityPrompt(productA: any, productB: any): string {
    return `You are the APEX LUXE AI Garment Compatibility Engineer.
Analyze the following two high-end sportswear products:
Product A: ${productA.name} | Category: ${productA.categoryName} | Aesthetic: ${productA.styleAesthetic} | Description: ${productA.description}
Product B: ${productB.name} | Category: ${productB.categoryName} | Aesthetic: ${productB.styleAesthetic} | Description: ${productB.description}

Calculate their outfit coordinate compatibility score (0-100) based on fabric tech synergy, color compatibility, layering fit, and functional use cases. Provide a precise luxury-retail explanation of why they pair together.

Return ONLY a valid JSON object matching this structure (no markdown wrappers, no backticks):
{
  "compatibilityScore": 92,
  "reason": "Detailed style reason explaining why these two items complement each other in an active coordinate."
}`;
  }

  getCompleteTheLookPrompt(sourceProduct: any, catalogStr: string): string {
    return `You are the APEX LUXE AI Outfit Architect.
The user is viewing the product:
Name: ${sourceProduct.name}
Category: ${sourceProduct.categoryName}
Description: ${sourceProduct.description}
Aesthetic: ${sourceProduct.styleAesthetic}

We have the following premium items in our live catalog:
${catalogStr}

Select 2 to 3 products from different categories in the catalog that compile a complete, matching look with the source product. Provide a specific styling explanation for each matching choice.

Return ONLY a valid JSON object matching this structure (no markdown wrappers, no backticks):
{
  "recommendations": [
    {
      "productId": "product-uuid-from-catalog",
      "reason": "Explanation citing color flow, tech fabric coordination, and silhouette balance.",
      "matchScore": 94
    }
  ]
}`;
  }
}
