import { Injectable, BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';
import { ApplicationStatus } from '@internai/shared';

@Injectable()
export class ApplicationsService {
  constructor(@Inject(SUPABASE_ADMIN) private supabase: SupabaseClient) {}

  // ---- Create Application ----
  async create(userId: string, body: {
    job_id?: string;
    cv_id?: string;
    ai_report_id?: string;
    notes?: string;
    cover_letter?: string;
    priority?: number;
    status?: ApplicationStatus;
  }) {
    const { data, error } = await this.supabase
      .from('applications')
      .insert({
        user_id: userId,
        ...body,
        status: body.status || 'applied',
        applied_at: body.status === 'applied' ? new Date().toISOString() : null,
      })
      .select(`
        *,
        job:jobs(*),
        cv:cvs(id, file_name, version),
        ai_report:ai_reports(id, ats_score, match_score, confidence_score)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Get All Applications (with filters) ----
  async findAll(userId: string, filters?: {
    status?: ApplicationStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.supabase
      .from('applications')
      .select(`
        *,
        job:jobs(id, title, company, location, job_type),
        cv:cvs(id, file_name, version),
        ai_report:ai_reports(id, ats_score, match_score, confidence_score)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.limit) query = query.limit(filters.limit);
    if (filters?.offset) query = query.range(filters.offset, (filters.offset + (filters.limit || 20)) - 1);

    const { data, error } = await query;
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Get Single Application ----
  async findOne(userId: string, applicationId: string) {
    const { data, error } = await this.supabase
      .from('applications')
      .select(`
        *,
        job:jobs(*),
        cv:cvs(*),
        ai_report:ai_reports(*),
        status_history:application_status_history(*)
      `)
      .eq('id', applicationId)
      .eq('user_id', userId)
      .single();

    if (error) throw new NotFoundException('Application not found');
    return data;
  }

  // ---- Update Status ----
  async updateStatus(
    userId: string,
    applicationId: string,
    newStatus: ApplicationStatus,
    note?: string,
  ) {
    // Get current status first
    const { data: current } = await this.supabase
      .from('applications')
      .select('status')
      .eq('id', applicationId)
      .eq('user_id', userId)
      .single();

    if (!current) throw new NotFoundException('Application not found');

    const updates: Record<string, any> = { status: newStatus };

    // Set timestamps based on status
    if (newStatus === 'applied') updates.applied_at = new Date().toISOString();
    if (['rejected', 'offer', 'withdrawn'].includes(newStatus)) {
      updates.response_received_at = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('applications')
      .update(updates)
      .eq('id', applicationId)
      .eq('user_id', userId)
      .select(`
        *,
        job:jobs(id, title, company),
        ai_report:ai_reports(id, ats_score, match_score)
      `)
      .single();

    if (error) throw new BadRequestException(error.message);

    // Manually insert status history (trigger does it, but we add note here)
    if (note && current.status !== newStatus) {
      await this.supabase.from('application_status_history').insert({
        application_id: applicationId,
        old_status: current.status,
        new_status: newStatus,
        note,
      });
    }

    return data;
  }

  // ---- Update Application ----
  async update(userId: string, applicationId: string, updates: Record<string, any>) {
    const { data, error } = await this.supabase
      .from('applications')
      .update(updates)
      .eq('id', applicationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ---- Delete Application ----
  async delete(userId: string, applicationId: string) {
    const { error } = await this.supabase
      .from('applications')
      .delete()
      .eq('id', applicationId)
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return { deleted: true };
  }

  // ---- Kanban Order Update ----
  async updatePositions(userId: string, positions: Array<{ id: string; position: number; status: ApplicationStatus }>) {
    const updates = positions.map(({ id, position, status }) =>
      this.supabase.from('applications').update({ position, status }).eq('id', id).eq('user_id', userId),
    );
    await Promise.all(updates);
    return { updated: positions.length };
  }
}
