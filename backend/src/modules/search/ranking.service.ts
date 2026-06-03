import { Injectable } from '@nestjs/common';

export interface SearchIntent {
  categories: string[];
  styles: string[];
  colors: string[];
  fitTypes: string[];
  useCases: string[];
  tags: string[];
  season?: string;
  priceRange?: 'budget' | 'mid' | 'premium' | 'luxury';
}

export interface StyleDnaContext {
  dominantAesthetic: string;
  preferredColors: string;
  preferredCategories: string;
  confidenceScore: number;
}

export interface ScoredProduct {
  product: any;
  score: number;
  vectorScore: number;
  intentScore: number;
  personalizationBoost: number;
  trendingBoost: number;
  reasons: string[];
}

/**
 * RankingService — Pure, stateless multi-factor product ranking.
 *
 * Scoring weights (total possible 100):
 *   - Category intent match:    30 pts
 *   - Style/aesthetic match:    15 pts
 *   - Fit type match:           10 pts
 *   - Use case match:           15 pts  (×2 for exact)
 *   - AI tag match:             15 pts
 *   - Description keyword:       5 pts
 *   - Vector cosine similarity: Up to 20 bonus pts (multiplier on base score)
 *   - Personalization boost:    Up to 15 bonus pts (StyleDNA alignment)
 *   - Trending boost:           Up to 10 bonus pts (TrendingSnapshot.score)
 *   - Inventory penalty:        -10 pts for LOW_STOCK, -20 for OUT_OF_STOCK
 */
@Injectable()
export class RankingService {
  /**
   * Score a single product against extracted search intent.
   */
  scoreProduct(
    product: any,
    intent: SearchIntent,
    vectorScore = 0,
  ): ScoredProduct {
    let score = 0;
    const reasons: string[] = [];

    const meta = product.aiMetadata;
    const category = product.category;

    // 1. Category match (30 pts)
    if (
      intent.categories.length > 0 &&
      intent.categories.some(
        (c) =>
          category?.slug?.toLowerCase().includes(c.toLowerCase()) ||
          category?.name?.toLowerCase().includes(c.toLowerCase()),
      )
    ) {
      score += 30;
      reasons.push(`Matches ${category?.name} category`);
    }

    if (meta) {
      const styleText = (meta.styleAesthetic || '').toLowerCase();
      const fitText = (meta.fitType || '').toLowerCase();
      const useCaseText = (meta.primaryUseCases || '').toLowerCase();
      const tagsText = (meta.aiTags || '').toLowerCase();

      // 2. Style/aesthetic match (15 pts, +5 per extra)
      let styleMatched = false;
      intent.styles.forEach((style) => {
        if (styleText.includes(style.toLowerCase())) {
          const pts = styleMatched ? 5 : 15;
          score += pts;
          reasons.push(`${style} aesthetic alignment`);
          styleMatched = true;
        }
      });

      // 3. Fit type match (10 pts)
      intent.fitTypes.forEach((fit) => {
        if (fitText.includes(fit.toLowerCase())) {
          score += 10;
          reasons.push(`${fit} fit preference match`);
        }
      });

      // 4. Use case match (15 pts each, capped at 30)
      let useCaseScore = 0;
      intent.useCases.forEach((useCase) => {
        if (useCaseText.includes(useCase.toLowerCase())) {
          if (useCaseScore < 30) {
            useCaseScore += 15;
            reasons.push(`Engineered for ${useCase}`);
          }
        }
      });
      score += useCaseScore;

      // 5. AI tag match (15 pts first, 5 pts subsequent)
      let firstTag = true;
      intent.tags.forEach((tag) => {
        if (tagsText.includes(tag.toLowerCase())) {
          const pts = firstTag ? 15 : 5;
          score += pts;
          reasons.push(`Technical attribute: ${tag}`);
          firstTag = false;
        }
      });
    }

    // 6. Description + name keyword match (5 pts each, capped at 15)
    const descText =
      `${product.description || ''} ${product.name || ''}`.toLowerCase();
    let descScore = 0;
    [...intent.useCases, ...intent.tags, ...intent.styles].forEach((word) => {
      if (descScore < 15 && descText.includes(word.toLowerCase())) {
        descScore += 5;
        reasons.push(`Mentions "${word}"`);
      }
    });
    score += descScore;

    // 7. Vector similarity bonus (up to +20)
    const vectorBonus = Math.round(vectorScore * 20);

    // 8. Inventory penalty
    const inventoryStatus = product.inventoryStatus || 'IN_STOCK';
    let inventoryPenalty = 0;
    if (inventoryStatus === 'OUT_OF_STOCK') {
      inventoryPenalty = -20;
      reasons.push('Out of stock — deprioritized');
    } else if (inventoryStatus === 'LOW_STOCK') {
      inventoryPenalty = -10;
      reasons.push('Low stock — slightly deprioritized');
    }

    const rawScore = score + vectorBonus + inventoryPenalty;

    return {
      product,
      score: Math.max(0, Math.min(100, rawScore)),
      vectorScore,
      intentScore: score,
      personalizationBoost: 0,
      trendingBoost: 0,
      reasons,
    };
  }

  /**
   * Inject personalization boost based on user's StyleDNA.
   * Adjusts scores in-place, re-sorts the results array.
   */
  injectPersonalization(
    results: ScoredProduct[],
    styleDna: StyleDnaContext,
  ): ScoredProduct[] {
    if (!styleDna) return results;

    const prefColors = (styleDna.preferredColors || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim());
    const prefCats = (styleDna.preferredCategories || '')
      .toLowerCase()
      .split(',')
      .map((s) => s.trim());
    const aesthetic = (styleDna.dominantAesthetic || '').toLowerCase();
    const confidence = styleDna.confidenceScore / 100;

    return results
      .map((r) => {
        let boost = 0;
        const catSlug = (r.product.category?.slug || '').toLowerCase();
        const styleAesthetic = (
          r.product.aiMetadata?.styleAesthetic || ''
        ).toLowerCase();
        const productColors = (r.product.colors || []).map(
          (c: any) => c.color?.toLowerCase() || '',
        );

        // Category preference boost (up to 10 pts weighted by confidence)
        if (
          prefCats.some((cat) => catSlug.includes(cat) || cat.includes(catSlug))
        ) {
          boost += Math.round(10 * confidence);
        }

        // Color preference boost (up to 8 pts weighted by confidence)
        if (
          prefColors.some((color) =>
            productColors.some((pc: string) => pc.includes(color)),
          )
        ) {
          boost += Math.round(8 * confidence);
        }

        // Aesthetic alignment (up to 7 pts)
        if (aesthetic && styleAesthetic.includes(aesthetic.split(' ')[0])) {
          boost += Math.round(7 * confidence);
        }

        return {
          ...r,
          personalizationBoost: boost,
          score: Math.min(100, r.score + boost),
          reasons:
            boost > 0
              ? [
                  ...r.reasons,
                  `Matches your ${styleDna.dominantAesthetic} style profile`,
                ]
              : r.reasons,
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Apply trending boost from TrendingSnapshot data (0-100 score → up to +10 pts).
   */
  applyTrendingBoost(
    results: ScoredProduct[],
    trendingMap: Map<string, number>,
  ): ScoredProduct[] {
    return results.map((r) => {
      const trendScore = trendingMap.get(r.product.id) || 0;
      const boost = Math.round((trendScore / 100) * 10);
      return {
        ...r,
        trendingBoost: boost,
        score: Math.min(100, r.score + boost),
        reasons: boost >= 5 ? [...r.reasons, 'Currently trending'] : r.reasons,
      };
    });
  }

  /**
   * Build a relevance explanation string from the top reasons.
   */
  buildExplanation(scored: ScoredProduct, query: string): string {
    const topReasons = scored.reasons.slice(0, 3);
    if (topReasons.length === 0) {
      return `Matches "${query}" based on catalog analysis.`;
    }
    return topReasons.join('. ') + '.';
  }
}
