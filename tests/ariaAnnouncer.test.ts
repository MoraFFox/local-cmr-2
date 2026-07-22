import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { announce, resetAnnouncer } from '../utils/ariaAnnouncer';

describe('ariaAnnouncer', () => {
  let announcerEl: HTMLDivElement;

  beforeEach(() => {
    // Create a mock aria-announcer div in the DOM
    announcerEl = document.createElement('div');
    announcerEl.id = 'aria-announcer';
    document.body.appendChild(announcerEl);
    // Reset cached element reference
    resetAnnouncer();
    // Mock requestAnimationFrame to execute synchronously in tests
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    // Guard against tests that already removed the element
    if (announcerEl.parentNode === document.body) {
      document.body.removeChild(announcerEl);
    }
    vi.restoreAllMocks();
  });

  describe('announce()', () => {
    it('sets textContent on the aria-announcer element', () => {
      announce('تم تحديد ٣ خدمات');
      expect(announcerEl.textContent).toBe('تم تحديد ٣ خدمات');
    });

    it('clears textContent before setting the new message', () => {
      // Pre-set some content
      announcerEl.textContent = 'old message';

      const setOrder: string[] = [];
      const originalTextContent = Object.getOwnPropertyDescriptor(
        Node.prototype,
        'textContent',
      )!;

      // Spy on textContent setter to track clear-then-set order
      const textContentSpy = vi.fn();
      Object.defineProperty(announcerEl, 'textContent', {
        get() {
          return originalTextContent.get?.call(announcerEl) ?? '';
        },
        set(value: string | null) {
          textContentSpy(value);
          originalTextContent.set?.call(announcerEl, value);
        },
        configurable: true,
      });

      announce('new message');

      // The first set should be empty string (clear), then the message
      expect(textContentSpy).toHaveBeenCalledTimes(2);
      expect(textContentSpy).toHaveBeenNthCalledWith(1, '');
      expect(textContentSpy).toHaveBeenNthCalledWith(2, 'new message');
    });

    it('is a no-op when the announcer element does not exist', () => {
      document.body.removeChild(announcerEl);
      resetAnnouncer();

      // Should not throw
      expect(() => announce('test message')).not.toThrow();
    });

    it('accepts Arabic text', () => {
      announce('تم حفظ التغييرات');
      expect(announcerEl.textContent).toBe('تم حفظ التغييرات');
    });

    it('accepts empty string messages', () => {
      announce('');
      expect(announcerEl.textContent).toBe('');
    });

    it('caches the element reference after first lookup', () => {
      const getElementByIdSpy = vi.spyOn(document, 'getElementById');

      announce('first');
      announce('second');
      announce('third');

      // getElementById should only be called once (cached after first lookup)
      expect(getElementByIdSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetAnnouncer()', () => {
    it('clears the cached element reference', () => {
      announce('first message');
      expect(announcerEl.textContent).toBe('first message');

      resetAnnouncer();

      // After reset, the next announce should re-lookup the element
      const getElementByIdSpy = vi.spyOn(document, 'getElementById');
      announce('second message');
      expect(getElementByIdSpy).toHaveBeenCalledWith('aria-announcer');
      expect(announcerEl.textContent).toBe('second message');
    });

    it('can be called multiple times safely', () => {
      expect(() => {
        resetAnnouncer();
        resetAnnouncer();
        resetAnnouncer();
      }).not.toThrow();
    });
  });
});
