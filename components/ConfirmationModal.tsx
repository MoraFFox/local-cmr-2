import React from 'react';
import { SafeModal } from './form-ui/SafeModal';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isConfirming?: boolean;
}

/**
 * ConfirmationModal — a simple Yes/No confirmation dialog.
 *
 * Migrated to SafeModal for consistent focus-trap, ESC handling, and
 * safe backdrop behavior across all modals (audit issue #16).
 *
 * Behavior:
 * - type="alert" → backdrop click closes (a confirm dialog is safe to dismiss)
 * - ESC closes
 * - Focus trap keeps keyboard focus inside the dialog while open
 * - No unsaved-changes protection (this IS the unsaved-changes confirmation)
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    isConfirming = false
}) => {
    return (
        <SafeModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            // type="alert" is semantically correct (a Yes/No confirmation),
            // but we explicitly allow backdrop dismissal to preserve the
            // original behavior: clicking outside the dialog = "No" (the
            // action is cancelled, onConfirm never fires).
            type="alert"
            closeOnBackdropClick={true}
            size="sm"
            ariaLabel={title}
            // Footer holds the No / Yes buttons. Rendered in SafeModal's
            // flex-shrink-0 footer slot so it stays pinned below the message.
            renderFooter={() => (
                <div className="flex justify-end space-x-3 px-6 py-4 border-t border-hairline dark:border-hairline bg-cream-2/30 dark:bg-espresso-light/20">
                    <button
                        onClick={onClose}
                        disabled={isConfirming}
                        className="px-5 py-2.5 text-sm font-semibold text-primary dark:text-cream bg-cream dark:bg-espresso-light border border-hairline rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30 disabled:opacity-50 transform active:scale-95"
                    >
                        No
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-ember-600 rounded-lg hover:bg-ember-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ember-500 disabled:opacity-50 disabled:cursor-wait transform active:scale-95"
                    >
                        {isConfirming ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            )}
        >
            <p className="mt-2 text-latte dark:text-cream/70">{message}</p>
        </SafeModal>
    );
};

export default ConfirmationModal;
