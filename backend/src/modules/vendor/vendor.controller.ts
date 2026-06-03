import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { VendorService } from './vendor.service';

@ApiTags('vendor')
@Controller('vendor')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register as a Vendor and create Stripe Connect account',
  })
  async registerVendor(@Req() req: any, @Body('storeName') storeName: string) {
    return this.vendorService.registerVendor(
      req.user.id || req.user.userId,
      storeName,
    );
  }

  @Post('onboard')
  @ApiOperation({ summary: 'Generate Stripe Connect Onboarding Link' })
  async getOnboardingLink(
    @Req() req: any,
    @Body('refreshUrl') refreshUrl: string,
    @Body('returnUrl') returnUrl: string,
  ) {
    return this.vendorService.createOnboardingLink(
      req.user.id || req.user.userId,
      refreshUrl,
      returnUrl,
    );
  }

  @Get('status')
  @ApiOperation({ summary: 'Check Stripe Connect verification status' })
  async getStatus(@Req() req: any) {
    return this.vendorService.checkVerificationStatus(
      req.user.id || req.user.userId,
    );
  }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Get vendor dashboard statistics and AI performance insights',
  })
  async getDashboard(@Req() req: any) {
    return this.vendorService.getDashboardStats(req.user.id || req.user.userId);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get vendor catalog products list' })
  async getProducts(@Req() req: any) {
    return this.vendorService.getProducts(req.user.id || req.user.userId);
  }

  @Post('products')
  @ApiOperation({ summary: 'Create a new product in vendor catalog' })
  async createProduct(@Req() req: any, @Body() body: any) {
    return this.vendorService.createProduct(
      req.user.id || req.user.userId,
      body,
    );
  }

  @Patch('products/:id')
  @ApiOperation({ summary: 'Update vendor product details' })
  async updateProduct(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.vendorService.updateProduct(
      req.user.id || req.user.userId,
      id,
      body,
    );
  }

  @Delete('products/:id')
  @ApiOperation({ summary: 'Soft delete a product from vendor catalog' })
  async deleteProduct(@Req() req: any, @Param('id') id: string) {
    return this.vendorService.deleteProduct(req.user.id || req.user.userId, id);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get orders containing vendor products' })
  async getOrders(@Req() req: any) {
    return this.vendorService.getOrders(req.user.id || req.user.userId);
  }

  @Patch('orders/:id/fulfill')
  @ApiOperation({
    summary: 'Register shipping and tracking information for a split order',
  })
  async fulfillOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body('trackingNumber') trackingNumber: string,
    @Body('carrier') carrier: string,
  ) {
    return this.vendorService.fulfillOrder(
      req.user.id || req.user.userId,
      id,
      trackingNumber,
      carrier,
    );
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get vendor store and support profile settings' })
  async getSettings(@Req() req: any) {
    return this.vendorService.getSettings(req.user.id || req.user.userId);
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update vendor store and support profile settings' })
  async updateSettings(@Req() req: any, @Body() body: any) {
    return this.vendorService.updateSettings(
      req.user.id || req.user.userId,
      body,
    );
  }

  @Get('payouts')
  @ApiOperation({
    summary:
      'Get Stripe Connect transfer history and pending ledger payout amounts',
  })
  async getPayouts(@Req() req: any) {
    return this.vendorService.getPayouts(req.user.id || req.user.userId);
  }
}
