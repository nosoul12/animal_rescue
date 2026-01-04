import { Module } from '@nestjs/common';
import { CasesController } from './cases.controller';
import { CasesService } from './cases.service';
import { CloudinaryService } from '../common/cloudinary.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [CasesController],
  providers: [CasesService, CloudinaryService, RolesGuard]
})
export class CasesModule {}
