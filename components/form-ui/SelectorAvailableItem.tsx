/**
 * SelectorAvailableItem Component
 *
 * Renders an available service/part option with an inline quantity stepper.
 * This replaces the old "click to add with quantity=1, then find it in the
 * selected section to adjust quantity" three-step flow (audit issue #10)
 * with a single-step flow: pick the quantity, then add.
 *
 * Designed to be used by both ServiceSelector and PartsSelector.
 *
 * @example
 * ```tsx
 * <SelectorAvailableItem
 *   label="Backflush"
 *   description="Group head cleaning"
 *   viewMode="grid"
 *   onAdd={(quantity) => handleAdd('backflush', quantity)}
 * />
 * ```
 */

import React, { useState } from 'react';
import { PlusIcon, MinusIcon, SparklesIcon } from '@heroicons/react/24/outline';

interface SelectorAvailableItemProps {
  /** Display label for the option */
  label: string;
  /** Optional description (services only) */
  description?: string;
  /** View mode to match the parent selector's layout */
  viewMode?: 'grid' | 'list';
  /** Initial quantity shown in the stepper (default 1) */
  initialQuantity?: number;
  /** Maximum quantity allowed (default 99) */
  maxQuantity?: number;
  /** When true, shows a "Suggested" badge (context-aware suggestion
   *  based on the problems/issues the technician reported). */
  isSuggested?: boolean;
  /** Callback when the user clicks Add, with the chosen quantity */
  onAdd: (quantity: number) => void;
}

export const SelectorAvailableItem: React.FC<SelectorAvailableItemProps> = ({
  label,
  description,
  viewMode = 'grid',
  initialQuantity = 1,
  maxQuantity = 99,
  isSuggested = false,
  onAdd,
}) => {
  const [quantity, setQuantity] = useState(initialQuantity);

  const decrement = () => setQuantity(q => Math.max(1, q - 1));
  const increment = () => setQuantity(q => Math.min(maxQuantity, q + 1));

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(quantity);
    // Reset to 1 after adding so the next item starts fresh
    setQuantity(initialQuantity);
  };

  const gridClasses = 'flex-col justify-between';
  const listClasses = 'flex-row justify-between items-center';

  return (
    <div
      className={`group border rounded-xl p-4 flex transition-all duration-200 text-left ${
        isSuggested
          ? 'border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60'
          : 'border-hairline bg-cream hover:bg-cream-2 hover:border-primary/50'
      } ${
        viewMode === 'grid' ? gridClasses : listClasses
      }`}
    >
      {/* Label + description + optional suggested badge */}
      <div className={viewMode === 'list' ? 'flex-1 min-w-0' : 'w-full'}>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-text group-hover:text-primary transition-colors truncate">
            {label}
          </p>
          {isSuggested && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary dark:text-copper-300 border border-primary/30 whitespace-nowrap"
              title="Suggested based on the problems you reported"
            >
              <SparklesIcon className="w-3 h-3" />
              Suggested
            </span>
          )}
        </div>
        {description && viewMode === 'grid' && (
          <p className="text-xs text-latte mt-1 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Inline quantity stepper + add button (single action) */}
      <div
        className={`flex items-center gap-2 ${
          viewMode === 'grid' ? 'mt-3' : 'mt-0 ml-4'
        }`}
      >
        {/* Quantity stepper */}
        <div className="flex items-center bg-cream-2 rounded-lg border border-hairline p-0.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); decrement(); }}
            className="p-1 text-latte hover:text-text hover:bg-cream-3 rounded-md transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label={`Decrease quantity for ${label}`}
          >
            <MinusIcon className="w-3.5 h-3.5" />
          </button>
          <span className="w-7 text-center font-mono font-bold text-primary dark:text-copper-300 text-sm select-none">
            {quantity}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); increment(); }}
            className="p-1 text-latte hover:text-text hover:bg-cream-3 rounded-md transition-colors min-w-[28px] min-h-[28px] flex items-center justify-center"
            aria-label={`Increase quantity for ${label}`}
          >
            <PlusIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={handleAdd}
          className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary/90 transition-colors flex items-center gap-1 min-h-[32px]"
          aria-label={`Add ${quantity} ${label}`}
        >
          <PlusIcon className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
};

export default SelectorAvailableItem;
