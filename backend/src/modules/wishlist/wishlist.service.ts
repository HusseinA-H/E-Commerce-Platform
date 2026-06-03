import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async findUserWishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleItem(userId: string, productId: string) {
    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const existing = await this.prisma.wishlistItem.findFirst({
      where: { userId, productId },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({
        where: { id: existing.id },
      });
      return { status: 'removed', message: 'Product removed from wishlist.' };
    }

    await this.prisma.wishlistItem.create({
      data: { userId, productId },
    });
    return { status: 'added', message: 'Product saved to wishlist.' };
  }
}
