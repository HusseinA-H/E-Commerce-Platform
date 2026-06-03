import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface RegionSeed {
  name: string;
  code: string;
  currencyCode: string;
  taxType: 'sales_tax' | 'vat' | 'gst';
  taxRate: number;
  countries: { code: string; name: string; defaultCurrency: string }[];
}

const REGION_SEEDS: RegionSeed[] = [
  {
    name: 'USA',
    code: 'US',
    currencyCode: 'USD',
    taxType: 'sales_tax',
    taxRate: 0.08,
    countries: [{ code: 'US', name: 'United States', defaultCurrency: 'USD' }],
  },
  {
    name: 'Europe',
    code: 'EU',
    currencyCode: 'EUR',
    taxType: 'vat',
    taxRate: 0.2,
    countries: [
      { code: 'FR', name: 'France', defaultCurrency: 'EUR' },
      { code: 'DE', name: 'Germany', defaultCurrency: 'EUR' },
      { code: 'ES', name: 'Spain', defaultCurrency: 'EUR' },
      { code: 'IT', name: 'Italy', defaultCurrency: 'EUR' },
    ],
  },
  {
    name: 'UK',
    code: 'GB',
    currencyCode: 'GBP',
    taxType: 'vat',
    taxRate: 0.2,
    countries: [{ code: 'GB', name: 'United Kingdom', defaultCurrency: 'GBP' }],
  },
  {
    name: 'UAE',
    code: 'AE',
    currencyCode: 'AED',
    taxType: 'vat',
    taxRate: 0.05,
    countries: [
      { code: 'AE', name: 'United Arab Emirates', defaultCurrency: 'AED' },
    ],
  },
  {
    name: 'Saudi Arabia',
    code: 'SA',
    currencyCode: 'SAR',
    taxType: 'vat',
    taxRate: 0.15,
    countries: [{ code: 'SA', name: 'Saudi Arabia', defaultCurrency: 'SAR' }],
  },
  {
    name: 'Egypt',
    code: 'EG',
    currencyCode: 'EGP',
    taxType: 'vat',
    taxRate: 0.14,
    countries: [{ code: 'EG', name: 'Egypt', defaultCurrency: 'EGP' }],
  },
];

const CARRIER_SEEDS = [
  { name: 'DHL', code: 'dhl' },
  { name: 'Aramex', code: 'aramex' },
  { name: 'FedEx', code: 'fedex' },
  { name: 'UPS', code: 'ups' },
];

@Injectable()
export class RegionService implements OnModuleInit {
  private readonly logger = new Logger(RegionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.seedRegionsAndCountries();
      await this.seedCarriersAndRates();
    } catch (err: any) {
      this.logger.error(`Error seeding regions and carriers: ${err.message}`);
    }
  }

  private async seedRegionsAndCountries() {
    this.logger.log('Seeding regional configuration tables...');
    for (const r of REGION_SEEDS) {
      const region = await this.prisma.region.upsert({
        where: { code: r.code },
        update: {
          taxRate: r.taxRate,
          taxType: r.taxType,
          currencyCode: r.currencyCode,
        },
        create: {
          name: r.name,
          code: r.code,
          currencyCode: r.currencyCode,
          taxType: r.taxType,
          taxRate: r.taxRate,
        },
      });

      for (const c of r.countries) {
        await this.prisma.country.upsert({
          where: { code: c.code },
          update: { regionId: region.id },
          create: {
            code: c.code,
            name: c.name,
            defaultCurrency: c.defaultCurrency,
            regionId: region.id,
          },
        });

        // Seed country tax rule fallback
        await this.prisma.taxRule.upsert({
          where: {
            countryCode_stateCode_taxType: {
              countryCode: c.code,
              stateCode: '',
              taxType: r.taxType,
            },
          },
          update: { taxRate: r.taxRate },
          create: {
            countryCode: c.code,
            stateCode: '',
            taxType: r.taxType,
            taxRate: r.taxRate,
          },
        });
      }
    }
  }

  private async seedCarriersAndRates() {
    this.logger.log('Seeding shipping carrier matrices...');
    const regions = await this.prisma.region.findMany();

    for (const c of CARRIER_SEEDS) {
      const carrier = await this.prisma.shippingCarrier.upsert({
        where: { code: c.code },
        update: {},
        create: { name: c.name, code: c.code },
      });

      for (const region of regions) {
        // Seed Express rate
        await this.prisma.shippingRate.create({
          data: {
            carrierId: carrier.id,
            regionId: region.id,
            name: 'Express Shipping',
            minDays: 1,
            maxDays: 3,
            baseCost: 15.0,
            perKgCost: 2.0,
          },
        });

        // Seed Standard rate
        await this.prisma.shippingRate.create({
          data: {
            carrierId: carrier.id,
            regionId: region.id,
            name: 'Standard Ground',
            minDays: 3,
            maxDays: 7,
            baseCost: 5.0,
            perKgCost: 0.8,
          },
        });
      }
    }
  }

  async getRegions() {
    return this.prisma.region.findMany({
      include: { countries: true },
    });
  }

  async getCountries() {
    return this.prisma.country.findMany({
      include: { region: true },
    });
  }

  async getRegionByCountry(countryCode: string) {
    const country = await this.prisma.country.findUnique({
      where: { code: countryCode.toUpperCase() },
      include: { region: true },
    });
    if (!country) return null;
    return country.region;
  }

  async getRegionProductPrices(productId: string) {
    return this.prisma.regionProductPrice.findMany({
      where: { productId },
    });
  }

  async updateRegionProductPrice(
    productId: string,
    regionId: string,
    price: number,
    compareAtPrice?: number,
    currency?: string,
  ) {
    const region = await this.prisma.region.findUnique({
      where: { id: regionId },
    });
    if (!region) throw new NotFoundException('Region not found');

    return this.prisma.regionProductPrice.upsert({
      where: {
        productId_regionId: { productId, regionId },
      },
      update: {
        price,
        compareAtPrice,
        currency: currency || region.currencyCode,
      },
      create: {
        productId,
        regionId,
        price,
        compareAtPrice,
        currency: currency || region.currencyCode,
      },
    });
  }

  async getProductPriceForRegion(
    productId: string,
    countryCode: string,
  ): Promise<{
    price: number;
    currency: string;
    compareAtPrice: number | null;
  }> {
    const region = await this.getRegionByCountry(countryCode);

    // Fetch default product price
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { price: true, compareAtPrice: true },
    });

    if (!product) throw new NotFoundException('Product not found');

    if (!region) {
      return {
        price: product.price,
        currency: 'USD',
        compareAtPrice: product.compareAtPrice,
      };
    }

    const override = await this.prisma.regionProductPrice.findUnique({
      where: {
        productId_regionId: { productId, regionId: region.id },
      },
    });

    if (override) {
      return {
        price: override.price,
        currency: override.currency,
        compareAtPrice: override.compareAtPrice,
      };
    }

    return {
      price: product.price,
      currency: 'USD',
      compareAtPrice: product.compareAtPrice,
    };
  }

  async calculateTax(
    countryCode: string,
    stateCode?: string,
  ): Promise<{ taxRate: number; taxType: string }> {
    // Lookup tax rule
    const rule = await this.prisma.taxRule.findFirst({
      where: {
        countryCode: countryCode.toUpperCase(),
        stateCode: stateCode ? stateCode.toUpperCase() : '',
      },
    });

    if (rule) {
      return { taxRate: rule.taxRate, taxType: rule.taxType };
    }

    // Default fallback
    const region = await this.getRegionByCountry(countryCode);
    return {
      taxRate: region ? region.taxRate : 0.0,
      taxType: region ? region.taxType : 'vat',
    };
  }

  async getShippingRates(countryCode: string) {
    const region = await this.getRegionByCountry(countryCode);
    if (!region) return [];

    return this.prisma.shippingRate.findMany({
      where: { regionId: region.id },
      include: { carrier: true },
    });
  }
}
