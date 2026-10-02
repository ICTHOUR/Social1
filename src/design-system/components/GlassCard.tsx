import React from 'react';
import { GlassLevel, GlassVariant } from '../types';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  level?: GlassLevel;
  variant?: GlassVariant;
  interactive?: boolean;
  sheen?: boolean;
  specularEdge?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  level,
  variant = 'surface',
  interactive = false,
  sheen = false,
  specularEdge = true,
  className = '',
  children,
  ...props
}) => {
  const getLevelStyles = () => {
    // If level is explicitly passed, map directly to Liquid Glass levels 1-5
    if (level === 1) return 'liquid-glass-1';
    if (level === 2) return 'liquid-glass-2';
    if (level === 3) return 'liquid-glass-3';
    if (level === 4) return 'liquid-glass-4';
    if (level === 5) return 'liquid-glass-5';

    // Otherwise derive from variant
    switch (variant) {
      case 'frosted':
        return 'liquid-glass-2';
      case 'deep':
        return 'liquid-glass-3';
      case 'floating':
        return 'liquid-glass-4';
      case 'modal':
        return 'liquid-glass-5';
      case 'subtle':
        return 'liquid-glass-1 opacity-90';
      case 'glow':
        return 'liquid-glass-2 border-cyan-400/40 dark:border-cyan-400/35 shadow-[0_0_28px_-4px_rgba(6,182,212,0.28)]';
      case 'accent':
        return 'bg-gradient-to-br from-violet-500/15 via-cyan-500/10 to-transparent dark:from-violet-950/40 dark:via-cyan-950/30 dark:to-transparent backdrop-blur-2xl border-cyan-400/30 dark:border-cyan-400/25 shadow-lg shadow-cyan-500/10';
      case 'prism':
        return 'bg-gradient-to-br from-white/70 via-cyan-100/40 to-violet-100/30 dark:from-slate-900/70 dark:via-cyan-950/30 dark:to-violet-950/20 backdrop-blur-2xl border-white/80 dark:border-white/15 shadow-xl';
      case 'surface':
      default:
        return 'liquid-glass-surface';
    }
  };

  const interactiveStyles = interactive
    ? 'cursor-pointer transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-8px_rgba(6,182,212,0.22)] dark:hover:shadow-[0_16px_40px_-8px_rgba(6,182,212,0.28)] hover:border-cyan-400/50 active:scale-[0.99]'
    : '';

  const sheenStyles = sheen ? 'sheen-sweep' : '';
  const edgeStyles = specularEdge ? 'glass-specular-edge' : '';

  return (
    <div
      className={`rounded-3xl text-slate-800 dark:text-slate-100 ${getLevelStyles()} ${interactiveStyles} ${sheenStyles} ${edgeStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
