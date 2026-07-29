import React from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { LanguageProvider } from '../utils/LanguageContext';

/** Renders a React element wrapped in LanguageProvider for tests that use useT()/useLanguage(). */
function render(ui: React.ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: ({ children }) => <LanguageProvider>{children}</LanguageProvider>, ...options });
}

// Re-export everything from @testing-library/react so test files only need one import
export { render };
export { screen, fireEvent, waitFor, within, act, cleanup } from '@testing-library/react';
