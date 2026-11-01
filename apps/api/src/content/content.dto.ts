import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PracticeType, Skill } from '@prisma/client';

export class CreateLevelDto {
  @IsString() @Matches(/^[A-Z0-9_]+$/, { message: 'code must be UPPER_SNAKE_CASE' }) code: string;
  @IsString() @MinLength(2) name: string;
  @IsNumber() band: number;
  @IsString() cefr: string;
  @IsString() description: string;
  @IsOptional() @IsString() color?: string;
  @IsOptional() @IsInt() order?: number;
}
export class UpdateLevelDto extends PartialType(CreateLevelDto) {}

export class CreateCourseDto {
  @IsString() @Matches(/^[a-z0-9-]+$/, { message: 'slug may only contain lowercase letters, numbers and dashes' })
  slug: string;
  @IsString() @MinLength(3) title: string;
  @IsOptional() @IsString() @MaxLength(200) subtitle?: string;
  @IsString() description: string;
  @IsEnum(Skill) skill: Skill;
  @IsString() levelId: string;
  @IsOptional() @IsString() coverImage?: string;
  @IsOptional() @IsBoolean() isPremium?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsInt() order?: number;
}
export class UpdateCourseDto extends PartialType(CreateCourseDto) {}

export class CreateLessonDto {
  @IsString() courseId: string;
  @IsString() @MinLength(2) title: string;
  @IsOptional() @IsString() summary?: string;
  @IsString() content: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() audioText?: string;
  @IsOptional() @IsInt() @Min(1) durationMin?: number;
  @IsOptional() @IsInt() order?: number;
  @IsOptional() @IsBoolean() isFree?: boolean;
}
export class UpdateLessonDto extends PartialType(CreateLessonDto) {}

export class QuestionDto {
  @IsString() id: string;
  @IsString() question: string;
  @IsOptional() @IsArray() @IsString({ each: true }) options?: string[];
  @IsDefined() answer: number | string;
  @IsOptional() @IsString() explanation?: string;
}

export class CreatePracticeDto {
  @IsString() @MinLength(2) title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() instructions?: string;
  @IsEnum(Skill) skill: Skill;
  @IsEnum(PracticeType) type: PracticeType;
  @IsString() levelId: string;
  @IsOptional() @IsString() lessonId?: string | null;
  @IsOptional() @IsBoolean() isPremium?: boolean;
  @IsOptional() @IsBoolean() isPublished?: boolean;
  @IsOptional() @IsString() passage?: string;
  @IsOptional() @IsString() prompt?: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => QuestionDto) questions?: QuestionDto[];
  @IsOptional() @IsInt() timeLimitMin?: number;
  @IsOptional() @IsInt() minWords?: number;
}
export class UpdatePracticeDto extends PartialType(CreatePracticeDto) {}

export class SubmitPracticeDto {
  @IsObject() answers: Record<string, number | string>;
}

export class ListQueryDto {
  @IsOptional() @IsEnum(Skill) skill?: Skill;
  @IsOptional() @IsString() level?: string;
  @IsOptional() @IsEnum(PracticeType) type?: PracticeType;
  @IsOptional() @IsString() q?: string;
}
