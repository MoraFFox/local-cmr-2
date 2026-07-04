import React, { useEffect, useRef } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isConfirming?: boolean;
  confirmLabel?: string;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen, onClose, onConfirm, title, message, isConfirming = false, confirmLabel = 'نعم، حذف'
}) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto-focus confirm button
      setTimeout(() => confirmRef.current?.focus(), 50);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div 
        className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 overflow-hidden animate-scale-in flex flex-col max-h-[90dvh]"
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="confirm-title"
      >
        <div className="flex items-center gap-4 mb-4 shrink-0">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 id="confirm-title" className="text-xl font-bold text-slate-800 dark:text-white">
            {title}
          </h3>
        </div>
        
        <div className="mb-8 overflow-y-auto custom-scrollbar flex-grow text-slate-600 dark:text-slate-300">
          {message}
        </div>
        
        <div className="flex gap-3 justify-end shrink-0 pt-4 border-t border-slate-100 dark:border-slate-700 pb-safe">
          <button
            type="button"
            onClick={onClose}
            disabled={isConfirming}
            className="px-4 py-2 font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            type="button"
            ref={confirmRef}
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex items-center justify-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-50 min-w-[100px]"
          >
            {isConfirming ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
