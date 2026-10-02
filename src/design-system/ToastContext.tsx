import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from './types';
import { AnimatePresence, motion } from 'motion/react';

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (msg: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((msg: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const duration = msg.duration || 4000;
    const newToast: ToastMessage = { ...msg, id, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((message: string, title?: string) => {
    showToast({ type: 'success', message, title });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast({ type: 'danger', message, title });
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast({ type: 'warning', message, title });
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast({ type: 'info', message, title });
  }, [showToast]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    if (type === 'success') success(message);
    else if (type === 'error') error(message);
    else if (type === 'warning') warning(message);
    else info(message);
  }, [success, error, warning, info]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, warning, info, addToast }}>
      {children}
      {/* Toast Render Viewport */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: -15, filter: 'blur(6px)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto rounded-2xl p-3.5 backdrop-blur-2xl border shadow-xl flex items-start gap-3 relative overflow-hidden text-sm bg-white/85 dark:bg-[#0e1526]/85 border-white/60 dark:border-white/10 text-slate-900 dark:text-slate-100 shadow-slate-900/10 dark:shadow-black/50"
            >
              {/* Colored status strip / indicator */}
              <div
                className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                  toast.type === 'success'
                    ? 'bg-emerald-400 shadow-[0_0_10px_#10B981]'
                    : toast.type === 'danger'
                    ? 'bg-rose-500 shadow-[0_0_10px_#F43F5E]'
                    : toast.type === 'warning'
                    ? 'bg-amber-400 shadow-[0_0_10px_#F59E0B]'
                    : 'bg-cyan-400 shadow-[0_0_10px_#06B6D4]'
                }`}
              />

              <div className="flex-1 min-w-0 pr-2">
                {toast.title && <div className="font-semibold text-xs tracking-tight mb-0.5">{toast.title}</div>}
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed break-words">{toast.message}</div>
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer text-xs leading-none"
                aria-label="Dismiss notification"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
