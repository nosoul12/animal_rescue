import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() body: any) {
    return this.authService.signup({
      name: body?.name,
      email: body?.email,
      password: body?.password,
      role: body?.role,
      phone: body?.phone,
    });
  }

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login({ email: body?.email, password: body?.password });
  }
}
