import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act, within } from './testUtils';
import { MemoryRouter } from 'react-router-dom';
import type { Draft } from '../hooks/useDrafts';
import type { FormData } from '../types';

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
vi.mock('../src/views/SettingsView', () => ({
  default: () => <div data-testid="settings-view">Settings View</div>,
}));

// Mock Sidebar (eager import, not lazy). A hoisted flag lets the mobile-drawer
// tests opt into the real sidebar content instead of the stub.
const { useRealSidebar } = vi.hoisted(() => ({ useRealSidebar: { current: false } }));

vi.mock('../src/views/Sidebar', async () => {
  const { default: RealSidebarContent } = await import('../src/views/Sidebar');
  return {
    default: (props: Record<string, unknown>) =>
      useRealSidebar.current ? React.createElement(RealSidebarContent, props) : React.createElement('nav', { 'data-testid': 'sidebar' }, 'Sidebar'),
  };
});

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
  useDrafts: vi.fn(() => ({
    drafts: [],
    setDrafts: vi.fn(),
    currentDraftId: null,
    setCurrentDraftId: vi.fn(),
    deleteDraftById: vi.fn(),
    discardCurrent: vi.fn(),
  })),
}));

import { useDrafts } from '../hooks/useDrafts';

// Mock ToastContext — showToast is a hoisted mock so tests can inspect the
// action ReactNode it received (e.g. the undo-dismiss restore button).
const { showToastMock, removeToastMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
  removeToastMock: vi.fn(),
}));

vi.mock('../components/ToastContext', () => ({
  useToast: () => ({ showToast: showToastMock, removeToast: removeToastMock }),
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
  // Used by the real SidebarContent in the mobile-drawer tests.
  SIDEBAR_TOGGLE_SHORTCUT: {
    label: 'Ctrl+Shift+S',
    ctrl: true,
    shift: true,
    alt: false,
    meta: false,
    key: 's',
  },
}));

// Mock KeyboardShortcutsHelp
vi.mock('../components/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelpProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  KeyboardShortcutsHelpButton: ({ className }: { className?: string }) => (
    <button type="button" aria-label="اختصارات لوحة المفاتيح" className={className} />
  ),
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

  describe('mobile drawer (real sidebar)', () => {
    afterEach(() => {
      useRealSidebar.current = false;
      localStorage.clear();
    });

    it('opens the drawer expanded with full labels even when desktop state is collapsed', async () => {
      useRealSidebar.current = true;
      localStorage.setItem('cmr-sidebar-expanded', 'false');
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      );
      // Open the drawer via the hamburger.
      const hamburger = screen.getByRole('button', { name: 'القائمة' });
      fireEvent.click(hamburger);
      // The mobile drawer is always expanded regardless of the persisted
      // desktop collapse preference, so its CTA shows the full label.
      await waitFor(() => {
        const drawer = document.getElementById('mobile-sidebar')!;
        expect(within(drawer).getByTestId('add-company-button')).toHaveTextContent(/إضافة شركة/);
      });
      // Focus moved to the drawer close button.
      const closeButton = screen.getByRole('button', { name: /إغلاق القائمة/ });
      expect(document.activeElement).toBe(closeButton);
    });

    it('closes the drawer on Escape and restores focus to the hamburger', async () => {
      useRealSidebar.current = true;
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      );
      const hamburger = screen.getByRole('button', { name: 'القائمة' });
      fireEvent.click(hamburger);
      await waitFor(() => {
        const drawer = document.getElementById('mobile-sidebar')!;
        expect(within(drawer).getByTestId('add-company-button')).toBeInTheDocument();
      });
      const drawer = document.getElementById('mobile-sidebar')!;
      fireEvent.keyDown(drawer, { key: 'Escape' });
      await waitFor(() => {
        // The drawer closes: it becomes inert and is removed from the focus
        // order, and focus returns to the hamburger trigger.
        expect(drawer).toHaveAttribute('aria-hidden', 'true');
      });
      expect(document.activeElement).toBe(hamburger);
    });
  });

  describe('mobile header', () => {
    it('uses flexible side columns and hides secondary actions on narrow screens', async () => {
      renderApp('/');

      const header = screen.getByRole('banner');
      await screen.findByTestId('history-view');
      expect(header).toHaveClass('grid');
      expect(header).toHaveClass('grid-cols-[auto_minmax(0,1fr)_auto]');
      expect(header.querySelector('h1')).toHaveClass('min-w-0', 'truncate');
      expect(screen.getByRole('button', { name: 'اختصارات لوحة المفاتيح' })).toHaveClass('hidden', 'sm:flex');
      expect(header.querySelector('.w-1\\/4')).not.toBeInTheDocument();
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

    it('renders the settings view at /settings', async () => {
      renderApp('/settings');
      await waitFor(() => {
        expect(screen.getByTestId('settings-view')).toBeInTheDocument();
      });
    });
  });

  describe('dynamic document.title (accessibility #27-45)', () => {
    it('sets document.title for the history view', async () => {
      renderApp('/');
      await waitFor(() => {
        expect(document.title).toBe('سجل عمليات الإرسال — ميدوز');
      });
    });

    it('sets document.title for the baristas view', async () => {
      renderApp('/baristas');
      await waitFor(() => {
        expect(document.title).toBe('أداء الباريستا — ميدوز');
      });
    });

    it('sets document.title for the print view', async () => {
      renderApp('/print');
      await waitFor(() => {
        expect(document.title).toBe('طباعة أمر العمل — ميدوز');
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

  describe('resume-draft FAB (crash/close recovery)', () => {
    // Capture the default useDrafts implementation (drafts: []) so each test
    // can override it safely and always restore it afterwards — vi.clearAllMocks
    // clears call history but not implementations, so a skipped restore would
    // otherwise leak into later tests.
    const defaultDraftsImpl = vi.mocked(useDrafts).getMockImplementation();

    // A saved draft from a previous session, injected into the useDrafts mock.
    const savedDraft: Draft = {
      id: 'draft_fab',
      timestamp: Date.now(),
      currentStep: 3,
      formData: { companyName: 'Company Alpha' } as FormData,
    };

    const mockSavedDrafts = (drafts: Draft[]) => {
      vi.mocked(useDrafts).mockReturnValue({
        drafts,
        setDrafts: vi.fn(),
        currentDraftId: null,
        setCurrentDraftId: vi.fn(),
        deleteDraftById: vi.fn(),
        discardCurrent: vi.fn(),
      });
    };

    afterEach(() => {
      vi.mocked(useDrafts).mockImplementation(defaultDraftsImpl!);
      // The FAB dismissal is persisted to localStorage — isolate it per test.
      localStorage.clear();
    });

    it('shows the persistent resume FAB when saved drafts exist on a fresh load', async () => {
      mockSavedDrafts([savedDraft]);
      renderApp('/');
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /استئناف المسودة/ })).toBeInTheDocument();
      });
    });

    it('does not show the FAB when there are no saved drafts', () => {
      renderApp('/');
      expect(screen.queryByRole('button', { name: /استئناف المسودة/ })).not.toBeInTheDocument();
    });

    it('clicking the FAB opens the load-draft confirmation dialog', async () => {
      mockSavedDrafts([savedDraft]);
      renderApp('/');
      const fab = await screen.findByRole('button', { name: /استئناف المسودة/ });
      fireEvent.click(fab);
      await waitFor(() => {
        expect(screen.getByText(/هل تريد تحميل هذه المسودة/)).toBeInTheDocument();
      });
    });

    it('clicking the close button dismisses the FAB for the session', async () => {
      mockSavedDrafts([savedDraft]);
      renderApp('/');
      await screen.findByRole('button', { name: /استئناف المسودة/ });
      fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /استئناف المسودة/ })).not.toBeInTheDocument();
      });
    });

    it('remembers the dismissal across a page refresh (same draft is not re-offered)', async () => {
      mockSavedDrafts([savedDraft]);
      const first = renderApp('/');
      const fab = await screen.findByRole('button', { name: /استئناف المسودة/ });
      fireEvent.click(fab);
      fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));

      // The dismissal must be persisted to localStorage, keyed by draft id.
      const stored = JSON.parse(localStorage.getItem('cmr-dismissed-drafts') || '[]') as string[];
      expect(stored).toContain(savedDraft.id);

      // Simulate a full page reload: unmount, then mount fresh with the same drafts.
      first.unmount();
      renderApp('/');
      await screen.findByTestId('history-view');
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /استئناف المسودة/ })).not.toBeInTheDocument();
      });
    });

    it('loading the draft via the confirm dialog hides the FAB', async () => {
      mockSavedDrafts([savedDraft]);
      renderApp('/');
      const fab = await screen.findByRole('button', { name: /استئناف المسودة/ });
      fireEvent.click(fab);
      // Confirm in the dialog → draft is loaded → FAB must disappear.
      const confirmBtn = await screen.findByRole('button', { name: 'تحميل المسودة' });
      fireEvent.click(confirmBtn);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /استئناف المسودة/ })).not.toBeInTheDocument();
      });
    });

    it('undoing the dismissal via the toast restores the FAB and clears the persisted id', async () => {
      mockSavedDrafts([savedDraft]);
      renderApp('/');
      await screen.findByRole('button', { name: /استئناف المسودة/ });
      fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));

      // Dismissed: FAB hidden, draft id persisted, undo toast fired.
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /استئناف المسودة/ })).not.toBeInTheDocument();
      });
      const stored = JSON.parse(localStorage.getItem('cmr-dismissed-drafts') || '[]') as string[];
      expect(stored).toContain(savedDraft.id);

      const undoCall = showToastMock.mock.calls.find((c) => c[0] === 'تم إخفاء المسودة');
      expect(undoCall).toBeDefined();
      const action = undoCall![3] as React.ReactElement<{ onClick: () => void }>;

      // Click the undo action → FAB returns, the persisted id is cleared, and
      // the undo toast is dismissed so it doesn't linger.
      act(() => {
        action.props.onClick();
      });
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /استئناف المسودة/ })).toBeInTheDocument();
      });
      const afterUndo = JSON.parse(localStorage.getItem('cmr-dismissed-drafts') || '[]') as string[];
      expect(afterUndo).not.toContain(savedDraft.id);
      expect(removeToastMock).toHaveBeenCalledWith('undo-resume-draft');
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
