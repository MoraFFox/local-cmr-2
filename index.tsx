import React from 'react';
import ReactDOM from 'react-dom/client';
// Tailwind + fonts + animations entry. Imported first so build output
// is a single purged CSS file (replaces the former CDN tailwind script).
import './index.css';
// FIX: Explicitly import with .tsx extension to resolve module error.
import { BrowserRouter } from 'react-router-dom';
import AppRouter from './components/AppRouter.tsx';
import { ToastProvider } from './components/ToastContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import DebugPanel from './components/DebugPanel.tsx';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
        {import.meta.env.DEV && <DebugPanel />}
      </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
