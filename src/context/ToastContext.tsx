'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string | unknown, title?: string) => void;
    info: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/**
 * Format raw Supabase or standard Error objects into friendly, human-readable strings
 */
export function formatFriendlyErrorMessage(err: unknown): string {
  if (!err) return 'An unexpected error occurred.';

  const message =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : String(err);

  const lower = message.toLowerCase();

  if (lower.includes('invalid login credentials') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Please verify your login details.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please verify your inbox.';
  }
  if (lower.includes('jwt') || lower.includes('token is expired') || lower.includes('expired')) {
    return 'Your session has expired. Please log in again to continue.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('load failed')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  if (lower.includes('row-level security') || lower.includes('permission denied')) {
    return 'Action not permitted by database security policies. Please ensure you are signed in.';
  }
  if (lower.includes('duplicate key') || lower.includes('unique constraint') || lower.includes('invoice_no')) {
    return 'An invoice with this invoice number already exists.';
  }
  if (lower.includes('violates check constraint')) {
    return 'Invalid data format. Please review your entered fields.';
  }

  return message;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const friendlyMsg = type === 'error' ? formatFriendlyErrorMessage(message) : message;

      setToasts((prev) => [...prev, { id, type, message: friendlyMsg, title }]);

      // Auto dismiss after 4.5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const toast = {
    success: useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast]),
    error: useCallback((err: unknown, title?: string) => showToast(formatFriendlyErrorMessage(err), 'error', title), [showToast]),
    info: useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast]),
    warning: useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast]),
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notifications"
      className="fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-[9999] flex flex-col gap-2.5 max-w-[calc(100vw-1.5rem)] sm:max-w-md pointer-events-none"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: () => void;
}) {
  const icons: Record<ToastType, string> = {
    success: '✅',
    error: '⚠️',
    info: 'ℹ️',
    warning: '🔔',
  };

  const borders: Record<ToastType, string> = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    error: 'border-rose-200 bg-rose-50 text-rose-900',
    info: 'border-blue-200 bg-blue-50 text-blue-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl border shadow-lg shadow-black/5 ${borders[toast.type]} backdrop-blur-md transition-all duration-300 animate-slide-up`}
    >
      <span className="text-lg shrink-0 mt-0.5">{icons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-xs font-bold uppercase tracking-wider mb-0.5">{toast.title}</p>}
        <p className="text-xs sm:text-sm font-medium leading-relaxed break-words">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-gray-400 hover:text-gray-700 p-1 rounded-lg transition-colors text-sm font-bold leading-none"
        aria-label="Close notification"
      >
        ✕
      </button>
    </div>
  );
}
