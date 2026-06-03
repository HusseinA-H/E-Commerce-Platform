import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMssql } from '@prisma/adapter-mssql';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../saas/tenant-context';

/** Number of attempts during startup before entering degraded mode. */
const STARTUP_MAX_RETRIES = 5;
/** Delays (ms) between each startup retry: 2s, 4s, 8s, 16s, 30s. */
const STARTUP_RETRY_DELAYS_MS = [2000, 4000, 8000, 16000, 30000];

/** How often (ms) to poll for DB recovery once in degraded mode. */
const RECOVERY_POLL_INTERVAL_MS = 30_000; // 30 seconds

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  /** True once a DB connection has been verified. */
  private _isReady = false;

  /** NodeJS timer handle for the background recovery loop. */
  private _recoveryTimer: ReturnType<typeof setInterval> | null = null;

  /** Set to true once the module is being destroyed so recovery stops. */
  private _destroying = false;

  constructor(
    configService: ConfigService,
    private readonly tenantContext: TenantContext,
  ) {
    const adapter = new PrismaMssql(
      configService.getOrThrow<string>('DATABASE_URL'),
      {
        onPoolError: (err) => {
          // Pool errors are non-fatal — log at debug level to avoid noise.
          const poolMsg = err instanceof Error ? err.message : String(err);
          this.logger.debug(`Prisma pool error: ${poolMsg}`);
        },
        onConnectionError: (err) => {
          const connMsg = err instanceof Error ? err.message : String(err);
          if (this._isReady) {
            this._isReady = false;
            this.logger.warn(
              `⚠️  Database connection lost: ${connMsg}. Starting background recovery...`,
            );
            this.scheduleRecovery();
          }
        },
      },
    );

    super({ adapter });

    const modelsWithTenantId = [
      'User',
      'Product',
      'Order',
      'Category',
      'SearchAnalyticsEvent',
      'LoyaltyAccount',
      'ReferralCode',
      'AbandonedCartJob',
      'WishlistItem',
      'Coupon',
      'Warehouse',
      'RegionProductPrice',
      'Review',
      'CartItem',
      'AuditLog',
      'OutfitAnalysis',
      'OutfitChatSession',
    ];

    const rawClient = this;

    const extendedClient = this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            const tenantId = tenantContext.getTenantId();

            if (tenantId && modelsWithTenantId.includes(model)) {
              const anyArgs = args as any;
              if (operation === 'create') {
                anyArgs.data = { ...anyArgs.data, tenantId };
              } else if (operation === 'createMany') {
                if (Array.isArray(anyArgs.data)) {
                  anyArgs.data = anyArgs.data.map((item: any) => ({
                    ...item,
                    tenantId,
                  }));
                } else if (anyArgs.data) {
                  anyArgs.data = { ...anyArgs.data, tenantId };
                }
              } else if (operation === 'upsert') {
                anyArgs.create = { ...anyArgs.create, tenantId };
                anyArgs.update = { ...anyArgs.update, tenantId };

                if (anyArgs.where) {
                  const camelModel = model.charAt(0).toLowerCase() + model.slice(1);
                  const targetClient = (rawClient as any)[camelModel];
                  if (targetClient && typeof targetClient.findFirst === 'function') {
                    const existing = await targetClient.findFirst({
                      where: anyArgs.where,
                    });
                    if (existing && existing.tenantId && existing.tenantId !== tenantId) {
                      throw new ForbiddenException(
                        `Tenant isolation violation: Record does not belong to tenant ${tenantId}`,
                      );
                    }
                  }
                }
              } else if (
                [
                  'update',
                  'updateMany',
                  'delete',
                  'deleteMany',
                  'findUnique',
                  'findFirst',
                  'findMany',
                  'count',
                  'aggregate',
                  'groupBy',
                ].includes(operation)
              ) {
                anyArgs.where = { ...anyArgs.where, tenantId };
              }
            }
            return query(args);
          },
        },
      },
    });

    return new Proxy(this, {
      get(target, prop, receiver) {
        if (prop in extendedClient) {
          const value = (extendedClient as any)[prop];
          if (typeof value === 'function') {
            return value.bind(extendedClient);
          }
          return value;
        }
        return Reflect.get(target, prop, receiver);
      },
    });
  }

  // ─── Lifecycle hooks ────────────────────────────────────────────────────────

  async onModuleInit() {
    await this.connectWithRetry();

    if (!this._isReady) {
      // Startup retries exhausted — enter degraded mode and keep trying in background.
      this.scheduleRecovery();
    }
  }

  async onModuleDestroy() {
    this._destroying = true;
    this.stopRecovery();
    await this.$disconnect();
    this.logger.log('Database connection closed cleanly.');
  }

  // ─── Public API ─────────────────────────────────────────────────────────────

  /**
   * Returns true once the database connection has been verified.
   * Use this as a health-check gate in guards or interceptors.
   */
  get isReady(): boolean {
    return this._isReady;
  }

  // ─── Private: startup retry ─────────────────────────────────────────────────

  private async connectWithRetry(): Promise<void> {
    for (let attempt = 1; attempt <= STARTUP_MAX_RETRIES; attempt++) {
      try {
        await this.$connect();
        this._isReady = true;
        this.logger.log(
          `✅ Database connected successfully (attempt ${attempt}/${STARTUP_MAX_RETRIES}).`,
        );
        return;
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        const isLastAttempt = attempt === STARTUP_MAX_RETRIES;

        if (isLastAttempt) {
          this.logger.error(
            `❌ Database connection failed after ${STARTUP_MAX_RETRIES} attempts. ` +
              `Starting in DEGRADED MODE — DB-dependent endpoints will return 503. ` +
              `Background recovery will retry every ${RECOVERY_POLL_INTERVAL_MS / 1000}s.`,
          );
          this.logger.error(`Last error: ${msg}`);
          return; // Do NOT throw — let the app start.
        }

        const delayMs = STARTUP_RETRY_DELAYS_MS[attempt - 1];
        this.logger.warn(
          `⚠️  Database connection attempt ${attempt}/${STARTUP_MAX_RETRIES} failed: ${msg}. ` +
            `Retrying in ${delayMs / 1000}s...`,
        );
        await this.sleep(delayMs);
      }
    }
  }

  // ─── Private: background recovery ───────────────────────────────────────────

  private scheduleRecovery(): void {
    if (this._recoveryTimer || this._destroying) return;

    this.logger.log(
      `🔄 Background DB recovery scheduled — polling every ${RECOVERY_POLL_INTERVAL_MS / 1000}s.`,
    );

    this._recoveryTimer = setInterval(() => {
      void this.attemptRecovery();
    }, RECOVERY_POLL_INTERVAL_MS);
  }

  private stopRecovery(): void {
    if (this._recoveryTimer) {
      clearInterval(this._recoveryTimer);
      this._recoveryTimer = null;
    }
  }

  private async attemptRecovery(): Promise<void> {
    if (this._isReady || this._destroying) return;

    try {
      // $connect is idempotent if already connected.
      await this.$connect();
      this._isReady = true;
      this.stopRecovery();
      this.logger.log(
        `✅ Database recovered — exiting DEGRADED MODE. All endpoints are now available.`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.debug(`DB recovery attempt failed: ${msg}`);
    }
  }

  // ─── Utilities ──────────────────────────────────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
