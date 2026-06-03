import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async createTenant(data: {
    name: string;
    subdomain: string;
    ownerUserId: string;
  }) {
    const slug = data.subdomain.toLowerCase().trim();

    // Check availability
    const existing = await this.prisma.tenant.findFirst({
      where: {
        OR: [{ subdomain: slug }, { customDomain: slug }],
      },
    });

    if (existing) {
      throw new ConflictException(
        `The store address "${slug}" is already taken.`,
      );
    }

    // Wrap in transaction to ensure consistency
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.name,
          subdomain: slug,
        },
      });

      // 2. Assign Tenant User
      await tx.tenantUser.create({
        data: {
          tenantId: tenant.id,
          userId: data.ownerUserId,
          role: 'owner',
        },
      });

      // 3. Initialize Default Settings
      await tx.tenantSettings.create({
        data: {
          tenantId: tenant.id,
          storeName: data.name,
          primaryColor: '#0b0b0b',
          secondaryColor: '#add500',
          accentColor: '#ffffff',
          themeName: 'dark-luxe',
        },
      });

      // 4. Initialize Starter Subscription
      await tx.tenantSubscription.create({
        data: {
          tenantId: tenant.id,
          planCode: 'starter',
          status: 'active',
        },
      });

      return tenant;
    });
  }

  async getTenantBySubdomain(subdomain: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { subdomain },
      include: {
        settings: true,
        subscription: true,
      },
    });
    if (!tenant)
      throw new NotFoundException(`Tenant store "${subdomain}" not found.`);
    return tenant;
  }

  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        settings: true,
        subscription: true,
      },
    });
    if (!tenant) throw new NotFoundException('Store profile not found.');
    return tenant;
  }

  async updateSettings(
    tenantId: string,
    data: {
      storeName?: string;
      logoUrl?: string;
      primaryColor?: string;
      secondaryColor?: string;
      accentColor?: string;
      themeName?: string;
      customCss?: string;
    },
  ) {
    // Clear resolved cache to force update
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (tenant) {
      await this.redis.del(`saas:tenant-resolve:${tenant.subdomain}`);
      if (tenant.customDomain) {
        await this.redis.del(`saas:tenant-resolve:${tenant.customDomain}`);
      }
    }

    return this.prisma.tenantSettings.update({
      where: { tenantId },
      data,
    });
  }

  async updateDomain(tenantId: string, customDomain: string | null) {
    const domain = customDomain ? customDomain.toLowerCase().trim() : null;

    if (domain) {
      const existing = await this.prisma.tenant.findFirst({
        where: {
          customDomain: domain,
          NOT: { id: tenantId },
        },
      });
      if (existing) {
        throw new ConflictException(
          `The domain "${domain}" is already assigned to another store.`,
        );
      }
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { customDomain: domain },
    });

    // Reset resolution cache
    await this.redis.del(`saas:tenant-resolve:${tenant.subdomain}`);
    if (domain) {
      await this.redis.del(`saas:tenant-resolve:${domain}`);
    }

    return tenant;
  }

  async getAllTenants() {
    return this.prisma.tenant.findMany({
      include: {
        subscription: true,
        settings: true,
      },
    });
  }

  async setTenantActiveStatus(tenantId: string, isActive: boolean) {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { isActive },
    });
    await this.redis.del(`saas:tenant-resolve:${tenant.subdomain}`);
    if (tenant.customDomain) {
      await this.redis.del(`saas:tenant-resolve:${tenant.customDomain}`);
    }
    return tenant;
  }
}
