import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/types';
import {
  AdminGenerateDto,
  AdminGenerateLessonDto,
  GenerateTestDto,
  SpeakingEvalDto,
  SubmitTestDto,
  TutorChatDto,
  WritingEvalDto,
} from './ai.dto';
import { AiService } from './ai.service';
import { QuotaService } from './quota.service';

@Throttle({ default: { limit: 20, ttl: 60_000 } })
@Controller()
export class AiController {
  constructor(private readonly ai: AiService, private readonly quota: QuotaService) {}

  @Get('ai/quota')
  quotaStatus(@CurrentUser() user: AuthUser) {
    return this.quota.status(user);
  }

  @Post('ai/writing/evaluate')
  writing(@CurrentUser() user: AuthUser, @Body() dto: WritingEvalDto) {
    return this.ai.evaluateWriting(user, dto);
  }

  @Post('ai/speaking/evaluate')
  speaking(@CurrentUser() user: AuthUser, @Body() dto: SpeakingEvalDto) {
    return this.ai.evaluateSpeaking(user, dto);
  }

  @Post('ai/tutor/chat')
  chat(@CurrentUser() user: AuthUser, @Body() dto: TutorChatDto) {
    return this.ai.tutorChat(user, dto);
  }

  @Post('ai/tests/generate')
  generate(@CurrentUser() user: AuthUser, @Body() dto: GenerateTestDto) {
    return this.ai.generateTest(user, dto);
  }

  @Post('ai/tests/:id/submit')
  submit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SubmitTestDto) {
    return this.ai.submitTest(user, id, dto.answers);
  }

  @Roles(Role.ADMIN)
  @Post('admin/ai/generate-practice')
  adminPractice(@CurrentUser() user: AuthUser, @Body() dto: AdminGenerateDto) {
    return this.ai.adminGeneratePractice(user, dto);
  }

  @Roles(Role.ADMIN)
  @Post('admin/ai/generate-lesson')
  adminLesson(@Body() dto: AdminGenerateLessonDto) {
    return this.ai.adminGenerateLesson(dto);
  }
}
