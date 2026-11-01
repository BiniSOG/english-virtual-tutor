import { IsEmail, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() @MinLength(2) @MaxLength(80) name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) password: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) nativeLanguage?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsNumber() @Min(3) @Max(9) targetBand?: number;
}

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(20) phone?: string;
  @IsOptional() @IsString() @MaxLength(40) nativeLanguage?: string;
  @IsOptional() @IsString() @MaxLength(60) city?: string;
  @IsOptional() @IsNumber() @Min(3) @Max(9) targetBand?: number;
  @IsOptional() @IsString() levelId?: string;
}

export class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

export class ForgotPasswordDto {
  @IsEmail() email: string;
}

export class ResetPasswordDto {
  @IsString() @MinLength(20) @MaxLength(200) token: string;
  @IsString() @MinLength(8, { message: 'Password must be at least 8 characters' }) @MaxLength(200) password: string;
}
