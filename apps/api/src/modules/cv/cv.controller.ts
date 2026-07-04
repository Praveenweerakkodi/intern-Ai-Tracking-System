import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Patch,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CvService } from './cv.service';

@ApiTags('CVs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('cv')
export class CvController {
  constructor(private readonly cvService: CvService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a CV PDF file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCV(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Request() req: any,
  ) {
    return this.cvService.uploadCV(req.user.id, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all CVs for the current user' })
  async getCVs(@Request() req: any) {
    return this.cvService.getUserCVs(req.user.id);
  }

  @Patch(':id/primary')
  @ApiOperation({ summary: 'Set a CV as the primary/active CV' })
  async setPrimary(@Param('id') id: string, @Request() req: any) {
    return this.cvService.setPrimaryCV(req.user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a CV' })
  async deleteCV(@Param('id') id: string, @Request() req: any) {
    return this.cvService.deleteCV(req.user.id, id);
  }
}
