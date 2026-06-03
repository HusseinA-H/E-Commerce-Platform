/**
 * VectorIndexAdapter — Abstract interface for vector store operations.
 *
 * Current implementation: InMemoryVectorAdapter (Map-based cosine similarity)
 * Future swap targets (single implementation change, no API changes):
 *   - PineconeVectorAdapter
 *   - PgVectorAdapter (PostgreSQL pgvector extension)
 *   - WeaviateVectorAdapter
 *   - QdrantVectorAdapter
 */
export interface VectorSearchResult {
  id: string;
  score: number; // cosine similarity [0..1]
}

export interface VectorIndexAdapter {
  /**
   * Insert or update a vector for the given ID.
   */
  upsert(
    id: string,
    vector: number[],
    metadata?: Record<string, any>,
  ): Promise<void>;

  /**
   * Find topK most similar vectors to the query vector.
   */
  query(queryVector: number[], topK: number): Promise<VectorSearchResult[]>;

  /**
   * Remove a vector by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Remove all vectors from the index.
   */
  clear(): Promise<void>;

  /**
   * Return the total number of indexed vectors.
   */
  count(): Promise<number>;
}
