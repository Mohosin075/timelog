'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    warning: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const TOAST_DURATION = 4000;

const toastStyles: Record<ToastType, { bg: string; border: string; icon: React.ReactNode }> = {
  success: {
    bg: 'bg-emerald-950/90',
    border: 'border-emerald-500/50',
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  },
  error: {
    bg: 'bg-red-950/90',
    border: 'border-red-500/50',
    icon: <XCircle className="w-5 h-5 text-red-400 shrink-0" />,
  },
  warning: {
    bg: 'bg-amber-950/90',
    border: 'border-amber-500/50',
    icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  },
  info: {
    bg: 'bg-blue-950/90',
    border: 'border-blue-500/50',
    icon: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message }]); // Max 5 toasts
    setTimeout(() => dismiss(id), TOAST_DURATION);
  }, [dismiss]);

  const toast = {
    success: (message: string) => addToast('success', message),
    error: (message: string) => addToast('error', message),
    warning: (message: string) => addToast('warning', message),
    info: (message: string) => addToast('info', message),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => {
          const style = toastStyles[t.type];
          return (
            <div
              key={t.id}
              className={`
                pointer-events-auto flex items-center gap-3 
                ${style.bg} ${style.border}
                border backdrop-blur-xl rounded-xl px-4 py-3 
                min-w-[280px] max-w-[380px]
                shadow-2xl animate-fade-in
              `}
            >
              {style.icon}
              <p className="text-sm text-white font-medium flex-1 leading-snug">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-white/50 hover:text-white transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
};
