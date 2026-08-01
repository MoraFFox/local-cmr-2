import React, { useState, useId, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';

interface SidebarTooltipProps {
  /** Translated label shown inside the tooltip. */
  label: string;
  /** Placement relative to the trigger. `end` points away from the sidebar edge. */
  placement?: 'top' | 'bottom' | 'start' | 'end';
  /** Extra classes for the trigger wrapper. */
  triggerClassName?: string;
  /** The focusable trigger element (button/link). */
  children: React.ReactElement;
}

type TooltipPosition = { top: number; left: number; transform: string };

/**
 * Compact-sidebar tooltip that works for hover, keyboard focus, RTL/LTR, and
 * scrollable containers. The visual tooltip is portaled so it cannot be
 * clipped by the sidebar's scroll region.
 */
export const SidebarTooltip: React.FC<SidebarTooltipProps> = ({
  label,
  placement = 'end',
  triggerClassName,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({
    top: 0,
    left: 0,
    transform: 'translateY(-50%)',
  });
  const tooltipId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const updatePosition = () => {
    const trigger = containerRef.current?.firstElementChild;
    const tooltip = tooltipRef.current;
    if (!trigger || !tooltip) return;

    const rect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;
    const direction = document.documentElement.dir || document.body.dir || 'ltr';
    const isRtl = direction === 'rtl';
    const horizontalEnd = isRtl ? 'left' : 'right';
    const horizontalStart = isRtl ? 'right' : 'left';

    let top: number;
    let left: number;
    let transform = 'translateY(-50%)';

    if (placement === 'top' || placement === 'bottom') {
      const preferredTop = placement === 'top'
        ? rect.top - tooltipRect.height - gap
        : rect.bottom + gap;
      const alternateTop = placement === 'top'
        ? rect.bottom + gap
        : rect.top - tooltipRect.height - gap;
      const fitsPreferred = preferredTop >= viewportPadding &&
        preferredTop + tooltipRect.height <= window.innerHeight - viewportPadding;
      top = fitsPreferred ? preferredTop : alternateTop;
      left = rect.left + rect.width / 2;
      transform = 'translateX(-50%)';
    } else {
      const preferredSide = placement === 'end' ? horizontalEnd : horizontalStart;
      const preferredLeft = preferredSide === 'right'
        ? rect.right + gap
        : rect.left - tooltipRect.width - gap;
      const alternateLeft = preferredSide === 'right'
        ? rect.left - tooltipRect.width - gap
        : rect.right + gap;
      const fitsPreferred = preferredLeft >= viewportPadding &&
        preferredLeft + tooltipRect.width <= window.innerWidth - viewportPadding;
      left = fitsPreferred ? preferredLeft : alternateLeft;
      top = rect.top + rect.height / 2;
    }

    const maxLeft = Math.max(viewportPadding, window.innerWidth - tooltipRect.width - viewportPadding);
    const maxTop = Math.max(viewportPadding, window.innerHeight - tooltipRect.height - viewportPadding);
    setPosition({
      top: Math.min(Math.max(top, viewportPadding), maxTop),
      left: Math.min(Math.max(left, viewportPadding), maxLeft),
      transform,
    });
  };

  useLayoutEffect(() => {
    if (!isVisible) return;

    // The tooltip is portaled after this component commits. Measure on the
    // next frame so its ref and rendered dimensions are available before
    // positioning it; this prevents a transient (0, 0) placement.
    const frame = window.requestAnimationFrame(updatePosition);
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, label, placement]);

  useEffect(() => {
    if (!isVisible) return;
    const handleDocumentClick = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsVisible(false);
      }
    };
    const handleViewportChange = () => updatePosition();
    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('touchstart', handleDocumentClick);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('touchstart', handleDocumentClick);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isVisible]);

  const trigger = React.cloneElement(children, {
    // These controls already expose their translated accessible name. The
    // tooltip is visual guidance, so do not add a duplicate screen-reader
    // description (especially for composite controls such as ThemeToggle).
    'aria-describedby': children.props['aria-describedby'],
    onClick: (event: React.MouseEvent) => {
      children.props.onClick?.(event);
      setIsVisible(false);
    },
    onMouseEnter: (event: React.MouseEvent) => {
      children.props.onMouseEnter?.(event);
      setIsVisible(true);
    },
    onMouseLeave: (event: React.MouseEvent) => {
      children.props.onMouseLeave?.(event);
      setIsVisible(false);
    },
    onFocus: (event: React.FocusEvent) => {
      children.props.onFocus?.(event);
      setIsVisible(true);
    },
    onBlur: (event: React.FocusEvent) => {
      children.props.onBlur?.(event);
      setIsVisible(false);
    },
  });

  return (
    <>
      <span ref={containerRef} className={`relative inline-flex items-center ${triggerClassName ?? ''}`}>
        {trigger}
      </span>
      {isVisible && createPortal(
        <span
          ref={tooltipRef}
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none fixed z-[100] w-max max-w-[min(16rem,calc(100vw-1rem))] rounded-md border border-hairline bg-espresso-light px-2.5 py-1.5 text-xs font-medium leading-relaxed text-on-chrome shadow-lg whitespace-normal break-words"
          style={{ top: position.top, left: position.left, transform: position.transform }}
        >
          {label}
        </span>,
        document.body,
      )}
    </>
  );
};

export default SidebarTooltip;
