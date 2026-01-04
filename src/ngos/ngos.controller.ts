import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { NgosService } from './ngos.service';

@Controller('ngo')
export class NgosController {
  constructor(private readonly ngosService: NgosService) {}

  @Get('nearby-cases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('NGO')
  nearbyCases(
    @Req() req: any,
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ) {
    return this.ngosService.nearbyCases({
      userId: req.user.userId,
      lat: Number(lat),
      lng: Number(lng),
    });
  }
}
