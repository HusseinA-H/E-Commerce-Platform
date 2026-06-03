import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RecommendationEmbeddingAdapter } from '../interfaces/recommendation-embedding-adapter.interface';

@Injectable()
export class RelatedProductsEngine {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingAdapter: RecommendationEmbeddingAdapter,
  ) {}

  async getRecommendations(productId: string, limit = 5): Promise<any[]> {
    const semanticIds =
      await this.embeddingAdapter.searchSemanticSimilarProducts(
        productId,
        limit,
      );

    const sourceProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, aiMetadata: true },
    });

    if (!sourceProduct) return [];

    const categoryId = sourceProduct.categoryId;

    const matchingProducts = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        deletedAt: null,
        OR: [
          { categoryId },
          sourceProduct.aiMetadata?.styleAesthetic
            ? {
                aiMetadata: {
                  styleAesthetic: {
                    contains: sourceProduct.aiMetadata.styleAesthetic,
                  },
                },
              }
            : {},
        ],
      },
      include: { images: true, category: true },
      take: limit * 2,
    });

    const combinedMap = new Map<string, any>();
    matchingProducts.forEach((p) => combinedMap.set(p.id, p));

    if (semanticIds.length > 0) {
      const semanticProducts = await this.prisma.product.findMany({
        where: { id: { in: semanticIds } },
        include: { images: true, category: true },
      });
      semanticProducts.forEach((p) => combinedMap.set(p.id, p));
    }

    const allMatched = Array.from(combinedMap.values());

    const scored = allMatched.map((p) => {
      let score = 50;
      if (p.categoryId === sourceProduct.categoryId) score += 20;
      if (
        p.aiMetadata?.styleAesthetic &&
        sourceProduct.aiMetadata?.styleAesthetic &&
        p.aiMetadata.styleAesthetic === sourceProduct.aiMetadata.styleAesthetic
      ) {
        score += 20;
      }
      if (semanticIds.includes(p.id)) score += 10;
      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.product);
  }
}
