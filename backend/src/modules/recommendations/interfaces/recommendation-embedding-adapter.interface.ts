import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface EmbeddingResult {
  productId: string;
  vector: number[];
}

@Injectable()
export class RecommendationEmbeddingAdapter {
  private readonly logger = new Logger(RecommendationEmbeddingAdapter.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a mock high-dimensional vector embedding for text.
   * Ready to be replaced by OpenAI or Cohere embeddings API in production.
   */
  async getEmbedding(text: string): Promise<number[]> {
    this.logger.debug(
      `Generating embedding for text block: "${text.substring(0, 30)}..."`,
    );
    // Create a deterministic mock vector based on string hash for testing consistency
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Generate a 128-dimensional mock vector normalized between -1 and 1
    const dims = 128;
    const vector = Array.from({ length: dims }, (_, index) => {
      const val = Math.sin(hash + index) * Math.cos(hash * index);
      return val;
    });

    // Normalize vector
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map((v) => (magnitude > 0 ? v / magnitude : 0));
  }

  /**
   * Simulates a vector database cosine-similarity query between product metadata.
   * Ready to be replaced by Pinecone / pgvector / Milvus database queries.
   */
  async searchSemanticSimilarProducts(
    productId: string,
    limit = 4,
  ): Promise<string[]> {
    this.logger.log(
      `Performing semantic similarity retrieval for product: ${productId}`,
    );

    const targetProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { aiMetadata: true },
    });

    if (!targetProduct) return [];

    const targetText = `${targetProduct.name} ${targetProduct.description} ${targetProduct.aiMetadata?.styleAesthetic || ''} ${targetProduct.aiMetadata?.aiTags || ''}`;
    const targetVec = await this.getEmbedding(targetText);

    // Fetch other products to calculate similarity
    const allProducts = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        deletedAt: null,
      },
      include: { aiMetadata: true },
    });

    const similarities = await Promise.all(
      allProducts.map(async (p) => {
        const text = `${p.name} ${p.description} ${p.aiMetadata?.styleAesthetic || ''} ${p.aiMetadata?.aiTags || ''}`;
        const vec = await this.getEmbedding(text);

        // Cosine similarity
        let dotProduct = 0;
        for (let i = 0; i < targetVec.length; i++) {
          dotProduct += targetVec[i] * vec[i];
        }

        return {
          productId: p.id,
          similarity: dotProduct,
        };
      }),
    );

    // Sort by cosine similarity descending
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, limit).map((s) => s.productId);
  }
}
