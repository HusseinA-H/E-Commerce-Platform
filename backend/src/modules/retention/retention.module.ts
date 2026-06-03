import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../redis/redis.module';
import {
  AbandonedCartService,
  ABANDONED_CART_QUEUE,
} from './abandoned-cart.service';
import { AbandonedCartProcessor } from './abandoned-cart.processor';
import { AbandonedCartScheduler } from './abandoned-cart.scheduler';
import { GrowthIntelligenceService } from './growth-intelligence.service';
import { GrowthController } from './growth.controller';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    NotificationsModule,
    RedisModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({ name: ABANDONED_CART_QUEUE }),
  ],
  controllers: [GrowthController],
  providers: [
    AbandonedCartService,
    AbandonedCartProcessor,
    AbandonedCartScheduler,
    GrowthIntelligenceService,
  ],
  exports: [AbandonedCartService, GrowthIntelligenceService],
})
export class RetentionModule {}
