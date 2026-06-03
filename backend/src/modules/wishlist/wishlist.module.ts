import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { WishlistService } from './wishlist.service';
import { WishlistController } from './wishlist.controller';
import { WishlistIntelligenceService } from './wishlist-intelligence.service';
import { WishlistScheduler } from './wishlist.scheduler';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    MailModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [WishlistController],
  providers: [WishlistService, WishlistIntelligenceService, WishlistScheduler],
  exports: [WishlistService, WishlistIntelligenceService],
})
export class WishlistModule {}
