import React, { useState, useId, useRef, useEffect } from 'react';

interface SidebarTooltipProps {
  /** Translated label shown inside the tooltip. */
  label: string;
  /** Placement relative to the trigger (default: right in LTR / left in RTL). */
  placement?: 'top' | 'bottom' | 'start' | 'end';
  /** Extra classes for the trigger element. */
  triggerClassName?: string;
  /** The focusable trigger element (button/link). */
  children: React.ReactElement;
}

const placementClasses: Record<NonNullable<SidebarTooltipProps['placement']>, string> = {
  top: 'bottom-full start-1/2 mb-2 ltr:-translate-x-1/2 rtl:translate-x-1/2',
  bottom: 'top-full start-1/2 mt-2 ltr:-translate-x-1/2 rtl:translate-x-1/2',
  start: 'end-full top-1/2 -translate-y-1/2 ltr:me-2 rtl:ms-2',
  end: 'start-full top-1/2 -translate-y-1/2 ltr:ms-2 rtl:me-2',
};

/**
 * Minimal hover/focus tooltip for compact sidebar controls.
 *
 * The tooltip appears on pointer hover and keyboard focus, uses `role="tooltip"`
 * and `aria-describedby`, and is placed at the logical outside edge so it works
 * in both RTL and LTR layouts. It never intercepts pointer events.
 */
export const SidebarTooltip: React.FC<SidebarTooltipProps> = ({
  label,
  placement = 'end',
  triggerClassName,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  // Close when clicking/touching anywhere outside the trigger.
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

  const trigger = React.cloneElement(children, {
    'aria-describedby': isVisible ? tooltipId : undefined,
    onMouseEnter: (e: React.MouseEvent) => {
      children.props.onMouseEnter?.(e);
      setIsVisible(true);
    },
    onMouseLeave: (e: React.MouseEvent) => {
      children.props.onMouseLeave?.(e);
      setIsVisible(false);
    },
    onFocus: (e: React.FocusEvent) => {
      children.props.onFocus?.(e);
      setIsVisible(true);
    },
    onBlur: (e: React.FocusEvent) => {
      children.props.onBlur?.(e);
      setIsVisible(false);
    },
  });

  return (
    <span ref={containerRef} className={`relative inline-flex items-center ${triggerClassName ?? ''}`}>
      {trigger}
      {isVisible && (
        <span
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 w-max max-w-[16rem] rounded-md bg-espresso-light text-on-chrome border border-hairline px-2.5 py-1.5 text-xs font-medium shadow-lg pointer-events-none whitespace-normal break-words leading-relaxed ${placementClasses[placement]}`}
        >
          {label}
        </span>
      )}
    </span>
  );
};

export default SidebarTooltip;
