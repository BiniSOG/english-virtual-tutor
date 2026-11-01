import type { Request, Response } from 'express';
import { createApp } from './app.factory';

/**
 * Vercel serverless entry. The Nest app is created once per warm instance and reused.
 */
let cached: Promise<(req: Request, res: Response) => void> | null = null;

async function bootstrap() {
  const app = await createApp();
  await app.init();
  return app.getHttpAdapter().getInstance();
}

export default async function handler(req: Request, res: Response) {
  if (!cached) cached = bootstrap();
  const server = await cached;
  return server(req, res);
}
