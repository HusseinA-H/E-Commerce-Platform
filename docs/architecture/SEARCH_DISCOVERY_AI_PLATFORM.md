# SEARCH_DISCOVERY_AI_PLATFORM.md
# APEX LUXE — Phase F: AI Search, Discovery & Retrieval Platform

## Executive Summary

Phase F transforms APEX LUXE into a semantic commerce intelligence platform. The system replaces basic keyword search with an 8-stage AI retrieval pipeline that understands natural language intent, ranks by semantic similarity and user style preferences, supports visual product discovery, tracks commerce-grade search analytics, and is architecturally ready for vector database integration.

---

## Architecture Overview

```
User Query
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│                   8-Stage Retrieval Pipeline                     │
│                                                                  │
│  [1] Query Understanding  →  Groq Llama3 intent extraction       │
│  [2] Cache Check          →  Redis 5min TTL per query+userId     │
│  [3] Semantic Enrichment  →  Augment intent with catalog context │
│  [4] Base Retrieval       →  Prisma query + AI metadata joins    │
│  [5] Vector Ranking       →  128-dim cosine similarity           │
│  [6] Multi-Factor Scoring →  8-signal scoring (RankingService)  │
│  [7] Personalization      →  StyleDNA preference injection       │
│  [8] AI Narrative         →  Groq WHY-explanation generation     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
SearchResponse { results, intent, aiNarrative, latencyMs, fromCache }
```

---

## Module Architecture (F.1–F.8)

### F.1 — Semantic Search Engine

**Endpoint:** `GET /search?q=<query>&userId=<id>`

**Understands:**
- Natural language: "luxury black gym hoodie", "cold weather marathon kit"
- Style intent: minimalist, techwear, compression, streetwear
- Color intents: onyx, slate, volt, monochrome
- Fit preferences: compression, slim, tapered, boxy, oversized
- Use cases: running, lifting, cold weather, travel, casual
- Seasonality: winter gear, summer performance
- Technical attributes: water-repellent, moisture-wicking, thermal, breathable

**Fallback:** Keyword rule engine (60+ regex patterns) when Groq unavailable

---

### F.2 — Retrieval Pipeline (SearchRetrievalService)

Full 8-stage pipeline with:

| Stage | Component | Description |
|---|---|---|
| 1 | `extractIntent()` | Groq Llama3 → structured JSON intent |
| 2 | Redis Cache | 5-min TTL, keyed by `query:userId` |
| 3 | Prisma Query | Products with AI metadata, images, colors |
| 4 | `TextEmbeddingProvider` | 128-dim weighted hash vector of query |
| 5 | `InMemoryVectorAdapter` | Cosine similarity over product index |
| 6 | `RankingService.scoreProduct()` | 8-signal multi-factor scoring |
| 7 | `RankingService.injectPersonalization()` | StyleDNA preference boost |
| 8 | `generateRetrievalNarrative()` | Groq WHY-explanation (≤20 words) |

**Scoring Signals (max 100 pts + bonuses):**

| Signal | Points |
|---|---|
| Category intent match | 30 |
| Style/aesthetic match | 15 |
| Fit type match | 10 |
| Use case match | 15 (×2 cap) |
| AI tag match | 15 + 5 subsequent |
| Description keyword | 5 each, cap 15 |
| Vector cosine bonus | up to +20 |
| Personalization boost | up to +15 |
| Trending boost | up to +10 |
| OUT_OF_STOCK penalty | -20 |
| LOW_STOCK penalty | -10 |

---

### F.3 — Vector Search Preparation

#### Abstraction Layer

```
EmbeddingProvider (interface)
  └── TextEmbeddingProvider (current: in-process TF-IDF weighted hash, 128-dim)
  └── [Future] OpenAIEmbeddingProvider (text-embedding-3-small, 1536-dim)
  └── [Future] GroqEmbeddingProvider (when available)

VectorIndexAdapter (interface)
  └── InMemoryVectorAdapter (current: Map-based cosine similarity)
  └── [Future] PineconeVectorAdapter
  └── [Future] PgVectorAdapter (PostgreSQL pgvector extension)
  └── [Future] WeaviateVectorAdapter
  └── [Future] QdrantVectorAdapter
```

#### Migration Path to pgvector

1. Add `vector VECTOR(1536)` column to Product table via Prisma extension
2. Implement `PgVectorAdapter` implementing `VectorIndexAdapter`
3. Implement `OpenAIEmbeddingProvider` implementing `EmbeddingProvider`
4. Swap providers in `SearchModule` providers array — **zero changes to SearchRetrievalService**

#### Migration Path to Pinecone

1. `npm install @pinecone-database/pinecone`
2. Implement `PineconeVectorAdapter` with upsert/query/delete using Pinecone SDK
3. Swap in `SearchModule` — **zero changes elsewhere**

#### TextEmbeddingProvider Technical Details

- **Algorithm:** Domain-weighted hash projection into 128-dim float vector space
- **Tokenization:** Lowercase, split on non-alphanumeric, filter length > 1
- **Domain weights:** 30+ sportswear-specific terms amplified (compression: 3.0×, thermal: 2.5×, waterproof: 2.5×, etc.)
- **Hash functions:** Two independent polynomial rolling hashes (h1: FNV-style, h2: XOR-rotate)
- **Normalization:** L2 unit vector normalization for cosine similarity
- **Deterministic:** Same text always produces same vector
- **Performance:** ~0.1ms per embed (in-process, no network)

---

### F.4 — Visual Search System (VisualSearchService)

**Endpoint:** `POST /search/visual` `{ imageUrl: string }`

**Vision Extraction (VisionRetrievalAdapter pattern):**

Current: `llama-3.2-11b-vision-preview` (Groq)

Extracted attributes:
- `colors[]` — Primary colorway (e.g., "onyx black", "slate gray", "volt yellow")
- `style` — Style category (techwear, compression, minimalist, athletic)
- `garmentType` — Category mapping (tops, bottoms, outerwear, footwear, accessories)
- `fit` — Silhouette descriptor (compression, slim, tapered, regular, boxy, oversized)
- `aesthetic` — Overall label (e.g., "Cyberpunk Techwear", "Minimalist Performance")

**Future Vision Provider Swap:**
- Replace `_callVisionProvider()` body with OpenAI GPT-4o, Gemini 1.5 Pro, or Claude 3.5 Vision call
- Zero changes to scoring/ranking logic

**Scoring:** Category/aesthetic/fit/color matching against `ProductAiMetadata`

**Logging:** `VisualSearchHistory` table tracks all visual search sessions

---

### F.5 — AI Discovery Ranking (RankingService)

Pure, stateless scoring service with composable ranking functions:

```typescript
scoreProduct(product, intent, vectorScore)    → ScoredProduct
injectPersonalization(results, styleDna)      → ScoredProduct[] (re-sorted)
applyTrendingBoost(results, trendingMap)      → ScoredProduct[]
buildExplanation(scored, query)               → string
```

StyleDNA personalization factors:
- Preferred category alignment (weight: 10 × confidence/100)
- Preferred color alignment (weight: 8 × confidence/100)
- Dominant aesthetic alignment (weight: 7 × confidence/100)

Trending boost: `TrendingSnapshot.score / 100 × 10` (max +10 pts)

---

### F.6 — Personalized Discovery

StyleDNA context injected when `userId` is provided in search request:

1. `UserStyleDNA` fetched (computed by `StyleDnaService` from orders + wishlist + views)
2. `dominantAesthetic` → boosts products with matching `aiMetadata.styleAesthetic`
3. `preferredColors` → boosts products with matching `ProductColor.color` entries
4. `preferredCategories` → boosts products in user's dominant categories
5. Confidence score scales all boosts: 100% confidence = full boost weight

Personalization badge shown in frontend when `result.personalized === true`.

---

### F.7 — AI Search Analytics (SearchAnalyticsService)

**Table:** `SearchAnalyticsEvent`

Tracked per search:
- Query string (max 500 chars)
- User ID + Session ID
- Result count
- Top product ID
- AI intent JSON snapshot
- Retrieval latency (ms)
- Source: semantic | visual | personalized | trending | autocomplete
- Click-through flag
- Conversion flag

**Aggregations (30-day window):**
- Total searches & unique queries
- Zero-result rate (discovery gap indicator)
- Average result count & latency
- Top 10 queries by frequency
- Zero-result queries (catalog gap opportunities)
- Source breakdown (semantic vs visual vs personalized)
- Click-through rate & conversion rate
- Recent 20 searches log

**Admin endpoint:** `GET /search/analytics` (requires admin role)

---

### F.8 — Multimodal Retrieval Architecture

#### Current Implementation
- Text: `TextEmbeddingProvider` (128-dim weighted hash) + Groq intent extraction
- Vision: `VisualSearchService` with `llama-3.2-11b-vision-preview`

#### Future Multimodal Roadmap

**Voice Commerce (Phase G):**
- Browser `SpeechRecognition` → transcribed text → semantic search pipeline
- No backend changes required

**CLIP-Style Multimodal Embeddings:**
- Joint image-text embedding space (e.g., OpenAI CLIP, Google Gemini Embeddings)
- Single vector query handles both image and text simultaneously
- Swap `EmbeddingProvider` and `VectorIndexAdapter` only

**Real-time Visual Feed:**
- Camera stream → frame extraction → visual search batch
- Architecture ready via `VisualSearchService.search(imageUrl)`

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/search?q=&userId=` | None (optional JWT) | Full AI semantic + personalized search |
| GET | `/search/autocomplete?q=` | None | Fast intent-aware suggestions |
| POST | `/search/visual` | None (optional JWT) | Visual product search by image URL |
| GET | `/search/trending?limit=12` | None | AI-ranked trending products |
| POST | `/search/track` | None (optional JWT) | Track click/conversion events |
| GET | `/search/analytics` | Admin JWT | 30-day search intelligence summary |
| POST | `/search/index/rebuild` | Admin JWT | Rebuild in-memory product vector index |

---

## Frontend Components

### AISearch (upgraded)

Three-tab interface:

| Tab | Feature |
|---|---|
| Semantic Search | Live intent-aware search, autocomplete, AI narrative banner, relevance bars, personalization badges |
| Visual Search | Image URL input, AI extraction preview, visual similarity grid |
| Trending | AI-ranked products with trending rank badges |

### Admin Search Intelligence Dashboard (`/admin/search-analytics`)

- 6 KPI cards: total searches, unique queries, avg results, latency, CTR, conversion
- Top 10 query frequency chart with bar visualization
- Discovery gap list (zero-result queries = catalog opportunities)
- Source breakdown (semantic vs visual vs personalized vs trending)
- Recent search log with latency and source
- Performance benchmark panel
- Index rebuild button with vector count feedback

---

## Caching Architecture

| Cache Key | TTL | Content |
|---|---|---|
| `search:results:{query}:{userId}` | 5 min | Full SearchResponse |
| `search:autocomplete:{partial}` | 5 min | Suggestions + intent |
| `search:trending:{limit}` | 10 min | Ranked product list |

Cache invalidation: `SearchRetrievalService.buildProductIndex()` clears no caches (index is separate from query cache). Product mutations should call `redis.delByPattern('search:*')`.

---

## Database Models Added (Phase F)

### SearchAnalyticsEvent
```prisma
model SearchAnalyticsEvent {
  id           String   @id @default(uuid())
  query        String   @db.NVarChar(500)
  userId       String?
  sessionId    String?
  resultCount  Int      @default(0)
  topProductId String?
  didClick     Boolean  @default(false)
  didConvert   Boolean  @default(false)
  intentJson   String?  @db.NVarChar(Max)
  latencyMs    Float    @default(0)
  source       String   @default("semantic")
  createdAt    DateTime @default(now())
}
```

### VisualSearchHistory
```prisma
model VisualSearchHistory {
  id          String   @id @default(uuid())
  userId      String?
  imageUrl    String   @db.NVarChar(Max)
  description String?  @db.NVarChar(Max)
  resultCount Int      @default(0)
  createdAt   DateTime @default(now())
}
```

---

## Vector Database Migration Playbook

### To pgvector (PostgreSQL)
```bash
# 1. Switch Prisma datasource to PostgreSQL
# 2. Add pgvector extension
prisma migrate dev --name add_pgvector

# 3. npm install pgvector
# 4. Implement PgVectorAdapter

# SearchModule: swap InMemoryVectorAdapter → PgVectorAdapter
# SearchModule: swap TextEmbeddingProvider → OpenAIEmbeddingProvider
```

### To Pinecone
```bash
npm install @pinecone-database/pinecone

# Set env vars:
# PINECONE_API_KEY=xxx
# PINECONE_INDEX=apex-luxe-products

# Implement PineconeVectorAdapter → swap in SearchModule
```

### To Weaviate
```bash
npm install weaviate-ts-client
# Implement WeaviateVectorAdapter with WeaviateClient → swap in SearchModule
```

### To Qdrant
```bash
npm install @qdrant/js-client-rest
# Implement QdrantVectorAdapter → swap in SearchModule
```

---

## Performance Characteristics

| Metric | Current (In-Memory) | Target (pgvector, 100k products) |
|---|---|---|
| Vector embed latency | ~0.1ms | ~20ms (OpenAI API) |
| Vector query (1k products) | ~0.5ms | ~5ms |
| Vector query (10k products) | ~5ms | ~10ms |
| Intent extraction (Groq) | ~800ms | ~800ms |
| Total pipeline (cache miss) | ~1-2s | ~1-2s |
| Total pipeline (cache hit) | ~5ms | ~5ms |
| Autocomplete | ~10ms | ~10ms |

---

## Files Created / Modified

### Backend (NestJS)

| File | Type | Description |
|---|---|---|
| `backend/prisma/schema.prisma` | Modified | Added SearchAnalyticsEvent, VisualSearchHistory models |
| `backend/src/modules/search/adapters/embedding.provider.ts` | New | EmbeddingProvider abstract interface |
| `backend/src/modules/search/adapters/text-embedding.provider.ts` | New | In-process 128-dim domain-weighted hash embedder |
| `backend/src/modules/search/adapters/vector-index.adapter.ts` | New | VectorIndexAdapter abstract interface |
| `backend/src/modules/search/adapters/in-memory-vector.adapter.ts` | New | Cosine similarity Map-based vector store |
| `backend/src/modules/search/ranking.service.ts` | New | Multi-factor pure scoring service |
| `backend/src/modules/search/search-analytics.service.ts` | New | Search event logging and aggregation |
| `backend/src/modules/search/visual-search.service.ts` | New | Vision AI product discovery |
| `backend/src/modules/search/search-retrieval.service.ts` | New | 8-stage retrieval pipeline |
| `backend/src/modules/search/search.controller.ts` | New | REST endpoints for all search features |
| `backend/src/modules/search/search.module.ts` | New | NestJS module wiring |
| `backend/src/app.module.ts` | Modified | SearchModule registered |

### Frontend (Next.js)

| File | Type | Description |
|---|---|---|
| `frontend/src/hooks/useSearch.ts` | New | React Query hooks for all search operations |
| `frontend/src/components/AISearch.tsx` | Modified | Upgraded 3-tab premium search UI |
| `frontend/src/app/admin/search-analytics/page.tsx` | New | Admin search intelligence dashboard |
| `frontend/src/app/admin/layout.tsx` | Modified | Added "Search Intel" nav link |
