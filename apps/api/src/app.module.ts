import { Controller, Get, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';
import { ClientThrottlerGuard } from './common/throttler.guard';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { AuthGuard } from './common/auth.guard';
import { Public } from './common/decorators';
import { ContentModule } from './content/content.module';
import { MailModule } from './mail/mail.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';

@Controller()
class HealthController {
  @Public() @Get('health')
  health() {
    return { ok: true, service: 'lisan-api', time: new Date().toISOString() };
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const secret = process.env.JWT_SECRET;
        if (!secret && process.env.NODE_ENV === 'production') throw new Error('JWT_SECRET must be set in production');
        return { secret: secret || 'dev-only-insecure-secret', signOptions: { expiresIn: '30d' } };
      },
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    ContentModule,
    AiModule,
    BillingModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: ClientThrottlerGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
