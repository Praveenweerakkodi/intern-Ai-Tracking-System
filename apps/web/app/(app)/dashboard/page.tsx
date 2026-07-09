'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { apiFetch, cn, formatRelativeTime, getStatusClass } from '@/lib/utils';
import { AnalyticsCache, Application } from '@internai/shared';
import { GlowCard } from '@/components/animations/GlowCard';
import { CountUpNumber } from '@/components/animations/CountUpNumber';
import { Send, FileText, CheckCircle, XCircle, ArrowRight, Brain, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const supabase = createClient();
  const [analytics, setAnalytics] = useState<AnalyticsCache | null>(null);
  const [recentApps, setRecentApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const [analyticsData, appsData] = await Promise.all([
          apiFetch<AnalyticsCache>('/analytics', {}, session.access_token),
          apiFetch<Application[]>('/applications?limit=5', {}, session.access_token)
        ]);

        setAnalytics(analyticsData);
        setRecentApps(appsData);
        setApiError(null);
      } catch (e) {
        console.error(e);
        setApiError(e instanceof Error ? e.message : 'Unable to load dashboard data.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  if (loading) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div className="h-8 w-48 skeleton" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 skeleton" />)}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Applications', value: analytics?.total_applications || 0, icon: Send, color: '#6366f1' },
    { label: 'Interviews', value: (analytics?.applications_by_status?.['interview'] || 0) + (analytics?.applications_by_status?.['technical'] || 0), icon: Brain, color: '#f59e0b' },
    { label: 'Offers', value: analytics?.applications_by_status?.['offer'] || 0, icon: CheckCircle, color: '#10b981' },
    { label: 'Rejections', value: analytics?.applications_by_status?.['rejected'] || 0, icon: XCircle, color: '#ef4444' },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back. Here's your internship search overview.</p>
        </div>
        <Link href="/cv-optimizer" className="btn-gradient px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 shrink-0">
          <FileText className="w-4 h-4" /> Analyze New Role
        </Link>
      </div>

      {/* Stats Grid */}
      {apiError && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-700 dark:text-yellow-300">
          <p className="font-medium">Unable to reach the backend API.</p>
          <p className="mt-1">Please start the backend server or update NEXT_PUBLIC_API_URL in your environment.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlowCard className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${stat.color}15` }}>
                <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{stat.label}</p>
                <div className="text-2xl font-bold">
                  <CountUpNumber value={stat.value} />
                </div>
              </div>
            </GlowCard>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Applications</h2>
            <Link href="/applications" className="text-sm font-medium flex items-center gap-1 hover:text-[#818cf8] transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="glass-card divide-y divide-[var(--border-subtle)]">
            {recentApps.length === 0 ? (
              <div className="p-8 text-center">
                <p style={{ color: 'var(--text-secondary)' }}>No applications yet.</p>
                <Link href="/cv-optimizer" className="text-[#818cf8] font-medium text-sm mt-2 block">
                  Start your first analysis
                </Link>
              </div>
            ) : (
              recentApps.map((app) => (
                <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--glass-hover)] transition-colors">
                  <div>
                    <h3 className="font-semibold text-[15px]">{app.job?.title}</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                      {app.job?.company} • {formatRelativeTime(app.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {app.ai_report && (
                      <div className="text-right">
                        <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>ATS Score</p>
                        <p className="text-sm font-bold">{app.ai_report.ats_score}%</p>
                      </div>
                    )}
                    <span className={cn('px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider', getStatusClass(app.status))}>
                      {app.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold">AI Insights</h2>
          <GlowCard className="p-5 bg-gradient-to-br from-[rgba(99,102,241,0.05)] to-transparent" glowColor="rgba(139,92,246,0.3)">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#8b5cf6] flex items-center justify-center shrink-0">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[15px]">Career Coach</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Based on your recent activity</p>
              </div>
            </div>
            
            <div className="space-y-3 text-sm">
              {analytics?.top_missing_skills && analytics.top_missing_skills.length > 0 ? (
                <>
                  <p>You're frequently missing these key skills in applications:</p>
                  <div className="flex flex-wrap gap-2">
                    {analytics.top_missing_skills.slice(0, 3).map(skill => (
                      <span key={skill.name} className="px-2 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-default)]">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                  <p className="text-[#a78bfa] font-medium pt-2 text-xs">
                    Consider adding projects with these skills to improve your match rate.
                  </p>
                </>
              ) : (
                <div className="text-center py-4 text-[var(--text-secondary)]">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  Apply to more roles to generate personalized AI insights.
                </div>
              )}
            </div>
          </GlowCard>
        </div>
      </div>
    </div>
  );
}
