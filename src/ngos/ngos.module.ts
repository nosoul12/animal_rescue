import { Module } from '@nestjs/common';
import { NgosController } from './ngos.controller';
import { NgosService } from './ngos.service';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  controllers: [NgosController],
  providers: [NgosService, RolesGuard]
})
export class NgosModule {}
