import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrdersService } from '../orders/orders.service';
import { StripeService } from '../stripe/stripe.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly ordersService: OrdersService,
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generates a Stripe PaymentIntent (Phase 3).
   * Ideal for custom checkout flows using Stripe Elements.
   */
  async createPaymentIntent(orderId: string) {
    const order = await this.ordersService.findOrderById(orderId);

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException(
        'This order invoice is already marked as paid.',
      );
    }

    const stripe = this.stripeService.getClient();
    const amountCents = Math.round(order.total * 100);

    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: amountCents,
          currency: order.currency || 'usd',
          metadata: { orderId: order.id },
          automatic_payment_methods: { enabled: true },
          // Idempotency allows safe retry mechanisms preventing duplicate intent generation
        },
        { idempotencyKey: `pi_${order.id}` },
      );

      return {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        amount: order.total,
        currency: order.currency || 'usd',
      };
    } catch (e: any) {
      this.logger.error(`Failed to create Stripe PaymentIntent: ${e.message}`);
      throw new BadRequestException(`Stripe error: ${e.message}`);
    }
  }

  /**
   * Generates a Stripe Hosted Checkout Session (Phase 2).
   * Ideal for redirection-based quick checkout flows.
   */
  async createCheckoutSession(
    orderId: string,
    successUrl: string,
    cancelUrl: string,
    useSavedCard?: string,
  ) {
    const order = await this.ordersService.findOrderById(orderId);

    if (order.paymentStatus === 'paid') {
      throw new BadRequestException(
        'This order invoice is already marked as paid.',
      );
    }

    const stripe = this.stripeService.getClient();

    // Fetch user billing profile
    let stripeCustomerId: string | undefined;
    const user = await this.prisma.user.findUnique({
      where: { id: order.userId },
      include: { billingProfile: true },
    });

    if (user?.billingProfile?.stripeCustomerId) {
      stripeCustomerId = user.billingProfile.stripeCustomerId;
    } else if (user) {
      // Create Stripe Customer on the fly for checkout
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;
      await this.prisma.billingProfile.create({
        data: { userId: user.id, stripeCustomerId: customer.id },
      });
    }

    const lineItems = order.items.map((item) => ({
      price_data: {
        currency: order.currency || 'usd',
        product_data: {
          name: item.productName,
          images: [item.image],
          metadata: {
            productId: item.productId,
            size: item.size,
            color: item.color,
          },
        },
        unit_amount: Math.round(item.productPrice * 100),
      },
      quantity: item.quantity,
    }));

    try {
      const sessionParams: any = {
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        customer: stripeCustomerId,
        customer_update: stripeCustomerId ? { name: 'auto' } : undefined,
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: cancelUrl,
        client_reference_id: order.id,
        metadata: {
          orderId: order.id,
        },
      };

      // Handle saved payment method
      if (useSavedCard) {
        // We do not pass payment_method_types when using an existing payment method in some flows,
        // but for standard checkout we just pass the saved card info or let Stripe Checkout
        // remember the customer's cards using `customer` param automatically.
        // `saved_payment_method_options` enables customers to use their saved cards in Checkout.
        sessionParams.saved_payment_method_options = {
          payment_method_save: 'enabled',
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams, {
        idempotencyKey: `cs_${order.id}`,
      });

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (e: any) {
      this.logger.error(
        `Failed to create Stripe Checkout Session: ${e.message}`,
      );
      throw new BadRequestException(`Stripe error: ${e.message}`);
    }
  }

  /**
   * Generates a SetupIntent for the user to securely add a new payment method.
   */
  async createSetupIntent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { billingProfile: true },
    });
    const stripe = this.stripeService.getClient();
    let customerId = user?.billingProfile?.stripeCustomerId;

    if (!customerId && user) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId },
      });
      customerId = customer.id;
      await this.prisma.billingProfile.create({
        data: { userId, stripeCustomerId: customerId },
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { userId },
    });

    return {
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    };
  }

  /**
   * Syncs user payment methods from Stripe into the local database
   */
  async syncSavedPaymentMethods(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { billingProfile: true },
    });
    if (!user?.billingProfile?.stripeCustomerId) return [];

    const stripe = this.stripeService.getClient();
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.billingProfile.stripeCustomerId,
      type: 'card',
    });

    const results: any[] = [];
    for (const pm of paymentMethods.data) {
      const card = pm.card!;
      const savedCard = await this.prisma.savedPaymentMethod.upsert({
        where: { stripePaymentMethodId: pm.id },
        create: {
          userId,
          stripePaymentMethodId: pm.id,
          brand: card.brand,
          last4: card.last4,
          expMonth: card.exp_month,
          expYear: card.exp_year,
          isDefault: false, // Can be updated manually or by customer profile
        },
        update: {
          expMonth: card.exp_month,
          expYear: card.exp_year,
        },
      });
      results.push(savedCard);
    }
    return results;
  }

  /**
   * Detaches a saved payment method.
   */
  async detachPaymentMethod(userId: string, paymentMethodId: string) {
    const savedCard = await this.prisma.savedPaymentMethod.findUnique({
      where: { stripePaymentMethodId: paymentMethodId },
    });
    if (!savedCard || savedCard.userId !== userId) {
      throw new BadRequestException(
        'Payment method not found or unauthorized.',
      );
    }

    const stripe = this.stripeService.getClient();
    await stripe.paymentMethods.detach(paymentMethodId);

    await this.prisma.savedPaymentMethod.delete({
      where: { stripePaymentMethodId: paymentMethodId },
    });
    return { success: true };
  }

  /**
   * Generates a refund for a payment intent.
   */
  async createRefund(orderId: string, amount?: number, reason?: string) {
    const order = await this.ordersService.findOrderById(orderId);
    if (!order.paymentIntentId)
      throw new BadRequestException('Order has no associated payment intent.');

    const stripe = this.stripeService.getClient();
    const refundAmountCents = amount
      ? Math.round(amount * 100)
      : Math.round(order.total * 100);

    const refund = await stripe.refunds.create({
      payment_intent: order.paymentIntentId,
      amount: refundAmountCents,
      reason: reason as any,
      metadata: { orderId: order.id },
    });

    return this.prisma.refund.create({
      data: {
        orderId: order.id,
        stripeRefundId: refund.id,
        amount: refundAmountCents / 100,
        currency: order.currency || 'usd',
        reason,
        status: refund.status || 'pending',
      },
    });
  }

  /**
   * Retrieves an invoice from Stripe.
   */
  async getInvoiceByOrderId(orderId: string) {
    const invoice = await this.prisma.invoice.findFirst({ where: { orderId } });
    if (!invoice) throw new NotFoundException('Invoice not found locally.');

    const stripe = this.stripeService.getClient();
    return stripe.invoices.retrieve(invoice.stripeInvoiceId);
  }

  /**
   * Simulates a mock Stripe webhook event (payment_intent.succeeded) to mark the order paid.
   */
  async handleMockWebhook(orderId: string, paymentIntentId: string) {
    this.logger.log(
      `[Checkout Lifecycle] Simulating mock Stripe webhook for Order ID: ${orderId}, Payment Intent: ${paymentIntentId}`,
    );
    return this.ordersService.markOrderAsPaid(orderId, paymentIntentId);
  }

  getPublishableKey() {
    const key = this.configService.get<string>('STRIPE_PUBLISHABLE_KEY');
    return { publishableKey: key || '' };
  }
}
