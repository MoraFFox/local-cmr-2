import React from 'react';
import Button from './ui/Button';
import { useT } from '../utils/i18n';

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
  const t = useT();
  return (
    <div className={`flex items-center ${currentStep > 1 ? 'justify-between' : 'justify-end'}`}>
      {currentStep > 1 && (
        <Button variant="ghost" onClick={onPrev} disabled={isLoading}>
          {t.common.back}
        </Button>
      )}
      <Button onClick={onNext} disabled={isNextDisabled || isLoading} isLoading={isLoading}>
        {isLastStep ? t.ui.wizard.createCompany : t.common.next}
      </Button>
    </div>
  );
};

export default NavigationButtons;
