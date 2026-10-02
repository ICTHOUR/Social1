import React from 'react';
import { ButtonSize, ButtonVariant } from '../types';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  sheen?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  sheen = true,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'liquid-btn-primary text-white';
      case 'secondary':
        return 'liquid-btn-secondary text-white';
      case 'accent':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold border border-amber-300/40 shadow-lg shadow-amber-500/25 backdrop-blur-xl';
      case 'danger':
        return 'bg-gradient-to-r from-rose-500 to-red-600 text-white border border-rose-400/40 shadow-lg shadow-rose-500/25 backdrop-blur-xl';
      case 'ghost':
        return 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 border border-transparent';
      case 'glass':
      default:
        return 'liquid-btn-glass text-slate-800 dark:text-slate-100';
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-xs font-medium rounded-xl gap-1.5 min-h-[36px]';
      case 'lg':
        return 'px-5 py-2.5 text-sm font-semibold rounded-2xl gap-2.5 min-h-[44px]';
      case 'icon':
        return 'w-10 h-10 min-w-[40px] p-0 rounded-2xl flex items-center justify-center';
      case 'md':
      default:
        return 'px-4 py-2 text-xs sm:text-sm font-medium rounded-xl gap-2 min-h-[40px]';
    }
  };

  const sheenStyles =
    sheen && variant !== 'ghost'
      ? 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full hover:before:translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700'
      : '';

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center cursor-pointer select-none transition-all duration-200 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none ${getVariantStyles()} ${getSizeStyles()} ${sheenStyles} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};
