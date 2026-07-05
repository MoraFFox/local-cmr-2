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
    const currentIndex = steps.findIndex((s) => s.id === currentStep);
    const progress = steps.length > 1 ? (currentIndex / (steps.length - 1)) * 100 : 0;

    return (
        <div className="w-full">
            {/* Desktop horizontal stepper */}
            <div className="hidden sm:block overflow-x-auto pb-4 -mb-4">
                <ol className="flex items-start min-w-max">
                    {steps.map((step, index) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;

                        return (
                            <React.Fragment key={step.id}>
                                <li className="relative flex flex-col items-center justify-start w-20 md:w-28">
                                    <div
                                        className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition-all duration-300 z-10 ${
                                            isCurrent ? 'border-success-500 bg-white dark:bg-slate-800 scale-110' :
                                            isCompleted ? 'border-success-500 bg-success-500' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                        }`}
                                        aria-current={isCurrent ? 'step' : undefined}
                                    >
                                        {isCompleted ? (
                                            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : isCurrent ? (
                                            <span className="h-2.5 w-2.5 rounded-full bg-success-500" />
                                        ) : null}
                                    </div>
                                    <p className={`mt-2 text-xs text-center transition-all duration-300 ${isCurrent ? 'font-bold text-success-700 dark:text-success-400' : 'font-medium text-slate-500 dark:text-slate-400'}`}>
                                        {step.name}
                                    </p>
                                </li>
                                {index < steps.length - 1 && (
                                    <div className="relative flex-auto mt-4 h-0.5 bg-slate-200 dark:bg-slate-700">
                                        <div className={`absolute top-0 left-0 h-full bg-success-500 transition-all duration-500 ease-in-out ${isCompleted ? 'w-full' : 'w-0'}`} />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </ol>
            </div>

            {/* Mobile compact sticky-style progress */}
            <div className="sm:hidden mb-6">
                <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                        {steps[currentIndex]?.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                        {currentIndex + 1} / {steps.length}
                    </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-success-500 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default StepIndicator;