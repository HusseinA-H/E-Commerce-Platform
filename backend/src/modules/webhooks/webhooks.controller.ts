import {
  Controller,
  Post,
  Req,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { Request } from 'express';
import { StripeService } from '../stripe/stripe.service';
import { WebhooksService } from './webhooks.service';

interface RequestWithRawBody extends Request {
  rawBody?: Buffer;
}

@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private readonly stripeService: StripeService,
    private readonly webhooksService: WebhooksService,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Stripe Webhook Receiver' })
  async handleStripeWebhook(
    @Req() request: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const reqWithRawBody = request as RequestWithRawBody;
    const rawBody = reqWithRawBody.rawBody;

    if (!rawBody) {
      throw new BadRequestException(
        'Missing raw body in request. Express raw() middleware required.',
      );
    }

    try {
      const event = this.stripeService.constructEvent(rawBody, signature);
      this.logger.log(`Received verified Stripe webhook event: ${event.type}`);

      // Dispatch to BullMQ for async retry-safe processing
      await this.webhooksService.dispatchEvent(event);

      return { received: true };
    } catch (err: any) {
      this.logger.error(`Webhook error: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }
}
