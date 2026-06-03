import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private isConnected = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD') || '';
    const target = `${host}:${port}`;

    try {
      this.client = new Redis({
        host,
        port,
        password: password || undefined,
        connectTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => {
          if (times > 3) {
            this.logger.warn(
              `Redis (${target}): max reconnect attempts reached. Caching disabled.`,
            );
            return null; // stop retrying
          }
          return Math.min(times * 200, 3000);
        },
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.logger.log(`Redis (${target}): connection established.`);
      });

      this.client.on('ready', () => {
        this.isConnected = true;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        this.logger.warn(`Redis (${target}): connection closed.`);
      });

      this.client.on('error', (err: Error) => {
        this.isConnected = false;
        this.logger.debug(`Redis (${target}): ${err.message}`);
      });

      // Explicit connect (lazyConnect: true means it won't auto-connect)
      this.client.connect().catch((err: Error) => {
        this.logger.warn(
          `Redis (${target}): initial connect failed — ${err.message}. Caching disabled.`,
        );
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `Redis client initialization failed (${msg}). Caching will be skipped.`,
      );
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) return null;
    try {
      const val = await this.client.get(key);
      return val ? (JSON.parse(val) as T) : null;
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Cache GET failed for key "${key}": ${errMsg}`);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds = 3600): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      const dataStr = JSON.stringify(value);
      await this.client.set(key, dataStr, 'EX', ttlSeconds);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Cache SET failed for key "${key}": ${errMsg}`);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.del(key);
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Cache DEL failed for key "${key}": ${errMsg}`);
    }
  }

  /**
   * Delete all keys matching a glob pattern using SCAN to avoid blocking Redis.
   * Example: delByPattern('products:*') clears all product cache keys.
   */
  async delByPattern(pattern: string): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.client.del(...keys);
          this.logger.debug(
            `Cache: evicted ${keys.length} keys matching "${pattern}"`,
          );
        }
      } while (cursor !== '0');
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `Cache pattern DEL failed for pattern "${pattern}": ${errMsg}`,
      );
    }
  }

  async flush(): Promise<void> {
    if (!this.isConnected || !this.client) return;
    try {
      await this.client.flushall();
      this.logger.log('Redis cache fully flushed.');
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Cache FLUSH failed: ${errMsg}`);
    }
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
      this.logger.log('Redis connection closed cleanly.');
    }
  }
}
