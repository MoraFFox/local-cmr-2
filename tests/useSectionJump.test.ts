import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSectionJump, SECTION_EXPAND_DURATION } from '../hooks/useSectionJump';

describe('useSectionJump', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('highlights the target section and clears the highlight after the duration', () => {
    const { result } = renderHook(() => useSectionJump());

    expect(result.current.highlightedSection).toBeNull();

    act(() => {
      result.current.jumpToSection('basic', 'section-header-basic');
    });

    expect(result.current.highlightedSection).toBe('basic');

    act(() => {
      vi.advanceTimersByTime(2100);
    });

    expect(result.current.highlightedSection).toBeNull();
  });

  it('scrolls the target element into view', () => {
    const scrollIntoViewMock = vi.fn();
    const element = document.createElement('div');
    element.id = 'section-header-basic';
    element.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(element);

    const { result } = renderHook(() => useSectionJump());

    act(() => {
      result.current.jumpToSection('basic', 'section-header-basic');
    });

    act(() => {
      vi.advanceTimersByTime(SECTION_EXPAND_DURATION + 50);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

    document.body.removeChild(element);
  });

  it('scrolls the tabbed container to the top when isTabbed is true', () => {
    const scrollToMock = vi.fn();
    const container = document.createElement('div');
    container.scrollTo = scrollToMock;
    document.body.appendChild(container);

    const { result } = renderHook(() =>
      useSectionJump({ isTabbed: true, scrollContainerRef: { current: container } })
    );

    act(() => {
      result.current.jumpToSection('services');
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });

    document.body.removeChild(container);
  });

  describe('field-level error jumps', () => {
    it('highlights the field and its section, expands the section, and scrolls/focuses the field', () => {
      const onExpandSection = vi.fn();
      const scrollIntoViewMock = vi.fn();
      const focusMock = vi.fn();

      const field = document.createElement('input');
      field.name = 'maintenanceDate';
      field.scrollIntoView = scrollIntoViewMock;
      field.focus = focusMock;
      document.body.appendChild(field);

      const { result } = renderHook(() =>
        useSectionJump({
          fieldSectionMapping: { maintenanceDate: 'basic' },
          onExpandSection,
        })
      );

    act(() => {
      result.current.jumpToFieldError('maintenanceDate');
    });

    expect(result.current.highlightedField).toBe('maintenanceDate');
    expect(result.current.highlightedSection).toBe('basic');
    expect(onExpandSection).toHaveBeenCalledWith('basic');

    act(() => {
      vi.advanceTimersByTime(SECTION_EXPAND_DURATION + 50);
    });

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(focusMock).toHaveBeenCalled();

      document.body.removeChild(field);
    });

    it('falls back to the section header when the field element is not found', () => {
      const onExpandSection = vi.fn();
      const headerScrollIntoViewMock = vi.fn();

      const header = document.createElement('div');
      header.id = 'section-header-basic';
      header.scrollIntoView = headerScrollIntoViewMock;
      document.body.appendChild(header);

      const { result } = renderHook(() =>
        useSectionJump({
          fieldSectionMapping: { unknownField: 'basic' },
          onExpandSection,
        })
      );

    act(() => {
      result.current.jumpToFieldError('unknownField');
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(headerScrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });

      document.body.removeChild(header);
    });

    it('jumps to the first error when jumpToFirstError is called', () => {
      const onExpandSection = vi.fn();
      const scrollIntoViewMock = vi.fn();
      const focusMock = vi.fn();

      const field = document.createElement('input');
      field.name = 'baristaName';
      field.scrollIntoView = scrollIntoViewMock;
      field.focus = focusMock;
      document.body.appendChild(field);

      const { result } = renderHook(() =>
        useSectionJump({
          fieldSectionMapping: {
            maintenanceDate: 'basic',
            baristaName: 'basic',
          },
          onExpandSection,
        })
      );

      let jumpResult: { section: string | null; field: string | null } = { section: null, field: null };
      act(() => {
        jumpResult = result.current.jumpToFirstError({
          baristaName: 'Required',
          maintenanceDate: 'Required',
        });
      });

      expect(jumpResult.section).toBe('basic');
      expect(jumpResult.field).toBe('baristaName');
      expect(result.current.highlightedField).toBe('baristaName');
      expect(result.current.highlightedSection).toBe('basic');
      expect(onExpandSection).toHaveBeenCalledWith('basic');

      act(() => {
        vi.advanceTimersByTime(350);
      });

      expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(focusMock).toHaveBeenCalled();

      document.body.removeChild(field);
    });

    it('escapes special characters in field names when looking up elements', () => {
      const onExpandSection = vi.fn();
      const scrollIntoViewMock = vi.fn();
      const focusMock = vi.fn();

      const field = document.createElement('input');
      field.name = 'field"quote';
      field.scrollIntoView = scrollIntoViewMock;
      field.focus = focusMock;
      document.body.appendChild(field);

      const { result } = renderHook(() =>
        useSectionJump({
          fieldSectionMapping: { 'field"quote': 'basic' },
          onExpandSection,
        })
      );

    act(() => {
      result.current.jumpToFieldError('field"quote');
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(result.current.highlightedField).toBe('field"quote');
    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
      expect(focusMock).toHaveBeenCalled();

      document.body.removeChild(field);
    });

    it('returns null from jumpToFirstError when there are no errors', () => {
      const { result } = renderHook(() => useSectionJump());

      let jumpResult: { section: string | null; field: string | null } = { section: null, field: null };
      act(() => {
        jumpResult = result.current.jumpToFirstError({});
      });

      expect(jumpResult.section).toBeNull();
      expect(jumpResult.field).toBeNull();
    });

    it('supports tabbed layouts by scrolling the container to top and finding the field', () => {
      const onExpandSection = vi.fn();
      const scrollToMock = vi.fn();
      const container = document.createElement('div');
      container.scrollTo = scrollToMock;
      document.body.appendChild(container);

      const field = document.createElement('input');
      field.name = 'baristaName';
      field.scrollIntoView = vi.fn();
      field.focus = vi.fn();
      document.body.appendChild(field);

      const { result } = renderHook(() =>
        useSectionJump({
          isTabbed: true,
          scrollContainerRef: { current: container },
          fieldSectionMapping: { baristaName: 'basic' },
          onExpandSection,
        })
      );

    act(() => {
      result.current.jumpToFieldError('baristaName');
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(scrollToMock).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
      expect(field.focus).toHaveBeenCalled();

      document.body.removeChild(container);
      document.body.removeChild(field);
    });
  });

  describe('localStorage persistence', () => {
    it('persists a section jump to localStorage', () => {
      const { result } = renderHook(() =>
        useSectionJump({ storageKey: 'test-record-section' })
      );

      act(() => {
        result.current.jumpToSection('payment', 'section-header-payment');
      });

      const stored = JSON.parse(localStorage.getItem('test-record-section')!);
      expect(stored.sectionId).toBe('payment');
      expect(stored.fieldName).toBeNull();
      expect(typeof stored.timestamp).toBe('number');
    });

    it('persists a field error jump to localStorage', () => {
      const { result } = renderHook(() =>
        useSectionJump({
          storageKey: 'test-record-section',
          fieldSectionMapping: { baristaName: 'basic' },
        })
      );

      act(() => {
        result.current.jumpToFieldError('baristaName');
      });

      const stored = JSON.parse(localStorage.getItem('test-record-section')!);
      expect(stored.sectionId).toBe('basic');
      expect(stored.fieldName).toBe('baristaName');
    });

    it('restores the persisted section on mount without animating', () => {
      localStorage.setItem(
        'test-record-section',
        JSON.stringify({ sectionId: 'supervisor', fieldName: null, timestamp: Date.now() })
      );

      const onExpandSection = vi.fn();
      const { result } = renderHook(() =>
        useSectionJump({
          storageKey: 'test-record-section',
          onExpandSection,
        })
      );

      expect(result.current.restoredSection).toBe('supervisor');
      expect(result.current.restoredField).toBeNull();
      expect(result.current.highlightedSection).toBeNull();
      expect(onExpandSection).toHaveBeenCalledWith('supervisor');
    });

    it('restores the persisted field on mount', () => {
      localStorage.setItem(
        'test-record-section',
        JSON.stringify({ sectionId: 'basic', fieldName: 'maintenanceDate', timestamp: Date.now() })
      );

      const onExpandSection = vi.fn();
      const { result } = renderHook(() =>
        useSectionJump({
          storageKey: 'test-record-section',
          fieldSectionMapping: { maintenanceDate: 'basic' },
          onExpandSection,
        })
      );

      expect(result.current.restoredSection).toBe('basic');
      expect(result.current.restoredField).toBe('maintenanceDate');
      expect(onExpandSection).toHaveBeenCalledWith('basic');
    });

    it('does not persist when no storageKey is provided', () => {
      const { result } = renderHook(() => useSectionJump());

      act(() => {
        result.current.jumpToSection('notes');
      });

      expect(localStorage.length).toBe(0);
    });

    it('isolates positions between different keys', () => {
      localStorage.setItem(
        'record-a',
        JSON.stringify({ sectionId: 'basic', fieldName: 'maintenanceDate', timestamp: Date.now() })
      );
      localStorage.setItem(
        'record-b',
        JSON.stringify({ sectionId: 'photos', fieldName: null, timestamp: Date.now() })
      );

      const { result: resultA } = renderHook(() => useSectionJump({ storageKey: 'record-a' }));
      const { result: resultB } = renderHook(() => useSectionJump({ storageKey: 'record-b' }));

      expect(resultA.current.restoredSection).toBe('basic');
      expect(resultB.current.restoredSection).toBe('photos');
    });

    it('overwrites the stored position on a new jump', () => {
      const { result } = renderHook(() =>
        useSectionJump({ storageKey: 'test-record-section' })
      );

      act(() => {
        result.current.jumpToSection('basic');
      });

      act(() => {
        result.current.jumpToSection('notes');
      });

      const stored = JSON.parse(localStorage.getItem('test-record-section')!);
      expect(stored.sectionId).toBe('notes');
    });

    it('ignores corrupt localStorage entries gracefully', () => {
      localStorage.setItem('test-record-section', 'not-json');

      const onExpandSection = vi.fn();
      const { result } = renderHook(() =>
        useSectionJump({ storageKey: 'test-record-section', onExpandSection })
      );

      expect(result.current.restoredSection).toBeNull();
      expect(onExpandSection).not.toHaveBeenCalled();
    });
  });
});
