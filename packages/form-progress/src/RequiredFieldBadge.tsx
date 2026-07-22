/**
 * RequiredFieldBadge Component
 *
 * Visual indicator for required form fields with clear accessibility.
 * Arabic-first with overridable translations.
 *
 * @example
 * ```tsx
 * import { RequiredFieldBadge } from '@local/form-progress';
 *
 * <label>
 *   Company Name
 *   <RequiredFieldBadge />
 * </label>
 * ```
 */

import React from 'react';
import { defaultArabicTranslations, RequiredFieldTranslations } from './translations';
import {
  RequiredFieldBadgeProps,
  RequiredFieldIconProps,
  RequiredFieldWrapperProps,
} from './types';

const sizeStyles = {
  sm: {
    badge: 'text-[10px] px-1 py-0.5',
    asterisk: 'text-xs',
    word: 'text-[10px]'
  },
  md: {
    badge: 'text-xs px-1.5 py-0.5',
    asterisk: 'text-sm',
    word: 'text-xs'
  },
  lg: {
    badge: 'text-sm px-2 py-1',
    asterisk: 'text-base',
    word: 'text-sm'
  }
};

export interface RequiredFieldBadgeComponentProps extends RequiredFieldBadgeProps {
  /** Partial or full translation overrides. */
  translations?: Partial<RequiredFieldTranslations>;
}

export const RequiredFieldBadge: React.FC<RequiredFieldBadgeComponentProps> = ({
  text,
  size = 'md',
  showWord = false,
  className,
  translations: translationsProp,
}) => {
  const t = { ...defaultArabicTranslations.requiredField, ...translationsProp };
  const styles = sizeStyles[size];

  const mergedClassName = className || '';

  if (showWord) {
    return (
      <span
        className={`${styles.badge} font-bold text-primary bg-primary/10 rounded-md border border-primary/30 inline-flex items-center ml-2 ${mergedClassName}`}
        aria-label={t.requiredField}
      >
        {text || t.required}
      </span>
    );
  }

  return (
    <span
      className={`${styles.asterisk} font-bold text-ember-500 ml-1 ${mergedClassName}`}
      aria-label={t.requiredField}
      title={t.requiredFieldTitle}
    >
      {text || '*'}
    </span>
  );
};

/**
 * Required field indicator with icon (more visible)
 */
export const RequiredFieldIcon: React.FC<RequiredFieldIconProps> = ({
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  return (
    <svg
      className={`${sizeClasses[size]} text-ember-500 ${className}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
        clipRule="evenodd"
      />
    </svg>
  );
};

/**
 * Required field wrapper component
 * Adds visual styling to required field containers
 */
export const RequiredFieldWrapper: React.FC<RequiredFieldWrapperProps> = ({
  isRequired,
  children,
  className = ''
}) => {
  if (!isRequired) {
    return <>{children}</>;
  }

  return (
    <div className={`required-field-container ${className}`}>
      {children}
      <style>{`
        .required-field-container {
          position: relative;
        }
        .required-field-container::after {
          content: '';
          position: absolute;
          left: -3px;
          top: 0;
          bottom: 0;
          width: 3px;
          background: linear-gradient(to bottom, #ef4444, #dc2626);
          border-radius: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .required-field-container::after {
            background: #ef4444;
          }
        }
      `}</style>
    </div>
  );
};

export default RequiredFieldBadge;
