/**
 * ValidationSummary Component
 *
 * Shows all form validation errors in a summary list
 * Allows users to jump to specific error fields
 *
 * @example
 * ```tsx
 * <ValidationSummary
 *   errors={validation.allErrors}
 *   onJumpToError={validation.focusNextError}
 *   isVisible={validation.hasErrors}
 * />
 * ```
 */

import React from 'react';
import { ExclamationCircleIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useT } from '../../utils/i18n';

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationSummaryProps {
  /** Array of validation errors */
  errors: ValidationError[];
  /** Callback to jump to specific error */
  onJumpToError?: (fieldName: string) => void;
  /** Whether to show the summary */
  isVisible?: boolean;
  /** Display title */
  title?: string;
  /** Compact mode */
  compact?: boolean;
  /** Show "Fix All" button */
  showFixAllButton?: boolean;
  /** onFixAll callback */
  onFixAll?: () => void;
}

/**
 * Convert field name to readable label
 */
function getFieldLabel(fieldName: string, t: ReturnType<typeof useT>): string {
  return fieldName
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^./, char => char.toUpperCase());
}

/**
 * Group errors by section (for complex forms)
 */
function groupErrorsBySection(errors: ValidationError[]): Record<string, ValidationError[]> {
  const grouped: Record<string, ValidationError[]> = {};

  errors.forEach(error => {
    const section = error.field.split('.')[0] || 'general';
    if (!grouped[section]) {
      grouped[section] = [];
    }
    grouped[section].push(error);
  });

  return grouped;
}

export const ValidationSummary: React.FC<ValidationSummaryProps> = ({
  errors,
  onJumpToError,
  isVisible = true,
  title,
  compact = false,
  showFixAllButton = false,
  onFixAll
}) => {
  if (!isVisible || errors.length === 0) return null;

  const t = useT();
  const groupedErrors = groupErrorsBySection(errors);
  const errorCount = errors.length;
  const sectionCount = Object.keys(groupedErrors).length;

  return (
    <div
      className="bg-ember-50 dark:bg-ember-500/10 border border-ember-500/30 rounded-xl p-4 animate-fade-in"
      role="alert"
      aria-live="assertive"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-ember-500/20 rounded-lg flex-shrink-0">
          <ExclamationCircleIcon className="w-5 h-5 text-ember-700 dark:text-ember-300" />
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-ember-700 dark:text-ember-300">
            {title || t.ui.formProgress.pleaseFixErrors.replace('{{count}}', String(errorCount))}
          </h3>
          <p className="text-sm text-ember-700/70 dark:text-ember-300/80 mt-1">
            {sectionCount > 1
              ? t.ui.formProgress.errorsInSections.replace('{{count}}', String(sectionCount))
              : t.ui.formProgress.someFieldsNeedAttention}
          </p>
        </div>

        {showFixAllButton && onFixAll && (
          <button
            type="button"
            onClick={onFixAll}
            className="px-3 py-1.5 text-sm font-medium bg-ember-500 text-white rounded-lg hover:bg-ember-600 transition-colors flex-shrink-0"
          >
            {t.common.fixAll}
          </button>
        )}
      </div>

      {/* Error List */}
      <div className="space-y-2">
        {Object.entries(groupedErrors).map(([section, sectionErrors]) => (
          <div key={section}>
            {/* Section header (if multiple sections) */}
            {sectionCount > 1 && (
              <h4 className="text-xs font-bold text-ember-700/60 dark:text-ember-300/70 uppercase tracking-wider mt-3 mb-2 first:mt-0">
                {getFieldLabel(section, t)}
              </h4>
            )}

            {/* Errors in section */}
            {sectionErrors.map(error => (
              <button
                key={error.field}
                type="button"
                onClick={() => onJumpToError?.(error.field)}
                className="w-full text-left p-2 rounded-lg hover:bg-ember-500/10 transition-colors group"
              >
                <div className="flex items-start gap-2">
                  <ChevronRightIcon className="w-4 h-4 text-ember-500/50 mt-0.5 group-hover:text-ember-700 dark:group-hover:text-ember-300 transition-colors" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ember-700 dark:text-ember-300">
                      {getFieldLabel(error.field, t)}
                    </p>
                    {!compact && (
                      <p className="text-xs text-ember-700/60 dark:text-ember-300/70 mt-0.5">
                        {error.message}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-ember-500/20">
        <p className="text-xs text-ember-700/50 dark:text-ember-300/60">
          {t.common.clickErrorToJump}
        </p>
      </div>
    </div>
  );
};

/**
 * Compact validation badge (for form headers)
 */
interface ValidationBadgeProps {
  errorCount: number;
  onClick?: () => void;
}

export const ValidationBadge: React.FC<ValidationBadgeProps> = ({
  errorCount,
  onClick
}) => {
  if (errorCount === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 px-2.5 py-1 bg-ember-500 text-white rounded-full text-xs font-medium hover:bg-ember-600 transition-colors"
      aria-label={`${errorCount} errors - click to view`}
    >
      <ExclamationCircleIcon className="w-3.5 h-3.5" />
      <span>{errorCount}</span>
    </button>
  );
};

/**
 * Inline validation message (for individual fields)
 */
interface InlineValidationMessageProps {
  message: string;
  type?: 'error' | 'warning' | 'success';
  showIcon?: boolean;
}

const typeConfig = {
  error: {
    container: 'text-ember-500',
    icon: 'text-ember-500'
  },
  warning: {
    container: 'text-amber-500',
    icon: 'text-amber-500'
  },
  success: {
    container: 'text-emerald-500',
    icon: 'text-emerald-500'
  }
};

export const InlineValidationMessage: React.FC<InlineValidationMessageProps> = ({
  message,
  type = 'error',
  showIcon = true
}) => {
  const config = typeConfig[type];

  return (
    <p className={`mt-1.5 text-sm ${config.container} flex items-center gap-1.5 animate-fade-in`}>
      {showIcon && (
        <svg className={`w-4 h-4 flex-shrink-0 ${config.icon}`} fill="currentColor" viewBox="0 0 20 20">
          {type === 'success' ? (
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          ) : (
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          )}
        </svg>
      )}
      <span>{message}</span>
    </p>
  );
};

/**
 * Error ring component (wraps fields with error)
 */
interface ErrorRingProps {
  hasError: boolean;
  children: React.ReactNode;
  pulse?: boolean;
}

export const ErrorRing: React.FC<ErrorRingProps> = ({
  hasError,
  children,
  pulse = true
}) => {
  if (!hasError) return <>{children}</>;

  return (
    <div className="relative">
      <div className={`absolute inset-0 rounded-lg bg-ember-500/20 ${pulse ? 'animate-pulse' : ''} -m-1`} />
      {children}
    </div>
  );
};

export default ValidationSummary;