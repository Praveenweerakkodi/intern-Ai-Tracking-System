'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PreSubmissionChecker } from '@/components/ai/PreSubmissionChecker';
import { CoachChat } from '@/components/ai/CoachChat';
import { Sparkles, MessageSquare, ShieldCheck } from 'lucide-react';

type Tab = 'precheck' | 'coach';

export default function AICoachPage() {
  const [tab, setTab] = useState<Tab>('precheck');

  return (
    <div className="p-4 md:p-8 w-full max-w-full space-y-4 md:space-y-6 flex flex-col h-[calc(100dvh-4rem)] md:h-screen overflow-hidden">
      {/* Header section */}
      <div className="shrink-0 space-y-1">
        <h1 className="text-3xl font-bold">AI Coach & Pre-check</h1>
        <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed max-w-3xl">
          Run an instant suitability check on job descriptions before applying, or talk with our context-aware career AI mentor.
        </p>
      </div>

      {/* Tabs list */}
      <div className="flex flex-wrap gap-2 shrink-0">
        <button
          onClick={() => setTab('precheck')}
          className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
            tab === 'precheck'
              ? 'bg-[var(--brand-from)] text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
              : 'btn-ghost'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4" /> Application Pre-check
        </button>
        <button
          onClick={() => setTab('coach')}
          className={`flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
            tab === 'coach'
              ? 'bg-[var(--brand-from)] text-white shadow-[0_0_20px_rgba(99,102,241,0.2)]'
              : 'btn-ghost'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 md:w-4 md:h-4" /> AI Career Chat
        </button>
      </div>

      {/* Tab Workspaces */}
      <div className="flex-1 overflow-hidden pr-2">
        <AnimatePresence mode="wait">
          {tab === 'precheck' && (
            <motion.div
              key="precheck"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-full overflow-y-auto pb-8 scrollbar-thin"
            >
              <PreSubmissionChecker />
            </motion.div>
          )}

          {tab === 'coach' && (
            <motion.div
              key="coach"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="h-full"
            >
              <CoachChat />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
