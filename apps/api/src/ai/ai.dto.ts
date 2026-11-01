import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PracticeType, Skill } from '@prisma/client';

const MAX_AUDIO_B64 = 6_000_000; // ~4.5MB of audio, well within Vercel's request body limit

export class WritingEvalDto {
  @IsString() @MinLength(20, { message: 'Please write at least a few sentences' }) @MaxLength(12000) essay: string;
  @IsOptional() @IsString() @MaxLength(4000) prompt?: string;
  @IsOptional() @IsIn(['TASK_1', 'TASK_2', 'GENERAL']) taskType?: 'TASK_1' | 'TASK_2' | 'GENERAL';
  @IsOptional() @IsString() practiceId?: string;
  @IsOptional() @IsBoolean() explainInAmharic?: boolean;
}

export class SpeakingEvalDto {
  @IsString() @MaxLength(MAX_AUDIO_B64, { message: 'Recording is too long (max ~3 minutes)' }) audio: string;
  @IsString() mimeType: string;
  @IsOptional() @IsString() @MaxLength(2000) prompt?: string;
  @IsOptional() @IsIn(['PART_1', 'PART_2', 'PART_3', 'FREE']) part?: string;
  @IsOptional() @IsString() practiceId?: string;
  @IsOptional() @IsBoolean() explainInAmharic?: boolean;
}

export class ChatTurnDto {
  @IsIn(['user', 'model']) role: 'user' | 'model';
  @IsString() @MaxLength(4000) text: string;
}

export class TutorChatDto {
  @IsArray() @ArrayMaxSize(40) @ValidateNested({ each: true }) @Type(() => ChatTurnDto) history: ChatTurnDto[];
  @IsOptional() @IsString() @MaxLength(4000) message?: string;
  @IsOptional() @IsString() @MaxLength(MAX_AUDIO_B64) audio?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsString() @MaxLength(60) scenario?: string;
  @IsOptional() @IsBoolean() explainInAmharic?: boolean;
}

export class GenerateTestDto {
  @IsEnum(Skill) skill: Skill;
  @IsOptional() @IsString() levelCode?: string;
  @IsOptional() @IsInt() @Min(3) @Max(20) count?: number;
  @IsOptional() @IsString() @MaxLength(120) topic?: string;
  @IsOptional() @IsIn(['SKILL', 'LEVEL_CHECK']) mode?: 'SKILL' | 'LEVEL_CHECK';
}

export class SubmitTestDto {
  @IsObject() answers: Record<string, number | string>;
}

export class AdminGenerateDto {
  @IsEnum(Skill) skill: Skill;
  @IsEnum(PracticeType) type: PracticeType;
  @IsString() levelId: string;
  @IsOptional() @IsString() @MaxLength(200) topic?: string;
  @IsOptional() @IsInt() @Min(1) @Max(20) count?: number;
}

export class AdminGenerateLessonDto {
  @IsString() courseId: string;
  @IsString() @MaxLength(200) topic: string;
}
