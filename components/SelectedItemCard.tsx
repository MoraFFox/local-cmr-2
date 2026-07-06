import React from 'react';
import { MinusIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import PayerSegmentedControl from './PayerSegmentedControl';

interface SelectedItemCardProps {
  name: string;
  quantity: number;
  paidByClient: boolean;
  isCustom?: boolean;
  onPayerChange: (paidByClient: boolean) => void;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onNameChange?: (name: string) => void;
  viewMode?: 'grid' | 'list';
}

const SelectedItemCard: React.FC<SelectedItemCardProps> = ({
  name,
  quantity,
  paidByClient,
  isCustom = false,
  onPayerChange,
  onQuantityChange,
  onRemove,
  onNameChange,
  viewMode = 'grid',
}) => {
  const borderColorClass = paidByClient
    ? 'border-amber-500/30 bg-amber-500/5'
    : 'border-copper-500/30 bg-copper-500/5';

  const handleDecrement = () => {
    onQuantityChange(quantity - 1);
  };

  const handleIncrement = () => {
    onQuantityChange(quantity + 1);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onNameChange) {
      onNameChange(e.target.value);
    }
  };

  return (
    <div
      className={`relative group rounded-xl border backdrop-blur-sm transition-all duration-300 ${borderColorClass} ${
        viewMode === 'list' 
          ? 'p-3 flex items-center justify-between gap-4' 
          : 'p-4 flex flex-col gap-4'
      }`}
    >
      {/* Remove Button (Absolute in grid, relative in list) */}
        {viewMode === 'grid' && (
            <button
                type="button"
                onClick={onRemove}
                className="absolute top-2 right-2 p-1.5 text-latte hover:text-ember-300 hover:bg-ember-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        )}

      {/* Item Name */}
      <div className={`${viewMode === 'list' ? 'flex-1 min-w-0' : 'w-full pr-8'}`}>
        {isCustom && onNameChange ? (
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            className="w-full bg-espresso/50 text-cream px-3 py-1.5 rounded-lg border border-espresso-light focus:border-copper-500 focus:ring-1 focus:ring-copper-500/50 outline-none transition-all placeholder-latte"
            placeholder="Item name..."
          />
        ) : (
          <h4 className="font-bold text-cream text-sm leading-snug break-words">
            {name}
          </h4>
        )}
      </div>

      {/* Controls Container */}
      <div className={`flex items-center ${viewMode === 'list' ? 'gap-3' : 'justify-between w-full'}`}>
        
        {/* Quantity Controls */}
        <div className="flex items-center bg-espresso/50 rounded-lg border border-espresso-light p-1">
          <button
            onClick={handleDecrement}
            className="p-1.5 text-latte hover:text-cream hover:bg-espresso-light rounded-md transition-colors"
          >
            <MinusIcon className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center font-mono font-bold text-copper-400">
            {quantity}
          </span>
          <button
            onClick={handleIncrement}
            className="p-1.5 text-latte hover:text-cream hover:bg-espresso-light rounded-md transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Payer Toggle */}
        <PayerSegmentedControl
          paidByClient={paidByClient}
          onChange={onPayerChange}
          size="sm"
        />

         {viewMode === 'list' && (
            <button
                type="button"
                onClick={onRemove}
                className="p-2 text-latte hover:text-ember-300 hover:bg-ember-500/10 rounded-lg transition-colors"
            >
                <TrashIcon className="w-4 h-4" />
            </button>
        )}
      </div>
    </div>
  );
};

export default SelectedItemCard;
