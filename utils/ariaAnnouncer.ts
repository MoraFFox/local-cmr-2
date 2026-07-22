/**
 * Aria Announcer Utility
 *
 * Provides a global aria-live region for screen reader announcements.
 * Components can call announce() to broadcast status changes like
 * selection counts, save status, and connectivity changes.
 *
 * Requires an element with id="aria-announcer" and aria-live="polite"
 * in the DOM (added in App.tsx).
 *
 * @example
 * ```ts
 * import { announce } from '../utils/ariaAnnouncer';
 * announce('تم تحديد ٣ خدمات');
 * ```
 */

let announcerEl: HTMLElement | null = null;

function getAnnouncer(): HTMLElement | null {
  if (!announcerEl && typeof document !== 'undefined') {
    announcerEl = document.getElementById('aria-announcer');
  }
  return announcerEl;
}

/**
 * Announce a message to screen readers via the global aria-live region.
 * Clears the element first to ensure the same message announced twice
 * in a row will still be re-read.
 */
export function announce(message: string): void {
  const el = getAnnouncer();
  if (!el) return;
  // Clear first so the screen reader re-reads even if the same text is set
  el.textContent = '';
  // Use requestAnimationFrame to ensure the DOM update is processed
  requestAnimationFrame(() => {
    el.textContent = message;
  });
}

/**
 * Reset/invalidate the cached announcer element reference.
 * Useful after DOM mutations that replace the element.
 */
export function resetAnnouncer(): void {
  announcerEl = null;
}
