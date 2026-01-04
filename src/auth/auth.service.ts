import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(
    name: string,
    email: string,
    password: string,
    role: 'Citizen' | 'NGO',
    phone?: string,
  ): Promise<{ access_token: string; token: string }>;
  async signup(input: {
    name: string;
    email: string;
    password: string;
    role: 'Citizen' | 'NGO';
    phone?: string;
  }): Promise<{ access_token: string; token: string }>;
  async signup(
    inputOrName:
      | {
          name: string;
          email: string;
          password: string;
          role: 'Citizen' | 'NGO';
          phone?: string;
        }
      | string,
    emailMaybe?: string,
    passwordMaybe?: string,
    roleMaybe?: 'Citizen' | 'NGO',
    phoneMaybe?: string,
  ) {
    const input =
      typeof inputOrName === 'string'
        ? {
            name: inputOrName,
            email: emailMaybe,
            password: passwordMaybe,
            role: roleMaybe,
            phone: phoneMaybe,
          }
        : inputOrName;

    const { name, email, password, role, phone } = input;

    if (!name || !email || !password || !role) {
      throw new BadRequestException('name, email, password, role are required');
    }

    if (role !== 'Citizen' && role !== 'NGO') {
      throw new BadRequestException('Invalid role');
    }

    if (role === 'NGO' && !phone) {
      throw new BadRequestException('phone is required for NGO signup');
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role === 'NGO' ? Role.NGO : Role.Citizen,
        ngoProfile:
          role === 'NGO'
            ? {
                create: {
                  name,
                  phone: phone!,
                },
              }
            : undefined,
      },
      include: { ngoProfile: true },
    });

    const payload = { userId: createdUser.id, role: createdUser.role };
    const token = this.jwtService.sign(payload);

    return { access_token: token, token };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ access_token: string; token: string }>;
  async login(input: {
    email: string;
    password: string;
  }): Promise<{ access_token: string; token: string }>;
  async login(
    inputOrEmail: { email: string; password: string } | string,
    passwordMaybe?: string,
  ) {
    const input =
      typeof inputOrEmail === 'string'
        ? { email: inputOrEmail, password: passwordMaybe }
        : inputOrEmail;

    const { email, password } = input;

    if (!email || !password) {
      throw new BadRequestException('email and password are required');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) throw new UnauthorizedException('Invalid credentials');

    const payload = { userId: user.id, role: user.role };
    const token = this.jwtService.sign(payload);

    return { access_token: token, token };
  }
}
