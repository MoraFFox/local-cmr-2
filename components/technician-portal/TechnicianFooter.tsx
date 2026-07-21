import React from 'react';
import { ArrowLeftIcon, ArrowRightIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ar } from '../../utils/arabicTranslations';
import TechButton from './ui/TechButton';

interface TechnicianFooterProps {
  currentStep: 1 | 2 | 3;
  canProceed: boolean;
  isSubmitting: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  validationError?: string | null;
}

const TechnicianFooter: React.FC<TechnicianFooterProps> = ({
  currentStep,
  canProceed,
  isSubmitting,
  onBack,
  onNext,
  onSubmit,
  validationError,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-gradient-to-t from-espresso via-espresso/95 to-transparent pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-2xl mx-auto space-y-3">

        {/* Validation Error Banner */}
        {validationError && (
            <div className="animate-in slide-in-from-bottom-2 fade-in bg-ember-500/10 border border-ember-500/50 rounded-xl p-3 flex items-center gap-3 backdrop-blur-sm">
                <ExclamationTriangleIcon className="w-5 h-5 text-ember-300 shrink-0" />
                <span className="text-sm font-bold text-ember-300">{validationError}</span>
            </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
            {currentStep > 1 && (
                <TechButton 
                    variant="secondary" 
                    onClick={onBack} 
                    className="flex-1 max-w-[120px]"
                >
                    <ArrowRightIcon className="w-5 h-5" />
                    {ar.common.back}
                </TechButton>
            )}

            {currentStep < 3 ? (
                 <TechButton 
                    variant="primary" 
                    onClick={onNext} 
                    disabled={!canProceed}
                    className="flex-1"
                >
                    {ar.common.next}
                    <ArrowLeftIcon className="w-5 h-5" />
                </TechButton>
            ) : (
                <TechButton 
                    variant="primary" 
                    onClick={onSubmit} 
                    disabled={isSubmitting || !canProceed}
                    className={`flex-1 ${isSubmitting ? 'opacity-80' : ''}`}
                >
                    {isSubmitting ? (
                         <div className="flex items-center gap-2">
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                             <span>{ar.step4.submitting}</span>
                         </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5" />
                            <span>{ar.common.submit}</span>
                        </div>
                    )}
                </TechButton>
            )}
        </div>
      </div>
    </div>
  );
};

export default TechnicianFooter;
