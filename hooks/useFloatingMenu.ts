import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import type { CSSProperties, RefObject, SetStateAction } from 'react';

/**
 * Anchor a floating menu/popover to a trigger element, rendered through a portal
 * to <body> so it can never be clipped by an ancestor overflow/stacking context.
 *
 * Auto-flips when the anchor would overflow the viewport (below→above, right→left).
 * Recomputes on scroll (capture) and resize. Closes on outside click and Escape.
 *
 * Usage:
 *   const { open, setOpen, triggerRef, contentRef, style } = useFloatingMenu();
 *   <button ref={triggerRef} onClick={() => setOpen(o => !o)} />
 *   {open && createPortal(<div ref={contentRef} style={style} className="fixed ...">…</div>, document.body)}
 *
 * `triggerRef` MUST wrap the element you want to anchor to.
 */
export interface FloatingMenuOptions {
  /** Menu width in px, used for horizontal flip math. Default 224 (w-56). */
  menuWidth?: number;
  /** Gap between trigger and menu in px. Default 8 (0.5rem / mt-2). */
  gap?: number;
  /** Viewport margin in px. Default 8. */
  edgeMargin?: number;
  /**
   * Controlled open state. When provided, the hook tracks this instead of its
   * own internal state — use for shared "only-one-open" coordination across
   * many anchors. Pass an `onOpenChange`-style writer via `setOpen`.
   */
  controlledOpen?: boolean;
  /** Called when an outside click or Escape requests a controlled menu close. */
  onOpenChange?: (open: boolean) => void;
}

export interface FloatingMenuResult {
  open: boolean;
  setOpen: (open: SetStateAction<boolean>) => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  /** Inline style to spread onto the portal content: { top, left } or { visibility:'hidden' }. */
  style: CSSProperties;
  /** Stable callback so it can be passed to a trigger's onClick without re-wrap churn. */
  toggle: () => void;
}

export function useFloatingMenu(opts: FloatingMenuOptions = {}): FloatingMenuResult {
  const {
    menuWidth = 224,
    gap = 8,
    edgeMargin = 8,
    controlledOpen,
    onOpenChange,
  } = opts;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = useCallback((next: SetStateAction<boolean>) => {
    if (controlledOpen !== undefined) {
      const nextValue = typeof next === 'function' ? next(open) : next;
      onOpenChange?.(nextValue);
    } else {
      setInternalOpen(next);
    }
  }, [controlledOpen, onOpenChange, open]);
  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const compute = useCallback(() => {
    if (!triggerRef.current) {
      setPos(null);
      return;
    }
    const r = triggerRef.current.getBoundingClientRect();
    const MENU_H = contentRef.current?.offsetHeight ?? 220;
    const viewport = window.visualViewport;
    const vw = viewport?.width ?? window.innerWidth;
    const vh = viewport?.height ?? window.innerHeight;
    const availableWidth = Math.max(0, vw - edgeMargin * 2);
    const measuredWidth = contentRef.current?.getBoundingClientRect().width ?? 0;
    const actualMenuWidth = measuredWidth > 0
      ? Math.min(measuredWidth, availableWidth)
      : Math.min(menuWidth, availableWidth);

    // Horizontal: right-align to the trigger, then clamp the *actual* menu
    // width so a narrow viewport can never produce a negative left position.
    const maxLeft = Math.max(edgeMargin, vw - edgeMargin - actualMenuWidth);
    let left = r.right - actualMenuWidth;
    left = Math.max(edgeMargin, Math.min(left, maxLeft));

    // Vertical: prefer below; flip above if below clips; else pin in-bounds.
    let top = r.bottom + gap;
    if (top + MENU_H > vh - edgeMargin) {
      const aboveTop = r.top - MENU_H - gap;
      if (aboveTop >= edgeMargin) {
        top = aboveTop;
      } else {
        top = Math.max(edgeMargin, Math.min(vh - edgeMargin - MENU_H, top));
      }
    }
    setPos({ top, left });
  }, [menuWidth, gap, edgeMargin]);

  // Position when opening; refresh on scroll/resize while open. Observe the
  // portal content too: filtering an autocomplete can change its height and
  // require a fresh above/below flip near the viewport edge.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    compute();
    const raf = requestAnimationFrame(compute); // recompute after paint with real height
    const handleScroll = compute;
    const handleResize = () => {
      // Recompute for width *and* height changes. Mobile browser chrome and the
      // on-screen keyboard can change the visual viewport without changing
      // window.innerWidth, which otherwise leaves a menu pinned off-screen.
      compute();
    };
    const resizeObserver = typeof ResizeObserver !== 'undefined' && contentRef.current
      ? new ResizeObserver(compute)
      : null;
    if (resizeObserver && contentRef.current) resizeObserver.observe(contentRef.current);

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
    };
  }, [open, compute]);

  // Outside click + Escape close.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;   // clicking toggle handled by onChange
      if (contentRef.current?.contains(t)) return;   // inside menu
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, setOpen]);

  const style: CSSProperties = pos
    ? { top: `${pos.top}px`, left: `${pos.left}px` }
    : { visibility: 'hidden' };

  const toggle = useCallback(() => setOpen((o) => !o), [setOpen]);

  return { open, setOpen, triggerRef, contentRef, style, toggle };
}
