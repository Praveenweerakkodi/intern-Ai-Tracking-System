import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';
import serverless from 'serverless-http';

function getAllowedOrigins(): string[] {
  const configuredOrigins = (process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://nexuscareerai.vercel.app')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  return [
    ...configuredOrigins,
    'https://intern-ai-tracking-system-api.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];
}

function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    return true;
  }

  const allowedOrigins = new Set(getAllowedOrigins());
  if (allowedOrigins.has(origin)) {
    return true;
  }

  return /https:\/\/([a-z0-9-]+)\.vercel\.app$/i.test(origin) || /http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

let cachedHandler: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register manual CORS middleware first
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin as string | undefined;

    if (!origin || isOriginAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With');
      res.header('Vary', 'Origin');

      if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
      }
    }
    next();
  });

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, !origin || isOriginAllowed(origin));
    },
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  const config = new DocumentBuilder()
    .setTitle('Nexus Career Tracker API')
    .setDescription('AI-powered internship application tracker backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.init();
  return app;
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    const app = await bootstrap();
    cachedHandler = serverless(app.getHttpAdapter().getInstance());
  }

  return cachedHandler(req, res);
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  bootstrap().then((app) => app.listen(process.env.PORT || 3001)).catch((error) => {
    console.error('Failed to start API server', error);
    process.exit(1);
  });
}
