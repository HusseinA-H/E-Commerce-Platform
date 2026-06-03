import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (
      cloudName &&
      apiKey &&
      apiSecret &&
      !apiKey.startsWith('mock') &&
      !apiSecret.startsWith('mock')
    ) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.isConfigured = true;
      this.logger.log('Cloudinary successfully configured.');
    } else {
      this.logger.warn(
        'Cloudinary credentials are missing or set to mock keys. File uploads will default to mock URLs.',
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folder = 'apexluxe',
  ): Promise<{ url: string; publicId: string }> {
    if (!this.isConfigured) {
      // Return a simulated mock url for local development stability
      const mockName = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
      this.logger.log(
        `Mock Upload: File simulated successfully -> ${mockName}`,
      );
      return {
        url: `https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600`, // fallback default image
        publicId: `mock_${mockName}`,
      };
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(new Error(error.message));
          if (!result)
            return reject(new Error('Cloudinary upload returned empty result'));
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(file.buffer);
    });
  }
}
