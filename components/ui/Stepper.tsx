import React from 'react';
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
  return (
    <nav aria-label="Progress">
      <ol className="space-y-0">
        {steps.map((step, index) => {
          const isCurrent = currentStep === step.id;
          const isCompleted = completedSteps.includes(step.id) || currentStep > step.id;
          const isLast = index === steps.length - 1;

          return (
            <li key={step.id} className="relative">
              {!isLast && (
                <div
                  className={`absolute top-8 right-4 w-0.5 h-full ${
                    isCompleted ? 'bg-lava-500' : 'bg-sea'
                  }`}
                  aria-hidden="true"
                />
              )}
              <button
                type="button"
                onClick={() => onChange?.(step.id)}
                disabled={!onChange}
                className={`relative z-10 flex items-start gap-3 w-full text-right py-3 pr-2 transition-colors ${
                  onChange ? 'cursor-pointer hover:bg-sea/30 rounded-lg' : 'cursor-default'
                }`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isCurrent
                      ? 'border-lava-500 bg-lava-500 text-onyx'
                      : isCompleted
                      ? 'border-lava-500 bg-lava-500 text-onyx'
                      : 'border-sea bg-deep text-sage'
                  }`}
                >
                  {isCompleted ? (
                    <CheckIcon className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-semibold">{index + 1}</span>
                  )}
                </span>
                <div className="flex-1 pt-0.5">
                  <p
                    className={`text-sm font-semibold ${
                      isCurrent ? 'text-onyx' : isCompleted ? 'text-onyx' : 'text-sage'
                    }`}
                  >
                    {step.name}
                  </p>
                  {isCurrent && (
                    <p className="text-xs text-sage mt-0.5">الخطوة الحالية</p>
                  )}
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

export default Stepper;
