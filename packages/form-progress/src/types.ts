import type { ReactNode } from 'react';

/**
 * Shared types for the form-progress package.
 */

export interface FormSection {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
}

export interface FormProgressProps {
  /** All form sections */
  sections: FormSection[];
  /** Completed section IDs */
  completedSections: Set<string> | string[];
  /** Current section ID */
  currentSection: string;
  /** Callback when section clicked */
  onSectionClick?: (sectionId: string) => void;
  /** Callback when user wants to jump to the next incomplete section */
  onJumpToNextIncomplete?: (sectionId: string) => void;
  /** Display variant */
  variant?: 'horizontal' | 'vertical' | 'compact';
  /** Show percentage */
  showPercentage?: boolean;
  /** Show "X of Y completed" */
  showCount?: boolean;
  /** Label for the jump button (defaults to the Arabic translation). */
  jumpButtonLabel?: string;
  /** Optional className for the outer container */
  className?: string;
}

export interface RequiredFieldsProgressProps {
  totalRequired: number;
  completedRequired: number;
  showLabel?: boolean;
  className?: string;
}

export interface RequiredFieldBadgeProps {
  /** Custom text instead of asterisk */
  text?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show full word "Required" instead of asterisk */
  showWord?: boolean;
  className?: string;
}

export interface RequiredFieldIconProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export interface RequiredFieldWrapperProps {
  isRequired: boolean;
  children: ReactNode;
  className?: string;
}
