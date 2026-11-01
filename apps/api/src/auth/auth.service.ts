import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { computeIsPremium } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, RegisterDto, UpdateProfileDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase().trim();
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new ConflictException('An account with this email already exists');
    const firstLevel = await this.prisma.level.findFirst({ orderBy: { order: 'asc' } });
    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        phone: dto.phone,
        nativeLanguage: dto.nativeLanguage ?? 'Amharic',
        city: dto.city,
        targetBand: dto.targetBand ?? 6.5,
        passwordHash: await bcrypt.hash(dto.password, 10),
        levelId: firstLevel?.id,
      },
    });
    return this.session(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase().trim() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) throw new UnauthorizedException('This account has been suspended');
    return this.session(await this.touchStreak(user));
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { level: true } });
    return this.publicUser(await this.touchStreak(user), user.level);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.levelId) {
      const level = await this.prisma.level.findUnique({ where: { id: dto.levelId } });
      if (!level) throw new BadRequestException('Unknown level');
    }
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto, include: { level: true } });
    return this.publicUser(user, user.level);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    return { ok: true };
  }

  /** Daily learning streak: +1 if active yesterday, reset if a day was missed. */
  private async touchStreak<T extends User>(user: T): Promise<T> {
    const now = new Date();
    const last = user.lastActiveAt;
    const dayMs = 86_400_000;
    const today = Math.floor(now.getTime() / dayMs);
    const lastDay = last ? Math.floor(last.getTime() / dayMs) : null;
    if (lastDay === today) return user;
    const streak = lastDay === today - 1 ? user.streak + 1 : 1;
    await this.prisma.user.update({ where: { id: user.id }, data: { streak, lastActiveAt: now } });
    return { ...user, streak, lastActiveAt: now };
  }

  private session(user: User) {
    const token = this.jwt.sign({ sub: user.id, role: user.role });
    return { token, user: this.publicUser(user) };
  }

  publicUser(user: User, level?: unknown) {
    const { passwordHash: _pw, ...rest } = user;
    return { ...rest, level: level ?? undefined, isPremium: computeIsPremium(user.role, user.premiumUntil) };
  }
}
