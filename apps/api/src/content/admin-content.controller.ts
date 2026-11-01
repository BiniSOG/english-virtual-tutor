import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Roles } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateCourseDto,
  CreateLessonDto,
  CreateLevelDto,
  CreatePracticeDto,
  ListQueryDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateLevelDto,
  UpdatePracticeDto,
} from './content.dto';

const json = (v: unknown) => v as Prisma.InputJsonValue;

@Roles(Role.ADMIN)
@Controller('admin')
export class AdminContentController {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- Levels ----------
  @Get('levels')
  levels() {
    return this.prisma.level.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { courses: true, practices: true, users: true } } },
    });
  }
  @Post('levels')
  createLevel(@Body() dto: CreateLevelDto) {
    return this.prisma.level.create({ data: dto });
  }
  @Patch('levels/:id')
  updateLevel(@Param('id') id: string, @Body() dto: UpdateLevelDto) {
    return this.prisma.level.update({ where: { id }, data: dto });
  }
  @Delete('levels/:id')
  deleteLevel(@Param('id') id: string) {
    return this.prisma.level.delete({ where: { id } });
  }

  // ---------- Courses ----------
  @Get('courses')
  courses(@Query() q: ListQueryDto) {
    return this.prisma.course.findMany({
      where: {
        skill: q.skill,
        level: q.level ? { code: q.level } : undefined,
        title: q.q ? { contains: q.q, mode: 'insensitive' } : undefined,
      },
      orderBy: [{ level: { order: 'asc' } }, { order: 'asc' }],
      include: { level: true, _count: { select: { lessons: true } } },
    });
  }
  @Get('courses/:id')
  course(@Param('id') id: string) {
    return this.prisma.course.findUniqueOrThrow({
      where: { id },
      include: { level: true, lessons: { orderBy: { order: 'asc' } } },
    });
  }
  @Post('courses')
  createCourse(@Body() dto: CreateCourseDto) {
    return this.prisma.course.create({ data: dto });
  }
  @Patch('courses/:id')
  updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.prisma.course.update({ where: { id }, data: dto });
  }
  @Delete('courses/:id')
  deleteCourse(@Param('id') id: string) {
    return this.prisma.course.delete({ where: { id } });
  }

  // ---------- Lessons ----------
  @Post('lessons')
  async createLesson(@Body() dto: CreateLessonDto) {
    const order = dto.order ?? (await this.prisma.lesson.count({ where: { courseId: dto.courseId } })) + 1;
    return this.prisma.lesson.create({ data: { ...dto, order } });
  }
  @Patch('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() dto: UpdateLessonDto) {
    return this.prisma.lesson.update({ where: { id }, data: dto });
  }
  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.prisma.lesson.delete({ where: { id } });
  }

  // ---------- Practices ----------
  @Get('practices')
  practices(@Query() q: ListQueryDto) {
    return this.prisma.practice.findMany({
      where: {
        skill: q.skill,
        type: q.type,
        level: q.level ? { code: q.level } : undefined,
        title: q.q ? { contains: q.q, mode: 'insensitive' } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: { level: true, lesson: { select: { id: true, title: true } }, _count: { select: { attempts: true } } },
    });
  }
  @Get('practices/:id')
  practice(@Param('id') id: string) {
    return this.prisma.practice.findUniqueOrThrow({ where: { id }, include: { level: true } });
  }
  @Post('practices')
  createPractice(@Body() dto: CreatePracticeDto) {
    const { questions, ...rest } = dto;
    return this.prisma.practice.create({ data: { ...rest, questions: json(questions ?? []) } });
  }
  @Patch('practices/:id')
  updatePractice(@Param('id') id: string, @Body() dto: UpdatePracticeDto) {
    const { questions, ...rest } = dto;
    return this.prisma.practice.update({
      where: { id },
      data: { ...rest, ...(questions ? { questions: json(questions) } : {}) },
    });
  }
  @Delete('practices/:id')
  deletePractice(@Param('id') id: string) {
    return this.prisma.practice.delete({ where: { id } });
  }
}
