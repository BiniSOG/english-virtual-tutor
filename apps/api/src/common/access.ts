import { Role } from '@prisma/client';
import { AuthUser } from './types';

export function computeIsPremium(role: Role, premiumUntil: Date | null): boolean {
  if (role === Role.ADMIN) return true;
  return !!premiumUntil && premiumUntil.getTime() > Date.now();
}

export function hasPremium(user?: AuthUser | null): boolean {
  return !!user && user.isPremium;
}
