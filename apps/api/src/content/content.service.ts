import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PracticeType } from '@prisma/client';
import { hasPremium } from '../common/access';
import { AuthUser, PracticeQuestion } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { ListQueryDto } from './content.dto';
import { AnswerMap, gradeQuestions, sanitizeQuestions } from './grading';

export const PREMIUM_REQUIRED = { code: 'PREMIUM_REQUIRED', message: 'Upgrade to Premium to unlock this content' };

@Injectable()
export class ContentService {
  constructor(private readonly prisma: PrismaService) {}

  levels() {
    return this.prisma.level.findMany({ orderBy: { order: 'asc' } });
  }

  async courses(query: ListQueryDto, user?: AuthUser) {
    const where: Prisma.CourseWhereInput = { isPublished: true };
    if (query.skill) where.skill = query.skill;
    if (query.level) where.level = { code: query.level };
    if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
    const courses = await this.prisma.course.findMany({
      where,
      orderBy: [{ level: { order: 'asc' } }, { order: 'asc' }],
      include: { level: true, _count: { select: { lessons: true } } },
    });
    const premium = hasPremium(user);
    return courses.map(({ _count, ...c }) => ({ ...c, lessonCount: _count.lessons, locked: c.isPremium && !premium }));
  }

  async course(slug: string, user?: AuthUser) {
    const course = await this.prisma.course.findFirst({
      where: { slug, isPublished: true },
      include: {
        level: true,
        lessons: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, summary: true, durationMin: true, order: true, isFree: true },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');
    const premium = hasPremium(user);
    const done = user
      ? new Set(
          (
            await this.prisma.lessonProgress.findMany({
              where: { userId: user.id, lessonId: { in: course.lessons.map((l) => l.id) } },
              select: { lessonId: true },
            })
          ).map((p) => p.lessonId),
        )
      : new Set<string>();
    return {
      ...course,
      locked: course.isPremium && !premium,
      lessons: course.lessons.map((l) => ({
        ...l,
        locked: course.isPremium && !l.isFree && !premium,
        completed: done.has(l.id),
      })),
    };
  }

  async lesson(id: string, user?: AuthUser) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id },
      include: {
        course: { include: { level: true, lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true } } } },
        practices: {
          where: { isPublished: true },
          select: { id: true, title: true, type: true, skill: true, isPremium: true },
        },
      },
    });
    if (!lesson || !lesson.course.isPublished) throw new NotFoundException('Lesson not found');
    const premium = hasPremium(user);
    if (lesson.course.isPremium && !lesson.isFree && !premium) throw new ForbiddenException(PREMIUM_REQUIRED);

    const siblings = lesson.course.lessons;
    const idx = siblings.findIndex((l) => l.id === id);
    const completed = user
      ? !!(await this.prisma.lessonProgress.findUnique({ where: { userId_lessonId: { userId: user.id, lessonId: id } } }))
      : false;
    const { lessons: _l, ...course } = lesson.course;
    return {
      ...lesson,
      course,
      completed,
      prev: idx > 0 ? siblings[idx - 1] : null,
      next: idx < siblings.length - 1 ? siblings[idx + 1] : null,
      practices: lesson.practices.map((p) => ({ ...p, locked: p.isPremium && !premium })),
    };
  }

  async completeLesson(id: string, user: AuthUser) {
    await this.lesson(id, user); // access check
    await this.prisma.lessonProgress.upsert({
      where: { userId_lessonId: { userId: user.id, lessonId: id } },
      create: { userId: user.id, lessonId: id },
      update: {},
    });
    return { ok: true };
  }

  async practices(query: ListQueryDto, user?: AuthUser) {
    const where: Prisma.PracticeWhereInput = { isPublished: true };
    if (query.skill) where.skill = query.skill;
    if (query.type) where.type = query.type;
    if (query.level) where.level = { code: query.level };
    if (query.q) where.title = { contains: query.q, mode: 'insensitive' };
    const items = await this.prisma.practice.findMany({
      where,
      orderBy: [{ level: { order: 'asc' } }, { createdAt: 'asc' }],
      select: {
        id: true, title: true, description: true, skill: true, type: true, isPremium: true,
        timeLimitMin: true, questions: true, level: true,
      },
    });
    const premium = hasPremium(user);
    let best = new Map<string, number>();
    if (user) {
      const attempts = await this.prisma.attempt.groupBy({
        by: ['practiceId'],
        where: { userId: user.id, practiceId: { in: items.map((i) => i.id) } },
        _max: { score: true },
      });
      best = new Map(attempts.map((a) => [a.practiceId as string, a._max.score ?? 0]));
    }
    return items.map(({ questions, ...p }) => ({
      ...p,
      questionCount: Array.isArray(questions) ? questions.length : 0,
      locked: p.isPremium && !premium,
      bestScore: best.get(p.id) ?? null,
    }));
  }

  private async loadPractice(id: string, user?: AuthUser) {
    const practice = await this.prisma.practice.findUnique({ where: { id }, include: { level: true } });
    if (!practice || !practice.isPublished) throw new NotFoundException('Practice not found');
    if (practice.isPremium && !hasPremium(user)) throw new ForbiddenException(PREMIUM_REQUIRED);
    return practice;
  }

  async practice(id: string, user?: AuthUser) {
    const p = await this.loadPractice(id, user);
    return { ...p, questions: sanitizeQuestions(p.questions as unknown as PracticeQuestion[]) };
  }

  async submitPractice(id: string, answers: AnswerMap, user?: AuthUser) {
    const p = await this.loadPractice(id, user);
    if (p.type === PracticeType.WRITING || p.type === PracticeType.SPEAKING) {
      throw new BadRequestException('Writing and speaking tasks are graded by the AI tutor');
    }
    const graded = gradeQuestions(p.questions as unknown as PracticeQuestion[], answers);
    let attemptId: string | undefined;
    if (user) {
      const attempt = await this.prisma.attempt.create({
        data: {
          userId: user.id,
          practiceId: p.id,
          kind: 'PRACTICE',
          skill: p.skill,
          title: p.title,
          score: graded.score,
          band: graded.band,
          answers: answers as Prisma.InputJsonValue,
          feedback: graded.results as unknown as Prisma.InputJsonValue,
        },
      });
      attemptId = attempt.id;
    }
    return { ...graded, attemptId, saved: !!user };
  }
}
