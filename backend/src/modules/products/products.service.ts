import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateProductDto } from './dto/create-product.dto';
import {
  Prisma,
  Product,
  ProductImage,
  ProductSize,
  ProductColor,
  ProductSpec,
  Category,
  Review,
} from '@prisma/client';

export type ProductWithRelations = Product & {
  images: ProductImage[];
  sizes: ProductSize[];
  colors: ProductColor[];
  specs: ProductSpec[];
  category: Category;
};

export type ReviewWithUser = Review & {
  user: {
    name: string;
  };
};

export type ProductDetail = ProductWithRelations & {
  reviews: ReviewWithUser[];
};

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  private getSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  async findAll(params: {
    categorySlug?: string;
    search?: string;
    minPrice?: number;
    maxPrice?: number;
    sizes?: string[];
    colors?: string[];
    tech?: string[];
    sort?: 'price-asc' | 'price-desc' | 'newest';
    includeDeleted?: boolean;
  }): Promise<ProductWithRelations[]> {
    const {
      categorySlug,
      search,
      minPrice,
      maxPrice,
      sizes,
      colors,
      tech,
      sort,
      includeDeleted,
    } = params;

    // Check if we can hit cache (simple caching for baseline queries)
    const isBaseQuery =
      !categorySlug &&
      !search &&
      !minPrice &&
      !maxPrice &&
      !sizes &&
      !colors &&
      !tech &&
      !sort &&
      !includeDeleted;
    const cacheKey = 'products:all';
    if (isBaseQuery) {
      const cached =
        await this.redisService.get<ProductWithRelations[]>(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.ProductWhereInput = {};

    // Filter out soft-deleted items unless explicitly requested (e.g. by Admins)
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (sizes && sizes.length > 0) {
      where.sizes = {
        some: { size: { in: sizes } },
      };
    }

    if (colors && colors.length > 0) {
      where.colors = {
        some: { color: { in: colors } },
      };
    }

    if (tech && tech.length > 0) {
      where.specs = {
        some: {
          OR: [{ key: { in: tech } }, { value: { in: tech } }],
        },
      };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price-asc') orderBy = { price: 'asc' };
    if (sort === 'price-desc') orderBy = { price: 'desc' };
    if (sort === 'newest') orderBy = { createdAt: 'desc' };

    const products = await this.prisma.product.findMany({
      where,
      orderBy,
      include: {
        images: true,
        sizes: true,
        colors: true,
        specs: true,
        category: true,
      },
    });

    if (isBaseQuery) {
      await this.redisService.set(cacheKey, products, 1800); // 30 minutes cache
    }

    return products;
  }

  async findById(id: string, includeDeleted = false): Promise<ProductDetail> {
    const cacheKey = `products:${id}:${includeDeleted}`;
    const cached = await this.redisService.get<ProductDetail>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        sizes: true,
        colors: true,
        specs: true,
        category: true,
        reviews: {
          include: {
            user: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product || (product.deletedAt && !includeDeleted)) {
      throw new NotFoundException('Product not found.');
    }

    await this.redisService.set(cacheKey, product, 1800);
    return product;
  }

  async findBySlug(
    slug: string,
    includeDeleted = false,
  ): Promise<ProductDetail> {
    const cacheKey = `products:slug:${slug}:${includeDeleted}`;
    const cached = await this.redisService.get<ProductDetail>(cacheKey);
    if (cached) return cached;

    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: true,
        sizes: true,
        colors: true,
        specs: true,
        category: true,
        reviews: {
          include: {
            user: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!product || (product.deletedAt && !includeDeleted)) {
      throw new NotFoundException('Product not found.');
    }

    await this.redisService.set(cacheKey, product, 1800);
    return product;
  }

  async create(dto: CreateProductDto) {
    const slug = this.getSlug(dto.name);

    // Validate Category exists
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Target category not found.');
    }

    const product = await this.prisma.$transaction(async (tx) => {
      const prod = await tx.product.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description,
          price: dto.price,
          compareAtPrice: dto.compareAtPrice,
          stock: dto.stock || 0,
          categoryId: dto.categoryId,
          isNew: dto.isNew || false,
          isLimited: dto.isLimited || false,
        },
      });

      if (dto.images && dto.images.length > 0) {
        await tx.productImage.createMany({
          data: dto.images.map((url, idx) => ({
            url,
            isPrimary: idx === 0,
            productId: prod.id,
          })),
        });
      }

      if (dto.sizes && dto.sizes.length > 0) {
        await tx.productSize.createMany({
          data: dto.sizes.map((size) => ({
            size,
            productId: prod.id,
          })),
        });
      }

      if (dto.colors && dto.colors.length > 0) {
        await tx.productColor.createMany({
          data: dto.colors.map((color) => ({
            color,
            productId: prod.id,
          })),
        });
      }

      if (dto.specs && dto.specs.length > 0) {
        await tx.productSpec.createMany({
          data: dto.specs.map((spec) => ({
            key: spec.key,
            value: spec.value,
            productId: prod.id,
          })),
        });
      }

      return prod;
    });

    await this.clearCache(product.id, slug);
    return this.findById(product.id);
  }

  async update(
    id: string,
    dto: Partial<CreateProductDto>,
  ): Promise<ProductDetail> {
    await this.findById(id);

    await this.prisma.$transaction(async (tx) => {
      // 1. Update Core Fields
      const coreUpdate: Prisma.ProductUpdateInput = {};
      if (dto.name) {
        coreUpdate.name = dto.name;
        coreUpdate.slug = this.getSlug(dto.name);
      }
      if (dto.description) coreUpdate.description = dto.description;
      if (dto.price !== undefined) coreUpdate.price = dto.price;
      if (dto.compareAtPrice !== undefined)
        coreUpdate.compareAtPrice = dto.compareAtPrice;
      if (dto.stock !== undefined) coreUpdate.stock = dto.stock;
      if (dto.categoryId) {
        coreUpdate.category = { connect: { id: dto.categoryId } };
      }
      if (dto.isNew !== undefined) coreUpdate.isNew = dto.isNew;
      if (dto.isLimited !== undefined) coreUpdate.isLimited = dto.isLimited;

      const prod = await tx.product.update({
        where: { id },
        data: coreUpdate,
      });

      // 2. Rebuild details relations if provided
      if (dto.images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (dto.images.length > 0) {
          await tx.productImage.createMany({
            data: dto.images.map((url, idx) => ({
              url,
              isPrimary: idx === 0,
              productId: id,
            })),
          });
        }
      }

      if (dto.sizes !== undefined) {
        await tx.productSize.deleteMany({ where: { productId: id } });
        if (dto.sizes.length > 0) {
          await tx.productSize.createMany({
            data: dto.sizes.map((size) => ({
              size,
              productId: id,
            })),
          });
        }
      }

      if (dto.colors !== undefined) {
        await tx.productColor.deleteMany({ where: { productId: id } });
        if (dto.colors.length > 0) {
          await tx.productColor.createMany({
            data: dto.colors.map((color) => ({
              color,
              productId: id,
            })),
          });
        }
      }

      if (dto.specs !== undefined) {
        await tx.productSpec.deleteMany({ where: { productId: id } });
        if (dto.specs.length > 0) {
          await tx.productSpec.createMany({
            data: dto.specs.map((spec) => ({
              key: spec.key,
              value: spec.value,
              productId: id,
            })),
          });
        }
      }

      return prod;
    });

    const updatedSlug = dto.name ? this.getSlug(dto.name) : undefined;
    await this.clearCache(id, updatedSlug);
    return this.findById(id);
  }

  async delete(id: string) {
    const product = await this.findById(id, true);
    const updated = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await this.clearCache(id, product.slug);
    return updated;
  }

  async restore(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { deletedAt: null },
    });
    await this.clearCache(id, product.slug);
    return updated;
  }

  async toggleFeatured(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found.');
    }
    const updated = await this.prisma.product.update({
      where: { id },
      data: { isFeatured: !product.isFeatured },
    });
    await this.clearCache(id, product.slug);
    return updated;
  }

  async bulkFeature(ids: string[], isFeatured: boolean) {
    await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { isFeatured },
    });
    await this.clearCache();
    return { count: ids.length };
  }

  async bulkArchive(ids: string[]) {
    await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });
    await this.clearCache();
    return { count: ids.length };
  }

  async bulkRestore(ids: string[]) {
    await this.prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: null },
    });
    await this.clearCache();
    return { count: ids.length };
  }

  async bulkStockUpdate(updates: { id: string; stockQuantity: number }[]) {
    await this.prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const product = await tx.product.findUnique({
          where: { id: update.id },
        });
        if (product) {
          let newStatus = 'IN_STOCK';
          if (update.stockQuantity === 0) {
            newStatus = 'OUT_OF_STOCK';
          } else if (update.stockQuantity <= product.lowStockThreshold) {
            newStatus = 'LOW_STOCK';
          }
          await tx.product.update({
            where: { id: update.id },
            data: {
              stockQuantity: update.stockQuantity,
              stock: update.stockQuantity, // sync legacy stock
              inventoryStatus: newStatus,
            },
          });
        }
      }
    });
    await this.clearCache();
    return { count: updates.length };
  }

  private async clearCache(id?: string, slug?: string) {
    // Sweep all products:* cache keys to ensure consistency after mutations
    await this.redisService.delByPattern('products:*');
    // Also explicitly delete known keys in case pattern scan is unavailable
    await this.redisService.del('products:all');
    if (id) {
      await this.redisService.del(`products:${id}:true`);
      await this.redisService.del(`products:${id}:false`);
    }
    if (slug) {
      await this.redisService.del(`products:slug:${slug}:true`);
      await this.redisService.del(`products:slug:${slug}:false`);
    }
  }
}
