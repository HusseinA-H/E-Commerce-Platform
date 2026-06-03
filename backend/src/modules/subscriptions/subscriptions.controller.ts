import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post('checkout')
  @ApiOperation({
    summary: 'Create a Stripe Checkout session for a subscription',
  })
  async createCheckoutSession(
    @Req() req: any,
    @Body('priceId') priceId: string,
    @Body('successUrl') successUrl: string,
    @Body('cancelUrl') cancelUrl: string,
  ) {
    return this.subscriptionsService.createSubscriptionCheckout(
      req.user.userId,
      priceId,
      successUrl,
      cancelUrl,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all user subscriptions' })
  async getSubscriptions(@Req() req: any) {
    return this.subscriptionsService.getUserSubscriptions(req.user.userId);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a subscription at period end' })
  async cancelSubscription(
    @Req() req: any,
    @Param('id') subscriptionId: string,
  ) {
    return this.subscriptionsService.cancelSubscription(
      req.user.userId,
      subscriptionId,
    );
  }
}
