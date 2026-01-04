import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { NgosModule } from './ngos/ngos.module';
import { CasesModule } from './cases/cases.module';
import { PrismaModule } from './prisma/prisma.module';
import { AdoptionsModule } from './adoptions/adoptions.module';
import { HealthModule } from './health/health.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    NestConfigModule.forRoot({ 
      isGlobal: true,
      envFilePath: process.cwd() + '/.env',
    }),
    ConfigModule,
    PrismaModule,
    AuthModule,
    NgosModule,
    CasesModule,
    AdoptionsModule,
    HealthModule,
  ],
})
export class AppModule {}
