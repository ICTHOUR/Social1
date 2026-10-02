import React from 'react';
import { useTheme } from '../ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { Sun, Moon, Sparkles } from 'lucide-react';

export interface ThemeToggleButtonProps {
  className?: string;
  variant?: 'icon' | 'pill' | 'switch';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const ThemeToggleButton: React.FC<ThemeToggleButtonProps> = ({
  className = '',
  variant = 'icon',
  size = 'md',
  showLabel = false,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();

  const isDark = theme === 'dark';

  // Size dimensions for container
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-xl',
    md: 'w-9 h-9 rounded-2xl',
    lg: 'w-10 h-10 rounded-2xl',
  }[size];

  const iconSizes = {
    sm: 15,
    md: 17,
    lg: 20,
  }[size];

  // 1. SWITCH / SLIDER VARIANT
  if (variant === 'switch') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full p-1 transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 shadow-inner ${
          isDark
            ? 'bg-slate-900 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
            : 'bg-amber-100/90 border border-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
        } ${className}`}
        aria-label="Toggle dark/light mode"
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <span
          className={`pointer-events-none relative flex h-6 w-6 transform items-center justify-center rounded-full shadow-md transition-all duration-300 ease-in-out ${
            isDark
              ? 'translate-x-8 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white'
              : 'translate-x-0 bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950'
          }`}
        >
          {/* Smooth Cross-Fade Icons inside Switch Knob */}
          <Sun
            size={13}
            className={`absolute transition-all duration-300 ease-in-out stroke-[2.5] ${
              isDark
                ? 'opacity-0 scale-50 rotate-90 pointer-events-none'
                : 'opacity-100 scale-100 rotate-0'
            }`}
          />
          <Moon
            size={13}
            className={`absolute transition-all duration-300 ease-in-out stroke-[2.5] ${
              isDark
                ? 'opacity-100 scale-100 rotate-0'
                : 'opacity-0 scale-50 -rotate-90 pointer-events-none'
            }`}
          />
        </span>
      </button>
    );
  }

  // 2. PILL BUTTON WITH TEXT VARIANT
  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`px-3.5 py-1.5 rounded-2xl border text-xs font-bold transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-xs select-none ${
          isDark
            ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white hover:border-cyan-400/40'
            : 'bg-black/5 hover:bg-black/10 border-black/10 text-slate-800 hover:border-amber-400/40'
        } ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
          <Sun
            size={15}
            className={`absolute transition-all duration-300 ease-in-out text-amber-400 stroke-[2.5] ${
              isDark
                ? 'opacity-0 scale-50 rotate-90 pointer-events-none'
                : 'opacity-100 scale-100 rotate-0'
            }`}
          />
          <Moon
            size={15}
            className={`absolute transition-all duration-300 ease-in-out text-cyan-400 stroke-[2.5] ${
              isDark
                ? 'opacity-100 scale-100 rotate-0'
                : 'opacity-0 scale-50 -rotate-90 pointer-events-none'
            }`}
          />
        </div>
        <span>
          {isDark
            ? language === 'bn'
              ? 'লাইট মোড'
              : 'Light Mode'
            : language === 'bn'
            ? 'ডার্ক মোড'
            : 'Dark Mode'}
        </span>
      </button>
    );
  }

  // 3. ICON-ONLY LIQUID GLASS BUTTON WITH SMOOTH CROSS-FADE ANIMATION
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative ${sizeClasses} flex items-center justify-center overflow-hidden transition-all duration-300 ease-out cursor-pointer active:scale-90 group select-none ${
        isDark
          ? 'bg-white/10 hover:bg-white/20 border border-white/15 hover:border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:shadow-[0_0_18px_rgba(6,182,212,0.35)]'
          : 'bg-slate-100/95 hover:bg-amber-50/90 border border-slate-200 hover:border-amber-400/60 text-amber-500 shadow-xs hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]'
      } ${className}`}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {/* Dynamic Background Glow Burst */}
      <span
        className={`absolute inset-0 rounded-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${
          isDark
            ? 'bg-gradient-to-tr from-cyan-500/20 to-blue-500/10'
            : 'bg-gradient-to-tr from-amber-400/20 to-yellow-300/10'
        }`}
      />

      {/* Sun Icon: Scales down and rotates away when Dark, flourishes when Light */}
      <div
        className={`absolute flex items-center justify-center transition-all duration-300 ease-out ${
          isDark
            ? 'opacity-0 scale-50 -rotate-90 pointer-events-none'
            : 'opacity-100 scale-100 rotate-0 text-amber-500'
        }`}
      >
        <Sun
          size={iconSizes}
          className="stroke-[2.5] group-hover:rotate-45 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(245,158,11,0.6)]"
        />
      </div>

      {/* Moon Icon: Flourishes when Dark, scales down and rotates away when Light */}
      <div
        className={`absolute flex items-center justify-center transition-all duration-300 ease-out ${
          isDark
            ? 'opacity-100 scale-100 rotate-0 text-cyan-400'
            : 'opacity-0 scale-50 rotate-90 pointer-events-none'
        }`}
      >
        <Moon
          size={iconSizes}
          className="stroke-[2.5] group-hover:-rotate-12 transition-transform duration-300 drop-shadow-[0_0_6px_rgba(34,211,238,0.7)]"
        />
      </div>
    </button>
  );
};

export default ThemeToggleButton;
