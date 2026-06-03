import {
  Injectable,
  Logger,
  OnModuleInit,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import StripeDefault from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
  private readonly logger = new Logger(StripeService.name);
  public readonly stripe: InstanceType<typeof StripeDefault>;
  public readonly isConfigured: boolean;

  constructor(private configService: ConfigService) {
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeKey || stripeKey.startsWith('sk_test_mock')) {
      this.logger.warn(
        'Stripe API keys are unconfigured or set to mock keys. You must paste real keys into .env for payments to work.',
      );
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
    }

    this.stripe = new StripeDefault(stripeKey || 'sk_test_mock', {
      apiVersion: '2025-01-27.acacia' as any,
    });
  }

  onModuleInit() {
    if (this.isConfigured) {
      this.logger.log(
        'Stripe SDK successfully configured with a real API key.',
      );
    }
  }

  /**
   * Safe getter for Stripe SDK that throws an enterprise-grade error if keys are missing.
   */
  public getClient(): InstanceType<typeof StripeDefault> {
    if (!this.isConfigured) {
      throw new InternalServerErrorException(
        'Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.',
      );
    }
    return this.stripe;
  }

  /**
   * Helper to verify webhook signatures.
   */
  public constructEvent(payload: string | Buffer, signature: string) {
    const secret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret || secret.startsWith('whsec_mock')) {
      throw new InternalServerErrorException(
        'Webhook secret is missing or invalid. Please add STRIPE_WEBHOOK_SECRET to your environment.',
      );
    }
    try {
      return this.stripe.webhooks.constructEvent(payload, signature, secret);
    } catch (err: any) {
      this.logger.error(
        `Webhook signature verification failed: ${err.message}`,
      );
      throw err;
    }
  }
}
