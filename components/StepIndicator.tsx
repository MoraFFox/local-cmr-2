import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

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
                <ol className="flex items-center min-w-max">
                    {steps.map((step, index) => {
                        const isCompleted = currentStep > step.id;
                        const isCurrent = currentStep === step.id;
                        const isFuture = !isCurrent && !isCompleted;

                        return (
                            <React.Fragment key={step.id}>
                                {/* Step node */}
                                <li className="relative flex flex-col items-center w-20 md:w-28">
                                    {/* Circle indicator */}
                                    <div className="relative">
                                        {/* Glow ring for active/completed */}
                                        {(isCurrent || isCompleted) && (
                                            <span
                                                className={`absolute -inset-1.5 rounded-full animate-pulse-glow ${
                                                    isCurrent ? 'bg-lava-500/15' : 'bg-lava-500/10'
                                                }`}
                                            />
                                        )}

                                        <div
                                            className={`relative flex items-center justify-center h-9 w-9 rounded-full border-2 transition-all duration-300 z-10 ${
                                                isCurrent
                                                    ? 'border-lava-500 bg-lava-500 text-onyx shadow-[0_0_14px_rgba(230,57,35,0.35)] scale-110'
                                                    : isCompleted
                                                    ? 'border-lava-500 bg-lava-500 text-onyx shadow-[0_0_10px_rgba(230,57,35,0.25)]'
                                                    : 'border-sea/50 bg-deep text-sage'
                                            }`}
                                            aria-current={isCurrent ? 'step' : undefined}
                                        >
                                            {isCompleted ? (
                                                <CheckIcon className="w-4 h-4 animate-pop-in" />
                                            ) : isCurrent ? (
                                                <span className="w-6 h-6 rounded-full bg-lava-500/20 flex items-center justify-center">
                                                    <span className="w-2.5 h-2.5 rounded-full bg-onyx" />
                                                </span>
                                            ) : (
                                                <span className="text-sm font-bold text-sage/60">
                                                    {index + 1}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Label */}
                                    <p
                                        className={`mt-2 text-xs text-center transition-all duration-300 px-1 ${
                                            isCurrent
                                                ? 'font-bold text-onyx'
                                                : isCompleted
                                                ? 'font-semibold text-onyx/80'
                                                : 'font-medium text-sage/50'
                                        }`}
                                    >
                                        {step.name}
                                    </p>
                                </li>

                                {/* Connector line between steps */}
                                {index < steps.length - 1 && (
                                    <div className="relative flex-1 mx-1 md:mx-2">
                                        <div className="h-[3px] w-full bg-sea/40 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                    isCompleted
                                                        ? 'bg-gradient-to-r from-lava-500 to-lava-400'
                                                        : 'bg-lava-500/0'
                                                }`}
                                                style={{
                                                    width: isCompleted ? '100%' : '0%',
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </ol>
            </div>

            {/* Mobile compact progress bar */}
            <div className="sm:hidden mb-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-lava-500 text-onyx text-xs font-bold">
                            {currentIndex + 1}
                        </span>
                        <span className="text-sm font-bold text-onyx">
                            {steps[currentIndex]?.name}
                        </span>
                    </div>
                    <span className="text-xs text-sage font-mono">
                        {currentIndex + 1}/{steps.length}
                    </span>
                </div>
                <div className="h-2 w-full bg-sea/40 rounded-full overflow-hidden shadow-inner">
                    <div
                        className="h-full bg-gradient-to-l from-lava-500 to-lava-400 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                        style={{ width: `${progress}%` }}
                    >
                        {/* Shimmer overlay */}
                        <div className="absolute inset-0 bg-white/10 animate-shimmer-sweep" />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StepIndicator;