/**
 * RequiredFieldBadge Component
 *
 * Visual indicator for required form fields with clear accessibility
 *
 * @example
 * ```tsx
 * <label>
 *   Company Name
 *   <RequiredFieldBadge />
 * </label>
 * ```
 */

import React from 'react';

interface RequiredFieldBadgeProps {
  /** Custom text instead of asterisk */
  text?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show full word "Required" instead of asterisk */
  showWord?: boolean;
  /** Position relative to label */
  position?: 'inline' | 'top-right';
}

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

export const RequiredFieldBadge: React.FC<RequiredFieldBadgeProps> = ({
  text,
  size = 'md',
  showWord = false,
  position = 'inline'
}) => {
  const styles = sizeStyles[size];

  if (showWord) {
    return (
      <span
        className={`${styles.badge} font-bold text-primary bg-primary/10 rounded-md border border-primary/30 inline-flex items-center ml-2`}
        aria-label="Required field"
      >
        {text || 'مطلوب'}
      </span>
    );
  }

  return (
    <span
      className={`${styles.asterisk} font-bold text-ember-500 ml-1`}
      aria-label="Required field"
      title="This field is required / هذا الحقل مطلوب"
    >
      {text || '*'}
    </span>
  );
};

/**
 * Required field indicator with icon (more visible)
 */
interface RequiredFieldIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

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
interface RequiredFieldWrapperProps {
  isRequired: boolean;
  children: React.ReactNode;
  className?: string;
}

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