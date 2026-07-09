/**
 * Vercel Serverless Adapter for NestJS
 *
 * Vercel runs this file as a serverless function for every incoming request.
 * We lazily bootstrap NestJS once and cache it so warm invocations are fast.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';
import * as express from 'express';
import type { Express } from 'express';

// Cache the Express server instance across warm invocations
let cachedServer: Express | null = null;

async function bootstrap(): Promise<Express> {
  if (cachedServer) return cachedServer;

  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);

  const app = await NestFactory.create(AppModule, adapter);

  // Apply all the shared middleware, CORS, validation, Swagger etc.
  await configureApp(app);

  await app.init();

  cachedServer = expressApp;
  return cachedServer;
}

// Default export — Vercel calls this function for every request
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const server = await bootstrap();
  server(req as any, res as any);
}
