import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CmsPage {
  id: string;
  title: string;
  slug: string;
  content: string;
  updatedAt: string;
}

export interface CmsBanner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl?: string;
  isActive: boolean;
}

export interface CmsCollection {
  id: string;
  name: string;
  slug: string;
  description?: string;
  productIds: string[];
}

export interface CmsBlog {
  id: string;
  title: string;
  slug: string;
  body: string;
  author: string;
  publishedAt: string;
}

export interface CmsStorePayload {
  pages: CmsPage[];
  banners: CmsBanner[];
  collections: CmsCollection[];
  blogs: CmsBlog[];
}

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  private getInitialPayload(): CmsStorePayload {
    return {
      pages: [
        {
          id: 'home-default',
          title: 'Welcome to our store',
          slug: 'home',
          content:
            '<p>Discover our technical high-performance training collections.</p>',
          updatedAt: new Date().toISOString(),
        },
      ],
      banners: [
        {
          id: 'banner-default',
          title: 'Technical Sportswear Evolution',
          subtitle: 'Experience absolute control and performance.',
          imageUrl:
            'https://images.unsplash.com/photo-1517838277536-f5f99be501cd',
          linkUrl: '/shop',
          isActive: true,
        },
      ],
      collections: [],
      blogs: [],
    };
  }

  async getCmsContent(tenantId: string): Promise<CmsStorePayload> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { cmsJson: true },
    });

    if (!settings) throw new NotFoundException('Store settings not found.');

    if (!settings.cmsJson) {
      return this.getInitialPayload();
    }

    try {
      return JSON.parse(settings.cmsJson) as CmsStorePayload;
    } catch {
      return this.getInitialPayload();
    }
  }

  async updateCmsContent(tenantId: string, content: CmsStorePayload) {
    return this.prisma.tenantSettings.update({
      where: { tenantId },
      data: {
        cmsJson: JSON.stringify(content),
      },
    });
  }

  async addPage(tenantId: string, page: Omit<CmsPage, 'id' | 'updatedAt'>) {
    const content = await this.getCmsContent(tenantId);
    const newPage: CmsPage = {
      id: `page_${Date.now()}`,
      ...page,
      updatedAt: new Date().toISOString(),
    };
    content.pages.push(newPage);
    await this.updateCmsContent(tenantId, content);
    return newPage;
  }

  async addBlog(tenantId: string, blog: Omit<CmsBlog, 'id' | 'publishedAt'>) {
    const content = await this.getCmsContent(tenantId);
    const newBlog: CmsBlog = {
      id: `blog_${Date.now()}`,
      ...blog,
      publishedAt: new Date().toISOString(),
    };
    content.blogs.push(newBlog);
    await this.updateCmsContent(tenantId, content);
    return newBlog;
  }

  async addBanner(tenantId: string, banner: Omit<CmsBanner, 'id'>) {
    const content = await this.getCmsContent(tenantId);
    const newBanner: CmsBanner = {
      id: `banner_${Date.now()}`,
      ...banner,
    };
    content.banners.push(newBanner);
    await this.updateCmsContent(tenantId, content);
    return newBanner;
  }
}
