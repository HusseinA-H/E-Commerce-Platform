import { Module } from '@nestjs/common';
import { SocialCommerceService } from './social-commerce.service';
import { SocialCommerceController } from './social-commerce.controller';

@Module({
  controllers: [SocialCommerceController],
  providers: [SocialCommerceService],
  exports: [SocialCommerceService],
})
export class SocialCommerceModule {}
