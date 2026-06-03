import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { Category, Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  private readonly CACHE_KEY_ALL = 'categories:all';

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async findAll(): Promise<Category[]> {
    const cached = await this.redisService.get<Category[]>(this.CACHE_KEY_ALL);
    if (cached) return cached;

    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    await this.redisService.set(this.CACHE_KEY_ALL, categories, 3600); // cache for 1 hr
    return categories;
  }

  async findById(id: string): Promise<Category> {
    const cacheKey = `categories:${id}`;
    const cached = await this.redisService.get<Category>(cacheKey);
    if (cached) return cached;

    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Category not found.`);
    }

    await this.redisService.set(cacheKey, category, 3600);
    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({
      where: { slug },
    });
    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found.`);
    }
    return category;
  }

  async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    const category = await this.prisma.category.create({ data });
    await this.clearCache();
    return category;
  }

  async update(
    id: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<Category> {
    await this.findById(id);
    const category = await this.prisma.category.update({
      where: { id },
      data,
    });
    await this.clearCache(id);
    return category;
  }

  async delete(id: string): Promise<Category> {
    await this.findById(id);
    const category = await this.prisma.category.delete({
      where: { id },
    });
    await this.clearCache(id);
    return category;
  }

  private async clearCache(id?: string) {
    await this.redisService.del(this.CACHE_KEY_ALL);
    if (id) {
      await this.redisService.del(`categories:${id}`);
    }
  }
}
