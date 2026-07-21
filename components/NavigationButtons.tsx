import React from 'react';
import Button from './ui/Button';

interface NavigationButtonsProps {
  currentStep: number;
  onPrev: () => void;
  onNext: () => void;
  isNextDisabled?: boolean;
  isLastStep?: boolean;
  isLoading?: boolean;
}

const NavigationButtons: React.FC<NavigationButtonsProps> = ({
  currentStep,
  onPrev,
  onNext,
  isNextDisabled,
  isLastStep,
  isLoading,
}) => {
  return (
    <div className={`flex items-center ${currentStep > 1 ? 'justify-between' : 'justify-end'}`}>
      {currentStep > 1 && (
        <Button variant="ghost" onClick={onPrev} disabled={isLoading}>
          السابق
        </Button>
      )}
      <Button onClick={onNext} disabled={isNextDisabled || isLoading} isLoading={isLoading}>
        {isLastStep ? 'إنشاء الشركة' : 'التالي'}
      </Button>
    </div>
  );
};

export default NavigationButtons;
