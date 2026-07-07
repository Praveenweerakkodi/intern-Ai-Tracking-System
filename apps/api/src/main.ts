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
    'https://*.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ];
}

let cachedHandler: any;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: getAllowedOrigins(),
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

  if (process.env.VERCEL) {
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();
    return serverless(expressApp);
  }

  await app.listen(process.env.PORT || 3001);
}

export default async function handler(req: any, res: any) {
  if (!cachedHandler) {
    cachedHandler = await bootstrap();
  }

  return cachedHandler(req, res);
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  bootstrap().catch((error) => {
    console.error('Failed to start API server', error);
    process.exit(1);
  });
}
