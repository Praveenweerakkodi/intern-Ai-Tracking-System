'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/utils';
import { AnalyzeResponse, CV } from '@internai/shared';
import { ATSScoreRing } from '@/components/ai/ATSScoreRing';
import { OutcomePredictionCard } from '@/components/ai/OutcomePredictionCard';
import { GlowCard } from '@/components/animations/GlowCard';
import { useRouter } from 'next/navigation';
import {
  Sparkles, FileText, Loader2, ArrowRight, CheckCircle,
  AlertTriangle, Briefcase, Building, ChevronDown, Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export function PreSubmissionChecker() {
  const supabase = createClient();
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[]>([]);
  const [selectedCvId, setSelectedCvId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const data = await apiFetch<CV[]>('/cv', {}, session.access_token);
        setCvs(data);
        if (data.length > 0) {
          const primary = data.find(c => c.is_primary) || data[0];
          setSelectedCvId(primary.id);
        }
      } catch (e) {
        console.error('Error loading CVs:', e);
      }
    }
    load();
  }, [supabase]);

  const selectedCv = cvs.find(c => c.id === selectedCvId);

  const handleCheck = async () => {
    if (!jobDescription) {
      toast.error('Please paste the job description first');
      return;
    }
    if (!selectedCv?.extracted_text) {
      toast.error('Selected CV has no text extracted');
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const data = await apiFetch<AnalyzeResponse>('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          cv_text: selectedCv.extracted_text,
          job_description: jobDescription,
          job_title: jobTitle || 'Target Role',
          company: company || 'Target Company',
        }),
      }, session?.access_token);
      setResult(data);
      toast.success('Pre-check completed!');
    } catch (e: any) {
      toast.error(e.message || 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleFixAndGo = () => {
    if (!cvTextToStore) return;
    // Set matching attributes in localStorage so cv-optimizer can load them
    localStorage.setItem('optimizer_job_title', jobTitle);
    localStorage.setItem('optimizer_company', company);
    localStorage.setItem('optimizer_job_desc', jobDescription);
    localStorage.setItem('optimizer_analysis', JSON.stringify(result));
    localStorage.setItem('optimizer_cv_text', selectedCv?.extracted_text || '');
    localStorage.setItem('optimizer_cv_id', selectedCvId);

    toast.loading('Redirecting to CV Optimizer editor...');
    router.push('/cv-optimizer');
  };

  const cvTextToStore = selectedCv?.extracted_text;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Input panel */}
      <div className="lg:col-span-5 space-y-6">
        <GlowCard className="p-6 space-y-5">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="text-[var(--brand-from)] w-5 h-5 animate-pulse" />
            Check Application
          </h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Fill in the details below to test your CV suitability and get an ATS match pre-check before you click submit on the job board.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Job Title
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Intern Software Engineer"
                  className="input-field w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Company
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="input-field w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
            </div>

            {cvs.length > 0 && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Select CV
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <select
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    className="input-field w-full pl-10 pr-10 py-2.5 appearance-none text-sm cursor-pointer"
                  >
                    {cvs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.file_name} {c.is_primary ? '(Primary)' : `(v${c.version})`}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Job Description
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job requirements or description..."
                className="input-field w-full p-4 h-44 resize-none text-sm"
              />
            </div>

            <button
              onClick={handleCheck}
              disabled={checking || !jobDescription}
              className="btn-gradient w-full py-3 flex items-center justify-center gap-2 font-semibold text-sm"
            >
              {checking ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Matching...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Run Pre-Submission Check</>
              )}
            </button>
          </div>
        </GlowCard>
      </div>

      {/* Results / Empty state panel */}
      <div className="lg:col-span-7">
        <AnimatePresence mode="wait">
          {!result && !checking && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-12 text-center text-[var(--text-secondary)] min-h-[400px] flex flex-col items-center justify-center"
            >
              <Sparkles className="w-12 h-12 text-[var(--text-muted)] mb-4 animate-pulse" />
              <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2">Ready to Analyze</h3>
              <p className="max-w-xs text-sm">
                Paste job details and choose your CV to predict callback probability and missing requirements.
              </p>
            </motion.div>
          )}

          {checking && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-12 text-center text-[var(--text-secondary)] min-h-[400px] flex flex-col items-center justify-center"
            >
              <Loader2 className="w-12 h-12 text-[var(--brand-from)] mb-4 animate-spin" />
              <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2">Running Deep Audit</h3>
              <p className="max-w-xs text-sm">
                Evaluating semantic fit, keyword weights, and predicting response rates...
              </p>
            </motion.div>
          )}

          {result && !checking && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Prediction */}
              <OutcomePredictionCard
                confidenceScore={result.confidence_score}
                atsScore={result.ats_score}
                matchScore={result.match_score}
              />

              {/* Score breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlowCard className="p-5 flex items-center justify-center gap-4 text-center">
                  <ATSScoreRing score={result.ats_score} size={90} />
                  <div className="text-left">
                    <p className="text-2xl font-bold">{result.ats_score}%</p>
                    <p className="text-xs text-[var(--text-muted)]">ATS Filter Pass Rate</p>
                  </div>
                </GlowCard>
                <GlowCard className="p-5 flex items-center justify-center gap-4 text-center">
                  <ATSScoreRing score={result.match_score} size={90} />
                  <div className="text-left">
                    <p className="text-2xl font-bold">{result.match_score}%</p>
                    <p className="text-xs text-[var(--text-muted)]">Semantic Match Rate</p>
                  </div>
                </GlowCard>
              </div>

              {/* Skills checklist */}
              <GlowCard className="p-6 space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-[var(--text-muted)]">
                  Critical Gaps to Cover
                </h3>
                <div className="space-y-2">
                  {result.missing_skills.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span className="font-medium text-[var(--text-primary)]">{s.name}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 font-semibold">
                        {s.importance || 'required'}
                      </span>
                    </div>
                  ))}

                  {result.missing_skills.length === 0 && (
                    <div className="text-center p-4 text-[var(--text-secondary)] text-sm">
                      🎉 No missing skills detected! Your CV covers all job keywords perfectly.
                    </div>
                  )}
                </div>
              </GlowCard>

              {/* Suggestion & CTA */}
              <GlowCard className="p-6 flex flex-col md:flex-row items-center justify-between gap-4 bg-gradient-to-r from-[rgba(99,102,241,0.08)] to-transparent">
                <div>
                  <h4 className="font-bold text-sm text-[var(--text-primary)]">Optimize instantly</h4>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 max-w-sm">
                    Open our smart CV editor with these suggestions pre-loaded to tweak and download.
                  </p>
                </div>
                <button
                  onClick={handleFixAndGo}
                  className="btn-gradient px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  Apply fixes in CV Editor <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </GlowCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
