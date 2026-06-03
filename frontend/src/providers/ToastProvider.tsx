'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto dismiss after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Render Panel */}
      <div className="fixed top-24 right-6 z-50 flex flex-col gap-sm max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-md p-4 rounded-lg shadow-2xl border transition-all duration-300 animate-slide-in ${
                isSuccess
                  ? 'bg-surface-low border-tertiary text-white'
                  : isError
                  ? 'bg-surface-low border-red-500/30 text-white'
                  : 'bg-surface-low border-white/10 text-white'
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 pt-0.5">
                {isSuccess && <CheckCircle className="h-5 w-5 text-tertiary" />}
                {isError && <AlertTriangle className="h-5 w-5 text-red-500" />}
                {!isSuccess && !isError && <Info className="h-5 w-5 text-outline" />}
              </div>

              {/* Message */}
              <div className="flex-1 text-xs font-button uppercase tracking-wider text-pretty leading-relaxed">
                {toast.message}
              </div>

              {/* Close Button */}
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 p-0.5 hover:text-white text-on-surface-variant/40 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
