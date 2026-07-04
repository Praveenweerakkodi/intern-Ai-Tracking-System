import { Controller, Get, Post, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(@Request() req: any) {
    return this.analyticsService.getCache(req.user.id);
  }

  @Post('refresh')
  async refreshAnalytics(@Request() req: any) {
    return this.analyticsService.computeAndCache(req.user.id);
  }
}
