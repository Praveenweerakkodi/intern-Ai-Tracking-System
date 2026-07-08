import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CvModule } from './modules/cv/cv.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AiModule } from './modules/ai/ai.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { CoachModule } from './modules/coach/coach.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    SupabaseModule,
    AuthModule,
    UsersModule,
    CvModule,
    JobsModule,
    AiModule,
    ApplicationsModule,
    AnalyticsModule,
    CoachModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
