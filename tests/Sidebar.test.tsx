import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, within } from './testUtils';
import SidebarContent from '../src/views/Sidebar';
import { ToastProvider } from '../components/ToastContext';
import { useLanguage } from '../utils/LanguageContext';
import type { FormData } from '../types';

// Mocks
vi.mock('../utils/googleSheetsSync', () => ({
  syncAllCompaniesToSheets: vi.fn(),
}));
vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock('../components/KeyboardShortcutsHelp', () => ({
  KeyboardShortcutsHelpButton: ({ className }: { className?: string }) => (
    <button type="button" className={className} aria-label="help">
      help
    </button>
  ),
}));

import { syncAllCompaniesToSheets } from '../utils/googleSheetsSync';

const mockSync = vi.mocked(syncAllCompaniesToSheets);

function makeDraft(id: string, companyName: string): {
  id: string;
  timestamp: number;
  formData: FormData;
  currentStep: number;
} {
  return {
    id,
    timestamp: new Date('2026-07-30T18:01:00').getTime(),
    currentStep: 3,
    formData: { companyName } as FormData,
  };
}

function renderSidebar(props: Partial<React.ComponentProps<typeof SidebarContent>> = {}) {
  const baseProps: React.ComponentProps<typeof SidebarContent> = {
    view: 'history',
    presentation: 'desktop',
    isSidebarExpanded: true,
    theme: 'light',
    drafts: [],
    currentDraftId: null,
    pathname: '/',
    handleViewChange: vi.fn(),
    handleLoadDraft: vi.fn(),
    handleDeleteDraft: vi.fn(),
    toggleTheme: vi.fn(),
    toggleLanguage: vi.fn(),
    language: 'ar',
    onAdminLogout: vi.fn(),
    handleAddNew: vi.fn(),
    setIsSidebarExpanded: vi.fn(),
    setCurrentDraftId: vi.fn(),
    setFormData: vi.fn(),
    setCurrentStep: vi.fn(),
    setView: vi.fn(),
    ...props,
  };
  return {
    props: baseProps,
    ...render(
      <ToastProvider>
        <SidebarContent {...baseProps} />
      </ToastProvider>,
    ),
  };
}

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSync.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the add-company CTA and all sidebar navigation items', () => {
    renderSidebar();
    expect(screen.getByTestId('add-company-button')).toBeInTheDocument();
    // Exact accessible-name matching avoids partial collisions (e.g. "السجل"
    // also matching "كل السجلات").
    expect(screen.getByRole('button', { name: 'السجل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أداء الباريستا' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إدارة الفنيين' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'كل السجلات' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الإعدادات' })).toBeInTheDocument();
  });

  it('uses translated labels when the app language is English', () => {
    // The sidebar reads translations from LanguageContext, so switch the
    // provider language to English (the `language` prop is only used for
    // chevron direction and draft date locale).
    function EnglishSidebar() {
      const { setLanguage } = useLanguage();
      React.useEffect(() => {
        setLanguage('en');
      }, [setLanguage]);
      return (
        <SidebarContent
          view="history"
          presentation="desktop"
          isSidebarExpanded={true}
          theme="light"
          drafts={[]}
          currentDraftId={null}
          pathname="/"
          handleViewChange={vi.fn()}
          handleLoadDraft={vi.fn()}
          handleDeleteDraft={vi.fn()}
          toggleTheme={vi.fn()}
          toggleLanguage={vi.fn()}
          language="en"
          onAdminLogout={vi.fn()}
          handleAddNew={vi.fn()}
          setIsSidebarExpanded={vi.fn()}
          setCurrentDraftId={vi.fn()}
          setFormData={vi.fn()}
          setCurrentStep={vi.fn()}
          setView={vi.fn()}
        />
      );
    }
    render(
      <ToastProvider>
        <EnglishSidebar />
      </ToastProvider>,
    );
    expect(screen.getByRole('button', { name: 'Add Company' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Barista Performance' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'All Records' })).toBeInTheDocument();
  });

  it('marks the active navigation item with aria-current="page"', () => {
    const first = renderSidebar({ view: 'all-records', pathname: '/records' });
    const active = screen.getByRole('button', { name: 'كل السجلات' });
    expect(active).toHaveAttribute('aria-current', 'page');
    // Unmount the first render so queries do not see duplicate sidebars.
    first.unmount();
    // Nested barista detail route marks baristas as active.
    renderSidebar({ view: 'barista-details', pathname: '/baristas/123' });
    expect(screen.getByRole('button', { name: 'أداء الباريستا' })).toHaveAttribute('aria-current', 'page');
  });

  it('opens all collapsed drafts in a centered modal with their details', () => {
    const drafts = [makeDraft('d1', 'Company A'), makeDraft('d2', 'Company B')];
    drafts[0].formData.email = 'a@example.com';
    drafts[0].formData.taxNumber = 'TX-123';
    drafts[0].formData.location = 'Cairo';
    drafts[0].formData.usesOurMachines = true;
    drafts[0].formData.branches = [{
      branchName: 'Downtown Branch',
      location: 'Nasr City',
    } as FormData['branches'][number]];
    drafts[0].formData.machines = [{
      machineName: 'La Marzocco',
      machineType: 'Espresso',
      machineOwner: 'ours',
    } as FormData['machines'][number]];
    const handleLoadDraft = vi.fn();
    renderSidebar({ isSidebarExpanded: false, drafts, handleLoadDraft });

    const toggle = screen.getByRole('button', { name: /فتح المسودات/ });
    expect(toggle).toHaveClass('w-10', 'h-10', 'min-w-10');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    toggle.focus();
    fireEvent.click(toggle);
    const dialog = screen.getByRole('dialog', { name: 'المسودات' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Company A' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Company B' })).toBeInTheDocument();
    expect(screen.getByText('a@example.com')).toBeInTheDocument();
    expect(screen.getByText('TX-123')).toBeInTheDocument();
    expect(screen.getByText('Cairo')).toBeInTheDocument();
    expect(screen.getByText('ماكينات ميدوز')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'إغلاق المسودات' })).toBeInTheDocument();
    const fullDetails = within(dialog).getAllByText('عرض كل التفاصيل')[0];
    expect(fullDetails).toBeInTheDocument();
    fireEvent.click(fullDetails);
    expect(within(dialog).getByText('Downtown Branch · Nasr City')).toBeInTheDocument();
    expect(within(dialog).getByText('La Marzocco · Espresso · ماكينات ميدوز')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'تحميل المسودة' })).toHaveLength(2);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'المسودات' })).not.toBeInTheDocument();
    expect(document.activeElement).toBe(toggle);

    fireEvent.click(toggle);
    const reopenedDialog = screen.getByRole('dialog', { name: 'المسودات' });
    fireEvent.click(reopenedDialog);
    expect(screen.queryByRole('dialog', { name: 'المسودات' })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    fireEvent.click(screen.getAllByRole('button', { name: 'تحميل المسودة' })[0]);
    expect(handleLoadDraft).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1' }));
    expect(screen.queryByRole('dialog', { name: 'المسودات' })).not.toBeInTheDocument();

    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole('button', { name: 'حذف المسودة: Company A' }));
    expect(screen.queryByRole('dialog', { name: 'المسودات' })).not.toBeInTheDocument();
  });

  it('centers every collapsed icon control consistently', () => {
    renderSidebar({ isSidebarExpanded: false, drafts: [makeDraft('d1', 'Company A')] });

    const controls = [
      screen.getByTestId('add-company-button'),
      screen.getByRole('button', { name: 'السجل' }),
      screen.getByRole('button', { name: 'فتح المسودات' }),
      screen.getByRole('button', { name: 'الوضع الليلي' }),
      screen.getByRole('button', { name: 'التبديل إلى الإنجليزية' }),
      screen.getByRole('button', { name: 'help' }),
      screen.getByRole('button', { name: 'مزامنة Sheets' }),
      screen.getByRole('button', { name: 'تسجيل الخروج' }),
    ];

    controls.forEach((control) => {
      expect(control).toHaveClass('w-10', 'h-10', 'min-w-10', 'mx-auto');
    });

    const collapseToggle = screen.getByRole('button', { name: 'فتح الشريط الجانبي' });
    expect(collapseToggle).toHaveClass('w-10', 'h-10', 'start-1/2', 'ltr:-translate-x-1/2', 'rtl:translate-x-1/2');
  });

  it('keeps collapsed tooltip triggers centered in their full-width wrappers', () => {
    renderSidebar({ isSidebarExpanded: false });

    const addButton = screen.getByTestId('add-company-button');
    expect(addButton.parentElement).toHaveClass('w-full', 'justify-center');
  });

  it('requires confirmation before logout is executed', () => {
    const onAdminLogout = vi.fn();
    renderSidebar({ onAdminLogout });
    fireEvent.click(screen.getByRole('button', { name: /تسجيل الخروج/ }));
    expect(onAdminLogout).not.toHaveBeenCalled();
    // Confirm dialog opened (title shown in the dialog).
    expect(screen.getByText(/هل أنت متأكد من تسجيل الخروج/)).toBeInTheDocument();
  });

  it('sets the sync button to a busy disabled state while syncing', async () => {
    let resolveSync!: (value: { success: boolean; error?: string }) => void;
    mockSync.mockImplementation(
      () => new Promise((resolve) => { resolveSync = resolve; }),
    );
    renderSidebar();
    fireEvent.click(screen.getByRole('button', { name: /مزامنة Sheets/ }));
    const busy = await screen.findByRole('button', { name: /جاري المزامنة/ });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    resolveSync!({ success: true });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /مزامنة Sheets/ })).toBeEnabled();
    });
  });
});
