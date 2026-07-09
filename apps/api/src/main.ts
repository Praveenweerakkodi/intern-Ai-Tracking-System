import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as express from 'express';

/**
 * Shared app configuration helper.
 * Called by both local bootstrap() and the Vercel serverless adapter.
 */
export async function configureApp(app: any) {
  // CORS — allow both local dev and production Vercel frontend
  const allowedOrigins = [
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.some((o) => origin === o || origin.endsWith('.vercel.app'))) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin ${origin} not allowed`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Increase payload size for PDF uploads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  // Health check endpoint
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Swagger docs
  const config = new DocumentBuilder()
    .setTitle('Nexus Career Tracker API')
    .setDescription('AI-powered internship application tracker backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
}

// Local dev / traditional server bootstrap
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await configureApp(app);

  const port = process.env.PORT || 3001;
  // Bind to 0.0.0.0 — required for Koyeb/Docker/containerized environments
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Nexus Career API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
}

bootstrap();
