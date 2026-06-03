import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SmartCrossSellEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(productId: string, limit = 3): Promise<any[]> {
    const sourceProduct = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    if (!sourceProduct) return [];

    let crossSellProducts = await this.prisma.product.findMany({
      where: {
        id: { not: productId },
        deletedAt: null,
        category: {
          slug: { in: ['accessories', 'gear', 'footwear'] },
        },
      },
      include: { images: true, category: true },
      take: limit,
    });

    if (crossSellProducts.length === 0) {
      crossSellProducts = await this.prisma.product.findMany({
        where: {
          id: { not: productId },
          deletedAt: null,
        },
        include: { images: true, category: true },
        take: limit,
      });
    }

    return crossSellProducts;
  }
}
