import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Commission Engine: computes platform share and vendor net share.
   * Supports percentage commission, custom category rules, and promo discounts adjustments.
   */
  calculateCommission(
    total: number,
    vendorCommissionRate: number,
    categorySlug?: string,
    hasPromo = false,
  ): { commission: number; payoutAmount: number } {
    let rate = vendorCommissionRate;

    // Category specific adjustments (e.g. Footwear has standard 12% rather than 15%)
    if (categorySlug === 'footwear' || categorySlug === 'shoes') {
      rate = 12.0;
    } else if (categorySlug === 'accessories') {
      rate = 10.0;
    }

    // Promotional fee adjustments (e.g. if the item had a promo code applied, add 2% fee)
    if (hasPromo) {
      rate += 2.0;
    }

    const commission = (total * rate) / 100;
    const payoutAmount = Math.max(0, total - commission);

    return {
      commission: parseFloat(commission.toFixed(2)),
      payoutAmount: parseFloat(payoutAmount.toFixed(2)),
    };
  }

  /**
   * Creates a Stripe Connect transfer to split funds to the vendor's Connected account.
   */
  async transferToVendor(
    vendorId: string,
    orderId: string,
    amount: number,
    transferGroup: string,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) throw new BadRequestException('Vendor record not found.');

    // If vendor doesn't have a Connected Stripe Account or onboarding is incomplete
    if (!vendor.stripeAccountId || !vendor.isVerified) {
      this.logger.warn(
        `Vendor ${vendor.storeName} (${vendorId}) has no Connect Account or is not verified yet. Queueing payout as pending.`,
      );
      return this.prisma.vendorPayout.create({
        data: {
          vendorId,
          amount,
          status: 'pending',
        },
      });
    }

    const isConfigured = this.stripeService.isConfigured;
    if (!isConfigured) {
      this.logger.log(
        `[Stripe Mock Mode] Simulating Connect Transfer for $${amount} to Connected Account ${vendor.stripeAccountId}`,
      );
      return this.prisma.vendorPayout.create({
        data: {
          vendorId,
          amount,
          status: 'paid',
          stripePayoutId: `tr_mock_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
        },
      });
    }

    const stripe = this.stripeService.getClient();
    const amountCents = Math.round(amount * 100);

    try {
      // Execute the Stripe transfer
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'usd',
        destination: vendor.stripeAccountId,
        transfer_group: transferGroup,
        metadata: {
          orderId,
          vendorId,
        },
      });

      return this.prisma.vendorPayout.create({
        data: {
          vendorId,
          amount,
          status: 'paid',
          stripePayoutId: transfer.id,
        },
      });
    } catch (e: any) {
      this.logger.error(`Stripe Connect Transfer Failed: ${e.message}`);
      // Record failed payout to allow operations auditing/retry
      return this.prisma.vendorPayout.create({
        data: {
          vendorId,
          amount,
          status: 'failed',
        },
      });
    }
  }

  /**
   * Retrieves summary of vendor earnings and payout transactions list.
   */
  async getPayoutSummary(vendorId: string) {
    const payouts = await this.prisma.vendorPayout.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' },
    });

    const totalPaid = payouts
      .filter((p) => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayout = payouts
      .filter((p) => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      pendingPayout: parseFloat(pendingPayout.toFixed(2)),
      transactionHistory: payouts,
    };
  }

  /**
   * Retries pending payouts once the vendor has completed verification.
   */
  async retryPendingPayouts(vendorId: string) {
    const pending = await this.prisma.vendorPayout.findMany({
      where: { vendorId, status: 'pending' },
    });

    if (pending.length === 0) return;

    this.logger.log(
      `Processing ${pending.length} pending payouts for verified vendor: ${vendorId}`,
    );

    for (const payout of pending) {
      try {
        const transferGroup = `retry_payout_${payout.id}`;
        // Attempt transfer
        const result = await this.transferToVendor(
          vendorId,
          'RETRY_PAYOUT',
          payout.amount,
          transferGroup,
        );

        if (result.status === 'paid') {
          // Clean up the pending row
          await this.prisma.vendorPayout.delete({ where: { id: payout.id } });
        }
      } catch (err: any) {
        this.logger.error(
          `Failed retrying pending payout ${payout.id}: ${err.message}`,
        );
      }
    }
  }
}
