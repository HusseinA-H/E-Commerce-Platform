import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PersonalizedRecommendationsEngine {
  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(userId: string, limit = 6): Promise<any[]> {
    const [cart, wishlist, orders, styleProfile] = await Promise.all([
      this.prisma.cartItem.findMany({
        where: { userId },
        select: { productId: true },
      }),
      this.prisma.wishlistItem.findMany({
        where: { userId },
        select: { productId: true },
      }),
      this.prisma.order.findMany({
        where: { userId },
        include: { items: { select: { productId: true } } },
      }),
      this.prisma.userStyleProfile.findUnique({ where: { userId } }),
    ]);

    const cartIds = cart.map((i) => i.productId);
    const wishlistIds = wishlist.map((i) => i.productId);

    const purchasedIds: string[] = [];
    orders.forEach((order) => {
      order.items.forEach((item) => {
        if (item.productId) purchasedIds.push(item.productId);
      });
    });

    const userInteractedIds = Array.from(
      new Set([...cartIds, ...wishlistIds, ...purchasedIds]),
    );

    const candidateProducts = await this.prisma.product.findMany({
      where: {
        id: { notIn: userInteractedIds },
        deletedAt: null,
      },
      include: { images: true, category: true, aiMetadata: true },
      take: 20,
    });

    if (candidateProducts.length === 0) {
      return this.prisma.product.findMany({
        where: { deletedAt: null },
        include: { images: true, category: true },
        take: limit,
      });
    }

    const preferredColors =
      styleProfile?.preferredColors
        ?.split(',')
        .map((c) => c.toLowerCase().trim()) || [];
    const preferredCategories =
      styleProfile?.preferredCategories
        ?.split(',')
        .map((c) => c.toLowerCase().trim()) || [];
    const dominantAesthetic =
      styleProfile?.dominantAesthetic?.toLowerCase().trim() || '';

    const scored = candidateProducts.map((p) => {
      let score = 50;

      if (preferredCategories.includes(p.category?.slug?.toLowerCase() || '')) {
        score += 20;
      }

      const pAesthetic = (p.aiMetadata?.styleAesthetic || '').toLowerCase();
      if (dominantAesthetic && pAesthetic.includes(dominantAesthetic)) {
        score += 20;
      }

      const pDesc = p.description.toLowerCase();
      preferredColors.forEach((color) => {
        if (pDesc.includes(color)) score += 10;
      });

      return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map((s) => s.product);
  }
}
