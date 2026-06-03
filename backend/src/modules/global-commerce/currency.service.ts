import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

const DEFAULT_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
  EGP: 47.5,
};

@Injectable()
export class ExchangeRateService implements OnModuleInit {
  private readonly logger = new Logger(ExchangeRateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    try {
      await this.seedDefaultExchangeRates();
      await this.cacheRatesInRedis();
    } catch (err: any) {
      this.logger.error(`Error initializing exchange rates: ${err.message}`);
    }
  }

  private async seedDefaultExchangeRates() {
    this.logger.log('Seeding default exchange rates...');
    for (const [targetCurrency, rate] of Object.entries(DEFAULT_RATES)) {
      await this.prisma.exchangeRate.upsert({
        where: {
          sourceCurrency_targetCurrency: {
            sourceCurrency: 'USD',
            targetCurrency,
          },
        },
        update: { rate },
        create: {
          sourceCurrency: 'USD',
          targetCurrency,
          rate,
        },
      });
    }
  }

  async cacheRatesInRedis(): Promise<void> {
    try {
      const rates = await this.prisma.exchangeRate.findMany({
        where: { sourceCurrency: 'USD' },
      });

      const ratesMap: Record<string, number> = {};
      rates.forEach((r) => {
        ratesMap[r.targetCurrency] = r.rate;
      });

      await this.redisService.set('rates:USD', ratesMap, 86400); // 1 day cache
      this.logger.log('Cached USD exchange rates in Redis.');
    } catch (err: any) {
      this.logger.warn(
        `Failed to cache exchange rates in Redis: ${err.message}`,
      );
    }
  }

  async getRates(base = 'USD'): Promise<Record<string, number>> {
    if (base !== 'USD') {
      const usdRates = await this.getRates('USD');
      const baseRateInUsd = usdRates[base] || 1.0;
      const convertedRates: Record<string, number> = {};

      for (const [cur, rate] of Object.entries(usdRates)) {
        convertedRates[cur] = rate / baseRateInUsd;
      }
      return convertedRates;
    }

    try {
      const cached =
        await this.redisService.get<Record<string, number>>('rates:USD');
      if (cached) {
        return cached;
      }
    } catch (err) {
      // Redis fail fallback
    }

    const dbRates = await this.prisma.exchangeRate.findMany({
      where: { sourceCurrency: 'USD' },
    });

    const ratesMap: Record<string, number> = {};
    dbRates.forEach((r) => {
      ratesMap[r.targetCurrency] = r.rate;
    });

    // Populate missing defaults
    for (const [cur, rate] of Object.entries(DEFAULT_RATES)) {
      if (!(cur in ratesMap)) {
        ratesMap[cur] = rate;
      }
    }

    return ratesMap;
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from.toUpperCase() === to.toUpperCase()) return amount;

    const rates = await this.getRates('USD');
    const fromRate =
      rates[from.toUpperCase()] || DEFAULT_RATES[from.toUpperCase()] || 1.0;
    const toRate =
      rates[to.toUpperCase()] || DEFAULT_RATES[to.toUpperCase()] || 1.0;

    // Convert from -> USD -> to
    const amountInUsd = amount / fromRate;
    return amountInUsd * toRate;
  }

  async updateRates(): Promise<void> {
    this.logger.log('Updating exchange rates from Mock Global Gateway...');
    // Simulate updating rates with slight volatility
    for (const [targetCurrency, baseRate] of Object.entries(DEFAULT_RATES)) {
      if (targetCurrency === 'USD') continue;
      const volatility = 1 + (Math.random() * 0.04 - 0.02); // +/- 2%
      const newRate = Number((baseRate * volatility).toFixed(4));

      await this.prisma.exchangeRate.updateMany({
        where: { sourceCurrency: 'USD', targetCurrency },
        data: { rate: newRate },
      });
    }
    await this.cacheRatesInRedis();
  }
}
