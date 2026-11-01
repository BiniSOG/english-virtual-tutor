import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

export class AdminUpdateUserDto {
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsDateString() premiumUntil?: string | null;
  /** Convenience: extend premium by N days from max(now, premiumUntil). Negative or 0 revokes. */
  @IsOptional() @IsInt() grantPremiumDays?: number;
  @IsOptional() @IsString() levelId?: string;
  @IsOptional() @IsString() name?: string;
  /** Admin-assisted password reset */
  @IsOptional() @IsString() @MinLength(8) newPassword?: string;
}
