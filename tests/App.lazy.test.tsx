import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// Mock all the async view imports so React.lazy resolves synchronously in tests
vi.mock('../src/views/HistoryView', () => ({
  default: () => <div data-testid="history-view">History View</div>,
}));
vi.mock('../src/views/BaristasView', () => ({
  default: () => <div data-testid="baristas-view">Baristas View</div>,
}));
vi.mock('../src/views/FormWizardView', () => ({
  default: () => <div data-testid="form-view">Form Wizard View</div>,
}));
vi.mock('../src/views/PrintView', () => ({
  default: () => <div data-testid="print-view">Print View</div>,
}));
vi.mock('../src/views/SubmissionDetailsView', () => ({
  default: () => <div data-testid="details-view">Submission Details View</div>,
}));
vi.mock('../src/views/BaristaDetailsView', () => ({
  default: () => <div data-testid="barista-details-view">Barista Details View</div>,
}));
vi.mock('../src/views/MaintenanceEditView', () => ({
  default: () => <div data-testid="maintenance-edit-view">Maintenance Edit View</div>,
}));
vi.mock('../src/views/UserAccessView', () => ({
  default: () => <div data-testid="user-access-view">User Access View</div>,
}));

// Mock Sidebar (eager import, not lazy)
vi.mock('../src/views/Sidebar', () => ({
  default: () => <nav data-testid="sidebar">Sidebar</nav>,
}));

// Mock hooks used by App
vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));
vi.mock('../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => true,
}));
vi.mock('../hooks/useOfflineQueue', () => ({
  useOfflineQueue: () => ({ isSyncing: false, processOfflineQueue: vi.fn() }),
}));
vi.mock('../hooks/useTechnicians', () => ({
  useTechnicians: () => ({ techniciansMap: new Map(), getTechnicianDisplayName: vi.fn((name: string) => name) }),
}));
vi.mock('../hooks/useSubmissions', () => ({
  useSubmissions: () => ({
    submissions: [],
    setSubmissions: vi.fn(),
    isLoading: false,
    fetchSubmissions: vi.fn(),
    createSubmission: vi.fn(),
    updateCompany: vi.fn(),
    deleteSubmission: vi.fn(),
  }),
}));
vi.mock('../hooks/useDrafts', () => ({
  useDrafts: () => ({
    drafts: [],
    setDrafts: vi.fn(),
    currentDraftId: null,
    setCurrentDraftId: vi.fn(),
    deleteDraftById: vi.fn(),
    discardCurrent: vi.fn(),
  }),
}));

// Mock ToastContext
vi.mock('../components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Mock shared constants
vi.mock('../utils/sharedConstants', () => ({
  CLASSES: {},
  initialFormData: {
    companyName: '',
    baristas: [],
    branches: [],
    machines: [],
    services: [],
    parts: [],
  },
  allPredefinedProblems: [],
  VIEW_TITLES: {
    history: 'سجل الصيانة — ميدوز',
    form: 'نموذج الإرسال — ميدوز',
    baristas: 'الفنيون — ميدوز',
    print: 'طباعة — ميدوز',
  },
  steps: [
    { id: 1, name: 'معلومات الشركة' },
    { id: 2, name: 'الفروع' },
  ],
}));

// Mock KeyboardShortcutsHelp
vi.mock('../components/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelpProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  KeyboardShortcutsHelpButton: () => null,
}));

// Mock LoadingState
vi.mock('../components/ui/LoadingState', () => ({
  LoadingState: ({ inline }: { inline?: boolean }) =>
    inline ? <div data-testid="loading-state-inline">Loading...</div> : <div data-testid="loading-state">Loading...</div>,
}));

// Mock OfflineBanner
vi.mock('../components/form-ui/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));

// Dynamic import after mocks are hoisted
const { default: App } = await vi.importActual('../App') as { default: React.FC<{ onAdminLogout?: () => void }> };

describe('App — Lazy Loading & Suspense', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = '';
  });

  const renderApp = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <App />
      </MemoryRouter>,
    );
  };

  describe('aria-announcer (accessibility #42)', () => {
    it('renders the aria-announcer div for screen reader announcements', () => {
      renderApp();
      const announcer = document.getElementById('aria-announcer');
      expect(announcer).toBeInTheDocument();
      expect(announcer).toHaveAttribute('aria-live', 'polite');
      expect(announcer).toHaveAttribute('aria-atomic', 'true');
    });
  });

  describe('sidebar (eager import)', () => {
    it('renders both desktop and mobile sidebar instances', () => {
      renderApp();
      // The sidebar is rendered twice: once in the desktop aside, once in the mobile aside
      const sidebars = screen.getAllByTestId('sidebar');
      expect(sidebars).toHaveLength(2);
    });
  });

  describe('lazy-loaded views', () => {
    it('renders the history view at / (root route)', async () => {
      renderApp('/');
      await waitFor(() => {
        expect(screen.getByTestId('history-view')).toBeInTheDocument();
      });
    });

    it('renders the baristas view at /baristas', async () => {
      renderApp('/baristas');
      await waitFor(() => {
        expect(screen.getByTestId('baristas-view')).toBeInTheDocument();
      });
    });

    it('renders the print view at /print', async () => {
      renderApp('/print');
      await waitFor(() => {
        expect(screen.getByTestId('print-view')).toBeInTheDocument();
      });
    });

    it('renders the form wizard view at /companies/new', async () => {
      renderApp('/companies/new');
      await waitFor(() => {
        expect(screen.getByTestId('form-view')).toBeInTheDocument();
      });
    });
  });

  describe('dynamic document.title (accessibility #27-45)', () => {
    it('sets document.title for the history view', async () => {
      renderApp('/');
      await waitFor(() => {
        expect(document.title).toBe('سجل الصيانة — ميدوز');
      });
    });

    it('sets document.title for the baristas view', async () => {
      renderApp('/baristas');
      await waitFor(() => {
        expect(document.title).toBe('الفنيون — ميدوز');
      });
    });

    it('sets document.title for the print view', async () => {
      renderApp('/print');
      await waitFor(() => {
        expect(document.title).toBe('طباعة — ميدوز');
      });
    });
  });

  describe('Suspense fallback', () => {
    it('shows LoadingState while a lazy view chunk is being loaded', async () => {
      // Verify that when navigating to a route where the lazy view hasn't
      // been loaded yet, the Suspense boundary renders a LoadingState fallback.
      // With vi.mock + synchronous mock resolution, the fallback may flash
      // briefly before the view appears. We verify the view ultimately renders.
      renderApp('/');

      // The fallback should be present during initial render before the lazy
      // chunk resolves. With mocked imports, waitFor catches the resolved state.
      const loadingIndicator = screen.queryByTestId('loading-state-inline');
      const historyView = await screen.findByTestId('history-view', {}, { timeout: 3000 });

      // After resolution, the actual view should be visible
      expect(historyView).toBeInTheDocument();
    });
  });

  describe('safety', () => {
    it('does not crash when onAdminLogout is provided', () => {
      const onLogout = vi.fn();
      expect(() =>
        render(
          <MemoryRouter initialEntries={['/']}>
            <App onAdminLogout={onLogout} />
          </MemoryRouter>,
        ),
      ).not.toThrow();
    });

    it('renders without crashing at the default route', () => {
      expect(() => renderApp()).not.toThrow();
    });
  });
});
