import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FrequentlyBoughtTogetherEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(productId: string, limit = 3): Promise<any[]> {
    const ordersWithProduct = await this.prisma.order.findMany({
      where: {
        items: {
          some: { productId },
        },
      },
      include: {
        items: {
          select: { productId: true },
        },
      },
    });

    if (ordersWithProduct.length === 0) {
      const target = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      return this.prisma.product.findMany({
        where: {
          id: { not: productId },
          categoryId: { not: target?.categoryId },
          deletedAt: null,
        },
        include: { images: true, category: true },
        take: limit,
      });
    }

    const counts: Record<string, number> = {};
    ordersWithProduct.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId && item.productId !== productId) {
          counts[item.productId] = (counts[item.productId] || 0) + 1;
        }
      });
    });

    const sortedIds = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);

    if (sortedIds.length === 0) {
      const target = await this.prisma.product.findUnique({
        where: { id: productId },
      });
      return this.prisma.product.findMany({
        where: {
          id: { not: productId },
          categoryId: { not: target?.categoryId },
          deletedAt: null,
        },
        include: { images: true, category: true },
        take: limit,
      });
    }

    return this.prisma.product.findMany({
      where: { id: { in: sortedIds } },
      include: { images: true, category: true },
    });
  }
}
