import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StyleDnaService {
  private readonly logger = new Logger(StyleDnaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getOrComputeStyleDna(userId: string): Promise<any> {
    // 1. Check if DNA already exists
    let styleDna = await this.prisma.userStyleDNA.findUnique({
      where: { userId },
    });

    if (!styleDna) {
      // 2. Perform initial computation based on user interaction snapshots
      styleDna = await this.computeStyleDna(userId);
    }

    return styleDna;
  }

  async recordSearch(userId: string, query: string): Promise<void> {
    let snapshot = await this.prisma.userBehaviorSnapshot.findUnique({
      where: { userId },
    });

    if (!snapshot) {
      snapshot = await this.prisma.userBehaviorSnapshot.create({
        data: {
          userId,
          recentSearches: JSON.stringify([query]),
          viewedCategories: '{}',
          viewedColors: '{}',
        },
      });
      return;
    }

    const searches = JSON.parse(snapshot.recentSearches || '[]');
    const updated = [
      query,
      ...searches.filter((s: string) => s !== query),
    ].slice(0, 10);

    await this.prisma.userBehaviorSnapshot.update({
      where: { userId },
      data: {
        recentSearches: JSON.stringify(updated),
        lastActive: new Date(),
      },
    });
  }

  async recordProductClick(userId: string, productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, colors: true },
    });

    if (!product) return;

    const snapshot = await this.prisma.userBehaviorSnapshot.findUnique({
      where: { userId },
    });

    if (!snapshot) {
      const catCount = { [product.category.slug]: 1 };
      const colorCount = product.colors.reduce(
        (acc: any, c) => ({ ...acc, [c.color]: 1 }),
        {},
      );
      await this.prisma.userBehaviorSnapshot.create({
        data: {
          userId,
          recentSearches: '[]',
          viewedCategories: JSON.stringify(catCount),
          viewedColors: JSON.stringify(colorCount),
        },
      });
      return;
    }

    const catCounts = JSON.parse(snapshot.viewedCategories || '{}');
    const colorCounts = JSON.parse(snapshot.viewedColors || '{}');

    catCounts[product.category.slug] =
      (catCounts[product.category.slug] || 0) + 1;
    product.colors.forEach((c) => {
      colorCounts[c.color] = (colorCounts[c.color] || 0) + 1;
    });

    await this.prisma.userBehaviorSnapshot.update({
      where: { userId },
      data: {
        viewedCategories: JSON.stringify(catCounts),
        viewedColors: JSON.stringify(colorCounts),
        lastActive: new Date(),
      },
    });

    // Recompute style dna in background periodically
    this.computeStyleDna(userId).catch(() => {});
  }

  private async computeStyleDna(userId: string): Promise<any> {
    // Fetch user preferences, orders, wishlist, and behavior snapshots
    const [preference, snapshot, orders, wishlist] = await Promise.all([
      this.prisma.userPreference.findUnique({ where: { userId } }),
      this.prisma.userBehaviorSnapshot.findUnique({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        include: {
          items: { include: { product: { include: { category: true } } } },
        },
      }),
      this.prisma.wishlistItem.findMany({
        where: { userId },
        include: { product: { include: { category: true, colors: true } } },
      }),
    ]);

    // Aggregate category and color preferences
    const categoryWeights: Record<string, number> = {};
    const colorWeights: Record<string, number> = {};

    // 1. Process orders (highest weight)
    orders.forEach((o) => {
      o.items.forEach((item) => {
        const catSlug = item.product?.category?.slug || 'tops';
        categoryWeights[catSlug] = (categoryWeights[catSlug] || 0) + 5;
        colorWeights[item.color] = (colorWeights[item.color] || 0) + 5;
      });
    });

    // 2. Process wishlist (medium weight)
    wishlist.forEach((w) => {
      const catSlug = w.product?.category?.slug || 'tops';
      categoryWeights[catSlug] = (categoryWeights[catSlug] || 0) + 3;
      w.product?.colors.forEach((c) => {
        colorWeights[c.color] = (colorWeights[c.color] || 0) + 3;
      });
    });

    // 3. Process views (low weight)
    if (snapshot) {
      const viewedCats = JSON.parse(snapshot.viewedCategories || '{}');
      const viewedColors = JSON.parse(snapshot.viewedColors || '{}');
      Object.entries(viewedCats).forEach(([cat, val]) => {
        categoryWeights[cat] = (categoryWeights[cat] || 0) + (val as number);
      });
      Object.entries(viewedColors).forEach(([color, val]) => {
        colorWeights[color] = (colorWeights[color] || 0) + (val as number);
      });
    }

    // Sort and get dominant
    const sortedCats = Object.entries(categoryWeights).sort(
      (a, b) => b[1] - a[1],
    );
    const sortedColors = Object.entries(colorWeights).sort(
      (a, b) => b[1] - a[1],
    );

    const preferredCategories =
      sortedCats
        .slice(0, 3)
        .map(([c]) => c)
        .join(', ') || 'tops, bottoms';
    const preferredColors =
      sortedColors
        .slice(0, 3)
        .map(([c]) => c)
        .join(', ') || 'Onyx Black, Slate Gray';

    // Heuristics for dominant aesthetic
    let dominantAesthetic = 'Minimalist Performance';
    if (preferredCategories.includes('accessories'))
      dominantAesthetic = 'Functional Runner';
    else if (preferredColors.includes('Volt'))
      dominantAesthetic = 'Volt Brutalism';
    else if (
      preferredColors.includes('Black') &&
      preferredCategories.includes('outerwear')
    )
      dominantAesthetic = 'Onyx Luxury Gymwear';
    else if (
      preferredCategories.includes('tops') &&
      preferredCategories.includes('bottoms')
    )
      dominantAesthetic = 'Monochrome Performance';

    const styleEvolution = `Your activewear palette has refined toward ${preferredColors.split(',')[0] || 'neutral tones'} with high-performance ${preferredCategories.split(',')[0] || 'essentials'} as the core.`;

    const data = {
      dominantAesthetic,
      preferredColors,
      preferredCategories,
      styleEvolution,
      confidenceScore: 75,
    };

    return this.prisma.userStyleDNA.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }

  async getOrInitializePreference(userId: string): Promise<any> {
    let preference = await this.prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!preference) {
      preference = await this.prisma.userPreference.create({
        data: {
          userId,
          locale: 'en',
          theme: 'dark',
          preferredSizes: 'M,L',
          preferredFits: 'Athletic',
        },
      });
    }

    return preference;
  }

  async updatePreference(userId: string, data: any): Promise<any> {
    return this.prisma.userPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        ...data,
      },
    });
  }
}
