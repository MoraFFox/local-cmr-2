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
      className={`inline-flex rounded-xl bg-cream-2 p-1 border border-hairline ${
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
            ? 'bg-primary/15 text-primary dark:text-copper-300 shadow-sm border border-primary/40'
            : 'bg-transparent text-latte hover:text-text'
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
            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-sm border border-amber-500/40'
            : 'bg-transparent text-latte hover:text-text'
        }`}
      >
        {ar.payerFirstUI.clientPays}
      </button>
    </div>
  );
};

export default PayerSegmentedControl;
