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
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep, onChange, completedSteps = [] }) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const isClickable = !!onChange;

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
                  <div className="absolute inset-0 bg-sea/40 rounded-full" />
                  {/* Animated fill */}
                  <div
                    className={`absolute inset-0 rounded-full transition-all duration-700 ease-out ${
                      isCompleted
                        ? 'bg-gradient-to-b from-lava-500 to-lava-400'
                        : 'bg-lava-500/0'
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
                    ? 'bg-sea/20 shadow-sm'
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
                        isCurrent ? 'bg-lava-500/15' : 'bg-lava-500/10'
                      }`}
                    />
                  )}

                  <span
                    className={`relative flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-300 ${
                      isCurrent
                        ? 'border-lava-500 bg-lava-500 text-onyx shadow-[0_0_14px_rgba(230,57,35,0.35)] scale-110'
                        : isCompleted
                        ? 'border-lava-500 bg-lava-500 text-onyx shadow-[0_0_10px_rgba(230,57,35,0.25)]'
                        : 'border-sea/60 bg-deep text-sage'
                    } ${isHovered && !isFuture ? 'scale-105' : ''}`}
                  >
                    {isCompleted ? (
                      <CheckIcon className="w-4 h-4 animate-pop-in" />
                    ) : (
                      <span
                        className={`text-sm font-bold transition-all duration-200 ${
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
                        ? 'text-onyx'
                        : isCompleted
                        ? 'text-onyx/90'
                        : 'text-sage/70'
                    }`}
                  >
                    {step.name}
                  </p>
                  {isCurrent && (
                    <p className="text-[11px] text-lava-400/80 mt-0.5 font-medium flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-lava-500 animate-pulse" />
                      الخطوة الحالية
                    </p>
                  )}
                  {isCompleted && (
                    <p className="text-[11px] text-success-500/70 mt-0.5 font-medium">
                      ✓ تم الإكمال
                    </p>
                  )}
                </div>

                {/* Step number badge */}
                {!isCurrent && !isCompleted && (
                  <span className="text-[10px] text-sage/40 font-mono mt-1.5 ml-1">
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
