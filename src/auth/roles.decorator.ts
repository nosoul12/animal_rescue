import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: Array<'Citizen' | 'NGO'>) =>
  SetMetadata(ROLES_KEY, roles);
