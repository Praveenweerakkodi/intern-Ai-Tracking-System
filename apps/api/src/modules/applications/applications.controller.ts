import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { ApplicationsService } from './applications.service';
import { ApplicationStatus } from '../../shared/types';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application' })
  async create(@Body() body: any, @Request() req: any) {
    return this.applicationsService.create(req.user.id, body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all applications (with optional filters)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async findAll(
    @Request() req: any,
    @Query('status') status?: ApplicationStatus,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.applicationsService.findAll(req.user.id, { status, limit, offset });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single application with full details' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.applicationsService.findOne(req.user.id, id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update application status (triggers history log)' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: ApplicationStatus; note?: string },
    @Request() req: any,
  ) {
    return this.applicationsService.updateStatus(req.user.id, id, body.status, body.note);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update application fields' })
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.applicationsService.update(req.user.id, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an application' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.applicationsService.delete(req.user.id, id);
  }

  @Post('kanban/positions')
  @ApiOperation({ summary: 'Batch update kanban positions after drag-and-drop' })
  async updatePositions(
    @Body() body: { positions: Array<{ id: string; position: number; status: ApplicationStatus }> },
    @Request() req: any,
  ) {
    return this.applicationsService.updatePositions(req.user.id, body.positions);
  }
}
