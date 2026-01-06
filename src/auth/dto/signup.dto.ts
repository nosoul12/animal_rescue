import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export enum UserRole {
  Citizen = 'Citizen',
  NGO = 'NGO',
}

export class SignupDto {
  @IsNotEmpty({ message: 'Name is required' })
  @IsString({ message: 'Name must be a string' })
  name: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum(UserRole, { message: 'Role must be either Citizen or NGO' })
  role: UserRole;

  @ValidateIf((o) => o.role === UserRole.NGO)
  @IsNotEmpty({ message: 'Phone is required for NGO accounts' })
  @IsString({ message: 'Phone must be a string' })
  phone?: string;
}
