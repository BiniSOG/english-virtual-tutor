import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma client for Neon Postgres. In serverless (Vercel) the Nest app — and therefore
 * this client — is cached across warm invocations by src/serverless.ts.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({ log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'] });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
