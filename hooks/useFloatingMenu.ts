import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import type { CSSProperties, RefObject } from 'react';

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
}

export interface FloatingMenuResult {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  /** Inline style to spread onto the portal content: { top, left } or { visibility:'hidden' }. */
  style: CSSProperties;
  /** Stable callback so it can be passed to a trigger's onClick without re-wrap churn. */
  toggle: () => void;
}

export function useFloatingMenu(opts: FloatingMenuOptions = {}): FloatingMenuResult {
  const { menuWidth = 224, gap = 8, edgeMargin = 8, controlledOpen } = opts;

  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = setInternalOpen; // uncontrolled callers; controlled ones carry state in via controlledOpen
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
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Horizontal: right-align to trigger, flip/clamp to viewport.
    let left = r.right - menuWidth;
    if (left < edgeMargin) left = edgeMargin;
    if (left + menuWidth > vw - edgeMargin) left = vw - edgeMargin - menuWidth;

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

  // Position when opening; refresh on scroll/resize while open.
  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    compute();
    const raf = requestAnimationFrame(compute); // recompute after paint with real height
    window.addEventListener('scroll', compute, true);
    window.addEventListener('resize', compute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', compute, true);
      window.removeEventListener('resize', compute);
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
  }, [open]);

  const style: CSSProperties = pos
    ? { top: `${pos.top}px`, left: `${pos.left}px` }
    : { visibility: 'hidden' };

  const toggle = useCallback(() => setOpen((o) => !o), []);

  return { open, setOpen, triggerRef, contentRef, style, toggle };
}
