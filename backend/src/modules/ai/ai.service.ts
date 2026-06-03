import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { AiTelemetryService } from './ai-telemetry.service';
import { cleanJsonString } from './utils/json-cleaner';

export interface GroqChatCompletionResponse {
  choices: {
    message: {
      role: string;
      content: string;
    };
  }[];
}

export interface GroqOutfitResult {
  theme: string;
  description: string;
  itemIds: string[];
}

export interface GroqSearchParserResult {
  search: string;
  categorySlug: string | null;
}

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private groqApiKey = '';
  private isConfigured = false;
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    @InjectQueue('ai-catalog') private readonly aiCatalogQueue: Queue,
    private readonly telemetry: AiTelemetryService,
  ) {}

  onModuleInit() {
    const key = this.configService.get<string>('GROQ_API_KEY');
    if (key && !key.startsWith('gsk_mock')) {
      this.groqApiKey = key;
      this.isConfigured = true;
      this.logger.log('Groq AI service successfully configured.');
    } else {
      this.logger.warn(
        'Groq API keys are missing or set to mock keys. Groq AI queries will return simulated responses.',
      );
    }
  }

  public async executeGroqCall(
    model: string,
    messages: { role: string; content: string }[],
    action: string,
    responseFormatObj?: any,
    temperature = 0.5,
  ): Promise<any> {
    const start = process.hrtime();
    const payload: any = {
      model,
      messages,
      temperature,
    };
    if (responseFormatObj) {
      payload.response_format = responseFormatObj;
    }

    try {
      const response = await axios.post<any>(this.groqEndpoint, payload, {
        headers: {
          Authorization: `Bearer ${this.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 seconds timeout (E.5)
      });

      const end = process.hrtime(start);
      const latencySeconds = end[0] + end[1] / 1e9;
      const usage = response.data?.usage;
      const promptTokens = usage?.prompt_tokens || 0;
      const completionTokens = usage?.completion_tokens || 0;

      // Log success telemetry
      void this.telemetry.logQuery({
        modelName: model,
        action,
        promptTokens,
        completionTokens,
        latencySeconds,
        status: 'success',
      });

      return response;
    } catch (e: any) {
      const end = process.hrtime(start);
      const latencySeconds = end[0] + end[1] / 1e9;
      const errorMessage =
        e.response?.data?.error?.message || e.message || String(e);

      // Log failure telemetry
      void this.telemetry.logQuery({
        modelName: model,
        action,
        promptTokens: 0,
        completionTokens: 0,
        latencySeconds,
        status: 'failed',
        errorMessage,
      });

      throw e;
    }
  }

  async getChatbotResponse(messages: { role: string; content: string }[]) {
    // 1. Fetch available products to build context
    const products = await this.prisma.product.findMany({
      include: { category: true },
      take: 8,
    });

    const contextStr = products
      .map(
        (p) =>
          `- ${p.name} (${p.category.name}): $${p.price}. ${p.description}`,
      )
      .join('\n');

    const systemPrompt = {
      role: 'system',
      content: `You are the APEX LUXE AI Stylist. You are an expert in technical, high-performance men's sportswear and minimal luxury fashion.
Your tone is professional, sophisticated, clean, and helpful. Focus on fabric technology, compression, thermal regulation, and styling aesthetics.
You have access to the APEX LUXE catalog below. Only suggest products when the user's query is contextually requesting or expecting product recommendations or styling options. Do not force product recommendations if they are not relevant to the user's request.
Catalog:
${contextStr}
Help users pick items based on their routines (e.g. running, weightlifting, travel) and curate perfect styling combinations only when contextually relevant.`,
    };

    const groqPayload = {
      model: 'llama-3.1-8b-instant',
      messages: [systemPrompt, ...messages],
      temperature: 0.7,
      max_tokens: 500,
    };

    if (!this.isConfigured) {
      // Simulate on-brand stylist response
      const lastUserMsg = messages[messages.length - 1]?.content || '';
      return this.generateMockStylistReply(lastUserMsg);
    }

    try {
      const response = await this.executeGroqCall(
        'llama-3.1-8b-instant',
        [systemPrompt, ...messages],
        'chatbot',
        null,
        0.7,
      );

      return response.data.choices[0].message.content;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Groq API completion request failed: ${errMsg}`);
      return 'The APEX AI system encountered a brief connection delay. For high performance, we recommend pairing the Vortex Compression Shirt V2 with the Core Performance Joggers for structural warmth and muscle recovery.';
    }
  }

  async generateOutfit(theme: string) {
    const products = await this.prisma.product.findMany({
      include: { images: true, category: true },
    });

    if (!this.isConfigured) {
      // Return structured mock outfit suggestion
      const tops = products.filter((p) => p.category.slug === 'tops');
      const bottoms = products.filter((p) => p.category.slug === 'bottoms');
      const footwear = products.filter((p) => p.category.slug === 'footwear');

      return {
        theme: theme.toUpperCase(),
        description: `Technical outfit curated for ${theme}. Engineered with advanced moisture management and streamlined fit guidelines.`,
        items: [
          tops[0] || null,
          bottoms[0] || null,
          footwear[0] || null,
        ].filter(Boolean),
      };
    }

    const prompt = `Based on the following sportswear catalog, select 3 matching items (a Top, a Bottom, and a Footwear) that fit the theme "${theme}".
Return only a JSON object structured exactly like this:
{
  "theme": "theme description",
  "description": "stylist narrative about the gear compatibility",
  "itemIds": ["product-id-1", "product-id-2", "product-id-3"]
}
Catalog:
${products.map((p) => `ID: ${p.id} | Name: ${p.name} | Category: ${p.category.slug}`).join('\n')}`;

    try {
      const response = await this.executeGroqCall(
        'llama-3.1-8b-instant',
        [{ role: 'user', content: prompt }],
        'outfit_curation',
        { type: 'json_object' },
        0.2,
      );

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw Groq response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      this.logger.log(`Cleaned Groq response length: ${cleaned.length}`);
      const result = JSON.parse(cleaned) as GroqOutfitResult;
      this.logger.log(`Successfully parsed Groq outfit result`);
      const items = await this.prisma.product.findMany({
        where: { id: { in: result.itemIds } },
        include: { images: true, category: true },
      });

      return {
        theme: result.theme,
        description: result.description,
        items,
      };
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Groq outfit generation failed: ${errMsg}`);
      return {
        theme: theme.toUpperCase(),
        description: 'Standard coordinated technical setup.',
        items: products.slice(0, 3),
      };
    }
  }

  async parseSemanticSearch(query: string) {
    if (!this.isConfigured) {
      // Mock natural search parser mapping
      const q = query.toLowerCase();
      if (q.includes('run') || q.includes('rain') || q.includes('drizzle')) {
        return { search: 'Shell', categorySlug: 'outerwear' };
      }
      if (
        q.includes('compression') ||
        q.includes('workout') ||
        q.includes('tee')
      ) {
        return { search: 'Compression', categorySlug: 'tops' };
      }
      return { search: query, categorySlug: undefined };
    }

    const prompt = `You are a search parser query builder. Translate the user search request "${query}" into database filtering fields.
Return only a JSON object structured exactly like this:
{
  "search": "primary search keyword or empty string",
  "categorySlug": "outerwear" or "tops" or "bottoms" or "footwear" or "accessories" or null
}`;

    try {
      const response = await this.executeGroqCall(
        'llama-3.1-8b-instant',
        [{ role: 'user', content: prompt }],
        'search_parse',
        { type: 'json_object' },
        0.1,
      );

      const raw = response.data.choices[0].message.content;
      this.logger.log(`Raw Groq response length: ${raw?.length || 0}`);
      const cleaned = cleanJsonString(raw);
      this.logger.log(`Cleaned Groq response length: ${cleaned.length}`);
      const parsed = JSON.parse(cleaned) as GroqSearchParserResult;
      this.logger.log(`Successfully parsed Groq search parser result`);
      return parsed;
    } catch {
      return { search: query, categorySlug: null };
    }
  }

  async summarizeProductReviews(productId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
    });

    if (reviews.length === 0) {
      return 'No reviews have been written for this product yet.';
    }

    if (!this.isConfigured) {
      return 'Pros: Incredibly soft compression knit fabric, excellent moisture wicking, permanent silver-ion odor resistance. Cons: Tight athletic compression fit, some users suggest sizing up for everyday comfort.';
    }

    const reviewText = reviews
      .map(
        (r) =>
          `- Rating: ${r.rating}* | Title: ${r.title} | Comment: ${r.comment}`,
      )
      .join('\n');
    const prompt = `Summarize customer reviews for a sportswear product. Create a bulleted breakdown list showing major Pros and Cons.
Reviews:
${reviewText}`;

    try {
      const response = await this.executeGroqCall(
        'llama-3.1-8b-instant',
        [{ role: 'user', content: prompt }],
        'reviews_summary',
        null,
        0.5,
      );

      return response.data.choices[0].message.content;
    } catch {
      return 'Review summary is temporarily loading.';
    }
  }

  async generateAnalyticsInsights(statsSummary: string): Promise<string> {
    const prompt = `You are a Senior Retail AI Business Analyst at APEX LUXE, an elite luxury technical sportswear company.
Review the following business telemetry data and generate a premium, executive-level natural language briefing.
Analyze:
1. Sales Trends & Velocity: Note changes in category performance.
2. Inventory Health: Highlight low stock or out of stock items and make precise restock suggestions.
3. Customer Behavior: Summarize order averages and traffic channel opportunities.

Provide the response as a bulleted executive brief with clear headings (Sales Insights, Inventory Health, Restock Suggestions, Customer Insights). Keep it concise, sharp, and highly strategic.

Telemetry Data:
${statsSummary}`;

    const groqPayload = {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.5,
      max_tokens: 600,
    };

    if (!this.isConfigured) {
      return `### Sales Insights
* Monthly velocity remains robust, driven by outerwear checkouts which represent 34% of overall volume.
* Average order values are stable at $184.50.

### Inventory Health & Restock Warnings
* Out of stock alert: Vortex Compression Shirt is out of stock. Stock replenishment is urgent.
* Low stock alert: Atmos Wind Shell is at 3 units, below the threshold of 5.

### Restock Suggestions
* Reorder 50 units of Vortex Compression Shirt.
* Reorder 20 units of Atmos Wind Shell to prevent stockouts in the next 5 days.

### Customer Insights
* Direct channel conversions are leading at 3.2%, but social referral traffic is growing at 12% week-on-week.`;
    }

    try {
      const response = await this.executeGroqCall(
        'llama-3.1-8b-instant',
        [{ role: 'user', content: prompt }],
        'analytics_insights',
        null,
        0.5,
      );
      return response.data.choices[0].message.content;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Groq AI analytics completion failed: ${errMsg}`);
      return 'AI analytics briefing is temporarily unavailable. Check database telemetry details for raw metrics.';
    }
  }

  private generateMockStylistReply(query: string): string {
    const q = query.toLowerCase();

    if (q.includes('run') || q.includes('drizzle') || q.includes('outdoor')) {
      return `For outdoor running or cold drizzle conditions, the **Atmos Wind Shell** ($185.00) is highly recommended. It features lightweight, packable windproof fabrics with DWR coating to repel light rain. I suggest pairing it with our thermal compression tops for ideal warmth-to-weight performance.`;
    }

    if (
      q.includes('compression') ||
      q.includes('gym') ||
      q.includes('lifting')
    ) {
      return `For heavy weightlifting and intense gym routines, the **Vortex Compression Shirt V2** ($145.00) offers superior structural support. The targeted Vortex™ compression panels aid oxygen circulation, while silver-ion technology ensures permanent freshness. Pair this with our **Core Performance Joggers** ($120.00) to keep muscles warm between sets.`;
    }

    return `Welcome to the APEX LUXE technical wardrobe. Our sportswear is engineered with high-end fabric compounds like CARBON-CORE™ and HYDROSHELL™ for uncompromising physical mastery. What style or activity are you preparing for?`;
  }

  async enrichProduct(productId: string): Promise<any> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        specs: true,
        colors: true,
      },
    });

    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const otherProducts = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        deletedAt: null,
      },
      include: { category: true },
      take: 20,
    });

    let aiData: {
      styleAesthetic: string;
      gymStreetwearUsage: string;
      fitType: string;
      primaryUseCases: string;
      outfitCompatibility: string[];
      aiTags: string[];
      sensoryDescription: string;
    };

    if (!this.isConfigured) {
      // Return high-quality mocked AI metadata matching product attributes
      const slug = (product.slug || '').toLowerCase();
      const cat = (product.category?.slug || '').toLowerCase();

      let styleAesthetic = 'Minimalist Luxury';
      let gymStreetwearUsage = '50% Gym / 50% Streetwear';
      let fitType = 'Regular Fit';
      let primaryUseCases = 'Leisurewear, urban mobility, layering';
      let aiTags = ['premium', 'versatile', 'luxury'];
      let sensoryDescription =
        'Supple textured weave with clean structural drape and comfortable weight.';

      if (
        cat.includes('outerwear') ||
        slug.includes('shell') ||
        slug.includes('jacket')
      ) {
        styleAesthetic = 'Cyberpunk Techwear';
        gymStreetwearUsage = '30% Gym / 70% Streetwear';
        fitType = 'Athletic Slim';
        primaryUseCases = 'Running, wet weather layering, outdoor transit';
        aiTags = ['water-repellent', 'windproof', 'lightweight', 'aerodynamic'];
        sensoryDescription =
          'Silky smooth technical shell fabric with lightweight matte surface barrier.';
      } else if (
        cat.includes('tops') &&
        (slug.includes('compression') || slug.includes('vortex'))
      ) {
        styleAesthetic = 'High-Performance Compression';
        gymStreetwearUsage = '95% Gym / 5% Streetwear';
        fitType = 'Compression Fit';
        primaryUseCases =
          'Weightlifting, track running, base layer thermal regulation';
        aiTags = [
          'moisture-wicking',
          'compression',
          'odor-resistant',
          'elastic',
        ];
        sensoryDescription =
          'Sleek, body-mapped compression fabric with structural cool-touch mesh panels.';
      } else if (
        cat.includes('bottoms') ||
        slug.includes('jogger') ||
        slug.includes('pant')
      ) {
        styleAesthetic = 'Modern Athletic Minimal';
        gymStreetwearUsage = '70% Gym / 30% Streetwear';
        fitType = 'Tapered Slim';
        primaryUseCases = 'Gym training, rest recovery, active lounging';
        aiTags = ['breathable', 'four-way-stretch', 'thermal-retention'];
        sensoryDescription =
          'Ultra-soft technical fleece liner with smooth brushed exterior finish.';
      } else if (
        cat.includes('footwear') ||
        slug.includes('shoe') ||
        slug.includes('runner')
      ) {
        styleAesthetic = 'Apex Aerodynamic';
        gymStreetwearUsage = '60% Gym / 40% Streetwear';
        fitType = 'Anatomical Precision';
        primaryUseCases =
          'Sprint intervals, road running, high-impact workouts';
        aiTags = ['shock-absorption', 'knit-upper', 'carbon-plate'];
        sensoryDescription =
          'Precision woven breathable knit wrap with responsive carbon density sole cushioning.';
      }

      // Pick up to 3 other product IDs from different categories
      const compatIds = otherProducts
        .filter((p) => p.categoryId !== product.categoryId)
        .slice(0, 3)
        .map((p) => p.id);

      aiData = {
        styleAesthetic,
        gymStreetwearUsage,
        fitType,
        primaryUseCases,
        outfitCompatibility: compatIds,
        aiTags,
        sensoryDescription,
      };
    } else {
      const prompt = `You are the APEX LUXE Retail AI Fashion Specialist.
Analyze the following product details:
Product Name: ${product.name}
Category: ${product.category.name}
Description: ${product.description}
Price: $${product.price}
Specs: ${JSON.stringify(product.specs.map((s) => `${s.key}: ${s.value}`))}
Colors: ${JSON.stringify(product.colors.map((c) => c.color))}

Select 2-3 compatible product IDs from the list below that form a stylish, high-performance outfit combination with this item.
Available Catalog IDs for Compatibility:
${otherProducts.map((p) => `ID: ${p.id} | Name: ${p.name} | Category: ${p.category.name}`).join('\n')}

Return ONLY a JSON object structured exactly like this:
{
  "styleAesthetic": "string",
  "gymStreetwearUsage": "string",
  "fitType": "string",
  "primaryUseCases": "string",
  "outfitCompatibility": ["productId-1", "productId-2"],
  "aiTags": ["tag1", "tag2"],
  "sensoryDescription": "string"
}`;

      try {
        const response = await this.executeGroqCall(
          'llama-3.3-70b-versatile',
          [{ role: 'user', content: prompt }],
          'catalog_enrichment_70b',
          { type: 'json_object' },
          0.2,
        );

        const raw = response.data.choices[0].message.content;
        this.logger.log(`Raw Groq response length: ${raw?.length || 0}`);
        const cleaned = cleanJsonString(raw);
        this.logger.log(`Cleaned Groq response length: ${cleaned.length}`);
        aiData = JSON.parse(cleaned);
        this.logger.log(`Successfully parsed Groq product enrichment (70b)`);
      } catch (e: any) {
        this.logger.error(
          `Groq product enrichment failed: ${e.message}. Falling back to Llama 8b.`,
        );
        try {
          const response = await this.executeGroqCall(
            'llama-3.1-8b-instant',
            [{ role: 'user', content: prompt }],
            'catalog_enrichment_8b',
            { type: 'json_object' },
            0.2,
          );
          const raw = response.data.choices[0].message.content;
          this.logger.log(`Raw Groq response length: ${raw?.length || 0}`);
          const cleaned = cleanJsonString(raw);
          this.logger.log(`Cleaned Groq response length: ${cleaned.length}`);
          aiData = JSON.parse(cleaned);
          this.logger.log(`Successfully parsed Groq product enrichment (8b)`);
        } catch (innerErr: any) {
          throw new Error(
            `Groq API catalog classification failed: ${innerErr.message}`,
          );
        }
      }
    }

    // Upsert ProductAiMetadata in DB
    const enriched = await this.prisma.productAiMetadata.upsert({
      where: { productId },
      create: {
        productId,
        styleAesthetic: aiData.styleAesthetic,
        gymStreetwearUsage: aiData.gymStreetwearUsage,
        fitType: aiData.fitType,
        primaryUseCases: aiData.primaryUseCases,
        outfitCompatibility: aiData.outfitCompatibility?.join(','),
        aiTags: aiData.aiTags?.join(','),
        sensoryDescription: aiData.sensoryDescription,
        syncedAt: new Date(),
      },
      update: {
        styleAesthetic: aiData.styleAesthetic,
        gymStreetwearUsage: aiData.gymStreetwearUsage,
        fitType: aiData.fitType,
        primaryUseCases: aiData.primaryUseCases,
        outfitCompatibility: aiData.outfitCompatibility?.join(','),
        aiTags: aiData.aiTags?.join(','),
        sensoryDescription: aiData.sensoryDescription,
        syncedAt: new Date(),
      },
    });

    return enriched;
  }

  async getEnrichmentStatus(): Promise<any> {
    const totalProducts = await this.prisma.product.count({
      where: { deletedAt: null },
    });

    const enrichedCount = await this.prisma.productAiMetadata.count({
      where: {
        syncedAt: { not: null },
        product: { deletedAt: null },
      },
    });

    const percent =
      totalProducts > 0 ? Math.round((enrichedCount / totalProducts) * 100) : 0;

    // Fetch active aesthetics breakdown
    const enrichedItems = await this.prisma.productAiMetadata.findMany({
      where: { product: { deletedAt: null } },
      select: { styleAesthetic: true },
    });

    const aesthetics: Record<string, number> = {};
    enrichedItems.forEach((item) => {
      const aesthetic = item.styleAesthetic || 'Other';
      aesthetics[aesthetic] = (aesthetics[aesthetic] || 0) + 1;
    });

    return {
      totalProducts,
      enrichedCount,
      percent,
      aesthetics,
    };
  }

  async runBulkEnrichment(): Promise<any> {
    // Fetch all products in the catalog
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    // Add each product as a separate job to the BullMQ queue
    const jobs = await Promise.all(
      products.map((p) =>
        this.aiCatalogQueue.add(
          'enrich-single-product',
          { productId: p.id },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 3000,
            },
          },
        ),
      ),
    );

    return {
      message: 'Bulk catalog enrichment initialized.',
      jobsCount: jobs.length,
    };
  }

  async getCompatibleOutfits(productId: string): Promise<any> {
    const metadata = await this.prisma.productAiMetadata.findUnique({
      where: { productId },
    });

    if (metadata && metadata.outfitCompatibility) {
      const compatibleIds = metadata.outfitCompatibility
        .split(',')
        .filter(Boolean);
      if (compatibleIds.length > 0) {
        const products = await this.prisma.product.findMany({
          where: {
            id: { in: compatibleIds },
            deletedAt: null,
          },
          include: { images: true, category: true },
        });
        if (products.length > 0) {
          return products;
        }
      }
    }

    // Fallback: fetch products from different categories
    const currentProduct = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    const fallbackProducts = await this.prisma.product.findMany({
      where: {
        categoryId: { not: currentProduct?.categoryId },
        id: { not: productId },
        deletedAt: null,
      },
      include: { images: true, category: true },
      take: 3,
    });
    return fallbackProducts;
  }

  async semanticSearch(query: string): Promise<any> {
    let intent: {
      categories: string[];
      styles: string[];
      colors: string[];
      fitTypes: string[];
      useCases: string[];
      tags: string[];
    };

    if (!this.isConfigured) {
      // Mock natural language parsing intent based on keyword searches
      const q = query.toLowerCase();
      const categories: string[] = [];
      const styles: string[] = [];
      const colors: string[] = [];
      const fitTypes: string[] = [];
      const useCases: string[] = [];
      const tags: string[] = [];

      if (
        q.includes('wind') ||
        q.includes('rain') ||
        q.includes('jacket') ||
        q.includes('outerwear')
      ) {
        categories.push('outerwear');
        styles.push('techwear');
        useCases.push('running', 'wet weather', 'wind');
        tags.push('water-repellent', 'windproof');
      }
      if (
        q.includes('compression') ||
        q.includes('base') ||
        q.includes('lifting') ||
        q.includes('gym')
      ) {
        categories.push('tops');
        styles.push('compression', 'performance');
        useCases.push('lifting', 'training');
        tags.push('compression', 'moisture-wicking');
      }
      if (q.includes('black') || q.includes('onyx')) {
        colors.push('onyx');
      }
      if (q.includes('grey') || q.includes('slate')) {
        colors.push('slate');
      }

      intent = { categories, styles, colors, fitTypes, useCases, tags };
    } else {
      const prompt = `You are a search parser query builder. Translate the natural language search request "${query}" into structured database filter tags.
Return ONLY a JSON object structured exactly like this:
{
  "categories": ["outerwear", "tops", "bottoms", "footwear", "accessories"],
  "styles": ["techwear", "compression", "minimalist", "retro", "classic"],
  "colors": ["onyx", "slate", "volt", "gray", "black", "white"],
  "fitTypes": ["compression", "slim", "boxy", "regular"],
  "useCases": ["running", "weightlifting", "raining", "windy", "cold", "casual"],
  "tags": ["water-repellent", "breathable", "lightweight", "thermal", "stretchy"]
}`;

      try {
        const response = await axios.post<GroqChatCompletionResponse>(
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
        this.logger.log(`Raw Groq response length: ${raw?.length || 0}`);
        const cleaned = cleanJsonString(raw);
        this.logger.log(`Cleaned Groq response length: ${cleaned.length}`);
        intent = JSON.parse(cleaned);
        this.logger.log(`Successfully parsed Groq intent extraction (70b)`);
      } catch (error) {
        try {
          const response = await axios.post<GroqChatCompletionResponse>(
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
            },
          );
          const raw = response.data.choices[0].message.content;
          this.logger.log(`Raw Groq response length: ${raw?.length || 0}`);
          const cleaned = cleanJsonString(raw);
          this.logger.log(`Cleaned Groq response length: ${cleaned.length}`);
          intent = JSON.parse(cleaned);
          this.logger.log(`Successfully parsed Groq intent extraction (8b)`);
        } catch {
          // Empty fallback on failure
          intent = {
            categories: [],
            styles: [],
            colors: [],
            fitTypes: [],
            useCases: [],
            tags: [],
          };
        }
      }
    }

    // Search database for non-deleted products
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: {
        category: true,
        aiMetadata: true,
        images: true,
      },
    });

    const results = products.map((product) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Category Matching
      if (
        intent.categories.length > 0 &&
        intent.categories.includes(product.category?.slug)
      ) {
        score += 30;
        reasons.push(`Matches category "${product.category?.name}"`);
      }

      // 2. AI Metadata Aesthetics/Style Matching
      const meta = product.aiMetadata;
      if (meta) {
        const styleText = (meta.styleAesthetic || '').toLowerCase();
        intent.styles.forEach((style) => {
          if (styleText.includes(style.toLowerCase())) {
            score += 15;
            reasons.push(`Aligned with "${style}" aesthetic style`);
          }
        });

        // 3. Fit type matching
        const fitText = (meta.fitType || '').toLowerCase();
        intent.fitTypes.forEach((fit) => {
          if (fitText.includes(fit.toLowerCase())) {
            score += 10;
            reasons.push(`Matches "${fit}" fit preference`);
          }
        });

        // 4. Primary Use Cases matching
        const useCasesText = (meta.primaryUseCases || '').toLowerCase();
        intent.useCases.forEach((useCase) => {
          if (useCasesText.includes(useCase.toLowerCase())) {
            score += 15;
            reasons.push(`Designed for ${useCase}`);
          }
        });

        // 5. AI Tags matching
        const tagsText = (meta.aiTags || '').toLowerCase();
        intent.tags.forEach((tag) => {
          if (tagsText.includes(tag.toLowerCase())) {
            score += 15;
            reasons.push(`Contains technical attribute "${tag}"`);
          }
        });
      }

      // 6. Description keyword matching
      const descText =
        product.description.toLowerCase() + ' ' + product.name.toLowerCase();
      intent.useCases.concat(intent.tags).forEach((word) => {
        if (descText.includes(word.toLowerCase())) {
          score += 5;
          reasons.push(`Mentions details relating to "${word}"`);
        }
      });

      return {
        product,
        score: Math.min(score, 100),
        reasons,
      };
    });

    // Sort by relevance score desc and filter out zero scores
    let filteredResults = results;
    if (query.trim().length > 0) {
      filteredResults = results.filter((r) => r.score > 0);
    }
    filteredResults.sort((a, b) => b.score - a.score);

    return filteredResults.map((r) => ({
      ...r.product,
      score: r.score,
      relevanceExplanation: r.reasons.slice(0, 3).join('. ') + '.',
    }));
  }
}
