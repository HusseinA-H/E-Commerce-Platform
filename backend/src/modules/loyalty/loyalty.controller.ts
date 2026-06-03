import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { LoyaltyService } from './loyalty.service';

@Controller('loyalty')
@UseGuards(JwtAuthGuard)
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  /** GET /loyalty — My loyalty account with tier progress */
  @Get()
  getMyAccount(@Req() req: any) {
    return this.loyaltyService.getAccountWithProgress(req.user.id);
  }

  /** GET /loyalty/transactions — Paginated transaction history */
  @Get('transactions')
  getTransactions(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.loyaltyService.getTransactions(
      req.user.id,
      Number(page),
      Number(limit),
    );
  }

  /** GET /loyalty/rewards — Available rewards with affordability + tier status */
  @Get('rewards')
  getRewards(@Req() req: any) {
    return this.loyaltyService.getAvailableRewards(req.user.id);
  }

  /** POST /loyalty/redeem/:rewardId — Redeem a reward */
  @Post('redeem/:rewardId')
  redeemReward(@Req() req: any, @Param('rewardId') rewardId: string) {
    return this.loyaltyService.redeemReward(req.user.id, rewardId);
  }

  /** GET /loyalty/admin/stats — Admin analytics (admin only) */
  @Get('admin/stats')
  @UseGuards(AdminGuard)
  getAdminStats() {
    return this.loyaltyService.getAdminStats();
  }
}
