import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface WarehouseSeed {
  name: string;
  code: string;
  address: string;
  city: string;
  countryCode: string;
}

const WAREHOUSE_SEEDS: WarehouseSeed[] = [
  {
    name: 'US East Logistics Hub',
    code: 'WH-US-EAST',
    address: '100 Logistics Blvd',
    city: 'Newark',
    countryCode: 'US',
  },
  {
    name: 'Europe Central Distribution',
    code: 'WH-EU-CENTRAL',
    address: '15 Industrie Strasse',
    city: 'Frankfurt',
    countryCode: 'DE',
  },
  {
    name: 'UAE Desert Gateway Hub',
    code: 'WH-AE-DXB',
    address: '50 Sheikh Zayed Rd',
    city: 'Dubai',
    countryCode: 'AE',
  },
  {
    name: 'Egypt Nile Valley Warehouse',
    code: 'WH-EG-CAI',
    address: '88 Nile Corniche',
    city: 'Cairo',
    countryCode: 'EG',
  },
];

@Injectable()
export class WarehouseService implements OnModuleInit {
  private readonly logger = new Logger(WarehouseService.name);
  private groqApiKey = '';
  private readonly groqEndpoint =
    'https://api.groq.com/openai/v1/chat/completions';

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.groqApiKey = this.config.get<string>('GROQ_API_KEY') || '';
  }

  async onModuleInit() {
    try {
      await this.seedWarehouses();
      await this.seedProductInventories();
    } catch (err: any) {
      this.logger.error(`Error initializing warehouse engine: ${err.message}`);
    }
  }

  private async seedWarehouses() {
    this.logger.log('Seeding warehouse configurations...');
    for (const w of WAREHOUSE_SEEDS) {
      await this.prisma.warehouse.upsert({
        where: { code: w.code },
        update: {
          name: w.name,
          address: w.address,
          city: w.city,
          countryCode: w.countryCode,
        },
        create: {
          name: w.name,
          code: w.code,
          address: w.address,
          city: w.city,
          countryCode: w.countryCode,
        },
      });
    }
  }

  private async seedProductInventories() {
    this.logger.log('Seeding warehouse product inventory allocations...');
    const warehouses = await this.prisma.warehouse.findMany();
    const products = await this.prisma.product.findMany();

    for (const p of products) {
      for (const w of warehouses) {
        await this.prisma.warehouseInventory.upsert({
          where: {
            warehouseId_productId: {
              warehouseId: w.id,
              productId: p.id,
            },
          },
          update: {},
          create: {
            warehouseId: w.id,
            productId: p.id,
            quantity: 120,
            reservedQty: 0,
          },
        });
      }
    }
  }

  async getWarehouses() {
    return this.prisma.warehouse.findMany({
      include: { inventories: true },
    });
  }

  async getWarehouseInventory(warehouseId: string) {
    return this.prisma.warehouseInventory.findMany({
      where: { warehouseId },
      include: { product: true },
    });
  }

  async getTransfers() {
    return this.prisma.warehouseTransfer.findMany({
      include: {
        fromWarehouse: true,
        toWarehouse: true,
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTransfer(
    fromWarehouseId: string,
    toWarehouseId: string,
    productId: string,
    quantity: number,
    notes?: string,
  ) {
    const sourceInv = await this.prisma.warehouseInventory.findUnique({
      where: {
        warehouseId_productId: { warehouseId: fromWarehouseId, productId },
      },
    });

    if (!sourceInv || sourceInv.quantity < quantity) {
      throw new Error('Insufficient inventory in source warehouse.');
    }

    await this.prisma.warehouseInventory.update({
      where: { id: sourceInv.id },
      data: { quantity: { decrement: quantity } },
    });

    return this.prisma.warehouseTransfer.create({
      data: {
        fromWarehouseId,
        toWarehouseId,
        productId,
        quantity,
        status: 'completed',
        notes,
        sentAt: new Date(),
        receivedAt: new Date(),
      },
    });
  }

  async routeOrder(
    items: { productId: string; quantity: number }[],
    countryCode: string,
  ): Promise<{
    routing: {
      productId: string;
      quantity: number;
      warehouseId: string;
      warehouseCode: string;
    }[];
    isSplit: boolean;
  }> {
    const warehouses = await this.prisma.warehouse.findMany({
      where: { isActive: true },
    });

    let preferredCode = 'WH-US-EAST';
    const code = countryCode.toUpperCase();
    if (['AE', 'SA', 'QA', 'OM', 'BH', 'KW'].includes(code)) {
      preferredCode = 'WH-AE-DXB';
    } else if (code === 'EG') {
      preferredCode = 'WH-EG-CAI';
    } else if (['FR', 'DE', 'ES', 'IT', 'NL', 'GB', 'UK'].includes(code)) {
      preferredCode = 'WH-EU-CENTRAL';
    }

    const preferredWh =
      warehouses.find((w) => w.code === preferredCode) || warehouses[0];
    const otherWhs = warehouses.filter((w) => w.id !== preferredWh.id);
    const checkOrder = [preferredWh, ...otherWhs];

    const routing: {
      productId: string;
      quantity: number;
      warehouseId: string;
      warehouseCode: string;
    }[] = [];
    let isSplit = false;

    for (const item of items) {
      let routed = false;
      const prefStock = await this.prisma.warehouseInventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: preferredWh.id,
            productId: item.productId,
          },
        },
      });

      const availablePref = prefStock
        ? prefStock.quantity - prefStock.reservedQty
        : 0;
      if (availablePref >= item.quantity) {
        routing.push({
          productId: item.productId,
          quantity: item.quantity,
          warehouseId: preferredWh.id,
          warehouseCode: preferredWh.code,
        });
        routed = true;
      } else {
        for (const wh of otherWhs) {
          const stock = await this.prisma.warehouseInventory.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: wh.id,
                productId: item.productId,
              },
            },
          });
          const available = stock ? stock.quantity - stock.reservedQty : 0;
          if (available >= item.quantity) {
            routing.push({
              productId: item.productId,
              quantity: item.quantity,
              warehouseId: wh.id,
              warehouseCode: wh.code,
            });
            routed = true;
            isSplit = true;
            break;
          }
        }

        if (!routed) {
          let remainingQty = item.quantity;
          for (const wh of checkOrder) {
            if (remainingQty <= 0) break;
            const stock = await this.prisma.warehouseInventory.findUnique({
              where: {
                warehouseId_productId: {
                  warehouseId: wh.id,
                  productId: item.productId,
                },
              },
            });
            const available = stock ? stock.quantity - stock.reservedQty : 0;
            if (available > 0) {
              const take = Math.min(available, remainingQty);
              routing.push({
                productId: item.productId,
                quantity: take,
                warehouseId: wh.id,
                warehouseCode: wh.code,
              });
              remainingQty -= take;
              if (wh.id !== preferredWh.id) {
                isSplit = true;
              }
            }
          }
          if (remainingQty > 0) {
            routing.push({
              productId: item.productId,
              quantity: remainingQty,
              warehouseId: preferredWh.id,
              warehouseCode: preferredWh.code,
            });
          }
        }
      }
    }

    return { routing, isSplit };
  }

  async reserveInventory(warehouseId: string, productId: string, qty: number) {
    await this.prisma.warehouseInventory.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: { reservedQty: { increment: qty } },
    });
  }

  async releaseInventory(warehouseId: string, productId: string, qty: number) {
    await this.prisma.warehouseInventory.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: { reservedQty: { decrement: qty } },
    });
  }

  async deductInventory(warehouseId: string, productId: string, qty: number) {
    await this.prisma.warehouseInventory.update({
      where: { warehouseId_productId: { warehouseId, productId } },
      data: {
        quantity: { decrement: qty },
        reservedQty: { decrement: qty },
      },
    });
  }

  async getAiRebalancingReport(): Promise<string> {
    const inventories = await this.prisma.warehouseInventory.findMany({
      include: { warehouse: true, product: true },
    });

    const stockSummary = inventories.map((inv) => ({
      warehouse: inv.warehouse.code,
      product: inv.product.name,
      sku: inv.product.sku,
      stock: inv.quantity,
      reserved: inv.reservedQty,
    }));

    if (!this.groqApiKey) {
      return JSON.stringify(
        {
          recommendation:
            'Increase core compression layers by 20% in Europe Hub. Groq Key not configured.',
          summary: stockSummary,
        },
        null,
        2,
      );
    }

    try {
      const response = await axios.post(
        this.groqEndpoint,
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content:
                'You are an elite operations research scientist and supply chain AI for APEX LUXE sportswear. Recommend stock rebalancing and demand forecasting strategy based on current levels.',
            },
            {
              role: 'user',
              content: `Here is the current warehouse inventories summary: ${JSON.stringify(stockSummary)}`,
            },
          ],
          temperature: 0.2,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.groqApiKey}`,
          },
        },
      );

      return response.data.choices[0].message.content;
    } catch (e: any) {
      this.logger.error(`Groq rebalancing analysis failed: ${e.message}`);
      return 'AI Rebalancing Engine is currently resolving demand metrics. Dynamic rebalancing recommended.';
    }
  }
}
