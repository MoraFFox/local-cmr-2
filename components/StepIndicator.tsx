import React from 'react';

interface Step {
    id: number;
    name: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
    return (
        <div className="w-full overflow-x-auto pb-4 -mb-4">
            <ol className="flex items-start min-w-max">
                {steps.map((step, index) => {
                    const isCompleted = currentStep > step.id;
                    const isCurrent = currentStep === step.id;

                    return (
                        <React.Fragment key={step.id}>
                            <li className="relative flex flex-col items-center justify-start w-20 sm:w-24 md:w-28">
                                <div
                                    className={`flex items-center justify-center h-10 w-10 sm:h-8 sm:w-8 rounded-full border-2 transition-all duration-300 z-10 ${
                                        isCurrent ? 'border-teal-500 bg-white dark:bg-slate-700 scale-110' : 
                                        isCompleted ? 'border-teal-500 bg-teal-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700'
                                    }`}
                                    aria-current={isCurrent ? 'step' : undefined}
                                >
                                    {isCompleted ? (
                                        <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : isCurrent ? (
                                        <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
                                    ) : null}
                                </div>
                                <p className={`mt-2 text-xs sm:text-sm text-center transition-all duration-300 ${isCurrent ? 'font-bold text-teal-600 dark:text-teal-400' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                                    {step.name}
                                </p>
                            </li>
                            {index < steps.length - 1 && (
                                <div className="relative flex-auto mt-4 h-0.5 bg-slate-300 dark:bg-slate-600">
                                    <div className={`absolute top-0 left-0 h-full bg-teal-500 transition-all duration-500 ease-in-out ${isCompleted ? 'w-full' : 'w-0'}`} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </ol>
        </div>
    );
};

export default StepIndicator;