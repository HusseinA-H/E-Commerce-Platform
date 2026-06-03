import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Creates a checkout session specifically for a subscription.
   */
  async createSubscriptionCheckout(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { billingProfile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const stripe = this.stripeService.getClient();
    let stripeCustomerId = user.billingProfile?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create Stripe Customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      await this.prisma.billingProfile.create({
        data: {
          userId: user.id,
          stripeCustomerId: customer.id,
        },
      });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: { userId },
      });

      return { sessionId: session.id, url: session.url };
    } catch (e: any) {
      this.logger.error(`Failed to create subscription checkout: ${e.message}`);
      throw new BadRequestException(`Stripe error: ${e.message}`);
    }
  }

  /**
   * Retrieves active subscriptions for a user.
   */
  async getUserSubscriptions(userId: string) {
    return this.prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Cancels an active subscription safely using Stripe.
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub || sub.userId !== userId)
      throw new NotFoundException('Subscription not found');

    const stripe = this.stripeService.getClient();

    try {
      // Cancel at period end to prevent immediate access loss
      const updatedStripeSub = await stripe.subscriptions.update(
        sub.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      );

      const updatedSub = await this.prisma.subscription.update({
        where: { id: subscriptionId },
        data: {
          cancelAtPeriodEnd: updatedStripeSub.cancel_at_period_end,
          status: updatedStripeSub.status,
        },
      });

      return updatedSub;
    } catch (e: any) {
      this.logger.error(`Failed to cancel subscription: ${e.message}`);
      throw new BadRequestException(`Stripe error: ${e.message}`);
    }
  }
}
