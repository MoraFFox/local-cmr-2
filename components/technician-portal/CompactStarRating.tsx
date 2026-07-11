import React from 'react';
import { StarIcon } from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface CompactStarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}

const CompactStarRating: React.FC<CompactStarRatingProps> = ({
  value,
  onChange,
  label,
  size = 'md',
  disabled = false,
}) => {
  const starSize = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-8 h-8' : 'w-6 h-6';
  const textClass = size === 'sm' ? 'text-xs' : 'text-sm';

  const handleClick = (rating: number) => {
    if (!disabled) {
      onChange(rating);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <span className={`${textClass} font-bold uppercase tracking-wider text-secondary`}>
          {label}
        </span>
      )}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= value;
          return (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(star)}
              className={`p-1 rounded-full transition-all duration-200 ${disabled ? 'cursor-default' : 'hover:bg-yellow-500/10 active:scale-95'}`}
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
            >
              {isFilled ? (
                <StarIconSolid
                  className={`${starSize} text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] transition-all`}
                />
              ) : (
                <StarIcon
                  className={`${starSize} text-secondary transition-all`}
                />
              )}
            </button>
          );
        })}
        {value > 0 && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500/10 text-yellow-400 text-xs font-bold rounded border border-yellow-500/20">
                {value}.0
            </span>
        )}
      </div>
    </div>
  );
};

export default CompactStarRating;
