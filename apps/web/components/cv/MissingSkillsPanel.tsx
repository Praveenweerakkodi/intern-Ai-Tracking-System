'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SkillItem, WeakArea, AnalyzeResponse } from '@internai/shared';
import { AlertTriangle, Plus, ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface MissingSkillsPanelProps {
  missingSkills: SkillItem[];
  weakAreas: WeakArea[];
  onAddToCV: (text: string) => void;
}

export function MissingSkillsPanel({ missingSkills, weakAreas, onAddToCV }: MissingSkillsPanelProps) {
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);

  const required = missingSkills.filter(s => s.importance === 'required');
  const niceToHave = missingSkills.filter(s => s.importance !== 'required');

  const handleAddSkill = (skill: SkillItem) => {
    const suggestion = `• ${skill.name} — Add this to your Skills section${skill.category ? ` under ${skill.category}` : ''}. It appears ${skill.frequency ?? 1}x in the job description.`;
    onAddToCV(suggestion);
  };

  return (
    <div className="space-y-6">
      {/* Required Skills */}
      {required.length > 0 && (
        <div className="glass-card p-5 border-rose-500/20 bg-rose-500/5">
          <h3 className="font-bold text-rose-400 flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            Required Skills Missing ({required.length})
          </h3>
          <div className="space-y-2">
            {required.map((skill, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] hover:border-rose-500/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{skill.name}</span>
                    {skill.category && (
                      <span className="text-[10px] px-2 py-0.5 bg-[var(--bg-overlay)] rounded-full text-[var(--text-muted)] capitalize">
                        {skill.category}
                      </span>
                    )}
                  </div>
                  {skill.frequency && skill.frequency > 1 && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Mentioned {skill.frequency}× in job description
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleAddSkill(skill)}
                  className="shrink-0 w-full sm:w-auto ml-0 sm:ml-3 flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add to CV
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Nice to Have */}
      {niceToHave.length > 0 && (
        <div className="glass-card p-5 border-amber-500/20 bg-amber-500/5">
          <h3 className="font-bold text-amber-400 flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            Nice-to-Have Skills ({niceToHave.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {niceToHave.map((skill, i) => (
              <button
                key={i}
                onClick={() => handleAddSkill(skill)}
                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition-colors"
              >
                {skill.name}
                <Plus className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Weak Areas */}
      {weakAreas.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="font-bold text-[var(--text-secondary)] flex items-center gap-2 mb-4 text-sm uppercase tracking-wider">
            Weak Areas to Fix ({weakAreas.length})
          </h3>
          <div className="space-y-3">
            {weakAreas.map((area, i) => (
              <div key={i} className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedSkill(expandedSkill === `area-${i}` ? null : `area-${i}`)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[var(--glass-hover)] transition-colors text-left"
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      {area.section}
                    </span>
                    <p className="text-sm font-medium mt-0.5">{area.issue}</p>
                  </div>
                  {expandedSkill === `area-${i}` ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                </button>
                <AnimatePresence>
                  {expandedSkill === `area-${i}` && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
                        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                          💡 {area.suggestion}
                        </p>
                        <button
                          onClick={() => onAddToCV(`[${area.section.toUpperCase()}] ${area.suggestion}`)}
                          className="flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-lg bg-[var(--brand-from)]/10 text-[#818cf8] border border-[var(--brand-from)]/20 hover:bg-[var(--brand-from)]/20 transition-colors"
                        >
                          <Zap className="w-3 h-3" /> Apply fix in editor
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
