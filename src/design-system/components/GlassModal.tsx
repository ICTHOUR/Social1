import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  maxWidth?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  maxWidth = 'max-w-lg',
  footer,
  children,
}) => {
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle backdrop touch and click uniformly
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (modalContainerRef.current && !modalContainerRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={handleBackdropClick}
          className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
        >
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-slate-950/45 dark:bg-slate-950/80 backdrop-blur-md pointer-events-none"
          />

          {/* Modal Container */}
          <motion.div
            ref={modalContainerRef}
            initial={{ opacity: 0, scale: 0.94, y: 15, filter: 'blur(6px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.94, y: 10, filter: 'blur(4px)' }}
            transition={{ type: 'spring', damping: 26, stiffness: 350 }}
            className={`relative w-full ${maxWidth} bg-white dark:bg-[#0c1324] liquid-glass-5 border border-slate-200/90 dark:border-white/15 rounded-[24px] sm:rounded-[28px] p-5 sm:p-6 z-50 text-slate-900 dark:text-slate-100 my-auto max-h-[92dvh] flex flex-col shadow-2xl`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            {(title || subtitle) && (
              <div className="flex items-start justify-between pb-3 sm:pb-4 mb-3 sm:mb-4 border-b border-slate-200 dark:border-white/10 shrink-0">
                <div className="pr-2">
                  {title && <h2 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>}
                  {subtitle && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{subtitle}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto overscroll-contain pr-0.5 custom-scrollbar">
              {children}
            </div>

            {/* Dedicated Fixed / Sticky Footer if provided */}
            {footer && (
              <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-200/80 dark:border-white/10 shrink-0 relative z-50">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
