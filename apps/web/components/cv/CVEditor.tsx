'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnalyzeResponse } from '@internai/shared';
import { getSocket } from '@/lib/socket';
import { ATSScoreRing } from '@/components/ai/ATSScoreRing';
import { downloadAsTxt, downloadAsPdf } from '@/lib/cv-download';
import { createClient } from '@/lib/supabase/client';
import { apiFetch, cleanErrorMessage } from '@/lib/utils';
import {
  Wand2, Download, RotateCcw, Loader2, Sparkles,
  FileText, CheckCircle, TrendingUp, Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

interface CVEditorProps {
  initialText: string;
  cvId: string | null;
  jobDescription: string;
  jobTitle: string;
  company: string;
  originalAnalysis: AnalyzeResponse;
}

export function CVEditor({
  initialText,
  cvId,
  jobDescription,
  jobTitle,
  company,
  originalAnalysis,
}: CVEditorProps) {
  const supabase = createClient();
  const [text, setText] = useState(initialText);
  const [isRewriting, setIsRewriting] = useState(false);
  const [isRescoring, setIsRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<AnalyzeResponse | null>(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- Append text to editor at end ----
  const appendToEditor = useCallback((addition: string) => {
    setText(prev => prev + '\n\n' + addition);
    toast.success('Added to your CV editor');
  }, []);

  // Expose appendToEditor via custom event so parent can call it
  useEffect(() => {
    const handler = (e: CustomEvent) => appendToEditor(e.detail);
    window.addEventListener('cv:append' as any, handler);
    return () => window.removeEventListener('cv:append' as any, handler);
  }, [appendToEditor]);

  // ---- AI Rewrite via WebSocket ----
  const handleAIRewrite = async () => {
    setIsRewriting(true);
    setStreamBuffer('');
    setText('');

    const socket = getSocket();

    socket.emit('improve-cv', {
      cvText: initialText,
      jobDescription,
      analysis: originalAnalysis,
    });

    let accumulated = '';

    const onToken = (data: { content: string }) => {
      accumulated += data.content;
      setStreamBuffer(accumulated);
      setText(accumulated);
    };

    const onDone = (data: { fullContent: string }) => {
      setText(data.fullContent);
      setStreamBuffer('');
      setIsRewriting(false);
      socket.off('stream:token', onToken);
      socket.off('stream:done', onDone);
      socket.off('stream:error', onError);
      toast.success('CV rewrite complete! Review and download.');
    };

    const onError = (data: { error: string }) => {
      toast.error(cleanErrorMessage(data.error || 'Rewrite failed'));
      setText(initialText);
      setIsRewriting(false);
      socket.off('stream:token', onToken);
      socket.off('stream:done', onDone);
      socket.off('stream:error', onError);
    };

    socket.on('stream:token', onToken);
    socket.on('stream:done', onDone);
    socket.on('stream:error', onError);
  };

  // ---- Re-Score ----
  const handleRescore = async () => {
    if (!text.trim()) return;
    setIsRescoring(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const result = await apiFetch<AnalyzeResponse>('/ai/analyze', {
        method: 'POST',
        body: JSON.stringify({
          cv_text: text,
          job_description: jobDescription,
          job_title: jobTitle,
          company,
        }),
      }, session?.access_token);
      setRescoreResult(result);
      toast.success('Re-scored successfully!');
    } catch (e: any) {
      toast.error(e.message || 'Re-score failed');
    } finally {
      setIsRescoring(false);
    }
  };

  const scoreDelta = rescoreResult
    ? rescoreResult.ats_score - originalAnalysis.ats_score
    : null;

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const handleReset = () => {
    setText(initialText);
    setRescoreResult(null);
    toast.success('Reset to original CV');
  };

  return (
    <div className="space-y-6">
      {/* Score comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-card p-5 flex items-center gap-4">
          <ATSScoreRing score={originalAnalysis.ats_score} size={80} />
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Original Score</p>
            <p className="text-2xl font-bold mt-1">{originalAnalysis.ats_score}<span className="text-sm text-[var(--text-muted)]">/100</span></p>
          </div>
        </div>

        <div className="glass-card p-5 flex items-center gap-4">
          <ATSScoreRing score={rescoreResult?.ats_score ?? 0} size={80} />
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">New Score</p>
            {rescoreResult ? (
              <>
                <p className="text-2xl font-bold mt-1">{rescoreResult.ats_score}<span className="text-sm text-[var(--text-muted)]">/100</span></p>
                {scoreDelta !== null && (
                  <span className={`text-sm font-bold ${scoreDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {scoreDelta >= 0 ? '+' : ''}{scoreDelta} pts
                  </span>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-muted)] mt-1">Click Re-Score to check</p>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
        <button
          onClick={handleAIRewrite}
          disabled={isRewriting}
          className="btn-gradient px-5 py-2.5 flex items-center gap-2 text-sm font-semibold"
        >
          {isRewriting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Rewriting...</>
          ) : (
            <><Wand2 className="w-4 h-4" /> AI Rewrite</>
          )}
        </button>

        <button
          onClick={handleRescore}
          disabled={isRescoring}
          className="btn-ghost px-5 py-2.5 flex items-center gap-2 text-sm font-semibold"
        >
          {isRescoring ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Scoring...</>
          ) : (
            <><TrendingUp className="w-4 h-4" /> Re-Score</>
          )}
        </button>

        <button onClick={handleCopy} className="btn-ghost px-4 py-2.5 flex items-center gap-2 text-sm">
          <Copy className="w-4 h-4" /> Copy
        </button>

        <button onClick={handleReset} className="btn-ghost px-4 py-2.5 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>

        <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
          <button
            onClick={() => downloadAsTxt(text, `cv-${Date.now()}.txt`)}
            className="btn-ghost px-4 py-2.5 flex items-center gap-2 text-sm"
          >
            <FileText className="w-4 h-4" /> Download TXT
          </button>
          <button
            onClick={() => downloadAsPdf(text, `cv-internai-${Date.now()}.pdf`)}
            className="btn-gradient px-4 py-2.5 flex items-center gap-2 text-sm font-semibold"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Rewriting indicator */}
      <AnimatePresence>
        {isRewriting && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-[var(--brand-from)]/10 border border-[var(--brand-from)]/20 rounded-xl text-sm"
          >
            <Sparkles className="w-4 h-4 text-[var(--brand-from)] animate-pulse" />
            <span className="text-[var(--text-secondary)]">AI is rewriting your CV for maximum ATS impact...</span>
            <span className="typewriter-cursor" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="input-field w-full p-5 font-mono text-sm leading-relaxed resize-none"
          style={{ minHeight: '520px' }}
          placeholder="Your CV text will appear here..."
          spellCheck={false}
        />
        <div className="absolute bottom-3 right-3 text-xs text-[var(--text-muted)]">
          {text.split(/\s+/).filter(Boolean).length} words
        </div>
      </div>

      {/* Improved sections legend */}
      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <span className="inline-block w-3 h-3 rounded bg-[var(--brand-from)]/30 border border-[var(--brand-from)]/50" />
        Lines marked with [IMPROVED] will be highlighted in your PDF download
      </div>
    </div>
  );
}
