import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SocialCommerceService {
  private readonly logger = new Logger(SocialCommerceService.name);

  constructor(private prisma: PrismaService) {}

  async generateMetaCatalog(): Promise<string> {
    try {
      const products = await this.prisma.product.findMany({
        where: { deletedAt: null },
        include: {
          images: true,
          category: true,
        },
      });

      let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>APEX LUXE Product Catalog</title>
    <link>http://localhost:3000</link>
    <description>Premium athletic fashion catalog sync feed.</description>`;

      products.forEach((p) => {
        const imageUrl =
          p.images.find((img) => img.isPrimary)?.url ||
          p.images[0]?.url ||
          'http://localhost:3000/placeholder.png';
        const brand = 'APEX LUXE';
        const availability = p.stockQuantity > 0 ? 'in stock' : 'out of stock';
        const priceStr = `${p.price.toFixed(2)} USD`;

        xml += `
    <item>
      <g:id>${p.id}</g:id>
      <g:title><![CDATA[${p.name}]]></g:title>
      <g:description><![CDATA[${p.description}]]></g:description>
      <g:link>http://localhost:3000/product/${p.slug || p.id}</g:link>
      <g:image_link>${imageUrl}</g:image_link>
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${priceStr}</g:price>
      <g:google_product_category>Apparel &amp; Accessories</g:google_product_category>
      <g:mpn>${p.sku || p.id}</g:mpn>
    </item>`;
      });

      xml += `
  </channel>
</rss>`;

      await this.prisma.socialCatalogSync.create({
        data: {
          platform: 'facebook',
          status: 'success',
          itemsSynced: products.length,
        },
      });

      return xml;
    } catch (error: any) {
      this.logger.error(`Meta catalog sync failed: ${error.message}`);
      await this.prisma.socialCatalogSync.create({
        data: {
          platform: 'facebook',
          status: 'failed',
          itemsSynced: 0,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }

  async generateTikTokCatalog() {
    try {
      const products = await this.prisma.product.findMany({
        where: { deletedAt: null },
        include: {
          images: true,
          category: true,
        },
      });

      const items = products.map((p) => {
        const imageUrl =
          p.images.find((img) => img.isPrimary)?.url ||
          p.images[0]?.url ||
          'http://localhost:3000/placeholder.png';
        return {
          sku_id: p.id,
          title: p.name,
          description: p.description,
          product_link: `http://localhost:3000/product/${p.slug || p.id}`,
          image_link: imageUrl,
          brand: 'APEX LUXE',
          price: p.price,
          currency: 'USD',
          stock: p.stockQuantity,
          category: p.category?.name || 'Apparel',
        };
      });

      await this.prisma.socialCatalogSync.create({
        data: {
          platform: 'tiktok',
          status: 'success',
          itemsSynced: items.length,
        },
      });

      return {
        catalog: 'APEX LUXE TikTok Sync',
        syncedAt: new Date(),
        items,
      };
    } catch (error: any) {
      this.logger.error(`TikTok catalog sync failed: ${error.message}`);
      await this.prisma.socialCatalogSync.create({
        data: {
          platform: 'tiktok',
          status: 'failed',
          itemsSynced: 0,
          errorMessage: error.message,
        },
      });
      throw error;
    }
  }
}
