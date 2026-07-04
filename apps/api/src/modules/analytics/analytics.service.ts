import { Injectable, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ADMIN } from '../../supabase/supabase.module';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(SUPABASE_ADMIN) private supabase: SupabaseClient) {}

  async computeAndCache(userId: string) {
    // Fetch all applications
    const { data: apps } = await this.supabase
      .from('applications')
      .select('*, ai_report:ai_reports(ats_score, match_score, confidence_score, missing_skills)')
      .eq('user_id', userId);

    if (!apps || apps.length === 0) {
      return this.emptyAnalytics(userId);
    }

    const total = apps.length;
    const byStatus: Record<string, number> = {};
    let sumATS = 0, sumMatch = 0, sumConf = 0, atsCount = 0;
    const missingSkillMap: Record<string, number> = {};

    for (const app of apps) {
      byStatus[app.status] = (byStatus[app.status] || 0) + 1;
      if (app.ai_report) {
        if (app.ai_report.ats_score != null) { sumATS += app.ai_report.ats_score; atsCount++; }
        if (app.ai_report.match_score != null) sumMatch += app.ai_report.match_score;
        if (app.ai_report.confidence_score != null) sumConf += app.ai_report.confidence_score;
        const skills: any[] = app.ai_report.missing_skills || [];
        skills.forEach((s: any) => {
          const name = typeof s === 'string' ? s : s.name;
          missingSkillMap[name] = (missingSkillMap[name] || 0) + 1;
        });
      }
    }

    const interviews = (byStatus['interview'] || 0) + (byStatus['technical'] || 0) + (byStatus['final_round'] || 0);
    const offers = byStatus['offer'] || 0;
    const rejections = byStatus['rejected'] || 0;

    const topMissingSkills = Object.entries(missingSkillMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Monthly trend (last 6 months)
    const monthlyTrend = this.computeMonthlyTrend(apps);

    const analytics = {
      user_id: userId,
      total_applications: total,
      interview_rate: total > 0 ? Math.round((interviews / total) * 100 * 100) / 100 : 0,
      offer_rate: total > 0 ? Math.round((offers / total) * 100 * 100) / 100 : 0,
      rejection_rate: total > 0 ? Math.round((rejections / total) * 100 * 100) / 100 : 0,
      avg_ats_score: atsCount > 0 ? Math.round((sumATS / atsCount) * 100) / 100 : 0,
      avg_match_score: atsCount > 0 ? Math.round((sumMatch / atsCount) * 100) / 100 : 0,
      avg_confidence_score: atsCount > 0 ? Math.round((sumConf / atsCount) * 100) / 100 : 0,
      top_missing_skills: topMissingSkills,
      applications_by_status: byStatus,
      monthly_trend: monthlyTrend,
      last_computed: new Date().toISOString(),
    };

    await this.supabase.from('analytics_cache').upsert(analytics, { onConflict: 'user_id' });
    return analytics;
  }

  async getCache(userId: string) {
    const { data } = await this.supabase
      .from('analytics_cache').select('*').eq('user_id', userId).single();
    if (!data) return this.computeAndCache(userId);
    // Refresh if older than 5 minutes
    const age = Date.now() - new Date(data.last_computed).getTime();
    if (age > 5 * 60 * 1000) return this.computeAndCache(userId);
    return data;
  }

  private computeMonthlyTrend(apps: any[]) {
    const months: Record<string, { applications: number; interviews: number; offers: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { applications: 0, interviews: 0, offers: 0 };
    }
    for (const app of apps) {
      const d = new Date(app.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (months[key]) {
        months[key].applications++;
        if (['interview', 'technical', 'final_round'].includes(app.status)) months[key].interviews++;
        if (app.status === 'offer') months[key].offers++;
      }
    }
    return Object.entries(months).map(([month, v]) => ({ month, ...v }));
  }

  private emptyAnalytics(userId: string) {
    return {
      user_id: userId,
      total_applications: 0,
      interview_rate: 0,
      offer_rate: 0,
      rejection_rate: 0,
      avg_ats_score: 0,
      avg_match_score: 0,
      avg_confidence_score: 0,
      top_missing_skills: [],
      applications_by_status: {},
      monthly_trend: [],
    };
  }
}
