import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';

@Injectable()
export class JobsService {
  constructor(@Inject(SUPABASE_ADMIN) private supabase: SupabaseClient) {}

  async create(userId: string, body: {
    title: string; company?: string; location?: string;
    job_type?: string; description: string; required_skills?: string[];
    nice_to_have_skills?: string[]; source_url?: string;
    salary_range?: string; deadline?: string;
  }) {
    const { data, error } = await this.supabase
      .from('jobs')
      .insert({ user_id: userId, ...body })
      .select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('jobs').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async findOne(userId: string, id: string) {
    const { data, error } = await this.supabase
      .from('jobs').select('*').eq('id', id).eq('user_id', userId).single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async update(userId: string, id: string, body: any) {
    const { data, error } = await this.supabase
      .from('jobs').update(body).eq('id', id).eq('user_id', userId)
      .select().single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async delete(userId: string, id: string) {
    const { error } = await this.supabase
      .from('jobs').delete().eq('id', id).eq('user_id', userId);
    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }
}
