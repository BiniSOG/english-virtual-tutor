import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeIsPremium } from './access';
import { IS_PUBLIC_KEY, ROLES_KEY } from './decorators';
import { AuthUser } from './types';

/**
 * Global guard:
 *  - parses an optional Bearer token and attaches the fresh user record to req.user
 *  - rejects anonymous access unless the route is marked @Public()
 *  - enforces @Roles(...)
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, targets);
    const req = context.switchToHttp().getRequest();

    const header: string | undefined = req.headers?.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (user && user.isActive) {
          const authUser: AuthUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            premiumUntil: user.premiumUntil,
            isPremium: computeIsPremium(user.role, user.premiumUntil),
            levelId: user.levelId,
          };
          req.user = authUser;
        }
      } catch {
        // invalid/expired token: treat as guest
      }
    }

    if (!req.user && !isPublic) throw new UnauthorizedException('Please sign in to continue');
    if (roles?.length) {
      if (!req.user) throw new UnauthorizedException();
      if (!roles.includes(req.user.role)) throw new ForbiddenException('Admins only');
    }
    return true;
  }
}
