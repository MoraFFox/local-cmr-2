import React from 'react';

interface NavigationButtonsProps {
    currentStep: number;
    onPrev: () => void;
    onNext: () => void;
    isNextDisabled?: boolean;
    isLastStep?: boolean;
    isLoading?: boolean;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({ currentStep, onPrev, onNext, isNextDisabled, isLastStep, isLoading }) => {
    return (
        <div className={`flex items-center ${currentStep > 1 ? 'justify-between' : 'justify-end'}`}>
            {currentStep > 1 && (
                <button
                    onClick={onPrev}
                    disabled={isLoading}
                    className="text-slate-600 dark:text-slate-300 font-medium py-3 px-4 rounded-lg hover:text-slate-900 dark:hover:text-white transition-colors disabled:opacity-50 transform active:scale-95"
                    aria-label="Go to previous step"
                >
                    Back
                </button>
            )}

            <button
                onClick={onNext}
                disabled={isNextDisabled || isLoading}
                className="bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-semibold py-3 px-10 rounded-lg hover:bg-slate-900 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                aria-label={isLastStep ? 'Submit form' : 'Go to next step'}
            >
                {isLoading ? 'Submitting...' : isLastStep ? 'Submit' : 'Next'}
            </button>
        </div>
    );
};

export default NavigationButtons;