import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhooksController } from './webhooks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { StripeModule } from '../stripe/stripe.module';
import { OrdersModule } from '../orders/orders.module';
import { WebhooksService } from './webhooks.service';
import { WebhooksProcessor } from './webhooks.processor';

@Module({
  imports: [
    PrismaModule,
    StripeModule,
    OrdersModule,
    BullModule.registerQueue({
      name: 'stripe-webhooks',
    }),
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService, WebhooksProcessor],
  exports: [WebhooksService],
})
export class WebhooksModule {}
