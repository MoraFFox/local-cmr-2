import React, { useEffect } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from './Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
  isConfirming?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  variant = 'primary',
  onConfirm,
  onCancel,
  onClose,
  isConfirming,
}) => {
  const handleClose = onCancel || onClose || (() => {});

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
    >
      <div
        className="bg-deep border border-sea rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 p-5 border-b border-sea">
          <div className="p-2 bg-lava-500/10 rounded-lg">
            <ExclamationTriangleIcon className="w-6 h-6 text-lava-500" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="text-lg font-bold text-onyx">
              {title}
            </h3>
            <p id="confirm-message" className="text-sm text-sage mt-1">
              {message}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1 text-sage hover:text-onyx hover:bg-sea rounded-full transition-colors"
            aria-label="إغلاق"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-end gap-3 p-4 bg-surface-muted/30">
          <Button variant="secondary" onClick={handleClose}>
            {cancelLabel}
          </Button>
          <Button variant={variant === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} isLoading={isConfirming}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

