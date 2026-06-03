import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { ReferralService } from './referral.service';

class ApplyReferralDto {
  code: string;
}

@Controller('referral')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /** GET /referral/my-code — Get or create my referral code and link */
  @Get('my-code')
  @UseGuards(JwtAuthGuard)
  getMyCode(@Req() req: any) {
    return this.referralService.getMyCode(req.user.id);
  }

  /** POST /referral/apply — Apply a referral code (post-registration) */
  @Post('apply')
  @UseGuards(JwtAuthGuard)
  apply(@Req() req: any, @Body() dto: ApplyReferralDto) {
    return this.referralService.applyReferralCode(req.user.id, dto.code);
  }

  /** GET /referral/analytics — My referral performance */
  @Get('analytics')
  @UseGuards(JwtAuthGuard)
  getAnalytics(@Req() req: any) {
    return this.referralService.getMyAnalytics(req.user.id);
  }

  /** GET /referral/admin/stats — Platform-wide stats (admin only) */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, AdminGuard)
  getAdminStats() {
    return this.referralService.getAdminStats();
  }
}
