import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CoachService } from './coach.service';

@ApiTags('Coach')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('coach')
export class CoachController {
  constructor(private readonly coachService: CoachService) {}

  @Get('conversations')
  @ApiOperation({ summary: 'Get all conversations for user' })
  async findAll(@Request() req: any) {
    return this.coachService.findAll(req.user.id);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get single conversation details' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.coachService.findOne(req.user.id, id);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Create a new coach conversation' })
  async create(@Body() body: any, @Request() req: any) {
    return this.coachService.create(req.user.id, body);
  }

  @Patch('conversations/:id/messages')
  @ApiOperation({ summary: 'Update conversation messages' })
  async updateMessages(
    @Param('id') id: string,
    @Body() body: { messages: any[] },
    @Request() req: any,
  ) {
    return this.coachService.updateMessages(req.user.id, id, body.messages);
  }

  @Delete('conversations/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete conversation' })
  async delete(@Param('id') id: string, @Request() req: any) {
    return this.coachService.delete(req.user.id, id);
  }
}
