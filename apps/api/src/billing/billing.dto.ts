import { PartialType } from '@nestjs/mapped-types';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CheckoutDto {
  @IsString() planId: string;
}

export class CreatePlanDto {
  @IsString() name: string;
  @IsString() @Matches(/^[a-z0-9-]+$/) slug: string;
  @IsInt() @Min(1) priceEtb: number;
  @IsInt() @Min(1) durationDays: number;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) features?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsBoolean() isPopular?: boolean;
  @IsOptional() @IsInt() order?: number;
}
export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
