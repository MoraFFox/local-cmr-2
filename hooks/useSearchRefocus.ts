import { useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';

interface UseSearchRefocusOptions {
  /**
   * Ref to the wrapper element containing the search input. The hook locates
   * the actual input via `ref.current.querySelector('input')`.
   */
  searchInputRef: RefObject<HTMLDivElement | null>;
  /**
   * Number of selected items. The refocus effect re-runs when this changes
   * (mirroring the original `[selectedValues.length]` dependency).
   */
  selectedCount: number;
}

interface UseSearchRefocusResult {
  /**
   * Set `current = true` from handlers that should NOT trigger a refocus
   * (remove, bulk operations, custom-name edits). The flag is consumed and
   * reset by the hook's effect on the next selection-count change.
   */
  skipRefocusRef: MutableRefObject<boolean>;
  /**
   * Attach to the picker root's `onMouseDownCapture`. It runs during the
   * capture phase, before the browser's default mousedown action moves focus
   * to the clicked Add button, so it accurately records whether the search
   * box held focus when the interaction began.
   */
  handleMouseDownCapture: () => void;
}

/**
 * Shared "refocus the search box after adding an item" logic for the
 * service/part/problem pickers (ServiceSelector, PartsSelector, CheckboxGroup).
 *
 * Original intent (audit issue #19): after adding an item, refocus the search
 * input so the user can keep finding more without re-clicking.
 *
 * Scroll-jump fix: the refocus only happens when the search box actually had
 * focus when the interaction began (a typing user). An unconditional refocus
 * made the browser scroll the search box back into view, teleporting the page
 * to the top of the picker after every click. When refocusing, `preventScroll`
 * is passed so even typing users never have their scroll position yanked.
 *
 * The first-render guard prevents focus from stealing on mount when editing an
 * existing record with pre-selected items.
 */
export function useSearchRefocus({
  searchInputRef,
  selectedCount,
}: UseSearchRefocusOptions): UseSearchRefocusResult {
  const skipRefocusRef = useRef(false);
  const didMountRef = useRef(false);
  const searchHadFocusRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (skipRefocusRef.current) {
      skipRefocusRef.current = false;
      searchHadFocusRef.current = false;
      return;
    }
    if (searchHadFocusRef.current && selectedCount > 0) {
      searchInputRef.current?.querySelector('input')?.focus({ preventScroll: true });
    }
    searchHadFocusRef.current = false;
  }, [selectedCount, searchInputRef]);

  const handleMouseDownCapture = useCallback(() => {
    const input = searchInputRef.current?.querySelector('input');
    searchHadFocusRef.current = input === document.activeElement;
  }, [searchInputRef]);

  return { skipRefocusRef, handleMouseDownCapture };
}

export default useSearchRefocus;
