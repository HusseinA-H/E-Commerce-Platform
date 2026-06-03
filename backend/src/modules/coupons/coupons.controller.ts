import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get('validate')
  @ApiOperation({ summary: 'Validate a coupon code (Public)' })
  async validateCoupon(@Query('code') code: string) {
    const coupon = await this.couponsService.validateCoupon(code);
    return {
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      isValid: true,
    };
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Get all coupons (Admin only)' })
  async findAll() {
    return this.couponsService.findAll();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Create a new coupon (Admin only)' })
  async create(
    @Body()
    body: {
      code: string;
      discountPercent: number;
      expiresAt: Date;
      maxUses: number;
    },
  ) {
    return this.couponsService.create(body);
  }

  @Patch(':id/toggle')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Toggle coupon active status (Admin only)' })
  async toggleActive(@Param('id') id: string) {
    return this.couponsService.toggleActive(id);
  }
}
