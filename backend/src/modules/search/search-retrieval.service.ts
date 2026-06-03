import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AiTelemetryService } from '../ai/ai-telemetry.service';
import { cleanJsonString } from '../ai/utils/json-cleaner';

import { TextEmbeddingProvider } from './adapters/text-embedding.provider';
import { InMemoryVectorAdapter } from './adapters/in-memory-vector.adapter';
import { RankingService, SearchIntent, ScoredProduct } from './ranking.service';
import { SearchAnalyticsService } from './search-analytics.service';

export interface SearchResult {
  id: string;
  name: string;
  slug: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  category: { id: string; name: string; slug: string };
  images: { url: string; isPrimary: boolean }[];
  colors: { color: string }[];
  sizes: { size: string }[];
  isNew: boolean;
  isLimited: boolean;
  inventoryStatus: string;
  score: number;
  vectorScore: number;
  relevanceExplanation: string;
  whyRetrieved: string;
  personalized: boolean;
}

export interface SearchResponse {
  results: SearchResult[];
  intent: SearchIntent | null;
  totalCount: number;
  fromCache: boolean;
  latencyMs: number;
  query: string;
  aiNarrative: string;
}

export interface AutocompleteResponse {
  suggestions: string[];
  intent: Partial<SearchIntent>;
}

/**
 * SearchRetrievalService — The core 8-stage AI retrieval pipeline for APEX LUXE.
 *
 * Pipeline stages:
 *   Stage 1: Query Understanding     — Groq Llama3 extracts structured intent
 *   Stage 2: Cache Check             — Redis cache hit skips stages 3-7
 *   Stage 3: Semantic Enrichment     — Augments intent with catalog context
 *   Stage 4: Base Retrieval          — Prisma query with AI metadata joins
 *   Stage 5: Vector Ranking          — Cosine similarity between query + product embeddings
 *   Stage 6: Multi-Factor Scoring    — RankingService applies 8-signal scoring
 *   Stage 7: Personalization         — StyleDNA injects preference boosts
 *   Stage 8: AI Reranking Narrative  — Groq generates WHY explanation for top results
 */
@Injectable()
export class SearchRetrievalService implements OnModuleInit {
  private readonly logger = new Logger(SearchRetrievalService.name);
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';
  private groqApiKey = '';
  private isConfigured = false;
  private indexReady = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly telemetry: AiTelemetryService,
    private readonly embedder: TextEmbeddingProvider,
    private readonly vectorIndex: InMemoryVectorAdapter,
    private readonly ranking: RankingService,
    private readonly analytics: SearchAnalyticsService,
  ) {
    const key = this.config.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
    }
  }

  /**
   * Build product vector index on startup.
   * Embeds each product's AI metadata text → stores in InMemoryVectorAdapter.
   */
  async onModuleInit() {
    try {
      await this.buildProductIndex();
    } catch (e: any) {
      this.logger.warn(
        `Failed to build product vector index on startup: ${e.message}`,
      );
    }
  }

  /**
   * Build or rebuild the in-memory vector index from product AI metadata.
   * Called on startup and can be triggered manually (e.g., after bulk enrichment).
   */
  async buildProductIndex(): Promise<{ indexed: number }> {
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: { aiMetadata: true, category: true, colors: true },
    });

    await this.vectorIndex.clear();

    let indexed = 0;
    for (const product of products) {
      const text = this.buildProductText(product);
      const vector = await this.embedder.embed(text);
      await this.vectorIndex.upsert(product.id, vector);
      indexed++;
    }

    this.indexReady = true;
    this.logger.log(`Vector index built: ${indexed} products indexed`);
    return { indexed };
  }

  /**
   * Stage 1: Extract structured intent from natural language query using Groq.
   */
  private async extractIntent(query: string): Promise<SearchIntent> {
    // Mock-mode fallback — keyword-based rule engine
    if (!this.isConfigured) {
      return this.extractIntentHeuristic(query);
    }

    const prompt = `You are a search intent parser for APEX LUXE luxury sportswear.
Parse the user query: "${query}"
Return ONLY a JSON object with extracted search intent:
{
  "categories": ["outerwear","tops","bottoms","footwear","accessories"],
  "styles": ["techwear","compression","minimalist","retro","classic","streetwear","performance"],
  "colors": ["onyx","slate","volt","gray","black","white","red","navy"],
  "fitTypes": ["compression","slim","tapered","boxy","regular","oversized","athletic"],
  "useCases": ["running","weightlifting","training","hiking","casual","travel","cold weather","rain","gym"],
  "tags": ["water-repellent","breathable","lightweight","thermal","stretchy","moisture-wicking","windproof"],
  "season": "summer|winter|fall|spring|all-season or null",
  "priceRange": "budget|mid|premium|luxury or null"
}
Include only relevant values. Return empty arrays for unmatched fields.`;

    try {
      const start = process.hrtime();
      const response = await axios.post<any>(
        this.groqEndpoint,
        {
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 8000,
        },
      );

      const end = process.hrtime(start);
      const latencySeconds = end[0] + end[1] / 1e9;
      const usage = response.data?.usage;

      void this.telemetry.logQuery({
        modelName: 'llama-3.1-8b-instant',
        action: 'search_intent_extraction',
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        latencySeconds,
        status: 'success',
      });

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw search intent response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      return JSON.parse(cleaned) as SearchIntent;
    } catch {
      return this.extractIntentHeuristic(query);
    }
  }

  /**
   * Rule-based intent extraction for mock mode or Groq fallback.
   */
  private extractIntentHeuristic(query: string): SearchIntent {
    const q = query.toLowerCase();
    const categories: string[] = [];
    const styles: string[] = [];
    const colors: string[] = [];
    const fitTypes: string[] = [];
    const useCases: string[] = [];
    const tags: string[] = [];

    if (q.match(/\b(jacket|shell|wind|rain|outerwear)\b/)) {
      categories.push('outerwear');
      styles.push('techwear');
      tags.push('water-repellent', 'windproof');
    }
    if (q.match(/\b(compression|tight|base.?layer)\b/)) {
      categories.push('tops');
      styles.push('compression', 'performance');
      fitTypes.push('compression');
      tags.push('moisture-wicking', 'compression');
    }
    if (q.match(/\b(hoodie|sweatshirt|pullover)\b/)) {
      categories.push('tops');
      styles.push('streetwear', 'minimalist');
    }
    if (q.match(/\b(jogger|pant|bottom)\b/)) {
      categories.push('bottoms');
      fitTypes.push('tapered', 'slim');
    }
    if (q.match(/\b(shoe|sneaker|runner|footwear|trainer)\b/)) {
      categories.push('footwear');
      tags.push('shock-absorption');
    }
    if (q.match(/\b(black|onyx|noir)\b/)) colors.push('onyx', 'black');
    if (q.match(/\b(grey|gray|slate)\b/)) colors.push('slate', 'gray');
    if (q.match(/\b(volt|neon|yellow|lime)\b/)) colors.push('volt');
    if (q.match(/\b(white|ivory)\b/)) colors.push('white');
    if (q.match(/\b(monochrome|mono|tonal)\b/)) styles.push('minimalist');
    if (q.match(/\b(minimal|clean|sleek)\b/)) styles.push('minimalist');
    if (q.match(/\b(luxury|premium|elite|apex)\b/)) styles.push('luxury');
    if (q.match(/\b(oversized|baggy|boxy)\b/))
      fitTypes.push('boxy', 'oversized');
    if (q.match(/\b(slim|fitted|athletic)\b/))
      fitTypes.push('slim', 'athletic');
    if (q.match(/\b(run|running|marathon)\b/)) {
      useCases.push('running');
      tags.push('breathable', 'lightweight');
    }
    if (q.match(/\b(gym|lift|lifting|workout|train)\b/)) {
      useCases.push('training', 'weightlifting');
    }
    if (q.match(/\b(cold|winter|thermal|warm)\b/)) {
      useCases.push('cold weather');
      tags.push('thermal');
    }
    if (q.match(/\b(lightweight|light)\b/)) tags.push('lightweight');
    if (q.match(/\b(breathe|breathable)\b/)) tags.push('breathable');
    if (q.match(/\b(stretch|stretch)\b/)) tags.push('stretchy');

    return { categories, styles, colors, fitTypes, useCases, tags };
  }

  /**
   * Generate AI narrative explaining why the top results were retrieved.
   */
  private async generateRetrievalNarrative(
    query: string,
    topProducts: any[],
    intent: SearchIntent,
  ): Promise<string> {
    if (!this.isConfigured || topProducts.length === 0) {
      const intents = [
        ...intent.categories,
        ...intent.styles,
        ...intent.colors,
        ...intent.useCases,
      ].slice(0, 3);

      if (intents.length > 0) {
        return `These ${topProducts.length} products match your search for ${intents.join(', ')} based on AI catalog analysis.`;
      }
      return `Showing ${topProducts.length} products from the APEX LUXE catalog.`;
    }

    try {
      const productList = topProducts
        .slice(0, 5)
        .map((p) => `- ${p.name} (${p.category?.name})`)
        .join('\n');

      const response = await axios.post<any>(
        this.groqEndpoint,
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            {
              role: 'user',
              content: `You are the APEX LUXE AI Stylist. In ONE sentence (max 20 words), explain why these sportswear products match the search: "${query}"
Products: ${productList}
Detected intent: ${JSON.stringify(intent)}
Write in second person, luxury tone. Focus on style, performance, or occasion match.`,
            },
          ],
          temperature: 0.6,
          max_tokens: 60,
        },
        {
          headers: {
            Authorization: `Bearer ${this.groqApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 6000,
        },
      );

      return response.data.choices[0].message.content.trim();
    } catch {
      return `These products match your ${query} intent based on APEX AI semantic analysis.`;
    }
  }

  /**
   * Generate autocomplete suggestions from a partial query.
   */
  async autocomplete(partial: string): Promise<AutocompleteResponse> {
    if (!partial || partial.trim().length < 2) {
      return { suggestions: [], intent: {} };
    }

    const cacheKey = `search:autocomplete:${partial.toLowerCase().trim()}`;
    const cached = await this.redis.get<AutocompleteResponse>(cacheKey);
    if (cached) return cached;

    // Predefined commerce-aware suggestion templates
    const SUGGEST_POOL = [
      'luxury black gym hoodie',
      'minimalist running outfit',
      'oversized monochrome fit',
      'premium athletic streetwear',
      'cold weather marathon kit',
      'waterproof outerwear shell',
      'carbon-fiber plate running shoes',
      'compression training set',
      'slate gray joggers',
      'volt neon workout gear',
      'lightweight breathable jacket',
      'thermal base layer',
      'slim-fit athletic pants',
      'techwear windbreaker',
      'onyx black compression shirt',
      'high-performance training tops',
      'outdoor athletic footwear',
      'urban minimalist activewear',
      'silver-ion odor-resistant tops',
      'four-way stretch bottoms',
    ];

    const q = partial.toLowerCase().trim();
    const matches = SUGGEST_POOL.filter(
      (s) =>
        s.includes(q) ||
        q.split(' ').some((word) => s.includes(word) && word.length > 2),
    ).slice(0, 6);

    const intent = this.extractIntentHeuristic(partial);

    const result: AutocompleteResponse = { suggestions: matches, intent };
    await this.redis.set(cacheKey, result, 300); // 5 min cache
    return result;
  }

  /**
   * Main search pipeline — 8 stages.
   */
  async search(
    query: string,
    userId?: string,
    sessionId?: string,
  ): Promise<SearchResponse> {
    const pipelineStart = Date.now();

    if (!query || query.trim().length === 0) {
      return {
        results: [],
        intent: null,
        totalCount: 0,
        fromCache: false,
        latencyMs: 0,
        query,
        aiNarrative: '',
      };
    }

    const normalizedQuery = query.trim().toLowerCase();
    const cacheKey = `search:results:${normalizedQuery}:${userId || 'anon'}`;

    // ─── Stage 2: Cache Check ────────────────────────────────────────────────
    const cached = await this.redis.get<SearchResponse>(cacheKey);
    if (cached) {
      void this.analytics.logSearchEvent({
        query,
        userId,
        sessionId,
        resultCount: cached.totalCount,
        latencyMs: Date.now() - pipelineStart,
        source: 'semantic',
      });
      return { ...cached, fromCache: true };
    }

    // ─── Stage 1: Query Understanding ───────────────────────────────────────
    const intent = await this.extractIntent(query);

    // ─── Stage 4: Base Retrieval ─────────────────────────────────────────────
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        aiMetadata: true,
        images: true,
        colors: true,
        sizes: true,
      },
    });

    // ─── Stage 5: Vector Ranking ─────────────────────────────────────────────
    const vectorScoreMap = new Map<string, number>();
    if (this.indexReady) {
      const queryVector = await this.embedder.embed(normalizedQuery);
      const vectorResults = await this.vectorIndex.query(
        queryVector,
        products.length,
      );
      vectorResults.forEach((r) => vectorScoreMap.set(r.id, r.score));
    }

    // ─── Stage 6: Multi-Factor Scoring ───────────────────────────────────────
    let scoredProducts: ScoredProduct[] = products.map((product) => {
      const vectorScore = vectorScoreMap.get(product.id) || 0;
      return this.ranking.scoreProduct(product, intent, vectorScore);
    });

    // ─── Stage 5b: Trending Boost ────────────────────────────────────────────
    const trendingSnapshots = await this.prisma.trendingSnapshot.findMany({
      select: { productId: true, score: true },
    });
    const trendingMap = new Map(
      trendingSnapshots.map((t) => [t.productId, t.score]),
    );
    scoredProducts = this.ranking.applyTrendingBoost(
      scoredProducts,
      trendingMap,
    );

    // ─── Stage 7: Personalization Injection ──────────────────────────────────
    let personalizationActive = false;
    if (userId) {
      try {
        const styleDna = await this.prisma.userStyleDNA.findUnique({
          where: { userId },
          select: {
            dominantAesthetic: true,
            preferredColors: true,
            preferredCategories: true,
            confidenceScore: true,
          },
        });

        if (styleDna) {
          scoredProducts = this.ranking.injectPersonalization(
            scoredProducts,
            styleDna,
          );
          personalizationActive = true;
        }
      } catch {
        // Non-fatal — continue without personalization
      }
    }

    // Filter out zero-score products, sort descending
    const filtered = scoredProducts
      .filter((r) => r.score > 0 || normalizedQuery.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    // ─── Stage 8: AI Reranking Narrative ─────────────────────────────────────
    const aiNarrative = await this.generateRetrievalNarrative(
      query,
      filtered.slice(0, 5).map((r) => r.product),
      intent,
    );

    const latencyMs = Date.now() - pipelineStart;

    // Map to clean response DTOs
    const results: SearchResult[] = filtered.map((r) => ({
      id: r.product.id,
      name: r.product.name,
      slug: r.product.slug,
      price: r.product.price,
      compareAtPrice: r.product.compareAtPrice,
      description: r.product.description,
      category: r.product.category,
      images: r.product.images,
      colors: r.product.colors,
      sizes: r.product.sizes,
      isNew: r.product.isNew,
      isLimited: r.product.isLimited,
      inventoryStatus: r.product.inventoryStatus,
      score: r.score,
      vectorScore: Math.round(r.vectorScore * 100),
      relevanceExplanation: this.ranking.buildExplanation(r, query),
      whyRetrieved: this.ranking.buildExplanation(r, query),
      personalized: personalizationActive && r.personalizationBoost > 0,
    }));

    const response: SearchResponse = {
      results,
      intent,
      totalCount: results.length,
      fromCache: false,
      latencyMs,
      query,
      aiNarrative,
    };

    // Cache for 5 minutes (300s)
    await this.redis.set(cacheKey, response, 300);

    // Log analytics (non-blocking)
    void this.analytics.logSearchEvent({
      query,
      userId,
      sessionId,
      resultCount: results.length,
      topProductId: results[0]?.id,
      intentJson: JSON.stringify(intent),
      latencyMs,
      source: personalizationActive ? 'personalized' : 'semantic',
    });

    return response;
  }

  /**
   * Get trending products, boosted by TrendingSnapshot scores.
   */
  async getTrending(limit = 12): Promise<any[]> {
    const cacheKey = `search:trending:${limit}`;
    const cached = await this.redis.get<any[]>(cacheKey);
    if (cached) return cached;

    const snapshots = await this.prisma.trendingSnapshot.findMany({
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        product: {
          include: {
            category: true,
            images: true,
            colors: true,
          },
        },
      },
    });

    const products = snapshots
      .filter((s) => s.product && !s.product.deletedAt)
      .map((s) => ({
        ...s.product,
        trendingScore: s.score,
      }));

    // Fallback if no trending data: return newest products
    if (products.length === 0) {
      const newest = await this.prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { category: true, images: true, colors: true },
      });
      await this.redis.set(cacheKey, newest, 600);
      return newest;
    }

    await this.redis.set(cacheKey, products, 600); // 10 min cache
    return products;
  }

  /**
   * Build searchable text representation of a product for embedding.
   */
  private buildProductText(product: any): string {
    const parts = [
      product.name || '',
      product.description || '',
      product.category?.name || '',
      product.category?.slug || '',
      ...(product.colors || []).map((c: any) => c.color || ''),
      product.aiMetadata?.styleAesthetic || '',
      product.aiMetadata?.fitType || '',
      product.aiMetadata?.primaryUseCases || '',
      product.aiMetadata?.aiTags || '',
      product.aiMetadata?.sensoryDescription || '',
    ];
    return parts.filter(Boolean).join(' ');
  }
}
