import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { CouponsModule } from '../coupons/coupons.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { VendorModule } from '../vendor/vendor.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { GlobalCommerceModule } from '../global-commerce/global-commerce.module';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { ReferralModule } from '../referral/referral.module';

@Module({
  imports: [
    CouponsModule,
    NotificationsModule,
    VendorModule,
    RealtimeModule,
    GlobalCommerceModule,
    LoyaltyModule,
    ReferralModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
