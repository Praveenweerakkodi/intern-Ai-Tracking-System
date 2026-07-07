'use client';

import { motion } from 'framer-motion';
import { AlertCircle, CheckCircle, Info, HelpCircle } from 'lucide-react';

interface OutcomePredictionCardProps {
  confidenceScore: number; // 0-100
  atsScore: number;        // 0-100
  matchScore: number;      // 0-100
}

export function OutcomePredictionCard({
  confidenceScore,
  atsScore,
  matchScore,
}: OutcomePredictionCardProps) {
  let status: 'likely' | 'possible' | 'unlikely' = 'possible';
  let title = 'Possible Callback';
  let desc = 'Your application stands a decent chance. Making minor improvements to missing skills could push it to likely.';
  let color = 'var(--accent-amber)';
  let bg = 'rgba(245, 158, 11, 0.05)';
  let border = 'rgba(245, 158, 11, 0.2)';
  let Icon = HelpCircle;

  if (confidenceScore >= 75 && atsScore >= 75) {
    status = 'likely';
    title = 'High Interview Probability';
    desc = 'Excellent! Your CV is a strong semantic match and passes ATS filters successfully. We highly recommend submitting.';
    color = 'var(--accent-emerald)';
    bg = 'rgba(16, 185, 129, 0.05)';
    border = 'rgba(16, 185, 129, 0.2)';
    Icon = CheckCircle;
  } else if (confidenceScore < 45 || atsScore < 50) {
    status = 'unlikely';
    title = 'Low Callback Rate';
    desc = 'ATS matching is currently low. Address the critical missing requirements and re-score before applying to avoid instant filters.';
    color = 'var(--accent-rose)';
    bg = 'rgba(244, 63, 94, 0.05)';
    border = 'rgba(244, 63, 94, 0.2)';
    Icon = AlertCircle;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card p-6 border transition-all flex flex-col sm:flex-row items-start sm:items-center gap-5"
      style={{ background: bg, borderColor: border }}
    >
      {/* Icon / Circular Ring */}
      <div className="relative shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg">
        <Icon className="w-8 h-8" style={{ color }} />
      </div>

      {/* Prediction Details */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2.5">
          <h4 className="font-bold text-base text-[var(--text-primary)]">
            {title}
          </h4>
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${color}15`, color, border: `1px solid ${color}30` }}
          >
            {status}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl">
          {desc}
        </p>

        {/* Confidence metric indicator */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1 h-1.5 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidenceScore}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
            />
          </div>
          <span className="text-xs font-bold shrink-0" style={{ color }}>
            {confidenceScore}% confidence
          </span>
        </div>
      </div>
    </motion.div>
  );
}
