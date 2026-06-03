import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateReviewDto) {
    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    // Check if the user has purchased the product to tag as verified purchase
    const purchased = await this.prisma.order.findFirst({
      where: {
        userId,
        paymentStatus: 'paid',
        items: {
          some: {
            productId: dto.productId,
          },
        },
      },
    });

    const isVerifiedPurchase = !!purchased;

    return this.prisma.review.create({
      data: {
        userId,
        productId: dto.productId,
        rating: dto.rating,
        title: dto.title,
        comment: dto.comment,
        isVerifiedPurchase,
      },
    });
  }

  async findByProductId(productId: string) {
    return this.prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
