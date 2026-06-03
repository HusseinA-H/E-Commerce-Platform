import {
  Controller,
  Post,
  Param,
  UseGuards,
  Body,
  Req,
  Get,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-intent/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe PaymentIntent client secret' })
  async createIntent(@Param('orderId') orderId: string) {
    return this.paymentsService.createPaymentIntent(orderId);
  }

  @Post('checkout-session/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create Stripe Hosted Checkout Session' })
  async createCheckoutSession(
    @Param('orderId') orderId: string,
    @Body('successUrl') successUrl: string,
    @Body('cancelUrl') cancelUrl: string,
    @Body('useSavedCard') useSavedCard?: string,
  ) {
    return this.paymentsService.createCheckoutSession(
      orderId,
      successUrl,
      cancelUrl,
      useSavedCard,
    );
  }

  @Post('setup-intent')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create SetupIntent for saving a card' })
  async createSetupIntent(@Req() req: any) {
    return this.paymentsService.createSetupIntent(req.user.userId);
  }

  @Post('payment-methods/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Sync and retrieve user saved payment methods' })
  async syncPaymentMethods(@Req() req: any) {
    return this.paymentsService.syncSavedPaymentMethods(req.user.userId);
  }

  @Post('payment-methods/:id/detach')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Detach a saved payment method' })
  async detachPaymentMethod(
    @Req() req: any,
    @Param('id') paymentMethodId: string,
  ) {
    return this.paymentsService.detachPaymentMethod(
      req.user.userId,
      paymentMethodId,
    );
  }

  @Post(':orderId/refund')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard) // Requires Admin guard in production
  @ApiOperation({ summary: 'Refund a payment' })
  async createRefund(
    @Param('orderId') orderId: string,
    @Body('amount') amount?: number,
    @Body('reason') reason?: string,
  ) {
    return this.paymentsService.createRefund(orderId, amount, reason);
  }

  @Get('invoice/:orderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get invoice for order' })
  async getInvoice(@Param('orderId') orderId: string) {
    return this.paymentsService.getInvoiceByOrderId(orderId);
  }

  @Get('publishable-key')
  @ApiOperation({ summary: 'Get Stripe Publishable Key' })
  async getPublishableKey() {
    return this.paymentsService.getPublishableKey();
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Simulate mock Stripe Webhook for testing' })
  async mockWebhook(@Body() body: any) {
    const type = body?.type;
    const object = body?.data?.object;
    const paymentIntentId = object?.id;
    const orderId = object?.metadata?.orderId;

    if (type === 'payment_intent.succeeded' && orderId && paymentIntentId) {
      return this.paymentsService.handleMockWebhook(orderId, paymentIntentId);
    }
    throw new BadRequestException('Invalid mock webhook payload.');
  }
}
