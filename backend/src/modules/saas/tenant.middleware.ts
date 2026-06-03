import {
  Injectable,
  NestMiddleware,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantContext } from './tenant-context';

export interface TenantRequest extends Request {
  tenantId?: string | null;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly tenantContext: TenantContext,
  ) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const tenantHeader = (req.headers['x-tenant-id'] ||
      req.headers['X-Tenant-Id']) as string | undefined;

    if (!tenantHeader) {
      // Platform-level access (Root site, SaaS billing, Super-admin setup)
      req.tenantId = null;
      return this.tenantContext.run(null, () => next());
    }

    const tenantSlug = tenantHeader.toLowerCase().trim();

    try {
      // 1. Check Redis cache first
      const cacheKey = `saas:tenant-resolve:${tenantSlug}`;
      let tenantId = await this.redis.get<string>(cacheKey);

      if (!tenantId) {
        // 2. Query database for subdomain or custom domain
        const tenant = await this.prisma.tenant.findFirst({
          where: {
            OR: [
              { subdomain: tenantSlug },
              { customDomain: tenantSlug },
              { id: tenantSlug }, // Fallback for raw UUID lookup
            ],
            isActive: true,
          },
          select: { id: true },
        });

        if (!tenant) {
          throw new NotFoundException(
            `Tenant store "${tenantSlug}" does not exist or is suspended.`,
          );
        }

        tenantId = tenant.id;
        // Cache mapping for 2 hours (7200 seconds)
        await this.redis.set(cacheKey, tenantId, 7200);
      }

      req.tenantId = tenantId;
      // 3. Bind execution to request context
      return this.tenantContext.run(tenantId, () => next());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Failed to resolve tenant for "${tenantSlug}": ${msg}`);
      res.status(404).json({
        statusCode: 404,
        message: [`Store "${tenantSlug}" not found or inactive.`],
        error: 'Not Found',
      });
    }
  }
}
