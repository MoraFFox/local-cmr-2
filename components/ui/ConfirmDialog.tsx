import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import SafeModal from '../form-ui/SafeModal';
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

  return (
    <SafeModal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      type="alert"
      closeOnBackdropClick={false}
      showCloseButton
      size="sm"
      ariaLabel={title}
      renderFooter={(closeModal) => (
        <div className="flex justify-end gap-3 p-4 bg-cream-2/30">
          <Button variant="secondary" onClick={closeModal}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isConfirming}
          >
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <div className="flex items-start gap-4 p-1">
        <div className="p-2 bg-lava-500/10 rounded-lg flex-shrink-0">
          <ExclamationTriangleIcon className="w-6 h-6 text-lava-500" />
        </div>
        <p id="confirm-message" className="text-sm text-latte mt-1">
          {message}
        </p>
      </div>
    </SafeModal>
  );
};

