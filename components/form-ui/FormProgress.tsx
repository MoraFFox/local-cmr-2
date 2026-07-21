/**
 * FormProgress Component
 *
 * Shows completion progress for multi-section forms
 *
 * @example
 * ```tsx
 * <FormProgress
 *   sections={sections}
 *   completedSections={completed}
 *   currentSection={current}
 *   onSectionClick={(section) => setCurrent(section)}
 * />
 * ```
 */

import React from 'react';
import { CheckIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface FormSection {
  id: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
}

interface FormProgressProps {
  /** All form sections */
  sections: FormSection[];
  /** Completed section IDs */
  completedSections: Set<string> | string[];
  /** Current section ID */
  currentSection: string;
  /** Callback when section clicked */
  onSectionClick?: (sectionId: string) => void;
  /** Display variant */
  variant?: 'horizontal' | 'vertical' | 'compact';
  /** Show percentage */
  showPercentage?: boolean;
  /** Show "X of Y completed" */
  showCount?: boolean;
}

export const FormProgress: React.FC<FormProgressProps> = ({
  sections,
  completedSections,
  currentSection,
  onSectionClick,
  variant = 'horizontal',
  showPercentage = true,
  showCount = true
}) => {
  const completedSet = completedSections instanceof Set
    ? completedSections
    : new Set(completedSections);

  const totalSections = sections.length;
  const completedCount = completedSet.size;
  const percentage = Math.round((completedCount / totalSections) * 100);

  /**
   * Get status of a section
   */
  const getSectionStatus = (sectionId: string) => {
    const isCompleted = completedSet.has(sectionId);
    const isCurrent = sectionId === currentSection;
    const section = sections.find(s => s.id === sectionId);
    const isDisabled = section?.disabled || false;

    return { isCompleted, isCurrent, isDisabled };
  };

  /**
   * Handle section click
   */
  const handleSectionClick = (sectionId: string) => {
    const { isDisabled } = getSectionStatus(sectionId);
    if (!isDisabled && onSectionClick) {
      onSectionClick(sectionId);
    }
  };

  // Compact variant (just a progress bar)
  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-latte font-medium">
            {showCount && `${completedCount} of ${totalSections} completed`}
          </span>
          {showPercentage && (
            <span className="text-primary font-bold">{percentage}%</span>
          )}
        </div>

        <div className="h-2 bg-hairline rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-copper-400 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  // Horizontal variant (stepper-like)
  if (variant === 'horizontal') {
    return (
      <div className="w-full">
        {/* Progress header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-latte uppercase tracking-wider">
            Form Progress
          </h3>
          <div className="flex items-center gap-3 text-xs">
            {showCount && (
              <span className="text-latte">
                {completedCount}/{totalSections} completed
              </span>
            )}
            {showPercentage && (
              <span className="font-bold text-primary">{percentage}%</span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-hairline rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-gradient-to-r from-primary to-copper-400 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Section indicators */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {sections.map((section, index) => {
            const { isCompleted, isCurrent, isDisabled } = getSectionStatus(section.id);

            return (
              <React.Fragment key={section.id}>
                {/* Section button */}
                <button
                  type="button"
                  onClick={() => handleSectionClick(section.id)}
                  disabled={isDisabled}
                  className={`
                    relative flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200 whitespace-nowrap
                    ${isDisabled
                      ? 'opacity-40 cursor-not-allowed border-hairline bg-cream-2'
                      : isCurrent
                        ? 'border-primary bg-primary/10 text-primary shadow-[0_0_0_3px_rgba(184,115,51,0.15)]'
                        : isCompleted
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                          : 'border-hairline bg-cream text-latte hover:border-primary/30 hover:text-primary'
                    }
                  `}
                  aria-label={`${section.label} - ${isCompleted ? 'completed' : isCurrent ? 'current' : 'not started'}`}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {/* Status icon */}
                  <span className="flex items-center justify-center w-5 h-5">
                    {isDisabled ? (
                      <LockClosedIcon className="w-3 h-3" />
                    ) : isCompleted ? (
                      <CheckIcon className="w-3.5 h-3.5" />
                    ) : isCurrent ? (
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-latte/40" />
                    )}
                  </span>

                  {/* Label */}
                  <span className="text-xs font-medium">
                    {section.label}
                    {section.required && <span className="text-ember-500 ml-1">*</span>}
                  </span>

                  {/* Current indicator */}
                  {isCurrent && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                    </span>
                  )}
                </button>

                {/* Connector (not after last item) */}
                {index < sections.length - 1 && (
                  <div className="w-8 h-0.5 bg-hairline relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-emerald-500/50 transition-all duration-300"
                      style={{ width: isCompleted ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical variant (sidebar style)
  return (
    <div className="w-full space-y-4">
      {/* Progress header */}
      <div className="flex items-center justify-between pb-3 border-b border-hairline">
        <h3 className="text-sm font-bold text-latte uppercase tracking-wider">
          Sections
        </h3>
        <div className="flex items-center gap-3 text-xs">
          {showCount && (
            <span className="text-latte">
              {completedCount}/{totalSections}
            </span>
          )}
          {showPercentage && (
            <span className="font-bold text-primary">{percentage}%</span>
          )}
        </div>
      </div>

      {/* Section list */}
      <div className="space-y-1.5">
        {sections.map((section, index) => {
          const { isCompleted, isCurrent, isDisabled } = getSectionStatus(section.id);

          return (
            <button
              key={section.id}
              type="button"
              onClick={() => handleSectionClick(section.id)}
              disabled={isDisabled}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left
                ${isDisabled
                  ? 'opacity-40 cursor-not-allowed bg-cream-2'
                  : isCurrent
                    ? 'bg-primary/10 text-primary border border-primary/30 shadow-sm'
                    : isCompleted
                      ? 'bg-emerald-500/5 text-emerald-700 hover:bg-emerald-500/10'
                      : 'hover:bg-cream-2 text-latte hover:text-primary'
                }
              `}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Step number / icon */}
              <span className={`
                flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0
                ${isDisabled
                  ? 'bg-hairline text-latte/60'
                  : isCompleted
                    ? 'bg-emerald-500 text-white'
                    : isCurrent
                      ? 'bg-primary text-white'
                      : 'bg-hairline text-latte'
                }
              `}>
                {isDisabled ? (
                  <LockClosedIcon className="w-3 h-3" />
                ) : isCompleted ? (
                  <CheckIcon className="w-3.5 h-3.5" />
                ) : (
                  index + 1
                )}
              </span>

              {/* Label */}
              <span className="flex-1 text-sm font-medium">
                {section.label}
                {section.required && <span className="text-ember-500 ml-1">*</span>}
              </span>

              {/* Arrow for current */}
              {isCurrent && (
                <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Progress bar at bottom */}
      <div className="pt-3 border-t border-hairline">
        <div className="h-2 bg-hairline rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-copper-400 transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Required fields progress indicator
 */
interface RequiredFieldsProgressProps {
  totalRequired: number;
  completedRequired: number;
  showLabel?: boolean;
}

export const RequiredFieldsProgress: React.FC<RequiredFieldsProgressProps> = ({
  totalRequired,
  completedRequired,
  showLabel = true
}) => {
  const percentage = totalRequired > 0
    ? Math.round((completedRequired / totalRequired) * 100)
    : 100;

  const isComplete = completedRequired >= totalRequired;

  return (
    <div className="flex items-center gap-2 text-xs">
      {showLabel && (
        <span className="text-latte">
          Required fields: {completedRequired}/{totalRequired}
        </span>
      )}

      <div className="flex-1 h-2 bg-hairline rounded-full overflow-hidden max-w-[100px]">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isComplete
              ? 'bg-emerald-500'
              : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {isComplete ? (
        <CheckIcon className="w-4 h-4 text-emerald-500" />
      ) : (
        <span className="text-latte font-mono">{percentage}%</span>
      )}
    </div>
  );
};

export default FormProgress;