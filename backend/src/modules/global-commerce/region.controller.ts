import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { RegionService } from './region.service';

@Controller('region')
export class RegionController {
  constructor(private readonly regionService: RegionService) {}

  @Get('list')
  async getRegions() {
    const regions = await this.regionService.getRegions();
    const countries = await this.regionService.getCountries();
    return { regions, countries };
  }

  @Get('rates/:countryCode')
  async getRates(@Param('countryCode') countryCode: string) {
    const shippingRates =
      await this.regionService.getShippingRates(countryCode);
    const tax = await this.regionService.calculateTax(countryCode);
    return { shippingRates, tax };
  }

  @Post('price-override')
  async updatePriceOverride(
    @Body()
    body: {
      productId: string;
      regionId: string;
      price: number;
      compareAtPrice?: number;
    },
  ) {
    return this.regionService.updateRegionProductPrice(
      body.productId,
      body.regionId,
      body.price,
      body.compareAtPrice,
    );
  }

  @Get('product-price/:productId/:countryCode')
  async getProductPrice(
    @Param('productId') productId: string,
    @Param('countryCode') countryCode: string,
  ) {
    return this.regionService.getProductPriceForRegion(productId, countryCode);
  }
}
