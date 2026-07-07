'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Application, ApplicationStatus, APPLICATION_STATUS_META } from '@internai/shared';
import { apiFetch, formatDate, getStatusClass } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
  X, Building, Calendar, Brain, CheckCircle, AlertTriangle,
  Clock, ChevronDown, Trash2, FileText, MessageSquare, ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ApplicationDrawerProps {
  app: Application | null;
  onClose: () => void;
  onStatusChange: (id: string, newStatus: ApplicationStatus) => void;
  onDelete: (id: string) => void;
}

const STATUSES = Object.entries(APPLICATION_STATUS_META) as [ApplicationStatus, typeof APPLICATION_STATUS_META[ApplicationStatus]][];

export function ApplicationDrawer({ app, onClose, onStatusChange, onDelete }: ApplicationDrawerProps) {
  const supabase = createClient();
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState(app?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);

  if (!app) return null;

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    setUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiFetch(`/applications/${app.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      }, session?.access_token);
      onStatusChange(app.id, newStatus);
      toast.success(`Status updated to ${APPLICATION_STATUS_META[newStatus].label}`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this application? This cannot be undone.')) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiFetch(`/applications/${app.id}`, { method: 'DELETE' }, session?.access_token);
      onDelete(app.id);
      onClose();
      toast.success('Application deleted');
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiFetch(`/applications/${app.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ notes }),
      }, session?.access_token);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const meta = APPLICATION_STATUS_META[app.status];

  return (
    <AnimatePresence>
      {app && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-[480px] z-50 flex flex-col overflow-hidden"
            style={{
              background: 'var(--bg-surface)',
              borderLeft: '1px solid var(--border-subtle)',
            }}
          >
            {/* Header */}
            <div className="p-6 border-b border-[var(--border-subtle)] shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold truncate">{app.job?.title || 'Untitled Role'}</h2>
                  <div className="flex items-center gap-2 mt-1 text-sm text-[var(--text-secondary)]">
                    <Building className="w-4 h-4 shrink-0" />
                    <span>{app.job?.company || 'Unknown Company'}</span>
                  </div>
                </div>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors shrink-0">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status selector */}
              <div className="mt-4">
                <label className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider block mb-2">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={app.status}
                    onChange={(e) => handleStatusChange(e.target.value as ApplicationStatus)}
                    disabled={updating}
                    className="input-field w-full px-4 py-2.5 pr-10 appearance-none cursor-pointer"
                  >
                    {STATUSES.map(([status, meta]) => (
                      <option key={status} value={status}>
                        {meta.emoji} {meta.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* AI Report */}
              {app.ai_report && (
                <div className="glass-card p-5 space-y-4">
                  <h3 className="font-bold flex items-center gap-2 text-sm uppercase tracking-wider text-[var(--text-muted)]">
                    <Brain className="w-4 h-4 text-[#8b5cf6]" /> AI Analysis
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'ATS Score', value: app.ai_report.ats_score },
                      { label: 'Match', value: app.ai_report.match_score },
                      { label: 'Confidence', value: app.ai_report.confidence_score },
                    ].map((s) => (
                      <div key={s.label} className="text-center p-3 bg-[var(--bg-elevated)] rounded-xl">
                        <div className="text-2xl font-bold" style={{ color: (s.value ?? 0) >= 70 ? '#10b981' : (s.value ?? 0) >= 50 ? '#f59e0b' : '#ef4444' }}>
                          {s.value ?? '—'}%
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timeline
                </h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Created', date: app.created_at },
                    { label: 'Applied', date: app.applied_at },
                    { label: 'Response', date: app.response_received_at },
                    { label: 'Interview', date: app.interview_date },
                  ]
                    .filter(t => t.date)
                    .map((t) => (
                      <div key={t.label} className="flex justify-between items-center p-2.5 bg-[var(--bg-elevated)] rounded-lg">
                        <span className="text-[var(--text-secondary)]">{t.label}</span>
                        <span className="font-medium">{formatDate(t.date)}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleSaveNotes}
                  placeholder="Add notes about this application..."
                  rows={4}
                  className="input-field w-full p-3 resize-none text-sm"
                />
                {savingNotes && (
                  <p className="text-xs text-[var(--text-muted)] mt-1">Saving...</p>
                )}
              </div>

              {/* Job Description */}
              {app.job?.description && (
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--text-muted)] mb-3">
                    Job Description
                  </h3>
                  <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-elevated)] rounded-xl p-4 max-h-48 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                    {app.job.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-subtle)] shrink-0 flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={onClose}
                className="flex-1 btn-ghost py-2.5 text-sm font-medium"
              >
                Close
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
