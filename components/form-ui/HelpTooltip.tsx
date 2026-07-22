/**
 * HelpTooltip Component
 *
 * Shows a small help icon that reveals explanatory text on hover/focus.
 * Addresses audit issue #25: technical terms lack explanation.
 *
 * @example
 * ```tsx
 * <label>
 *   Visit Type
 *   <HelpTooltip text="الزيارات المجدولة مخطط لها مسبقاً؛ الزيارات المطلوبة عند الحاجة." />
 * </label>
 * ```
 */

import React, { useState, useId, useRef, useEffect } from 'react';
import { QuestionMarkCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface HelpTooltipProps {
  /** Help text to display in the tooltip */
  text: string;
  /** Optional label for screen readers */
  ariaLabel?: string;
  /** Placement of the tooltip (default: top) */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Visual variant: default (standalone icon) or inline (smaller, for form labels) */
  variant?: 'default' | 'inline';
  /** Icon size: sm (14px), md (16px) */
  size?: 'sm' | 'md';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  text,
  ariaLabel = 'More information',
  placement = 'top',
  variant = 'default',
  size = 'md'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isVisible) return;
    const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchstart', handleDocumentClick);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
    };
  }, [isVisible]);

  const placementClasses = {
    top: 'bottom-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mb-2',
    bottom: 'top-full start-1/2 -translate-x-1/2 rtl:translate-x-1/2 mt-2',
    left: 'end-full top-1/2 -translate-y-1/2 me-2',
    right: 'start-full top-1/2 -translate-y-1/2 ms-2'
  };

  return (
    <span ref={containerRef} className="relative inline-flex items-center">
      <button
        type="button"
        className={`${variant === 'inline' ? 'p-0' : 'p-0.5'} text-latte hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full transition-colors inline-flex align-middle`}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible((v) => !v);
        }}
        aria-label={ariaLabel}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {variant === 'inline' ? (
          <InformationCircleIcon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} align-text-bottom`} />
        ) : (
          <QuestionMarkCircleIcon className={`${size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        )}
      </button>

      {isVisible && (
        <span
          id={tooltipId}
          dir="rtl"
          className={`absolute z-50 p-2.5 text-xs text-right text-cream bg-espresso border border-hairline rounded-lg shadow-lg pointer-events-none max-w-[16rem] sm:max-w-xs w-max break-words leading-relaxed ${placementClasses[placement]}`}
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
};

export default HelpTooltip;
