import React, { useCallback, useRef, useState, useEffect } from 'react';
import { flushSync } from 'react-dom';

export interface UseSectionJumpOptions {
  /**
   * Whether the container is tabbed (mobile bottom-sheet style).
   * When true, jumping scrolls `scrollContainerRef` to the top instead of
   * calling `scrollIntoView` on an individual element.
   */
  isTabbed?: boolean;
  /**
   * Ref to the scrollable container for tabbed layouts.
   */
  scrollContainerRef?: React.RefObject<HTMLElement | null>;
  /**
   * How long the highlight animation should remain active, in milliseconds.
   * @default 2000
   */
  highlightDuration?: number;
  /**
   * Optional mapping from form field names to section ids. Used by
   * `jumpToFirstError` to determine which section to highlight.
   */
  fieldSectionMapping?: Record<string, string>;
  /**
   * Optional callback invoked when a section needs to be expanded so the
   * target field becomes visible. The hook consumer can use this to update
   * any collapsed-section state.
   */
  onExpandSection?: (sectionId: string) => void;
  /**
   * Optional localStorage key. When provided, the last jumped-to section
   * (and field) is persisted and restored on mount so returning to a record
   * keeps the user's previous position.
   */
  storageKey?: string;
}

export interface JumpToFirstErrorResult {
  /** The section id that was highlighted, or null if no section was found. */
  section: string | null;
  /** The field name that was jumped to, or null if no error was found. */
  field: string | null;
}

export interface UseSectionJumpResult {
  /** The id of the section currently being highlighted, or null. */
  highlightedSection: string | null;
  /** The name of the field currently being highlighted, or null. */
  highlightedField: string | null;
  /** The section id restored from localStorage on mount, or null. */
  restoredSection: string | null;
  /** The field name restored from localStorage on mount, or null. */
  restoredField: string | null;
  /**
   * Jump to a section: visually highlight it and scroll it into view.
   * @param sectionId - The section identifier used to drive the highlight.
   * @param elementId - Optional DOM element id to scroll into view (ignored in tabbed mode).
   */
  jumpToSection: (sectionId: string, elementId?: string) => void;
  /**
   * Jump to a field-level error: expand its section, highlight both the
   * section and the field, and scroll the field into view.
   * @param fieldName - The form field name (used as `[name]` or `[id]` selector).
   * @param sectionId - Optional section id; when omitted, `fieldSectionMapping` is used.
   */
  jumpToFieldError: (fieldName: string, sectionId?: string) => void;
  /**
   * Jump to the first field-level error in the provided errors map.
   * Returns the section and field that were jumped to.
   */
  jumpToFirstError: (errors: Record<string, string>) => JumpToFirstErrorResult;
}

/**
 * Escape a string for safe use in a CSS selector.
 */
function escapeSelector(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return CSS.escape(value);
  }
  // Minimal fallback for environments without CSS.escape.
  return value.replace(/(["'\\])/g, '\\$1');
}

interface PersistedPosition {
  sectionId: string;
  fieldName: string | null;
  timestamp: number;
}

/**
 * Safely read a persisted position from localStorage.
 */
function readStoredPosition(storageKey: string | undefined): PersistedPosition | null {
  if (!storageKey || typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.sectionId === 'string') {
      return {
        sectionId: parsed.sectionId,
        fieldName: typeof parsed.fieldName === 'string' ? parsed.fieldName : null,
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now(),
      };
    }
  } catch {
    // Ignore corrupt/missing storage entries.
  }
  return null;
}

/**
 * Safely persist a position to localStorage.
 */
function writeStoredPosition(storageKey: string | undefined, sectionId: string, fieldName: string | null) {
  if (!storageKey || typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  try {
    const payload: PersistedPosition = { sectionId, fieldName, timestamp: Date.now() };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  } catch {
    // Ignore storage errors (e.g., quota exceeded).
  }
}

/**
 * Find a field element by its name or id.
 */
function findFieldElement(fieldName: string): HTMLElement | null {
  const escaped = escapeSelector(fieldName);

  const byName = document.querySelector(`[name="${escaped}"]`);
  if (byName instanceof HTMLElement) return byName;

  const byId = document.getElementById(fieldName);
  if (byId instanceof HTMLElement) return byId;

  const byData = document.querySelector(`[data-field="${escaped}"]`);
  if (byData instanceof HTMLElement) return byData;

  return null;
}

/**
 * Duration (ms) of the section expand/collapse CSS transition. The hook waits
 * this long before scrolling so the browser can measure the final layout.
 */
export const SECTION_EXPAND_DURATION = 300;

/**
 * Hook that coordinates a visual highlight and smooth-scroll when a user
 * jumps to a form section from a progress indicator or when validation fails.
 */
export function useSectionJump(options: UseSectionJumpOptions = {}): UseSectionJumpResult {
  const { isTabbed = false, scrollContainerRef, highlightDuration = 2000, fieldSectionMapping, onExpandSection, storageKey } = options;
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const [highlightedField, setHighlightedField] = useState<string | null>(null);
  const [restoredSection, setRestoredSection] = useState<string | null>(null);
  const [restoredField, setRestoredField] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fieldElementRef = useRef<HTMLElement | null>(null);
  const isRestoringRef = useRef(false);
  const onExpandSectionRef = useRef(onExpandSection);

  // Keep the latest onExpandSection in a ref so the restore effect doesn't
  // re-run every time the consumer passes a new inline function.
  useEffect(() => {
    onExpandSectionRef.current = onExpandSection;
  }, [onExpandSection]);

  const clearHighlights = useCallback(() => {
    if (fieldElementRef.current) {
      fieldElementRef.current.classList.remove('section-jump-field-highlight');
      fieldElementRef.current = null;
    }
    setHighlightedSection(null);
    setHighlightedField(null);
  }, []);

  const scheduleClearHighlight = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      clearHighlights();
    }, highlightDuration);
  }, [highlightDuration, clearHighlights]);

  // Restore the last persisted position on mount. This only expands the
  // section; it intentionally does not scroll or animate so the initial
  // render feels stable.
  useEffect(() => {
    const position = readStoredPosition(storageKey);
    if (position) {
      isRestoringRef.current = true;
      setRestoredSection(position.sectionId);
      setRestoredField(position.fieldName);
      onExpandSectionRef.current?.(position.sectionId);
      // Clear the restoring flag after the current task so persisted jumps
      // made during this render cycle are still recorded.
      Promise.resolve().then(() => {
        isRestoringRef.current = false;
      });
    }
  }, [storageKey]);

  const jumpToSection = useCallback(
    (sectionId: string, elementId?: string) => {
      setHighlightedSection(sectionId);
      scheduleClearHighlight();

      if (!isRestoringRef.current) {
        writeStoredPosition(storageKey, sectionId, null);
      }

      // Double rAF: first frame = React commit, second frame = browser paint.
      // More reliable than a fixed timeout, especially for stepper forms where
      // content is conditionally rendered (no CSS transition to wait for).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isTabbed && scrollContainerRef?.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (elementId) {
            const element = document.getElementById(elementId);
            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });
      });
    },
    [isTabbed, scrollContainerRef, scheduleClearHighlight, storageKey]
  );

  const jumpToFieldError = useCallback(
    (fieldName: string, sectionId?: string) => {
      const targetSection = sectionId ?? fieldSectionMapping?.[fieldName] ?? null;

      setHighlightedField(fieldName);
      scheduleClearHighlight();

      setHighlightedField(fieldName);
      scheduleClearHighlight();

      // Expand the target section first — use flushSync to force React to
      // render synchronously so the new step's DOM exists immediately.
      // Without this, React batches the state update and the rAF callback
      // fires before the conditional step content is rendered.
      if (targetSection) {
        flushSync(() => {
          setHighlightedSection(targetSection);
          onExpandSectionRef.current?.(targetSection);
        });
        if (!isRestoringRef.current) {
          writeStoredPosition(storageKey, targetSection, fieldName);
        }
      }

      // Now the DOM is guaranteed to have the target step rendered.
      // Single rAF is enough to wait for browser paint, then scroll.
      requestAnimationFrame(() => {
        if (isTabbed && scrollContainerRef?.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }

        const element = findFieldElement(fieldName);
        if (element) {
          element.classList.add('section-jump-field-highlight');
          fieldElementRef.current = element;
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement || element instanceof HTMLButtonElement) {
            element.focus({ preventScroll: true });
          } else {
            const firstInput = element.querySelector('input, select, textarea, button');
            if (firstInput instanceof HTMLElement) {
              firstInput.focus({ preventScroll: true });
            }
          }
        } else if (targetSection) {
          const header = document.getElementById(`section-header-${targetSection}`);
          header?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    },
    [fieldSectionMapping, isTabbed, scheduleClearHighlight, scrollContainerRef, storageKey]
  );

  const jumpToFirstError = useCallback(
    (errors: Record<string, string>): JumpToFirstErrorResult => {
      const firstErrorField = Object.entries(errors).find(([_, message]) => Boolean(message));

      if (!firstErrorField) {
        return { section: null, field: null };
      }

      const fieldName = firstErrorField[0];
      const sectionId = fieldSectionMapping?.[fieldName] ?? null;

      jumpToFieldError(fieldName, sectionId ?? undefined);

      return { section: sectionId, field: fieldName };
    },
    [fieldSectionMapping, jumpToFieldError]
  );

  return { highlightedSection, highlightedField, restoredSection, restoredField, jumpToSection, jumpToFieldError, jumpToFirstError };
}
