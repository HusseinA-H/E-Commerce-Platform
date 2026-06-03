import { Test, TestingModule } from '@nestjs/testing';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CartService', () => {
  let service: CartService;
  let prismaService: Partial<PrismaService>;

  beforeEach(async () => {
    prismaService = {
      cartItem: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      } as any,
      product: {
        findUnique: jest.fn(),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addItem', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      (prismaService.product?.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.addItem('user1', {
          productId: 'invalid',
          quantity: 1,
          size: 'M',
          color: 'Red',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create new cart item if not exists', async () => {
      (prismaService.product?.findUnique as jest.Mock).mockResolvedValue({
        stock: 5,
      });
      (prismaService.cartItem?.findFirst as jest.Mock).mockResolvedValue(null);

      await service.addItem('user1', {
        productId: 'prod1',
        quantity: 3,
        size: 'M',
        color: 'Red',
      });
      expect(prismaService.cartItem?.create).toHaveBeenCalled();
    });
  });

  describe('findUserCart', () => {
    it('should return cart items', async () => {
      const mockItems = [{ id: '1', quantity: 2 }];
      (prismaService.cartItem?.findMany as jest.Mock).mockResolvedValue(
        mockItems,
      );

      const result = await service.findUserCart('user1');
      expect(result).toEqual(mockItems);
    });
  });
});
