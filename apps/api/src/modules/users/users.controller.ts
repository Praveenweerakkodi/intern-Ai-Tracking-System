import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../../common/guards/auth.guard';
import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(@Inject(SUPABASE_ADMIN) private supabase: SupabaseClient) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    const { data } = await this.supabase
      .from('profiles').select('*').eq('id', req.user.id).single();
    return data;
  }

  @Patch('me')
  async updateProfile(@Request() req: any, @Body() body: any) {
    const { data, error } = await this.supabase
      .from('profiles').update(body).eq('id', req.user.id).select().single();
    if (error) throw new Error(error.message);
    return data;
  }
}
