import { Injectable, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';

@Injectable()
export class CoachService {
  constructor(@Inject(SUPABASE_ADMIN) private supabase: SupabaseClient) {}

  // ---- Get all conversations for a user ----
  async findAll(userId: string) {
    const { data, error } = await this.supabase
      .from('coach_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Get single conversation ----
  async findOne(userId: string, id: string) {
    const { data, error } = await this.supabase
      .from('coach_conversations')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) throw new NotFoundException('Conversation not found');
    return data;
  }

  // ---- Create new conversation ----
  async create(userId: string, body: { title?: string; application_id?: string; context?: any }) {
    const { data, error } = await this.supabase
      .from('coach_conversations')
      .insert({
        user_id: userId,
        title: body.title || 'New Coaching Session',
        application_id: body.application_id || null,
        context: body.context || {},
        messages: [],
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Update messages / append messages ----
  async updateMessages(userId: string, id: string, messages: any[]) {
    const { data, error } = await this.supabase
      .from('coach_conversations')
      .update({
        messages,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Delete conversation ----
  async delete(userId: string, id: string) {
    const { error } = await this.supabase
      .from('coach_conversations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }
}
