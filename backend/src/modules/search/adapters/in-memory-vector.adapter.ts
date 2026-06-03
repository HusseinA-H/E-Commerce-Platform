import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { VectorIndexAdapter, VectorSearchResult } from './vector-index.adapter';

interface VectorEntry {
  vector: number[];
  metadata?: Record<string, any>;
}

/**
 * InMemoryVectorAdapter — Cosine similarity search over an in-process Map.
 *
 * No external dependencies. Works immediately without any DB or cloud setup.
 * Persists only for the lifetime of the NestJS process (refreshed on restart/re-index).
 *
 * Performance characteristics:
 *   - Upsert: O(1)
 *   - Query: O(n × d) where n = catalog size, d = vector dimension (128)
 *   - For 1,000 products at 128-dim: ~0.5ms per query (well within SLA)
 *   - For 10,000 products: ~5ms per query (still sub-10ms)
 *
 * Future migration:
 *   - Replace this class with PineconeVectorAdapter implementing VectorIndexAdapter
 *   - No changes required to SearchRetrievalService or any consumer
 */
@Injectable()
export class InMemoryVectorAdapter implements VectorIndexAdapter, OnModuleInit {
  private readonly logger = new Logger(InMemoryVectorAdapter.name);
  private readonly store = new Map<string, VectorEntry>();

  onModuleInit() {
    this.logger.log(
      'InMemoryVectorAdapter initialized. Future: Replace with Pinecone/pgvector/Weaviate adapter.',
    );
  }

  async upsert(
    id: string,
    vector: number[],
    metadata?: Record<string, any>,
  ): Promise<void> {
    this.store.set(id, { vector, metadata });
  }

  async query(
    queryVector: number[],
    topK: number,
  ): Promise<VectorSearchResult[]> {
    if (this.store.size === 0) {
      return [];
    }

    const scores: VectorSearchResult[] = [];

    for (const [id, entry] of this.store.entries()) {
      const similarity = this.cosineSimilarity(queryVector, entry.vector);
      scores.push({ id, score: similarity });
    }

    // Sort descending by similarity, return top K
    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }

  async delete(id: string): Promise<void> {
    this.store.delete(id);
  }

  async clear(): Promise<void> {
    this.store.clear();
    this.logger.debug('InMemoryVectorAdapter: index cleared');
  }

  async count(): Promise<number> {
    return this.store.size;
  }

  /**
   * Cosine similarity between two L2-normalized vectors.
   * Since both are unit vectors, dot product === cosine similarity.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    let dot = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
    }
    // Clamp to [0, 1] for normalized vectors (handles floating point drift)
    return Math.max(0, Math.min(1, dot));
  }
}
