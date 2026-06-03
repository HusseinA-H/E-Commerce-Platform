/**
 * EmbeddingProvider — Abstract interface for text-to-vector embedding.
 *
 * Current implementation: TextEmbeddingProvider (in-process TF-IDF weighted vectors)
 * Future: Swap for OpenAI text-embedding-3-small, Cohere, or Groq embedding API
 */
export interface EmbeddingProvider {
  /**
   * Convert a text string into a fixed-dimensional numeric vector.
   * @param text — Natural language string to embed
   * @returns Promise resolving to a numeric float array (vector)
   */
  embed(text: string): Promise<number[]>;
}
