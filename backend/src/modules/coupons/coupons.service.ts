import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Coupon } from '@prisma/client';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class CouponsService {
  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
  ) {}

  async findByCode(code: string): Promise<Coupon> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      throw new NotFoundException(
        `Coupon code "${code}" is invalid or does not exist.`,
      );
    }

    return coupon;
  }

  async validateCoupon(code: string): Promise<Coupon> {
    const coupon = await this.findByCode(code);

    if (!coupon.isActive) {
      throw new BadRequestException('This coupon code is inactive.');
    }

    if (coupon.expiresAt < new Date()) {
      throw new BadRequestException('This coupon code has expired.');
    }

    if (coupon.usesCount >= coupon.maxUses) {
      throw new BadRequestException(
        'This coupon code has reached its maximum usage limit.',
      );
    }

    return coupon;
  }

  async create(body: {
    code: string;
    discountPercent: number;
    expiresAt: Date;
    maxUses: number;
  }) {
    const code = body.code.toUpperCase();

    // Create coupon in Stripe natively
    const stripe = this.stripeService.getClient();
    let stripeCouponId: string | null = null;
    try {
      const stripeCoupon = await stripe.coupons.create({
        percent_off: body.discountPercent,
        duration: 'once',
        name: code,
        max_redemptions: body.maxUses,
        redeem_by: Math.floor(new Date(body.expiresAt).getTime() / 1000),
      });
      // Optionally create a promotion code for the coupon
      await stripe.promotionCodes.create({
        coupon: stripeCoupon.id,
        code: code,
      } as any);
      stripeCouponId = stripeCoupon.id;
    } catch (e: any) {
      // It's possible the user hasn't set keys properly; we log but do not crash local creation if mock is okay.
      // However, we throw if strict mode is intended. Let's just log and throw.
      throw new BadRequestException(
        `Failed to create Stripe coupon: ${e.message}`,
      );
    }

    return this.prisma.coupon.create({
      data: {
        code,
        discountPercent: body.discountPercent,
        expiresAt: new Date(body.expiresAt),
        maxUses: body.maxUses,
        isActive: true,
      },
    });
  }

  async findAll(): Promise<Coupon[]> {
    return this.prisma.coupon.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleActive(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found.');
    }

    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
  }
}
