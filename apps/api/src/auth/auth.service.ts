import { BadRequestException, ConflictException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { computeIsPremium } from '../common/access';
import { MailService } from '../mail/mail.service';
import { passwordResetEmail } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto } from './auth.dto';

const RESET_TTL_MIN = 60;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

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
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10), passwordChangedAt: new Date() },
    });
    // Other devices are signed out; this device gets a fresh token.
    return { ok: true, ...this.session(updated) };
  }

  /**
   * Always responds the same way whether or not the email exists (no account enumeration).
   * Sends a single-use link valid for RESET_TTL_MIN minutes; only the token's hash is stored.
   */
  async forgotPassword(emailRaw: string) {
    const email = emailRaw.toLowerCase().trim();
    const generic = { ok: true, message: 'If an account exists for this email, we have sent a password reset link.' };
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) return generic;

    // Basic abuse guard: at most 3 reset emails per account per hour.
    const recent = await this.prisma.passwordResetToken.count({
      where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3_600_000) } },
    });
    if (recent >= 3) return generic;

    const token = randomBytes(32).toString('base64url');
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
      this.prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MIN * 60_000) },
      }),
    ]);
    const webUrl = (this.config.get<string>('WEB_URL') || 'http://localhost:3000').replace(/\/$/, '');
    const link = `${webUrl}/reset-password?token=${token}`;
    const mail = passwordResetEmail({ name: user.name, link, minutes: RESET_TTL_MIN });
    const sent = await this.mail.send({ to: user.email, ...mail });
    if (!sent) this.logger.warn(`Password reset email for ${user.email} was not delivered`);
    return generic;
  }

  async checkResetToken(token: string) {
    const record = await this.findValidToken(token);
    return { valid: !!record, email: record ? maskEmail(record.user.email) : null };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const record = await this.findValidToken(dto.token);
    if (!record) throw new BadRequestException('This reset link is invalid or has expired. Please request a new one.');
    const now = new Date();
    const [, user] = await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({ where: { userId: record.userId, usedAt: null }, data: { usedAt: now } }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(dto.password, 10), passwordChangedAt: now },
      }),
    ]);
    return this.session(user);
  }

  private async findValidToken(token: string) {
    if (!token || token.length < 20) return null;
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) return null;
    return record;
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
    const { passwordHash: _pw, passwordChangedAt: _pc, ...rest } = user;
    return { ...rest, level: level ?? undefined, isPremium: computeIsPremium(user.role, user.premiumUntil) };
  }
}

function maskEmail(email: string) {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}${'•'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}
