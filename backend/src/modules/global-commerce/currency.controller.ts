import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ExchangeRateService } from './currency.service';

@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: ExchangeRateService) {}

  @Get('rates')
  async getRates(@Query('base') base?: string) {
    return this.currencyService.getRates(base || 'USD');
  }

  @Post('convert')
  async convert(@Body() body: { amount: number; from: string; to: string }) {
    const converted = await this.currencyService.convert(
      body.amount,
      body.from,
      body.to,
    );
    return { amount: body.amount, from: body.from, to: body.to, converted };
  }
}
