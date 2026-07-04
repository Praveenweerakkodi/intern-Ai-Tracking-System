import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(SUPABASE_CLIENT) private supabase: SupabaseClient) {}

  @Post('register')
  async register(@Body() body: { email: string; password: string; full_name: string }) {
    const { data, error } = await this.supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: { data: { full_name: body.full_name } },
    });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });
    if (error) throw new Error(error.message);
    return { user: data.user, session: data.session };
  }

  @Post('logout')
  async logout() {
    await this.supabase.auth.signOut();
    return { success: true };
  }
}
