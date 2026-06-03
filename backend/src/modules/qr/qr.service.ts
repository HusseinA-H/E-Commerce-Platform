import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrService {
  private readonly logger = new Logger(QrService.name);

  async generateQrBuffer(text: string): Promise<Buffer> {
    try {
      return await QRCode.toBuffer(text, {
        margin: 2,
        color: {
          dark: '#0b0b0b',
          light: '#ffffff',
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to generate QR buffer: ${error.message}`);
      throw error;
    }
  }

  async generateProductQr(productId: string): Promise<Buffer> {
    const url = `http://localhost:3000/product/${productId}`;
    return this.generateQrBuffer(url);
  }

  async generateReferralQr(code: string): Promise<Buffer> {
    const url = `http://localhost:3000/register?ref=${code}`;
    return this.generateQrBuffer(url);
  }

  async generateOrderTrackingQr(orderId: string): Promise<Buffer> {
    const url = `http://localhost:3000/tracking/${orderId}`;
    return this.generateQrBuffer(url);
  }
}
