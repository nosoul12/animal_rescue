import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { AppConfigService } from '../config/config.service';

@Injectable()
export class CloudinaryService {
  private configured = false;

  constructor(private readonly configService: AppConfigService) {}

  private ensureConfigured() {
    if (this.configured) return;

    const { cloudName, apiKey, apiSecret } = this.configService.cloudinary;

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.configured = true;
  }

  async uploadImage(file: Express.Multer.File) {
    this.ensureConfigured();

    if (!file?.buffer) {
      throw new InternalServerErrorException('Missing file buffer');
    }

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, uploadResult) => {
          if (error || !uploadResult?.secure_url) {
            reject(error ?? new Error('Cloudinary upload failed'));
            return;
          }

          resolve({ secure_url: uploadResult.secure_url });
        },
      );

      stream.end(file.buffer);
    });

    return result.secure_url;
  }
}
