import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface GlassDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  position?: 'right' | 'left';
  width?: string;
  children: React.ReactNode;
  className?: string;
}

export const GlassDrawer: React.FC<GlassDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  position = 'right',
  width = 'max-w-md',
  children,
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const slideInitial = position === 'right' ? { x: '100%' } : { x: '-100%' };
  const slideAnimate = { x: 0 };
  const slideExit = position === 'right' ? { x: '100%' } : { x: '-100%' };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] overflow-hidden" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/30 dark:bg-slate-950/60 backdrop-blur-sm"
          />

          {/* Drawer panel */}
          <div className={`fixed inset-y-0 ${position === 'right' ? 'right-0' : 'left-0'} flex max-w-full z-[10000]`}>
            <motion.div
              initial={slideInitial}
              animate={slideAnimate}
              exit={slideExit}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`w-screen ${width} bg-white dark:bg-[#0c1220] border-y-0 ${
                position === 'right' ? 'border-l' : 'border-r'
              } border-slate-200 dark:border-white/15 rounded-none shadow-2xl flex flex-col text-slate-900 dark:text-slate-100 ${className}`}
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/70 dark:border-white/10 shrink-0 bg-slate-50/70 dark:bg-white/[0.02]">
                <div>
                  {title && <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>}
                  {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close drawer"
                >
                  ✕
                </button>
              </div>

              {/* Drawer Content Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar">{children}</div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
