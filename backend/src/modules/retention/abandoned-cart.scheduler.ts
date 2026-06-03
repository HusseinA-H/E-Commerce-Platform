import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AbandonedCartService } from './abandoned-cart.service';

/**
 * AbandonedCartScheduler — Runs every hour to detect and queue abandoned carts.
 */
@Injectable()
export class AbandonedCartScheduler {
  private readonly logger = new Logger(AbandonedCartScheduler.name);

  constructor(private readonly cartService: AbandonedCartService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async runAbandonedCartScan() {
    this.logger.log('[Cron] Running abandoned cart scan...');
    try {
      const result = await this.cartService.scanAbandonedCarts();
      this.logger.log(
        `[Cron] Abandoned cart scan complete: ${result.scheduled} jobs scheduled`,
      );
    } catch (e: any) {
      this.logger.error(`[Cron] Abandoned cart scan failed: ${e.message}`);
    }
  }
}
