'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/utils';
import { AnalyzeResponse, CV } from '@internai/shared';
import { ATSScoreRing } from '@/components/ai/ATSScoreRing';
import {
  X, Briefcase, Building, FileText, Sparkles, Loader2,
  CheckCircle, AlertTriangle, ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AddApplicationModalProps {
  onClose: () => void;
  onCreated: () => void;
}

export function AddApplicationModal({ onClose, onCreated }: AddApplicationModalProps) {
  const supabase = createClient();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preCheck, setPreCheck] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    async function loadCVs() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const data = await apiFetch<CV[]>('/cv', {}, session.access_token);
        setCvs(data);
        if (data.length > 0) {
          const primary = data.find(c => c.is_primary) || data[0];
          setSelectedCvId(primary.id);
        }
      } catch { /* no CVs yet */ }
    }
    loadCVs();
  }, [supabase]);

  const selectedCv = cvs.find(c => c.id === selectedCvId);

  const handlePreCheck = async () => {
    if (!jobDescription || !selectedCv?.extracted_text) {
      toast.error('Please paste a job description and select a CV with extracted text.');
      return;
    }
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await apiFetch<AnalyzeResponse>('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          cv_text: selectedCv.extracted_text,
          job_description: jobDescription,
          job_title: jobTitle,
          company,
        }),
      }, session?.access_token);
      setPreCheck(result);
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    } finally {
      setChecking(false);
    }
  };

  const handleSave = async () => {
    if (!jobTitle || !jobDescription) {
      toast.error('Job title and description are required');
      return;
    }
    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await apiFetch('/applications', {
        method: 'POST',
        body: JSON.stringify({
          cv_id: selectedCvId || undefined,
          status: 'applied',
          job_attributes: { title: jobTitle, company, description: jobDescription },
        }),
      }, session?.access_token);
      toast.success('Application added!');
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Failed to save application');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--border-subtle)]"
          style={{ background: 'var(--bg-surface)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-subtle)]">
            <div>
              <h2 className="text-xl font-bold">Add Application</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-0.5">
                Check your CV against this role before applying
              </p>
            </div>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Job Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Job Title *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Frontend Engineering Intern"
                    className="input-field w-full pl-10 pr-4 py-3"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Company</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google"
                    className="input-field w-full pl-10 pr-4 py-3"
                  />
                </div>
              </div>
            </div>

            {/* CV Selector */}
            {cvs.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">Select CV</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <select
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    className="input-field w-full pl-10 pr-10 py-3 appearance-none cursor-pointer"
                  >
                    {cvs.map((cv) => (
                      <option key={cv.id} value={cv.id}>
                        {cv.file_name} {cv.is_primary ? '(Primary)' : `(v${cv.version})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </div>
            )}

            {/* Job Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Job Description *</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
                className="input-field w-full p-4 h-44 resize-none text-sm"
              />
            </div>

            {/* Pre-Check Button */}
            <button
              onClick={handlePreCheck}
              disabled={checking || !jobDescription || !selectedCv?.extracted_text}
              className="btn-gradient w-full py-3 flex items-center justify-center gap-2 font-semibold"
            >
              {checking ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing your CV...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Check Before Applying</>
              )}
            </button>

            {/* Pre-Check Results */}
            <AnimatePresence>
              {preCheck && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Score Row */}
                  <div className="flex items-center gap-6 p-5 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
                    <ATSScoreRing score={preCheck.ats_score} size={90} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--text-secondary)] mb-1">ATS Score</div>
                      <div className="text-3xl font-bold">{preCheck.ats_score}<span className="text-base text-[var(--text-muted)]">/100</span></div>
                      <div className="text-sm mt-1" style={{
                        color: preCheck.ats_score >= 70 ? '#10b981' : preCheck.ats_score >= 50 ? '#f59e0b' : '#ef4444'
                      }}>
                        {preCheck.ats_score >= 70 ? '✓ Strong match' : preCheck.ats_score >= 50 ? '⚠ Moderate match' : '✗ Weak match — improve CV before applying'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{preCheck.confidence_score}%</div>
                      <div className="text-xs text-[var(--text-muted)]">Interview chance</div>
                    </div>
                  </div>

                  {/* Missing Skills */}
                  {preCheck.missing_skills.length > 0 && (
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                      <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-3">
                        <AlertTriangle className="w-4 h-4" /> Missing from your CV
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {preCheck.missing_skills.slice(0, 8).map((s, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300"
                          >
                            {s.name}
                            {s.importance === 'required' && <span className="ml-1 opacity-60">(Required)</span>}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matched Skills */}
                  {preCheck.matched_skills.length > 0 && (
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4" /> Skills you already have
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {preCheck.matched_skills.slice(0, 6).map((s, i) => (
                          <span
                            key={i}
                            className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                          >
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Top suggestion */}
                  {preCheck.suggestions && (
                    <div className="p-4 bg-[var(--bg-elevated)] rounded-xl text-sm text-[var(--text-secondary)] leading-relaxed">
                      <span className="font-semibold text-[var(--text-primary)]">AI Tip: </span>
                      {preCheck.suggestions.slice(0, 250)}...
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 pt-0">
            <button onClick={onClose} className="btn-ghost flex-1 py-3">Cancel</button>
            <button
              onClick={handleSave}
              disabled={saving || !jobTitle || !jobDescription}
              className="btn-gradient flex-1 py-3 flex items-center justify-center gap-2 font-semibold"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Application
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
