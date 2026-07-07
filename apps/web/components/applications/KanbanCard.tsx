'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Application } from '@internai/shared';
import { Brain, Building, Calendar, GripVertical } from 'lucide-react';
import { getStatusClass } from '@/lib/utils';

interface KanbanCardProps {
  app: Application;
  onClick: (app: Application) => void;
}

export function KanbanCard({ app, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <motion.div
        layoutId={`card-${app.id}`}
        className="glass-card p-4 cursor-pointer hover:border-[var(--brand-from)] transition-colors group"
        onClick={() => onClick(app)}
        whileHover={{ y: -2 }}
      >
        {/* Header row */}
        <div className="flex justify-between items-start mb-3">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getStatusClass(app.status)}`}
          >
            {app.status.replace('_', ' ')}
          </span>
          <div className="flex items-center gap-2">
            {app.ai_report && (
              <div
                className="flex items-center gap-1 text-xs font-semibold text-[#8b5cf6]"
                title="ATS Score"
              >
                <Brain className="w-3 h-3" />
                {app.ai_report.ats_score}%
              </div>
            )}
            <button
              {...listeners}
              className="text-[var(--text-muted)] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
            >
              <GripVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Job title */}
        <h4 className="font-bold text-[15px] mb-2 leading-snug line-clamp-2">
          {app.job?.title || 'Untitled Role'}
        </h4>

        {/* Meta */}
        <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-2">
            <Building className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{app.job?.company || 'Unknown Company'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{new Date(app.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* ATS score bar */}
        {app.ai_report?.ats_score != null && (
          <div className="mt-3">
            <div className="h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${app.ai_report.ats_score}%`,
                  background:
                    app.ai_report.ats_score >= 70
                      ? 'linear-gradient(90deg,#10b981,#34d399)'
                      : app.ai_report.ats_score >= 50
                      ? 'linear-gradient(90deg,#f59e0b,#fbbf24)'
                      : 'linear-gradient(90deg,#ef4444,#f87171)',
                }}
              />
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
