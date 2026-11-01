import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  limitFor(user: AuthUser): number {
    if (user.role === Role.ADMIN) return 100_000;
    return user.isPremium
      ? Number(this.config.get('PREMIUM_AI_DAILY_LIMIT') ?? 300)
      : Number(this.config.get('FREE_AI_DAILY_LIMIT') ?? 10);
  }

  async status(user: AuthUser) {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    const used = await this.prisma.aiUsage.count({ where: { userId: user.id, createdAt: { gte: start } } });
    const limit = this.limitFor(user);
    return { used, limit, remaining: Math.max(0, limit - used), isPremium: user.isPremium };
  }

  /** Throws if the user has no AI calls left today. Call before the AI request. */
  async ensure(user: AuthUser) {
    const { remaining } = await this.status(user);
    if (remaining <= 0) {
      throw new HttpException(
        {
          code: 'AI_QUOTA_EXCEEDED',
          message: user.isPremium
            ? 'You have reached today\'s AI limit. It resets at midnight (UTC).'
            : 'You have used all free AI sessions for today. Upgrade to Premium for unlimited practice.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Records one AI call. Call only after the AI request succeeded. */
  async record(user: AuthUser, feature: string) {
    await this.prisma.aiUsage.create({ data: { userId: user.id, feature } });
  }
}
