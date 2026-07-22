/**
 * ErrorRecovery Component
 *
 * Provides user-friendly error recovery options for form operations
 *
 * @example
 * ```tsx
 * <ErrorRecovery
 *   error={error}
 *   onRetry={handleRetry}
 *   onSaveDraft={handleSaveDraft}
 *   onContactSupport={handleContactSupport}
 * />
 * ```
 */

import React from 'react';
import {
  ArrowPathIcon,
  DocumentArrowDownIcon,
  ChatBubbleLeftIcon,
  XMarkIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { logger } from '../../utils/logger';
import { useT } from '../../utils/i18n';

interface ErrorRecoveryProps {
  /** Error object or message */
  error: Error | string;
  /** Retry the failed operation */
  onRetry?: () => void | Promise<void>;
  /** Save as draft */
  onSaveDraft?: () => void | Promise<void>;
  /** Contact support */
  onContactSupport?: () => void;
  /** Custom recovery actions */
  customActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    action: () => void | Promise<void>;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  /** Show error details */
  showDetails?: boolean;
  /** Custom class name */
  className?: string;
  /** Auto-dismiss after timeout (ms) */
  autoDismiss?: number;
  /** On dismiss callback */
  onDismiss?: () => void;
}

interface ErrorType {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  canRetry: boolean;
  canSaveDraft: boolean;
}

/**
 * Categorize error and provide context
 */
function categorizeError(error: Error | string, t: ReturnType<typeof useT>): ErrorType {
  const message = typeof error === 'string' ? error : error.message;
  const lowerMessage = message.toLowerCase();

  // Network errors
  if (
    lowerMessage.includes('network') ||
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('timeout')
  ) {
    return {
      title: t.errors.networkError,
      description: t.errors.networkErrorDesc,
      icon: ExclamationTriangleIcon,
      canRetry: true,
      canSaveDraft: true
    };
  }

  // Validation errors
  if (
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('validation')
  ) {
    return {
      title: t.errors.validationError,
      description: t.errors.validationErrorDesc,
      icon: ExclamationTriangleIcon,
      canRetry: false,
      canSaveDraft: true
    };
  }

  // Authentication errors
  if (
    lowerMessage.includes('unauthorized') ||
    lowerMessage.includes('authentication') ||
    lowerMessage.includes('login')
  ) {
    return {
      title: t.errors.authenticationError,
      description: t.errors.authenticationErrorDesc,
      icon: ExclamationTriangleIcon,
      canRetry: true,
      canSaveDraft: true
    };
  }

  // Server errors
  if (
    lowerMessage.includes('server') ||
    lowerMessage.includes('500') ||
    lowerMessage.includes('internal')
  ) {
    return {
      title: t.errors.serverError,
      description: t.errors.serverErrorDesc,
      icon: ExclamationTriangleIcon,
      canRetry: true,
      canSaveDraft: true
    };
  }

  // Storage errors
  if (
    lowerMessage.includes('storage') ||
    lowerMessage.includes('quota') ||
    lowerMessage.includes('disk')
  ) {
    return {
      title: t.errors.storageError,
      description: t.errors.storageErrorDesc,
      icon: ExclamationTriangleIcon,
      canRetry: false,
      canSaveDraft: false
    };
  }

  // Default error
  return {
    title: t.common.error,
    description: message || t.errors.unexpectedError,
    icon: ExclamationTriangleIcon,
    canRetry: true,
    canSaveDraft: true
  };
}

export const ErrorRecovery: React.FC<ErrorRecoveryProps> = ({
  error,
  onRetry,
  onSaveDraft,
  onContactSupport,
  customActions,
  showDetails = false,
  className = '',
  autoDismiss,
  onDismiss
}) => {
  const t = useT();
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [isSavingDraft, setIsSavingDraft] = React.useState(false);
  const errorInfo = categorizeError(error, t);
  const ErrorIcon = errorInfo.icon;

  // Auto-dismiss logic
  React.useEffect(() => {
    if (!autoDismiss) return;

    const timer = setTimeout(() => {
      onDismiss?.();
    }, autoDismiss);

    return () => clearTimeout(timer);
  }, [autoDismiss, onDismiss]);

  /**
   * Handle retry
   */
  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  /**
   * Handle save draft
   */
  const handleSaveDraft = async () => {
    if (!onSaveDraft || isSavingDraft) return;

    setIsSavingDraft(true);
    try {
      await onSaveDraft();
    } finally {
      setIsSavingDraft(false);
    }
  };

  const hasRecoveryActions = onRetry || onSaveDraft || onContactSupport || customActions;

  return (
    <div
      className={`
        bg-ember-500/10 border border-ember-500/30 rounded-xl p-4 animate-fade-in
        ${className}
      `}
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-ember-500/20 rounded-lg flex-shrink-0">
          <ErrorIcon className="w-5 h-5 text-ember-500" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-ember-500">{errorInfo.title}</h3>
          <p className="text-sm text-ember-500/80 mt-1">{errorInfo.description}</p>

          {showDetails && (
            <details className="mt-2">
              <summary className="text-xs text-ember-500/60 cursor-pointer hover:text-ember-500">
                {t.errors.errorDetails}
              </summary>
              <pre className="mt-1 text-xs text-ember-500/50 bg-ember-500/5 p-2 rounded overflow-auto">
                {typeof error === 'string' ? error : error.stack || error.message}
              </pre>
            </details>
          )}
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 text-ember-500/60 hover:text-ember-500 rounded-lg hover:bg-ember-500/10 transition-colors"
            aria-label={t.common.close}
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Recovery Actions */}
      {hasRecoveryActions && (
        <div className="mt-4 pt-4 border-t border-ember-500/20">
          <div className="flex flex-wrap gap-2">
            {/* Retry */}
            {onRetry && errorInfo.canRetry && (
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ember-500 text-white rounded-lg hover:bg-ember-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                <ArrowPathIcon className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
                {isRetrying ? t.common.saving : t.errors.tryAgain}
              </button>
            )}

            {/* Save Draft */}
            {onSaveDraft && errorInfo.canSaveDraft && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary border border-hairline rounded-lg hover:bg-cream-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px]"
              >
                <DocumentArrowDownIcon className={`w-4 h-4 ${isSavingDraft ? 'animate-bounce' : ''}`} />
                {isSavingDraft ? t.common.saving : t.errors.saveDraft}
              </button>
            )}

            {/* Contact Support */}
            {onContactSupport && (
              <button
                type="button"
                onClick={onContactSupport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-latte border border-hairline rounded-lg hover:bg-cream-2 hover:text-primary transition-colors min-h-[44px]"
              >
                <ChatBubbleLeftIcon className="w-4 h-4" />
                {t.errors.contactSupport}
              </button>
            )}

            {/* Custom Actions */}
            {customActions?.map((action, index) => {
              const variantStyles = {
                primary: 'bg-primary text-white hover:bg-hover',
                secondary: 'bg-cream-2 text-primary hover:bg-cream-3',
                danger: 'bg-ember-500 text-white hover:bg-ember-600'
              };

              return (
                <button
                  key={index}
                  type="button"
                  onClick={action.action}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
                    variantStyles[action.variant || 'secondary']
                  }`}
                >
                  {action.icon}
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Error boundary component
 */
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  // Explicit declarations required for this tsconfig (useDefineForClassFields: false + ES2022 target)
  state: ErrorBoundaryState;
  props: ErrorBoundaryProps;
  setState: React.Component<ErrorBoundaryProps, ErrorBoundaryState>['setState'];

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('React Error Boundary caught error', { error, errorInfo }, 'error-boundary');
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback;

      if (Fallback) {
        return <Fallback error={this.state.error} resetError={this.resetError} />;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <ErrorRecovery
              error={this.state.error}
              onRetry={this.resetError}
              showDetails={true}
            />
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorRecovery;