import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser, Public } from '../common/decorators';
import { AuthUser } from '../common/types';
import { ListQueryDto, SubmitPracticeDto } from './content.dto';
import { ContentService } from './content.service';

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Public() @Get('levels')
  levels() {
    return this.content.levels();
  }

  @Public() @Get('courses')
  courses(@Query() q: ListQueryDto, @CurrentUser() user?: AuthUser) {
    return this.content.courses(q, user);
  }

  @Public() @Get('courses/:slug')
  course(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    return this.content.course(slug, user);
  }

  @Public() @Get('lessons/:id')
  lesson(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.content.lesson(id, user);
  }

  @Post('lessons/:id/complete')
  complete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.content.completeLesson(id, user);
  }

  @Public() @Get('practices')
  practices(@Query() q: ListQueryDto, @CurrentUser() user?: AuthUser) {
    return this.content.practices(q, user);
  }

  @Public() @Get('practices/:id')
  practice(@Param('id') id: string, @CurrentUser() user?: AuthUser) {
    return this.content.practice(id, user);
  }

  /** Guests may submit objective practices: they get a score but nothing is saved. */
  @Public() @Post('practices/:id/submit')
  submit(@Param('id') id: string, @Body() dto: SubmitPracticeDto, @CurrentUser() user?: AuthUser) {
    return this.content.submitPractice(id, dto.answers, user);
  }
}
