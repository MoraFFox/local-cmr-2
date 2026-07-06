import React, { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

export interface StepperStep {
  id: number;
  name: string;
}

interface StepperProps {
  steps: StepperStep[];
  currentStep: number;
  onChange?: (stepId: number) => void;
  completedSteps?: number[];
  layout?: 'vertical' | 'horizontal';
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onChange, completedSteps = [], layout = 'vertical' }) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const isClickable = !!onChange;

  if (layout === 'horizontal') {
    return (
      <nav aria-label="Progress">
        <ol className="flex items-start w-full overflow-x-auto custom-scrollbar pb-2 pt-1 px-1">
          {steps.map((step, index) => {
            const isCurrent = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
            const isFuture = !isCurrent && !isCompleted;
            const isLast = index === steps.length - 1;
            
            return (
              <li key={step.id} className={`relative shrink-0 flex flex-col items-center ${isLast ? 'w-20' : 'w-28'}`}>
                {/* Connector line */}
                {!isLast && (
                  <div 
                    className="absolute top-4 left-0 w-full h-[3px] -translate-x-1/2 z-0 overflow-hidden rounded-full" 
                    aria-hidden="true"
                  >
                    <div className="absolute inset-0 bg-hairline/40" />
                    <div
                      className={`absolute inset-0 transition-all duration-700 ease-in-out ${
                        isCompleted ? 'bg-gradient-to-l from-copper-500 to-copper-400' : 'bg-copper-500/0'
                      }`}
                      style={{
                        transformOrigin: 'right',
                        transform: isCompleted ? 'scaleX(1)' : 'scaleX(0)',
                      }}
                    />
                  </div>
                )}
                
                <button
                  type="button"
                  onClick={() => {
                    if (isClickable && !isFuture) onChange?.(step.id);
                  }}
                  disabled={!isClickable || isFuture}
                  className={`relative z-10 flex flex-col items-center group outline-none ${
                    !isClickable ? 'cursor-default' : isFuture ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                  }`}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-disabled={isFuture}
                >
                  {/* Step circle */}
                  <span className="relative flex-shrink-0 mb-2">
                    {/* Active/Completed background glow */}
                    {(isCurrent || isCompleted) && (
                      <span className={`absolute -inset-2 rounded-full transition-all duration-500 ${
                        isCurrent ? 'bg-copper-500/20 animate-pulse-glow' : 'bg-leaf-500/10 group-hover:bg-leaf-500/20'
                      }`} />
                    )}
                    
                    {/* Hover focus ring */}
                    {!isFuture && isClickable && !isCurrent && (
                      <span className="absolute -inset-1 rounded-full bg-cream-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}

                    <span className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isCurrent
                        ? 'border-copper-500 bg-copper-500 shadow-[0_0_12px_rgba(184,115,51,0.4)] scale-110'
                        : isCompleted
                        ? 'border-leaf-500 bg-leaf-500 text-white shadow-sm group-hover:shadow-md group-hover:scale-105'
                        : 'border-hairline bg-cream-2 group-hover:border-copper-500/40 group-hover:bg-cream-3'
                    }`}>
                      {isCompleted ? (
                        <CheckIcon className="h-5 w-5 text-white animate-pop-in" aria-hidden="true" />
                      ) : (
                        <span className={`text-xs font-bold transition-colors ${
                          isCurrent ? 'text-white' : 'text-latte/70 group-hover:text-ink'
                        }`}>
                          {index + 1}
                        </span>
                      )}
                    </span>
                  </span>
                  
                  {/* Label under circle */}
                  <span className={`text-[11px] font-semibold text-center leading-tight truncate px-1 transition-all duration-300 ${
                    isCurrent 
                      ? 'text-copper-700 dark:text-copper-400 font-bold scale-105' 
                      : isCompleted 
                      ? 'text-ink/90 group-hover:text-ink' 
                      : 'text-latte/70 group-hover:text-ink/80'
                  }`}>
                    {step.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    );
  }

  // Default Vertical Layout
  return (
    <nav aria-label="Progress">
      <ol className="space-y-1">
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
          const isFuture = !isCurrent && !isCompleted;
          const isLast = index === steps.length - 1;
          const isHovered = hoveredStep === step.id;

          return (
            <li key={step.id} className="relative group">
              {/* Connector line */}
              {!isLast && (
                <div className="absolute top-8 right-[15px] w-[3px] h-[calc(100%_-_8px)] overflow-hidden rounded-full" aria-hidden="true">
                  {/* Background track */}
                  <div className="absolute inset-0 bg-hairline/40 rounded-full" />
                  {/* Animated fill */}
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-700 ease-out ${
                      isCompleted
                        ? 'bg-gradient-to-b from-copper-500 to-copper-400'
                        : 'bg-copper-500/0'
                    }`}
                    style={{
                      transformOrigin: 'top',
                      transform: isCompleted ? 'scaleY(1)' : 'scaleY(0)',
                    }}
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (isClickable && !isFuture) onChange?.(step.id);
                }}
                disabled={!isClickable}
                onMouseEnter={() => setHoveredStep(step.id)}
                onMouseLeave={() => setHoveredStep(null)}
                className={`relative z-10 flex items-start gap-3 w-full text-right py-2.5 pr-2 rounded-xl transition-all duration-200 ${
                  !isClickable
                    ? 'cursor-default'
                    : isFuture
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer'
                } ${
                  isHovered && isClickable && !isFuture
                    ? 'bg-cream-2 shadow-sm'
                    : ''
                }`}
                aria-current={isCurrent ? 'step' : undefined}
                aria-disabled={isFuture}
              >
                {/* Step circle indicator */}
                <span className="relative flex-shrink-0">
                  {/* Outer glow ring for current/completed */}
                  {(isCurrent || isCompleted) && (
                    <span
                      className={`absolute -inset-1.5 rounded-full animate-pulse-glow ${
                        isCurrent
                          ? 'bg-copper-500/20'
                          : 'bg-leaf-500/10'
                      }`}
                    />
                  )}

                  <span
                    className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                      isCurrent
                        ? 'border-copper-500 bg-copper-500 shadow-[0_0_12px_rgba(184,115,51,0.3)]'
                        : isCompleted
                        ? 'border-leaf-500 bg-leaf-500 text-white shadow-sm'
                        : 'border-hairline bg-cream-2'
                    } ${
                      isHovered && isClickable && !isCurrent && !isCompleted
                        ? 'border-copper-500/50 bg-cream-3'
                        : ''
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon
                        className="h-5 w-5 text-white animate-pop-in"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className={`text-xs font-semibold ${
                          isCurrent ? 'text-white' : 'text-latte/70'
                        } ${
                          isHovered && isClickable && !isCurrent ? 'text-ink' : ''
                        } ${
                          isCurrent ? 'scale-110' : ''
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </span>
                </span>

                {/* Step label */}
                <div className="flex-1 pt-1 min-w-0">
                  <p
                    className={`text-sm font-semibold truncate transition-all duration-200 ${
                      isCurrent
                        ? 'text-ink'
                        : isCompleted
                        ? 'text-ink/90'
                        : 'text-latte/70'
                    }`}
                  >
                    {step.name}
                  </p>
                  {isCurrent && (
                    <p className="text-[11px] text-copper-600/80 dark:text-copper-400 mt-0.5 font-medium flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-copper-500 animate-pulse" />
                      الخطوة الحالية
                    </p>
                  )}
                  {isCompleted && (
                    <p className="text-[11px] text-leaf-500/70 mt-0.5 font-medium">
                      ✓ تم الإكمال
                    </p>
                  )}
                </div>

                {/* Step number badge */}
                {!isCurrent && !isCompleted && (
                  <span className="text-[10px] text-latte/40 font-mono mt-1.5 ml-1">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;
