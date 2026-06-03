import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface ServiceStatus {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthReport> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const allOk = database.status === 'ok' && redis.status === 'ok';

    return {
      status: allOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      services: { database, redis },
    };
  }

  // ─── Private checks ─────────────────────────────────────────────────────────

  private async checkDatabase(): Promise<ServiceStatus> {
    if (!this.prisma.isReady) {
      return {
        status: 'degraded',
        message: 'Database connection not established — retry in progress.',
      };
    }

    const start = Date.now();
    try {
      // Lightweight query — just confirms the connection is alive.
      await this.prisma.$queryRaw`SELECT 1 AS alive`;
      return {
        status: 'ok',
        latencyMs: Date.now() - start,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'error',
        message: `Database query failed: ${msg}`,
        latencyMs: Date.now() - start,
      };
    }
  }

  private async checkRedis(): Promise<ServiceStatus> {
    const start = Date.now();
    try {
      // RedisService.get() returns null gracefully when disconnected.
      // Use the isConnected flag exposed via a test probe key.
      const probe = await this.redis.get<string>('__health_probe__');
      const latencyMs = Date.now() - start;

      // If Redis is offline, get() returns null without error.
      // We distinguish by latency: a real Redis hit resolves instantly.
      // A more robust check uses a dedicated setter probe:
      await this.redis.set('__health_probe__', 'ok', 10);
      const verify = await this.redis.get<string>('__health_probe__');

      if (verify === 'ok') {
        return { status: 'ok', latencyMs };
      } else {
        return {
          status: 'degraded',
          message: 'Redis not connected — caching disabled.',
          latencyMs,
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: 'error',
        message: `Redis check failed: ${msg}`,
        latencyMs: Date.now() - start,
      };
    }
  }
}
