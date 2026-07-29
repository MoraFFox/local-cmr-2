import '@testing-library/jest-dom';

// Polyfill requestAnimationFrame for jsdom (used by useSectionJump for DOM-ready scrolling)
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(cb, 16) as unknown as number;
  };
  globalThis.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id);
  };
}
