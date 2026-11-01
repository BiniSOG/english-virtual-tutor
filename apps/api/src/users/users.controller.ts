import { Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { Prisma, Role, Skill } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { computeIsPremium } from '../common/access';
import { CurrentUser, Roles } from '../common/decorators';
import { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUpdateUserDto } from './users.dto';

const SKILLS: Skill[] = ['GRAMMAR', 'VOCABULARY', 'READING', 'LISTENING', 'SPEAKING', 'WRITING'];
const userSelect = {
  id: true, email: true, name: true, phone: true, role: true, premiumUntil: true, isActive: true,
  city: true, nativeLanguage: true, targetBand: true, streak: true, lastActiveAt: true, createdAt: true,
  level: { select: { id: true, name: true, code: true, band: true, cefr: true, color: true } },
} satisfies Prisma.UserSelect;

@Controller()
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------ Student
  @Get('me/dashboard')
  async dashboard(@CurrentUser() user: AuthUser) {
    const [me, completed, attempts, recent] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect }),
      this.prisma.lessonProgress.findMany({
        where: { userId: user.id },
        orderBy: { completedAt: 'desc' },
        include: { lesson: { select: { courseId: true } } },
      }),
      this.prisma.attempt.findMany({
        where: { userId: user.id, completed: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
        select: { skill: true, band: true, score: true, createdAt: true },
      }),
      this.prisma.attempt.findMany({
        where: { userId: user.id, completed: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, kind: true, skill: true, title: true, score: true, band: true, createdAt: true },
      }),
    ]);

    const skills = SKILLS.map((skill) => {
      const items = attempts.filter((a) => a.skill === skill && a.band != null).slice(0, 10);
      const band = items.length ? Math.round((items.reduce((s, a) => s + (a.band ?? 0), 0) / items.length) * 2) / 2 : null;
      return { skill, band, attempts: attempts.filter((a) => a.skill === skill).length };
    });
    const banded = skills.filter((s) => s.band != null);
    const estimatedBand = banded.length
      ? Math.round((banded.reduce((s, x) => s + (x.band ?? 0), 0) / banded.length) * 2) / 2
      : null;

    // Activity for the last 14 days
    const days: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      days.push({ date: d, count: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.date, i]));
    for (const a of attempts) {
      const k = a.createdAt.toISOString().slice(0, 10);
      if (idx.has(k)) days[idx.get(k)!].count++;
    }
    for (const c of completed) {
      const k = c.completedAt.toISOString().slice(0, 10);
      if (idx.has(k)) days[idx.get(k)!].count++;
    }

    // Continue learning: courses with progress that are not finished
    const courseIds = [...new Set(completed.map((c) => c.lesson.courseId))];
    const doneSet = new Set(completed.map((c) => c.lessonId));
    const courses = await this.prisma.course.findMany({
      where: { id: { in: courseIds }, isPublished: true },
      include: { level: true, lessons: { orderBy: { order: 'asc' }, select: { id: true, title: true } } },
    });
    const inProgress = courses
      .map((c) => {
        const done = c.lessons.filter((l) => doneSet.has(l.id)).length;
        const next = c.lessons.find((l) => !doneSet.has(l.id));
        return {
          id: c.id, slug: c.slug, title: c.title, skill: c.skill, level: c.level,
          done, total: c.lessons.length, progress: c.lessons.length ? Math.round((done / c.lessons.length) * 100) : 0,
          nextLesson: next ?? null,
        };
      })
      .sort((a, b) => b.progress - a.progress);

    const recommended = await this.prisma.course.findMany({
      where: { isPublished: true, levelId: me.level?.id, id: { notIn: courseIds } },
      take: 4,
      orderBy: { order: 'asc' },
      include: { level: true, _count: { select: { lessons: true } } },
    });

    return {
      user: { ...me, isPremium: computeIsPremium(me.role, me.premiumUntil) },
      stats: {
        lessonsCompleted: completed.length,
        practicesDone: attempts.length,
        streak: me.streak,
        estimatedBand,
      },
      skills,
      activity: days,
      inProgress,
      recommended: recommended.map(({ _count, ...c }) => ({ ...c, lessonCount: _count.lessons, locked: c.isPremium && !user.isPremium })),
      recent,
    };
  }

  @Get('me/attempts')
  attempts(@CurrentUser() user: AuthUser, @Query('skill') skill?: Skill) {
    return this.prisma.attempt.findMany({
      where: { userId: user.id, completed: true, skill: skill || undefined },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, kind: true, skill: true, title: true, score: true, band: true, createdAt: true, practiceId: true },
    });
  }

  @Get('me/attempts/:id')
  async attempt(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const a = await this.prisma.attempt.findUnique({ where: { id } });
    if (!a || (a.userId !== user.id && user.role !== Role.ADMIN)) throw new NotFoundException();
    const { payload: _p, ...rest } = a;
    return rest;
  }

  // ------------------------------------------------ Admin
  @Roles(Role.ADMIN) @Get('admin/stats')
  async stats() {
    const now = new Date();
    const since30 = new Date(Date.now() - 30 * 86_400_000);
    const since7 = new Date(Date.now() - 7 * 86_400_000);
    const [users, premium, newUsers, active7, courses, lessons, practices, attempts30, revenue, revenue30, aiCalls30, bySkill, recentUsers, recentPayments, signups] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { OR: [{ premiumUntil: { gt: now } }, { role: 'ADMIN' }] } }),
        this.prisma.user.count({ where: { createdAt: { gte: since30 } } }),
        this.prisma.user.count({ where: { lastActiveAt: { gte: since7 } } }),
        this.prisma.course.count(),
        this.prisma.lesson.count(),
        this.prisma.practice.count(),
        this.prisma.attempt.count({ where: { createdAt: { gte: since30 } } }),
        this.prisma.payment.aggregate({ where: { status: 'SUCCESS' }, _sum: { amount: true } }),
        this.prisma.payment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: since30 } }, _sum: { amount: true } }),
        this.prisma.aiUsage.count({ where: { createdAt: { gte: since30 } } }),
        this.prisma.attempt.groupBy({ by: ['skill'], where: { createdAt: { gte: since30 } }, _count: { _all: true } }),
        this.prisma.user.findMany({ orderBy: { createdAt: 'desc' }, take: 6, select: userSelect }),
        this.prisma.payment.findMany({
          where: { status: 'SUCCESS' }, orderBy: { paidAt: 'desc' }, take: 6,
          include: { user: { select: { name: true, email: true } }, plan: { select: { name: true } } },
        }),
        this.prisma.user.findMany({ where: { createdAt: { gte: new Date(Date.now() - 14 * 86_400_000) } }, select: { createdAt: true } }),
      ]);
    const signupDays: { date: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      signupDays.push({ date: d, count: signups.filter((s) => s.createdAt.toISOString().slice(0, 10) === d).length });
    }
    return {
      users, premium, newUsers, active7, courses, lessons, practices, attempts30, aiCalls30,
      revenueTotal: revenue._sum.amount ?? 0,
      revenue30: revenue30._sum.amount ?? 0,
      bySkill: SKILLS.map((s) => ({ skill: s, count: bySkill.find((b) => b.skill === s)?._count._all ?? 0 })),
      signupDays,
      recentUsers: recentUsers.map((u) => ({ ...u, isPremium: computeIsPremium(u.role, u.premiumUntil) })),
      recentPayments,
    };
  }

  @Roles(Role.ADMIN) @Get('admin/users')
  async users(@Query('q') q?: string, @Query('filter') filter?: 'premium' | 'free' | 'admin' | 'suspended') {
    const now = new Date();
    const where: Prisma.UserWhereInput = {};
    if (q) where.OR = [{ name: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }];
    if (filter === 'premium') where.premiumUntil = { gt: now };
    if (filter === 'free') where.AND = [{ OR: [{ premiumUntil: null }, { premiumUntil: { lte: now } }] }, { role: 'STUDENT' }];
    if (filter === 'admin') where.role = 'ADMIN';
    if (filter === 'suspended') where.isActive = false;
    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 300,
      select: { ...userSelect, _count: { select: { attempts: true, progress: true } } },
    });
    return users.map((u) => ({ ...u, isPremium: computeIsPremium(u.role, u.premiumUntil) }));
  }

  @Roles(Role.ADMIN) @Get('admin/users/:id')
  async user(@Param('id') id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...userSelect,
        attempts: { orderBy: { createdAt: 'desc' }, take: 20, select: { id: true, kind: true, skill: true, title: true, band: true, score: true, createdAt: true } },
        payments: { orderBy: { createdAt: 'desc' }, include: { plan: { select: { name: true } } } },
        _count: { select: { progress: true, attempts: true, aiUsage: true } },
      },
    });
    if (!u) throw new NotFoundException();
    return { ...u, isPremium: computeIsPremium(u.role, u.premiumUntil) };
  }

  @Roles(Role.ADMIN) @Patch('admin/users/:id')
  async updateUser(@CurrentUser() admin: AuthUser, @Param('id') id: string, @Body() dto: AdminUpdateUserDto) {
    if (id === admin.id && (dto.role === 'STUDENT' || dto.isActive === false)) {
      throw new ForbiddenException('You cannot demote or suspend your own account');
    }
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id } });
    const data: Prisma.UserUpdateInput = {};
    if (dto.role) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.name) data.name = dto.name;
    if (dto.newPassword) {
      data.passwordHash = await bcrypt.hash(dto.newPassword, 10);
      data.passwordChangedAt = new Date();
    }
    if (dto.levelId) data.level = { connect: { id: dto.levelId } };
    if (dto.premiumUntil !== undefined) data.premiumUntil = dto.premiumUntil ? new Date(dto.premiumUntil) : null;
    if (dto.grantPremiumDays !== undefined) {
      if (dto.grantPremiumDays <= 0) data.premiumUntil = null;
      else {
        const base = target.premiumUntil && target.premiumUntil > new Date() ? target.premiumUntil : new Date();
        data.premiumUntil = new Date(base.getTime() + dto.grantPremiumDays * 86_400_000);
      }
    }
    const u = await this.prisma.user.update({ where: { id }, data, select: userSelect });
    return { ...u, isPremium: computeIsPremium(u.role, u.premiumUntil) };
  }

  @Roles(Role.ADMIN) @Delete('admin/users/:id')
  async deleteUser(@CurrentUser() admin: AuthUser, @Param('id') id: string) {
    if (id === admin.id) throw new ForbiddenException('You cannot delete your own account');
    await this.prisma.user.delete({ where: { id } });
    return { ok: true };
  }
}
