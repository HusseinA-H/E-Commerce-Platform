import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PayoutsService } from '../vendor/payouts.service';
import { RealtimeService } from '../realtime/realtime.service';
import { ExchangeRateService } from '../global-commerce/currency.service';
import { RegionService } from '../global-commerce/region.service';
import { WarehouseService } from '../global-commerce/warehouse.service';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { ReferralService } from '../referral/referral.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: Partial<PrismaService>;
  let couponsService: Partial<CouponsService>;

  beforeEach(async () => {
    prismaService = {
      cartItem: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
      } as any,
      order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      } as any,
      orderItem: {
        createMany: jest.fn(),
      } as any,
      shippingAddress: {
        create: jest.fn(),
      } as any,
      coupon: {
        update: jest.fn(),
      } as any,
      product: {
        update: jest.fn(),
      } as any,
      $transaction: jest.fn((callback) =>
        callback(prismaService as any),
      ) as any,
    };

    couponsService = {
      validateCoupon: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaService },
        { provide: CouponsService, useValue: couponsService },
        { provide: MailService, useValue: { sendOrderConfirmation: jest.fn() } },
        { provide: NotificationsService, useValue: { trigger: jest.fn() } },
        { provide: PayoutsService, useValue: { calculateCommission: jest.fn() } },
        { provide: RealtimeService, useValue: { publishOrderUpdate: jest.fn() } },
        { provide: ExchangeRateService, useValue: { convert: jest.fn() } },
        {
          provide: RegionService,
          useValue: {
            getRegionByCountry: jest.fn().mockResolvedValue({ id: 'region1', currencyCode: 'USD' }),
            calculateTax: jest.fn().mockResolvedValue({ taxRate: 0.08 }),
            getShippingRates: jest.fn().mockResolvedValue([{ baseCost: 10.0 }]),
            getProductPriceForRegion: jest.fn().mockResolvedValue({ price: 100, currency: 'USD' }),
          },
        },
        {
          provide: WarehouseService,
          useValue: {
            routeOrder: jest.fn().mockResolvedValue({
              routing: [{ productId: 'prod1', quantity: 2, warehouseId: 'wh1' }],
              isSplit: false,
            }),
          },
        },
        { provide: LoyaltyService, useValue: { awardOrderPoints: jest.fn().mockResolvedValue(null) } },
        { provide: ReferralService, useValue: { onReferredUserPurchase: jest.fn().mockResolvedValue(null) } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    it('should throw BadRequestException if cart is empty', async () => {
      (prismaService.cartItem?.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.createOrder('user1', {
          address: '123 Test St',
          city: 'Test',
          country: 'Test',
          postalCode: '12345',
          phone: '1234567890',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      const mockCartItems = [
        {
          productId: 'prod-1',
          product: { name: 'Shoe', stock: 1, price: 100, stockQuantity: 1, reservedStock: 0, images: [] },
          quantity: 2,
          size: 'M',
          color: 'Red',
        },
      ];
      (prismaService.cartItem?.findMany as jest.Mock).mockResolvedValue(
        mockCartItems,
      );

      await expect(
        service.createOrder('user1', {
          address: '123 Test St',
          city: 'Test',
          country: 'Test',
          postalCode: '12345',
          phone: '1234567890',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOrderById', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      (prismaService.order?.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findOrderById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
