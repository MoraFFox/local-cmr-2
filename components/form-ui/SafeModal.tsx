/**
 * SafeModal Component
 *
 * Enhanced modal with:
 * - Proper focus trap
 * - ESC key handling
 * - Safe backdrop click (only for informational modals)
 * - Unsaved changes protection
 * - Accessibility
 *
 * @example
 * ```tsx
 * <SafeModal
 *   isOpen={isOpen}
 *   onClose={onClose}
 *   title="Edit Company"
 *   hasUnsavedChanges={hasChanges}
 *   type="form"
 * >
 *   <CompanyForm />
 * </SafeModal>
 * ```
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { createPortal } from 'react-dom';

interface SafeModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close callback */
  onClose: () => void;
  /** Modal title (string or custom ReactNode, e.g. a header with subtitle) */
  title?: React.ReactNode;
  /** Modal content */
  children: React.ReactNode;
  /** Modal type determines behavior */
  type?: 'form' | 'info' | 'alert';
  /** Has unsaved changes warning */
  hasUnsavedChanges?: boolean;
  /** Custom confirmation message */
  unsavedMessage?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  /** Show close button */
  showCloseButton?: boolean;
  /** Close on backdrop click (only for info type) */
  closeOnBackdropClick?: boolean;
  /** Custom class name for the modal panel */
  className?: string;
  /** aria-label for accessibility */
  ariaLabel?: string;
  /** Render a custom header (replaces the default title bar). When provided,
   *  `title` is ignored and no default header is rendered. The function
   *  receives SafeModal's internal `handleClose` so custom close buttons go
   *  through the unsaved-changes protection (instead of calling `onClose`
   *  directly, which would bypass it). */
  renderHeader?: (handleClose: () => void) => React.ReactNode;
  /** Render a custom footer (e.g. action buttons, totals). Rendered in a
   *  flex-shrink-0 slot below the scrollable content. The function receives
   *  SafeModal's internal `handleClose` so custom Cancel/Close buttons in the
   *  footer go through the unsaved-changes protection (instead of calling
   *  `onClose` directly, which would bypass it). */
  renderFooter?: (handleClose: () => void) => React.ReactNode;
  /** Extra classes for the scrollable content area (e.g. to remove padding
   *  for full-bleed layouts like two-panel content). */
  bodyClassName?: string;
  /** Extra classes for the header wrapper (e.g. custom background). */
  headerClassName?: string;
  /** Set to true to disable the scrollable wrapper and render content directly
   *  (useful for modals that manage their own internal scrolling, e.g. a
   *  two-panel layout where each panel scrolls independently). */
  rawContent?: boolean;
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full mx-4'
};

/**
 * Focus trap hook for modals
 */
function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLDivElement>) {
  const lastFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store last focused element
    lastFocusedRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    // Focus first element
    firstElement?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Shift + Tab
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      }
      // Tab
      else if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    container.addEventListener('keydown', handleTab);

    return () => {
      container.removeEventListener('keydown', handleTab);
      // Restore focus
      lastFocusedRef.current?.focus();
    };
  }, [isActive, containerRef]);
}

export const SafeModal: React.FC<SafeModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  type = 'form',
  hasUnsavedChanges = false,
  unsavedMessage = 'You have unsaved changes. Are you sure you want to close?',
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick,
  className = '',
  ariaLabel,
  renderHeader,
  renderFooter,
  bodyClassName = '',
  headerClassName = '',
  rawContent = false
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Override backdrop click behavior based on type
  const shouldCloseOnBackdrop = closeOnBackdropClick !== undefined
    ? closeOnBackdropClick
    : type === 'info';

  useFocusTrap(isOpen, modalRef);

  /**
   * Handle close request with unsaved changes check.
   *
   * When the unsaved-changes confirm dialog is already showing, ignore
   * further close attempts (X button, footer Cancel, etc.) so the user
   * must explicitly choose "Keep Editing" or "Discard Changes". This
   * prevents bypassing the confirmation by clicking X a second time.
   */
  const handleClose = useCallback(() => {
    if (showConfirm) return;
    if (hasUnsavedChanges) {
      setShowConfirm(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, showConfirm, onClose]);

  /**
   * Handle ESC key
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showConfirm) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose, showConfirm]);

  /**
   * Prevent body scroll when modal is open.
   *
   * Also resets the unsaved-changes confirm state when the modal closes so
   * that re-opening it doesn't show a stale "Discard changes?" dialog (e.g.
   * when the parent sets `isOpen=false` directly without going through
   * `handleClose`).
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setShowConfirm(false);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget && shouldCloseOnBackdrop) {
      handleClose();
    }
  }, [shouldCloseOnBackdrop, handleClose]);

  /**
   * Handle confirm close (with unsaved changes)
   */
  const handleConfirmClose = useCallback(() => {
    setShowConfirm(false);
    onClose();
  }, [onClose]);

  /**
   * Cancel confirm dialog
   */
  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false);
  }, []);

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div
        ref={modalRef}
        className={`bg-cream dark:bg-espresso border border-hairline dark:border-hairline rounded-2xl shadow-xl w-full ${sizeStyles[size]} ${className} animate-scale-in max-h-[90vh] overflow-hidden flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        {renderHeader ? (
          renderHeader(handleClose)
        ) : title ? (
          <div className={`flex items-center justify-between px-6 py-4 border-b border-hairline dark:border-hairline bg-cream-2/50 dark:bg-espresso-light/30 flex-shrink-0 ${headerClassName}`}>
            {typeof title === 'string' ? (
              <h2 className="text-lg font-bold text-primary dark:text-white">{title}</h2>
            ) : (
              title
            )}

            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                className="p-2 text-latte hover:text-primary rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : null}

        {/* Content */}
        {rawContent ? (
          showConfirm ? (
            <div className="flex-1 px-6 py-4">
              <ConfirmationDialog
                message={unsavedMessage}
                onConfirm={handleConfirmClose}
                onCancel={handleCancelConfirm}
              />
            </div>
          ) : (
            <div className={`flex-1 flex flex-col overflow-hidden ${bodyClassName}`}>
              {children}
            </div>
          )
        ) : (
          <div className={`flex-1 overflow-y-auto px-6 py-4 ${bodyClassName}`}>
            {showConfirm ? (
              <ConfirmationDialog
                message={unsavedMessage}
                onConfirm={handleConfirmClose}
                onCancel={handleCancelConfirm}
              />
            ) : (
              children
            )}
          </div>
        )}

        {/* Custom footer */}
        {renderFooter && !showConfirm && (
          <div className="flex-shrink-0">
            {renderFooter(handleClose)}
          </div>
        )}

        {/* Warning banner for unsaved changes */}
        {hasUnsavedChanges && !showConfirm && (
          <div className="px-6 py-3 bg-amber-500/10 border-t border-amber-500/30 flex-shrink-0">
            <p className="text-sm text-amber-700 flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              Unsaved changes will be lost if you close
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

/**
 * Confirmation dialog component for unsaved changes
 */
interface ConfirmationDialogProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  message,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="space-y-4 py-4">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg flex-shrink-0">
          <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-primary mb-1">Discard unsaved changes?</h3>
          <p className="text-sm text-latte">{message}</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-primary border border-hairline rounded-lg hover:bg-cream-2 transition-colors min-h-[44px]"
        >
          Keep Editing
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium bg-ember-500 text-white rounded-lg hover:bg-ember-600 transition-colors min-h-[44px]"
        >
          Discard Changes
        </button>
      </div>
    </div>
  );
};

export default SafeModal;