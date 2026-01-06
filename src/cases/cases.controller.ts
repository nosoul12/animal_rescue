import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CasesService } from './cases.service';

@Controller('cases')
export class CasesController {
  constructor(private readonly casesService: CasesService) {}

  @Get()
  getCases() {
    return this.casesService.listCases();
  }

  @Get(':id')
  getCase(@Param('id') id: string) {
    return this.casesService.getCaseById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  createCase(
    @Req() req: any,
    @Body() body: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.casesService.createCase({
      reportedById: req.user.userId,
      body,
      file,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateCase(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.casesService.updateCase(id, body, req.user.userId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('NGO')
  respondToCase(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    // If status is provided in body, use it; otherwise auto-assign and set to InProgress
    if (body?.status) {
      return this.casesService.updateCaseStatus(id, body.status, req.user.userId);
    }
    return this.casesService.ngoRespondToCase({
      caseId: id,
      userId: req.user.userId,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('NGO')
  deleteCase(@Req() req: any, @Param('id') id: string) {
    return this.casesService.deleteCase({
      caseId: id,
      userId: req.user.userId,
    });
  }
}
