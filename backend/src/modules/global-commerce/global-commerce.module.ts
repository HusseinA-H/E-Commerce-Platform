import { Module } from '@nestjs/common';
import { ExchangeRateService } from './currency.service';
import { RegionService } from './region.service';
import { WarehouseService } from './warehouse.service';
import { CurrencyController } from './currency.controller';
import { RegionController } from './region.controller';
import { WarehouseController } from './warehouse.controller';

@Module({
  controllers: [CurrencyController, RegionController, WarehouseController],
  providers: [ExchangeRateService, RegionService, WarehouseService],
  exports: [ExchangeRateService, RegionService, WarehouseService],
})
export class GlobalCommerceModule {}
