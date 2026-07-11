import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { AnalyzeRequest } from '../../shared/types';

@ApiTags('AI')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze CV against job description (ATS + Match scoring)' })
  async analyze(@Body() body: AnalyzeRequest, @Request() req: any) {
    const startTime = Date.now();
    const result = await this.aiService.analyzeCV(body);
    return { ...result, processing_time_ms: Date.now() - startTime };
  }

  @Post('interview-questions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate interview preparation questions' })
  async interviewQuestions(
    @Body() body: { jobTitle: string; jobDescription: string; cvSummary: string },
  ) {
    return this.aiService.generateInterviewQuestions(
      body.jobTitle,
      body.jobDescription,
      body.cvSummary,
    );
  }

  @Post('rejection-analysis')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Analyze why application was rejected and suggest improvements' })
  async rejectionAnalysis(
    @Body()
    body: {
      jobTitle: string;
      company: string;
      atsScore: number;
      matchScore: number;
      missingSkills: string[];
      weakAreas: string[];
    },
  ) {
    const analysis = await this.aiService.analyzeRejection(
      body.jobTitle,
      body.company,
      body.atsScore,
      body.matchScore,
      body.missingSkills,
      body.weakAreas,
    );
    return { analysis };
  }
}
