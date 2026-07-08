import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import serverless from 'serverless-http';

// ─── Allowed origins ────────────────────────────────────────────────────────
const ALLOWED_ORIGINS_STATIC = [
  'https://nexuscareerai.vercel.app',
  'https://intern-ai-tracking-system-api.vercel.app',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return true;

  // Check env-configured origins first
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if ([...ALLOWED_ORIGINS_STATIC, ...envOrigins].includes(origin)) {
    return true;
  }

  // Allow any *.vercel.app or localhost
  return (
    /^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin) ||
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)
  );
}

// ─── CORS middleware (pure Express — runs before NestJS routing) ─────────────
function corsMiddleware(req: any, res: any, next: any) {
  const origin = req.headers.origin as string | undefined;

  // Always set CORS headers for allowed origins
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      (req.headers['access-control-request-headers'] as string) ||
        'Content-Type,Authorization,X-Requested-With',
    );
  }

  // Short-circuit OPTIONS preflight — must NOT reach router or auth guards
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  next();
}

// ─── Singleton initialization (Promise-based to avoid race conditions) ───────
// On Vercel, multiple concurrent requests arrive before cachedHandler is set.
// Using a single Promise ensures bootstrap() runs exactly once even if many
// requests arrive simultaneously during a cold start.
let initPromise: Promise<(req: any, res: any) => void> | null = null;

function getHandler(): Promise<(req: any, res: any) => void> {
  if (!initPromise) {
    initPromise = bootstrap();
  }
  return initPromise;
}

async function bootstrap(): Promise<(req: any, res: any) => void> {
  const app = await NestFactory.create(AppModule, {
    // Disable NestJS body parser so we control it ourselves after CORS
    bodyParser: false,
    logger: ['error', 'warn'],
  });

  // ① CORS middleware — must be registered FIRST, before anything else
  app.use(corsMiddleware);

  // ② Body parsers — after CORS so OPTIONS never waits for body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // ③ Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // ④ Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Nexus Career Tracker API')
    .setDescription('AI-powered internship application tracker backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.init();

  const expressApp = app.getHttpAdapter().getInstance();
  return serverless(expressApp) as (req: any, res: any) => void;
}

// ─── Vercel serverless entry point ───────────────────────────────────────────
export default async function handler(req: any, res: any) {
  // Handle OPTIONS at the edge immediately — before even waiting for bootstrap
  // This ensures preflights never time out during cold starts
  const origin = req.headers.origin as string | undefined;
  if (req.method === 'OPTIONS' && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers',
      (req.headers['access-control-request-headers'] as string) ||
        'Content-Type,Authorization,X-Requested-With',
    );
    res.writeHead(204);
    res.end();
    return;
  }

  const serverlessHandler = await getHandler();
  return serverlessHandler(req, res);
}

// ─── Local dev entry point ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  (async () => {
    const app = await NestFactory.create(AppModule, { bodyParser: false });
    app.use(corsMiddleware);
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false, transform: true }),
    );
    const config = new DocumentBuilder()
      .setTitle('Nexus Career Tracker API')
      .setDescription('AI-powered internship application tracker backend')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
    await app.listen(process.env.PORT || 3001);
    console.log(`API running on http://localhost:${process.env.PORT || 3001}`);
  })().catch((err) => {
    console.error('Failed to start API server', err);
    process.exit(1);
  });
}
