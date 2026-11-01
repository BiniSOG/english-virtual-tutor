import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'crypto';

/**
 * Rate-limit per signed-in user (token) or per real client IP.
 * Requests arrive through the Next.js / Vercel proxy, so the socket IP is shared by everyone —
 * use X-Forwarded-For's first entry instead.
 */
@Injectable()
export class ClientThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const auth: string | undefined = req.headers?.authorization;
    if (auth?.startsWith('Bearer ')) return 'u:' + createHash('sha256').update(auth.slice(7)).digest('hex').slice(0, 32);
    const fwd: string | undefined = req.headers?.['x-forwarded-for'];
    const ip = fwd?.split(',')[0]?.trim() || req.headers?.['x-real-ip'] || req.ip;
    return 'ip:' + ip;
  }
}
