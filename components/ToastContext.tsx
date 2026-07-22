import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  /** Optional interactive element rendered next to the message (e.g. Undo). */
  action?: React.ReactNode;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, type: Toast['type'], duration?: number, action?: React.ReactNode, id?: string) => string;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const removeToast = useCallback((id: string) => {
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id]);
      delete timeoutsRef.current[id];
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clean up any pending auto-remove timeouts when the provider unmounts.
  useEffect(() => {
    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
      timeoutsRef.current = {};
    };
  }, []);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 5000, action?: React.ReactNode, id?: string) => {
    const toastId = id ?? `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const toast: Toast = { id: toastId, message, type, duration, action };

    setToasts((prev) => [...prev, toast]);

    // Auto-remove after duration; keep a handle so we can cancel the timeout if
    // the toast is dismissed manually before it fires. If a toast with the same
    // id is already pending, clear its old timeout first to prevent leaks and
    // premature removal.
    if (timeoutsRef.current[toastId]) {
      clearTimeout(timeoutsRef.current[toastId]);
      delete timeoutsRef.current[toastId];
    }
    if (duration > 0) {
      timeoutsRef.current[toastId] = setTimeout(() => {
        delete timeoutsRef.current[toastId];
        setToasts((prev) => prev.filter((t) => t.id !== toastId));
      }, duration);
    }

    return toastId;
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed top-4 left-4 z-50 flex flex-col gap-2"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px] animate-toast-slide-in border ${
              toast.type === 'success'
                ? 'bg-cream-2 text-primary border-hairline/50'
                : toast.type === 'error'
                ? 'bg-ember-500/20 text-primary border-ember-500/30'
                : toast.type === 'warning'
                ? 'bg-cream text-primary border-primary/30'
                : 'bg-cream text-primary border-hairline'
            }`}
            role={toast.type === 'error' ? 'alert' : 'status'}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {toast.type === 'success' && (
                <svg className="w-5 h-5 text-latte" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'error' && (
                <svg className="w-5 h-5 text-ember-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              )}
              {toast.type === 'info' && (
                <svg className="w-5 h-5 text-latte" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            
            {/* Message */}
            <p className="flex-1 text-sm font-medium">{toast.message}</p>

            {/* Action */}
            {toast.action && <div className="flex-shrink-0">{toast.action}</div>}

            {/* Close button — hidden for actionable toasts so the user can't
                dismiss a pending destructive operation without undoing it. */}
            {!toast.action && (
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 rounded hover:bg-ink/10 transition-colors text-latte hover:text-primary"
                aria-label="إغلاق"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export default ToastContext;
