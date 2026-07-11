import React from 'react';
import { ar } from '../utils/arabicTranslations';

interface PayerSegmentedControlProps {
  paidByClient: boolean;
  onChange: (paidByClient: boolean) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

const PayerSegmentedControl: React.FC<PayerSegmentedControlProps> = ({
  paidByClient,
  onChange,
  size = 'md',
  disabled = false,
}) => {
  const sizeClasses = {
    sm: 'text-xs py-1 px-3',
    md: 'text-sm py-2 px-4',
  };

  const handleMidosClick = () => {
    if (!disabled && paidByClient) {
      onChange(false);
    }
  };

  const handleClientClick = () => {
    if (!disabled && !paidByClient) {
      onChange(true);
    }
  };

  return (
    <div
      role="radiogroup"
      className={`inline-flex rounded-xl bg-chrome p-1 border border-espresso-light ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={!paidByClient}
        onClick={handleMidosClick}
        disabled={disabled}
        className={`rounded-lg transition-all duration-300 font-bold tracking-wide ${sizeClasses[size]} ${
          !paidByClient
            ? 'bg-brand-red/20 text-brand-red-400 shadow-[0_0_15px_rgba(184,115,51,0.3)] border border-brand-red/50'
            : 'bg-transparent text-secondary hover:text-cream'
        }`}
      >
        {ar.payerFirstUI.midosPays}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={paidByClient}
        onClick={handleClientClick}
        disabled={disabled}
        className={`rounded-lg transition-all duration-300 font-bold tracking-wide ${sizeClasses[size]} ${
          paidByClient
            ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-500/50'
            : 'bg-transparent text-secondary hover:text-cream'
        }`}
      >
        {ar.payerFirstUI.clientPays}
      </button>
    </div>
  );
};

export default PayerSegmentedControl;
