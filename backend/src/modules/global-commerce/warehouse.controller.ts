import { Controller, Get, Post, Body } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';

@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get('list')
  async getWarehouses() {
    return this.warehouseService.getWarehouses();
  }

  @Get('transfers')
  async getTransfers() {
    return this.warehouseService.getTransfers();
  }

  @Post('transfer')
  async createTransfer(
    @Body()
    body: {
      fromWarehouseId: string;
      toWarehouseId: string;
      productId: string;
      quantity: number;
      notes?: string;
    },
  ) {
    return this.warehouseService.createTransfer(
      body.fromWarehouseId,
      body.toWarehouseId,
      body.productId,
      body.quantity,
      body.notes,
    );
  }

  @Post('route')
  async routeOrder(
    @Body()
    body: {
      items: { productId: string; quantity: number }[];
      countryCode: string;
    },
  ) {
    return this.warehouseService.routeOrder(body.items, body.countryCode);
  }

  @Get('ai-insights')
  async getAiInsights() {
    const report = await this.warehouseService.getAiRebalancingReport();
    return { report };
  }
}
