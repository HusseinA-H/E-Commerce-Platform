import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { SocialCommerceService } from './social-commerce.service';

@Controller('social')
export class SocialCommerceController {
  constructor(private readonly socialCommerceService: SocialCommerceService) {}

  @Get('catalog/meta')
  async getMetaCatalog(@Res() res: Response) {
    const xml = await this.socialCommerceService.generateMetaCatalog();
    res.set('Content-Type', 'text/xml');
    res.send(xml);
  }

  @Get('catalog/tiktok')
  async getTikTokCatalog() {
    return this.socialCommerceService.generateTikTokCatalog();
  }
}
