import { Module } from '@nestjs/common';
import { AdoptionsController } from './adoptions.controller';
import { AdoptionsService } from './adoptions.service';
import { CloudinaryService } from '../common/cloudinary.service';

@Module({
  controllers: [AdoptionsController],
  providers: [AdoptionsService, CloudinaryService],
})
export class AdoptionsModule {}
