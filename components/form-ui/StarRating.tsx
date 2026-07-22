/**
 * StarRating Component
 *
 * Unified star rating with consistent 44px touch targets, half-star support,
 * and an N/A option. Replaces all ad-hoc inline star implementations across
 * the app (audit issue #15).
 *
 * @example Interactive with half-stars
 * ```tsx
 * <StarRating value={3.5} onChange={setRating} allowHalf showNA showNumeric />
 * ```
 *
 * @example Display-only
 * ```tsx
 * <StarRating value={4} size="xs" />
 * ```
 */

import React, { useCallback } from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

export interface StarRatingProps {
  /** Current rating value (0–5, supports .5 increments when allowHalf) */
  value: number;
  /** Called with the new rating. Omit for display-only mode. */
  onChange?: (value: number) => void;
  /** Visual size preset */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** When true, clicking the left half of a star gives a .5 value */
  allowHalf?: boolean;
  /** Show a small "N/A" button to clear the rating to 0 */
  showNA?: boolean;
  /** Show the numeric value badge (e.g. "3.5 / 5") */
  showNumeric?: boolean;
  /** Disable interaction */
  disabled?: boolean;
  /** Accessible label */
  label?: string;
  /** Custom class */
  className?: string;
}

/** Size config: icon size + touch-target padding */
const SIZE_CONFIG = {
  xs: { icon: 'w-3.5 h-3.5', gap: 'gap-0', hit: 'min-w-[20px] min-h-[20px] p-0.5' },
  sm: { icon: 'w-5 h-5', gap: 'gap-0.5', hit: 'min-w-[36px] min-h-[36px] p-1' },
  md: { icon: 'w-6 h-6', gap: 'gap-1', hit: 'min-w-[44px] min-h-[44px] p-1.5' },
  lg: { icon: 'w-8 h-8', gap: 'gap-1', hit: 'min-w-[44px] min-h-[44px] p-1.5' },
} as const;

const STAR_VALUES = [1, 2, 3, 4, 5] as const;

/** Discern whether the click was on the left or right half of the element. */
function clickHalf(e: React.MouseEvent<HTMLButtonElement>): 'left' | 'right' {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  return x < rect.width / 2 ? 'left' : 'right';
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  size = 'md',
  allowHalf = false,
  showNA = false,
  showNumeric = false,
  disabled = false,
  label,
  className = '',
}) => {
  const isInteractive = !!onChange && !disabled;
  const config = SIZE_CONFIG[size];
  const numericDisplay = showNumeric ? (value > 0 ? `${value % 1 === 0 ? value : value.toFixed(1)} / 5` : '—') : null;

  const handleStarClick = useCallback(
    (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
      if (!onChange) return;
      if (allowHalf) {
        const half = clickHalf(e);
        onChange(half === 'left' ? star - 0.5 : star);
      } else {
        onChange(star);
      }
    },
    [onChange, allowHalf],
  );

  /** Render a single star (filled, half, or empty). */
  const renderStar = (star: number) => {
    const filled = value >= star;
    const half = allowHalf && !filled && value >= star - 0.5;

    const button = (
      <button
        key={star}
        type="button"
        disabled={disabled}
        onClick={isInteractive ? (e) => handleStarClick(star, e) : undefined}
        className={`${config.hit} rounded-full transition-all duration-150 flex items-center justify-center ${
          isInteractive
            ? 'hover:bg-yellow-500/10 active:scale-90 cursor-pointer'
            : disabled
              ? 'cursor-default opacity-50'
              : 'cursor-default'
        }`}
        aria-label={`Rate ${star} star${star > 1 ? 's' : ''}${allowHalf ? ' (click right for full, left for half)' : ''}`}
        tabIndex={isInteractive ? 0 : -1}
      >
        {filled ? (
          <StarIconSolid className={`${config.icon} text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]`} />
        ) : half ? (
          <span className={`${config.icon} relative inline-block`}>
            {/* Empty star as background */}
            <StarIcon className={`${config.icon} text-latte absolute inset-0`} />
            {/* Half-filled star clipped to left 50% */}
            <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
              <StarIconSolid className={`${config.icon} text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.4)]`} />
            </span>
          </span>
        ) : (
          <StarIcon className={`${config.icon} text-latte`} />
        )}
      </button>
    );

    return button;
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} role="group" aria-label={label || 'Rating'}>
      {label && (
        <span className="text-sm font-medium text-primary dark:text-latte/70">{label}</span>
      )}
      <div className={`flex items-center ${config.gap}`}>
        {STAR_VALUES.map(renderStar)}

        {/* Numeric badge */}
        {numericDisplay && (
          <span className={`ml-2 px-2 py-0.5 bg-yellow-500/10 text-yellow-500 text-xs font-bold rounded border border-yellow-500/20 select-none`}>
            {numericDisplay}
          </span>
        )}

        {/* N/A clear button */}
        {showNA && isInteractive && value > 0 && (
          <button
            type="button"
            onClick={() => onChange(0)}
            className={`ml-2 px-2 py-1 text-xs font-medium text-latte hover:text-ember-500 bg-cream-2 hover:bg-ember-500/10 rounded border border-hairline transition-colors min-h-[28px]`}
            aria-label="Clear rating"
          >
            N/A
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * Display-only variant — renders filled/empty stars without any interaction.
 */
export const StarRatingDisplay: React.FC<{ value: number; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string; label?: string }> = ({
  value,
  size = 'xs',
  className = '',
  label,
}) => {
  const config = SIZE_CONFIG[size];

  return (
    <div className={`flex items-center ${config.gap} ${className}`} role="img" aria-label={label || `${value} out of 5 stars`}>
      {STAR_VALUES.map((star) => (
        <span key={star} className="flex items-center justify-center">
          {value >= star ? (
            <StarIconSolid className={`${config.icon} text-yellow-400`} />
          ) : value >= star - 0.5 ? (
            <span className={`${config.icon} relative inline-block`}>
              <StarIcon className={`${config.icon} text-latte absolute inset-0`} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: '50%' }}>
                <StarIconSolid className={`${config.icon} text-yellow-400`} />
              </span>
            </span>
          ) : (
            <StarIcon className={`${config.icon} text-latte`} />
          )}
        </span>
      ))}
      <span className="ml-1 text-xs text-latte font-semibold">{value > 0 ? `${value % 1 === 0 ? value : value.toFixed(1)}` : '—'}</span>
    </div>
  );
};

export default StarRating;
