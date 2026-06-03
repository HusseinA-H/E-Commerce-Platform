import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: Partial<PrismaService>;
  let redisService: Partial<RedisService>;

  beforeEach(async () => {
    prismaService = {
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      } as any,
      category: {
        findUnique: jest.fn(),
      } as any,
      $transaction: jest.fn((callback) =>
        callback(prismaService as any),
      ) as any,
      productImage: { createMany: jest.fn(), deleteMany: jest.fn() } as any,
      productSize: { createMany: jest.fn(), deleteMany: jest.fn() } as any,
      productColor: { createMany: jest.fn(), deleteMany: jest.fn() } as any,
      productSpec: { createMany: jest.fn(), deleteMany: jest.fn() } as any,
    };

    redisService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delByPattern: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prismaService },
        { provide: RedisService, useValue: redisService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return cached products if available for base query', async () => {
      const mockProducts = [{ id: '1', name: 'Test' }];
      (redisService.get as jest.Mock).mockResolvedValue(mockProducts);

      const result = await service.findAll({});
      expect(result).toEqual(mockProducts);
      expect(prismaService.product?.findMany).not.toHaveBeenCalled();
    });

    it('should query DB and cache if not in cache', async () => {
      const mockProducts = [{ id: '1', name: 'Test' }];
      (prismaService.product?.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.findAll({});
      expect(result).toEqual(mockProducts);
      expect(redisService.set).toHaveBeenCalled();
    });

    it('should apply filters and not cache complex queries', async () => {
      const mockProducts = [{ id: '1', name: 'Test' }];
      (prismaService.product?.findMany as jest.Mock).mockResolvedValue(
        mockProducts,
      );

      const result = await service.findAll({ search: 'Test' });
      expect(result).toEqual(mockProducts);
      expect(redisService.set).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return product from cache if available', async () => {
      const mockProduct = { id: '1', name: 'Test' };
      (redisService.get as jest.Mock).mockResolvedValue(mockProduct);

      const result = await service.findById('1');
      expect(result).toEqual(mockProduct);
    });

    it('should throw NotFoundException if product not found', async () => {
      (prismaService.product?.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.findById('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should throw NotFoundException if category not found', async () => {
      (prismaService.category?.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.create({
          name: 'Test',
          price: 100,
          categoryId: 'cat1',
          description: 'test',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
