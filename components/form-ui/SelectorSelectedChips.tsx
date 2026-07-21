/**
 * SelectorSelectedChips Component
 *
 * Compact chip/tag view for selected service/part items — a space-saving
 * alternative to the full SelectedItemCard layout (audit issue #11: "Selected
 * Items Section Takes Too Much Space"). Each item is a single-line chip with
 * the name, quantity, payer badge, and a remove button.
 *
 * Designed to be used by both ServiceSelector and PartsSelector as a toggle
 * between the detailed card view and this compact chips view.
 *
 * @example
 * ```tsx
 * <SelectorSelectedChips
 *   items={[{ name: 'Backflush', count: 2, paidByClient: false }]}
 *   onRemove={(name) => handleRemove(name)}
 *   onQuantityChange={(name, qty) => handleQty(name, qty)}
 *   onPayerChange={(name, paidByClient) => handlePayer(name, paidByClient)}
 * />
 * ```
 */

import React from 'react';
import { MinusIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SelectedChipItem {
  name: string;
  count: number;
  paidByClient?: boolean;
  isCustom?: boolean;
}

interface SelectorSelectedChipsProps {
  /** Selected items to render as chips */
  items: SelectedChipItem[];
  /** Remove an item by name */
  onRemove: (name: string) => void;
  /** Change an item's quantity */
  onQuantityChange: (name: string, quantity: number) => void;
  /** Change an item's payer */
  onPayerChange: (name: string, paidByClient: boolean) => void;
  /** Rename a custom item (by index in the items array). Only called for isCustom items. */
  onNameChange?: (index: number, newName: string) => void;
  /** Label for the "company pays" payer (e.g. "Mido's") */
  midosLabel?: string;
  /** Label for the "client pays" payer */
  clientLabel?: string;
}

export const SelectorSelectedChips: React.FC<SelectorSelectedChipsProps> = ({
  items,
  onRemove,
  onQuantityChange,
  onPayerChange,
  onNameChange,
  midosLabel = "Mido's",
  clientLabel = 'Client',
}) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-4 text-latte text-sm italic">
        No items selected yet.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 bg-cream-2/50 rounded-xl border border-hairline">
      {items.map((item, index) => {
        const paidByClient = item.paidByClient === true;
        const chipBorder = paidByClient
          ? 'border-amber-500/40 bg-amber-500/10'
          : 'border-primary/40 bg-primary/10';

        return (
          <div
            key={`${item.name}-${index}`}
            className={`group inline-flex items-center gap-1.5 px-2 py-1 rounded-full border ${chipBorder} transition-all`}
          >
            {/* Name: custom items get an inline input; predefined items toggle payer on click */}
            {item.isCustom && onNameChange ? (
              <input
                type="text"
                value={item.name}
                onChange={(e) => onNameChange(index, e.target.value)}
                className="text-xs font-semibold bg-transparent border-b border-hairline focus:border-primary outline-none px-1 max-w-[140px] text-text placeholder-latte"
                placeholder="Name..."
                aria-label={`Custom item name (row ${index + 1})`}
              />
            ) : (
              <button
                type="button"
                onClick={() => onPayerChange(item.name, !paidByClient)}
                className="text-xs font-semibold text-text hover:text-primary dark:hover:text-copper-300 transition-colors max-w-[160px] truncate"
                title={`${item.name} — click to change payer (currently ${paidByClient ? clientLabel : midosLabel})`}
                aria-label={`${item.name}, paid by ${paidByClient ? clientLabel : midosLabel}, click to toggle payer`}
              >
                {item.name || 'Untitled'}
              </button>
            )}

            {/* Quantity mini-stepper */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => onQuantityChange(item.name, Math.max(1, item.count - 1))}
                className="p-0.5 text-latte hover:text-text rounded transition-colors min-w-[20px] min-h-[20px] flex items-center justify-center"
                aria-label={`Decrease ${item.name} quantity`}
                disabled={item.count <= 1}
              >
                <MinusIcon className="w-3 h-3" />
              </button>
              <span className="text-xs font-mono font-bold text-primary dark:text-copper-300 min-w-[16px] text-center select-none">
                {item.count}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(item.name, item.count + 1)}
                className="p-0.5 text-latte hover:text-text rounded transition-colors min-w-[20px] min-h-[20px] flex items-center justify-center"
                aria-label={`Increase ${item.name} quantity`}
              >
                <PlusIcon className="w-3 h-3" />
              </button>
            </div>

            {/* Payer badge (tiny, color-coded) */}
            <span
              className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                paidByClient
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                  : 'bg-primary/20 text-primary dark:text-copper-300'
              }`}
            >
              {paidByClient ? clientLabel : midosLabel}
            </span>

            {/* Remove button */}
            <button
              type="button"
              onClick={() => onRemove(item.name)}
              className="p-0.5 text-latte hover:text-ember-500 rounded-full transition-colors min-w-[20px] min-h-[20px] flex items-center justify-center"
              aria-label={`Remove ${item.name}`}
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default SelectorSelectedChips;
