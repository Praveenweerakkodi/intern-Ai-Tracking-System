'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { apiFetch } from '@/lib/utils';
import { CVUploader } from '@/components/cv/CVUploader';
import { CVEditor } from '@/components/cv/CVEditor';
import { MissingSkillsPanel } from '@/components/cv/MissingSkillsPanel';
import { ATSScoreRing } from '@/components/ai/ATSScoreRing';
import { GlowCard } from '@/components/animations/GlowCard';
import { AnalyzeResponse } from '@internai/shared';
import {
  ArrowRight, Briefcase, FileText, Loader2, Sparkles,
  AlertTriangle, CheckCircle, Brain, PenLine, BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

type Step = 1 | 2 | 3;
type ResultTab = 'results' | 'editor';

const STEP_LABELS = ['Upload CV', 'Job Details', 'Analysis & Edit'];

export default function CVOptimizerPage() {
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [cvId, setCvId] = useState<string | null>(null);
  const [cvText, setCvText] = useState<string | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [company, setCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>('results');

  useEffect(() => {
    const storedTitle = localStorage.getItem('optimizer_job_title');
    const storedCompany = localStorage.getItem('optimizer_company');
    const storedDesc = localStorage.getItem('optimizer_job_desc');
    const storedAnalysis = localStorage.getItem('optimizer_analysis');
    const storedCvText = localStorage.getItem('optimizer_cv_text');
    const storedCvId = localStorage.getItem('optimizer_cv_id');

    if (storedAnalysis && storedCvText) {
      setJobTitle(storedTitle || '');
      setCompany(storedCompany || '');
      setJobDescription(storedDesc || '');
      setAnalysis(JSON.parse(storedAnalysis));
      setCvText(storedCvText);
      setCvId(storedCvId);
      setStep(3);
      setResultTab('editor');

      // Clear them so they don't load again on next refresh
      localStorage.removeItem('optimizer_job_title');
      localStorage.removeItem('optimizer_company');
      localStorage.removeItem('optimizer_job_desc');
      localStorage.removeItem('optimizer_analysis');
      localStorage.removeItem('optimizer_cv_text');
      localStorage.removeItem('optimizer_cv_id');
    }
  }, []);

  const handleUpload = async (file: File) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const formData = new FormData();
    formData.append('file', file);

    const cv = await apiFetch<any>('/cv/upload', {
      method: 'POST',
      body: formData,
    }, session.access_token);

    setCvId(cv.id);
    setCvText(cv.extracted_text);
    setStep(2);
  };

  const handleAnalyze = async () => {
    if (!jobDescription || !cvText) return;
    setAnalyzing(true);
    setStep(3);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      const result = await apiFetch<AnalyzeResponse>('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          cv_text: cvText,
          job_description: jobDescription,
          job_title: jobTitle,
          company,
        }),
      }, session?.access_token);

      setAnalysis(result);
      setResultTab('results');

      // Save application automatically
      if (session) {
        await apiFetch('/applications', {
          method: 'POST',
          body: JSON.stringify({
            cv_id: cvId,
            status: 'draft',
            job_attributes: {
              title: jobTitle,
              company,
              description: jobDescription,
            },
          }),
        }, session.access_token);
      }
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
      setStep(2);
    } finally {
      setAnalyzing(false);
    }
  };

  // Inject text into CV editor via custom event
  const handleAddToCV = useCallback((text: string) => {
    window.dispatchEvent(new CustomEvent('cv:append', { detail: text }));
    setResultTab('editor');
  }, []);

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold">CV Optimizer</h1>
        <p className="text-xs md:text-sm text-[var(--text-secondary)] mt-1 max-w-3xl leading-relaxed">
          Match your CV against any job description — get ATS scoring, AI improvements, and download your upgraded CV.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3">
        {STEP_LABELS.map((label, i) => {
          const s = (i + 1) as Step;
          const isActive = step === s;
          const isDone = step > s;
          return (
            <div key={s} className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                    isActive
                      ? 'bg-[var(--brand-from)] text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                      : isDone
                      ? 'bg-emerald-500 text-white'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
                >
                  {isDone ? <CheckCircle className="w-4 h-4" /> : s}
                </div>
                <span
                  className={`text-sm font-medium hidden sm:block ${
                    isActive ? 'text-white' : 'text-[var(--text-muted)]'
                  }`}
                >
                  {label}
                </span>
              </div>
              {s !== 3 && (
                <div
                  className={`w-12 h-0.5 rounded-full ${step > s ? 'bg-emerald-500' : 'bg-[var(--bg-elevated)]'}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {/* STEP 1: UPLOAD */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <GlowCard className="p-8">
              <CVUploader onUpload={handleUpload} />
            </GlowCard>
          </motion.div>
        )}

        {/* STEP 2: JOB DESCRIPTION */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <GlowCard className="p-8 space-y-6">
              <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-sm text-emerald-300">CV uploaded successfully. Now tell us about the role.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Job Title</label>
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
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
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

              <div>
                <label className="block text-sm font-medium mb-2">Job Description <span className="text-rose-400">*</span></label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="input-field w-full p-4 h-64 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-4">
                <button onClick={() => setStep(1)} className="btn-ghost px-6 py-3">Back</button>
                <button
                  onClick={handleAnalyze}
                  disabled={!jobDescription}
                  className="btn-gradient px-8 py-3 flex items-center gap-2 font-semibold"
                >
                  <Sparkles className="w-4 h-4" /> Analyze Match
                </button>
              </div>
            </GlowCard>
          </motion.div>
        )}

        {/* STEP 3: RESULTS + EDITOR */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {analyzing ? (
              <GlowCard className="p-16 flex flex-col items-center justify-center min-h-[400px]">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <div className="absolute inset-0 border-t-2 border-[var(--brand-from)] rounded-full animate-spin-slow" />
                  <Brain className="w-10 h-10 text-[var(--brand-from)] animate-pulse-glow" />
                </div>
                <h3 className="text-xl font-bold mt-8 mb-2">Analyzing your CV</h3>
                <p className="text-[var(--text-secondary)] text-center max-w-sm">
                  Gemini AI is parsing keywords, comparing requirements, and generating your ATS score...
                </p>
              </GlowCard>
            ) : analysis ? (
              <div className="space-y-6">
                {/* Result Tabs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setResultTab('results')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      resultTab === 'results'
                        ? 'bg-[var(--brand-from)] text-white'
                        : 'btn-ghost'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" /> Analysis Results
                  </button>
                  <button
                    onClick={() => setResultTab('editor')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      resultTab === 'editor'
                        ? 'bg-[var(--brand-from)] text-white'
                        : 'btn-ghost'
                    }`}
                  >
                    <PenLine className="w-4 h-4" /> Edit & Download CV
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {resultTab === 'results' && (
                    <motion.div
                      key="results-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="space-y-6"
                    >
                      {/* Score Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <GlowCard className="p-8 flex flex-col items-center justify-center text-center">
                          <ATSScoreRing score={analysis.ats_score} size={180} />
                          <h3 className="text-xl font-bold mt-6 mb-1">Match Score: {analysis.match_score}%</h3>
                          <p className="text-sm text-[var(--text-secondary)]">Confidence: {analysis.confidence_score}%</p>
                        </GlowCard>

                        <GlowCard className="p-6 col-span-2 space-y-6">
                          <div>
                            <h3 className="font-bold flex items-center gap-2 mb-4">
                              <CheckCircle className="text-emerald-500 w-5 h-5" /> Matched Skills ({analysis.matched_skills.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {analysis.matched_skills.map((s, i) => (
                                <span key={i} className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-sm">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <h3 className="font-bold flex items-center gap-2 mb-4">
                              <AlertTriangle className="text-rose-500 w-5 h-5" /> Missing Skills ({analysis.missing_skills.length})
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              {analysis.missing_skills.slice(0, 8).map((s, i) => (
                                <button
                                  key={i}
                                  onClick={() => handleAddToCV(`• ${s.name} — [Add to your Skills section]`)}
                                  className="group px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-full text-sm hover:bg-rose-500/20 transition-colors"
                                  title="Click to add to CV editor"
                                >
                                  {s.name}
                                  {s.importance === 'required' && <span className="opacity-50 text-xs ml-1">(Req)</span>}
                                </button>
                              ))}
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-2">💡 Click a skill to add it to your CV editor</p>
                          </div>
                        </GlowCard>
                      </div>

                      {/* Strengths */}
                      {analysis.strengths.length > 0 && (
                        <GlowCard className="p-6">
                          <h3 className="font-bold mb-4 flex items-center gap-2">
                            <Sparkles className="text-amber-400 w-5 h-5" /> Your Strengths
                          </h3>
                          <ul className="space-y-2">
                            {analysis.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                                {s}
                              </li>
                            ))}
                          </ul>
                        </GlowCard>
                      )}

                      {/* AI Suggestions */}
                      <GlowCard className="p-8">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                          <Sparkles className="text-[var(--brand-from)] w-6 h-6" /> AI Feedback & Suggestions
                        </h3>
                        <div className="ai-prose">
                          <p className="whitespace-pre-wrap">{analysis.suggestions}</p>
                        </div>
                      </GlowCard>

                      {/* Missing Skills + Weak Areas Panel */}
                      <MissingSkillsPanel
                        missingSkills={analysis.missing_skills}
                        weakAreas={analysis.weak_areas}
                        onAddToCV={handleAddToCV}
                      />

                      {/* CTA to editor */}
                      <GlowCard className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h3 className="font-bold">Ready to improve your CV?</h3>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Use the AI editor to rewrite, fix, and download your upgraded CV.
                          </p>
                        </div>
                        <button
                          onClick={() => setResultTab('editor')}
                          className="btn-gradient px-6 py-3 flex items-center justify-center gap-2 font-semibold shrink-0"
                        >
                          <PenLine className="w-4 h-4" /> Open CV Editor
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </GlowCard>
                    </motion.div>
                  )}

                  {resultTab === 'editor' && cvText && (
                    <motion.div
                      key="editor-tab"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <GlowCard className="p-8">
                        <div className="mb-6">
                          <h3 className="text-xl font-bold">CV Editor</h3>
                          <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Edit your CV, click "AI Rewrite" for full optimization, re-score to see improvement, then download.
                          </p>
                        </div>
                        <CVEditor
                          initialText={cvText}
                          cvId={cvId}
                          jobDescription={jobDescription}
                          jobTitle={jobTitle}
                          company={company}
                          originalAnalysis={analysis}
                        />
                      </GlowCard>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
