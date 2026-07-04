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
      className={`inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={value === "client"}
        role="radio"
        aria-checked={value === "company"}
        onClick={handleMidosClick}
        disabled={disabled}
        className={`rounded-lg transition-all duration-300 font-bold tracking-wide ${sizeClasses[size]} ${
          !paidByClient
            ? 'bg-teal-500/20 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)] border border-teal-500/50'
            : 'bg-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        {ar.payerFirstUI.midosPays}
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "client"}
        role="radio"
        aria-checked={value === "company"}
        onClick={handleClientClick}
        disabled={disabled}
        className={`rounded-lg transition-all duration-300 font-bold tracking-wide ${sizeClasses[size]} ${
          paidByClient
            ? 'bg-amber-500/20 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] border border-amber-500/50'
            : 'bg-transparent text-slate-500 hover:text-slate-300'
        }`}
      >
        {ar.payerFirstUI.clientPays}
      </button>
    </div>
  );
};

export default PayerSegmentedControl;
