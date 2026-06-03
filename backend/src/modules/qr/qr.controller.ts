import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { QrService } from './qr.service';

@Controller('qr')
export class QrController {
  constructor(private readonly qrService: QrService) {}

  @Get('product/:id')
  async getProductQr(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.qrService.generateProductQr(id);
    res.type('image/png').send(buffer);
  }

  @Get('referral/:code')
  async getReferralQr(@Param('code') code: string, @Res() res: Response) {
    const buffer = await this.qrService.generateReferralQr(code);
    res.type('image/png').send(buffer);
  }

  @Get('order/:id')
  async getOrderQr(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.qrService.generateOrderTrackingQr(id);
    res.type('image/png').send(buffer);
  }
}
