'use client';

import { motion } from 'framer-motion';
import { CountUpNumber } from '../animations/CountUpNumber';
import { getScoreColor } from '@/lib/utils';

export function ATSScoreRing({ score, size = 160 }: { score: number; size?: number }) {
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  
  const color = getScoreColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Background Ring */}
      <svg className="absolute inset-0 transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--bg-elevated)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Animated Progress Ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 8px ${color}40)` }}
        />
      </svg>
      
      {/* Score Text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
          <CountUpNumber value={score} />
        </span>
        <span className="text-xs uppercase tracking-wider font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>
          ATS Score
        </span>
      </div>
    </div>
  );
}
