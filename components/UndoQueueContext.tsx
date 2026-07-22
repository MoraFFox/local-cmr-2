/**
 * UndoQueueContext
 *
 * Provides an app-level undo queue. Callers can queue a destructive action;
 * the user sees a persistent toast with an Undo button. If not undone within
 * the timeout, the action is committed automatically.
 */

import React, { createContext, useContext, useCallback, useRef, useState } from 'react';
import { useToast } from './ToastContext';
import { announce } from '../utils/ariaAnnouncer';

interface UndoQueueContextValue {
  /** Queue a delete operation. Returns the queue item id. */
  queueDelete: (options: { label: string; onCommit: () => void; onUndo?: () => void; timeout?: number }) => string;
}

const UndoQueueContext = createContext<UndoQueueContextValue | undefined>(undefined);

export const UndoQueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast, removeToast } = useToast();
  const [pending, setPending] = useState<Record<string, { timeoutId: ReturnType<typeof setTimeout>; toastId: string }>>({});
  const pendingRef = useRef<Record<string, { timeoutId: ReturnType<typeof setTimeout>; toastId: string }>>({});
  // Keep the ref in sync with state so callbacks always see the latest map.
  pendingRef.current = pending;

  const queueDelete = useCallback(({
    label,
    onCommit,
    onUndo,
    timeout = 10000
  }: { label: string; onCommit: () => void; onUndo?: () => void; timeout?: number }) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const undo = () => {
      const item = pendingRef.current[id];
      if (!item) return;
      try {
        clearTimeout(item.timeoutId);
        onUndo?.();
        announce('تم التراجع عن الحذف');
      } finally {
        removeToast(item.toastId);
        setPending(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    };

    const commit = () => {
      try {
        onCommit();
      } finally {
        removeToast(toastId);
        setPending(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    };

    const toastLabel = label.replace(/[.!?]\s*$/, '').trim();

    const toastId = showToast(
      `${toastLabel}. Undo within ${timeout / 1000}s.`,
      'warning',
      0,
      <button
        type="button"
        onClick={undo}
        className="px-2.5 py-1 bg-white text-amber-600 text-xs font-bold rounded-md hover:bg-amber-100 transition-colors"
        aria-label="Undo"
      >
        تراجع
      </button>
    );

    const timeoutId = setTimeout(commit, timeout);

    setPending(prev => ({
      ...prev,
      [id]: { timeoutId, toastId }
    }));

    return id;
  }, [showToast, removeToast]);

  return (
    <UndoQueueContext.Provider value={{ queueDelete }}>
      {children}
    </UndoQueueContext.Provider>
  );
};

export const useUndoQueue = (): UndoQueueContextValue => {
  const context = useContext(UndoQueueContext);
  if (!context) {
    throw new Error('useUndoQueue must be used within an UndoQueueProvider');
  }
  return context;
};

export default UndoQueueContext;
