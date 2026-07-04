import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post() async create(@Body() body: any, @Request() req: any) {
    return this.jobsService.create(req.user.id, body);
  }
  @Get() async findAll(@Request() req: any) {
    return this.jobsService.findAll(req.user.id);
  }
  @Get(':id') async findOne(@Param('id') id: string, @Request() req: any) {
    return this.jobsService.findOne(req.user.id, id);
  }
  @Patch(':id') async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.jobsService.update(req.user.id, id, body);
  }
  @Delete(':id') async delete(@Param('id') id: string, @Request() req: any) {
    return this.jobsService.delete(req.user.id, id);
  }
}
