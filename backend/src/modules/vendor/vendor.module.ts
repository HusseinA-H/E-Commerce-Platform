import { Module } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { PayoutsService } from './payouts.service';
import { MarketplaceAiService } from './marketplace-ai.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [RealtimeModule, AiModule],
  controllers: [VendorController],
  providers: [VendorService, PayoutsService, MarketplaceAiService],
  exports: [VendorService, PayoutsService, MarketplaceAiService],
})
export class VendorModule {}
