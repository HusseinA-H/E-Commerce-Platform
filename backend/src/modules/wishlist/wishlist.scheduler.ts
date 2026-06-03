import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WishlistIntelligenceService } from './wishlist-intelligence.service';

/**
 * WishlistScheduler — Daily cron to run wishlist restock + price drop scans.
 */
@Injectable()
export class WishlistScheduler {
  private readonly logger = new Logger(WishlistScheduler.name);

  constructor(private readonly intelligence: WishlistIntelligenceService) {}

  @Cron('0 6 * * *') // Daily at 6am
  async runWishlistAlertScan() {
    this.logger.log('[Cron] Running wishlist alert scan...');
    try {
      const [restock, priceDrop] = await Promise.all([
        this.intelligence.checkRestockAlerts(),
        this.intelligence.checkPriceDropAlerts(),
      ]);
      this.logger.log(
        `[Cron] Wishlist scan: ${restock.notified} restock + ${priceDrop.notified} price-drop alerts sent`,
      );
    } catch (e: any) {
      this.logger.error(`[Cron] Wishlist alert scan failed: ${e.message}`);
    }
  }
}
