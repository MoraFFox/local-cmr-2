import React from 'react';
import ReactDOM from 'react-dom/client';
// Tailwind + fonts + animations entry. Imported first so build output
// is a single purged CSS file (replaces the former CDN tailwind script).
import './index.css';
// FIX: Explicitly import with .tsx extension to resolve module error.
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './components/AppRouter.tsx';
import { ToastProvider } from './components/ToastContext.tsx';
import { UndoQueueProvider } from './components/UndoQueueContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import DebugPanel from './components/DebugPanel.tsx';
import { LanguageProvider } from './utils/LanguageContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/*
      LanguageProvider must wrap ErrorBoundary/ToastProvider/UndoQueueProvider:
      those providers read translations via useT() themselves, so they need the
      language context to be mounted before (above) them.
    */}
    <LanguageProvider>
      <ErrorBoundary>
        <ToastProvider>
          <UndoQueueProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <AppRouter />
              {import.meta.env.DEV && <DebugPanel />}
            </BrowserRouter>
          </UndoQueueProvider>
        </ToastProvider>
      </ErrorBoundary>
    </LanguageProvider>
  </React.StrictMode>
);
