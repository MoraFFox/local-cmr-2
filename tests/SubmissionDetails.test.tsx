import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from './testUtils';
import SubmissionDetails from '../components/SubmissionDetails';
import type { FormData } from '../types';

vi.mock('../hooks/useLogisticsOperations', () => ({
  useLogisticsOperations: () => ({ operations: [] }),
}));

vi.mock('../components/DateRangeExportModal', () => ({
  default: () => null,
}));

vi.mock('../utils/internalReportPdf', () => ({
  generateInternalCompanyReport: vi.fn(),
  generateInternalBranchReport: vi.fn(),
  generateClientCompanyReport: vi.fn(),
  generateClientBranchReport: vi.fn(),
  generateCostCompanyReport: vi.fn(),
  generateCostBranchReport: vi.fn(),
  generateInternalVisitReport: vi.fn(),
  generateClientVisitReport: vi.fn(),
  generateCostVisitReport: vi.fn(),
}));

vi.mock('../utils/missingDataPdf', () => ({
  generateMissingDataPDF: vi.fn(),
  parseMissingDataPDF: vi.fn(),
  applyParsedMissingData: vi.fn(),
}));

vi.mock('../components/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn(), removeToast: vi.fn() }),
}));

vi.mock('../components/ui/ConfirmDialog', () => ({
  ConfirmDialog: () => null,
}));

const submission = {
  id: 3,
  companyName: 'Gourmet',
  email: 'hello@gourmet.example',
  taxNumber: '12345',
  location: 'Zamalek',
  hasBranches: true,
  usesOurMachines: null,
  machines: [],
  branchCount: 2,
  branches: [
    {
      id: 10,
      branchName: 'Zamalek Branch',
      email: 'zamalek@gourmet.example',
      taxNumber: '',
      location: 'Zamalek',
      contacts: [],
      baristas: [],
      clientBaristas: [],
      usesOurMachines: false,
      machines: [],
      maintenanceHistory: [
        {
          id: 101,
          maintenanceDate: '2026-07-22',
          type: 'scheduled',
          hadProblem: true,
          partsWereReplaced: false,
          problemSolved: false,
          partsReplaced: [],
          paidBy: 'company',
          baristaName: 'Tech One',
          visitZone: null,
          servicesPerformed: [],
          supervisors: [],
        },
      ],
    },
    {
      id: 11,
      branchName: 'Sodic Branch',
      email: '',
      taxNumber: '',
      location: 'Sodic',
      contacts: [],
      baristas: [],
      clientBaristas: [],
      usesOurMachines: false,
      machines: [],
      maintenanceHistory: [],
    },
  ],
  warehouse: { location: '', contacts: [] },
  baristas: [],
  maintenanceHistory: [
    {
      id: 100,
      maintenanceDate: '2026-07-10',
      type: 'requested',
      hadProblem: false,
      partsWereReplaced: false,
      problemSolved: true,
      partsReplaced: [],
      paidBy: 'company',
      baristaName: 'Tech One',
      visitZone: null,
      servicesPerformed: [],
      supervisors: [],
    },
  ],
  contacts: [
    {
      id: 1,
      name: 'Mohamed Moussa',
      position: 'Purchasing Manager',
      phoneNumbers: [{ id: 1, number: '0111-904-4374' }],
    },
  ],
  coffeeConsumptionKg: 40,
  pendingSync: false,
  created_at: '2026-07-10T00:00:00.000Z',
} as FormData & { created_at: string };

describe('SubmissionDetails company summary', () => {
  beforeEach(() => {
    window.localStorage.setItem('cmr-language', 'en');
  });

  it('shows operational metrics, information tiles, and an actionable contact', () => {
    render(<SubmissionDetails submission={submission} onBack={vi.fn()} />);

    expect(screen.getByText('Gourmet')).toBeInTheDocument();
    expect(screen.getByText('Synced')).toBeInTheDocument();
    expect(within(screen.getByTestId('summary-branches')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('summary-visits')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('summary-last-visit')).getByText(/2026/)).toBeInTheDocument();
    expect(within(screen.getByTestId('summary-open-issues')).getByText('1')).toBeInTheDocument();
    const companyInformation = screen.getByRole('region', { name: 'Company information' });
    expect(within(companyInformation).getByText('Zamalek')).toBeInTheDocument();
    expect(screen.getByText('40 kg/month')).toBeInTheDocument();

    const phone = screen.getByRole('link', { name: '0111-904-4374' });
    expect(phone).toHaveAttribute('href', 'tel:0111-904-4374');
    expect(screen.getByText('Purchasing Manager')).toBeInTheDocument();
  });

  it('organizes record actions and date filtering for mobile and desktop use', () => {
    const onBack = vi.fn();
    render(<SubmissionDetails submission={submission} onBack={onBack} />);

    const actions = screen.getByRole('region', { name: 'Record actions' });
    expect(within(actions).getByRole('heading', { name: 'Record actions' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'رفع PDF مكتمل' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'استكمال بيانات ناقصة (PDF)' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'استكمال بيانات ناقصة (Word)' })).toBeInTheDocument();
    expect(within(actions).getByRole('button', { name: 'Export Full Report' })).toBeInTheDocument();
    expect(within(actions).getByText('Download a PDF or Word template to complete missing company data.')).toBeInTheDocument();

    const filter = screen.getByRole('region', { name: 'Filter maintenance history' });
    const clearButton = within(filter).getByRole('button', { name: 'Clear' });
    expect(within(filter).getByText('Choose a date range to update the records and summary metrics.')).toBeInTheDocument();
    expect(clearButton).toBeDisabled();

    fireEvent.change(within(filter).getByLabelText('Filter start date'), {
      target: { value: '2026-07-01' },
    });
    expect(clearButton).toBeEnabled();
    fireEvent.click(clearButton);
    expect(within(filter).getByLabelText('Filter start date')).toHaveValue('');

    fireEvent.click(screen.getByRole('button', { name: 'Back to History' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('keeps the report options popup inside a narrow viewport and exposes clear format actions', async () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });

    try {
      render(<SubmissionDetails submission={submission} onBack={vi.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Export Full Report' }));

      const popup = await screen.findByRole('menu', { name: 'Export Full Report options' });
      const popupSurface = popup.parentElement as HTMLElement;
      expect(popupSurface).toHaveClass('max-w-[calc(100vw-1rem)]');
      expect(popupSurface).toHaveClass('max-h-[calc(100vh-1rem)]');
      const internalPdf = within(popup).getByRole('menuitem', { name: 'Internal Report PDF' });
      const internalWord = within(popup).getByRole('menuitem', { name: 'Internal Report Word' });
      const costWord = within(popup).getByRole('menuitem', { name: 'Cost Report Word' });
      expect(internalPdf).toBeInTheDocument();
      expect(within(popup).getByRole('menuitem', { name: 'Client Report Word' })).toBeInTheDocument();

      await waitFor(() => {
        expect(document.activeElement).toBe(internalPdf);
      });
      fireEvent.keyDown(popup, { key: 'ArrowDown' });
      expect(document.activeElement).toBe(internalWord);
      fireEvent.keyDown(popup, { key: 'End' });
      expect(document.activeElement).toBe(costWord);
      fireEvent.keyDown(popup, { key: 'Home' });
      expect(document.activeElement).toBe(internalPdf);

      await waitFor(() => {
        expect(popupSurface.style.left).toBe('8px');
      });
      expect(Number.parseFloat(popupSurface.style.left) + 288).toBeLessThanOrEqual(312);

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu', { name: 'Export Full Report options' })).not.toBeInTheDocument();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Export Full Report' }));
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });

  it('shows branch summaries before the branch details are opened', () => {
    render(<SubmissionDetails submission={submission} onBack={vi.fn()} />);

    expect(screen.getByText('Zamalek Branch')).toBeInTheDocument();
    expect(screen.getByText('1 maintenance visit')).toBeInTheDocument();
    expect(screen.getByText(/1 open issue/)).toBeInTheDocument();
    expect(screen.getByText('Sodic Branch')).toBeInTheDocument();
    expect(screen.getByText('No maintenance visits')).toBeInTheDocument();
  });

  it('uses structured branch details, contact empty states, and maintenance status metrics when opened', () => {
    render(<SubmissionDetails submission={submission} onBack={vi.fn()} />);

    fireEvent.click(screen.getByTestId('branch-card-title-10'));

    const branchInfo = screen.getByRole('region', { name: 'Branch information' });
    expect(within(branchInfo).getAllByText('Zamalek').length).toBeGreaterThan(0);
    expect(within(branchInfo).getByText('zamalek@gourmet.example')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Branch contacts' })).toHaveTextContent('No contacts listed');
    expect(screen.getByTestId('branch-10-visits')).toHaveTextContent('1');
    expect(screen.getByTestId('branch-10-open-issues')).toHaveTextContent('1');
    const maintenance = screen.getByRole('region', { name: 'Maintenance & logistics history' });
    expect(maintenance).toHaveTextContent('Review work performed');
    expect(within(maintenance).getByText('No work details recorded')).toBeInTheDocument();
    expect(within(maintenance).queryByText('دورة غسيل الجروب')).not.toBeInTheDocument();
    const detailsButton = within(maintenance).getByRole('button', { name: /View details 2026-07-22/ });
    fireEvent.click(detailsButton);
    expect(detailsButton).toHaveAttribute('aria-controls', 'maintenance-details-101');
    expect(within(maintenance).getByText('open issue')).toBeInTheDocument();
    expect(detailsButton).toHaveAttribute('aria-label', 'Hide details 2026-07-22 — Tech One');
    expect(screen.getAllByRole('button', { name: /Visit Report/ }).some((button) => button.parentElement?.className.includes('[&>button]:border'))).toBe(true);
  });

  it('keeps an opened branch card contained at 320px with compact mobile actions', () => {
    const originalInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 320 });

    try {
      render(<SubmissionDetails submission={submission} onBack={vi.fn()} />);
      fireEvent.click(screen.getByTestId('branch-card-title-10'));

      const actions = screen.getByTestId('branch-card-actions-10');
      expect(actions).toHaveClass('hidden', 'sm:flex');
      expect(screen.getByRole('region', { name: 'Branch information' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Branch contacts' })).toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Maintenance & logistics history' })).toBeInTheDocument();
      const mobilePrint = screen.getByRole('button', { name: 'Print Branch Report' });
      expect(mobilePrint.parentElement?.parentElement).toHaveClass('min-w-0', 'min-[360px]:col-span-2');
      expect(mobilePrint.parentElement?.parentElement?.parentElement).toHaveClass('mb-4', 'grid', 'sm:hidden');
      expect(screen.getByTestId('branch-10-visits')).toBeInTheDocument();
    } finally {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalInnerWidth });
    }
  });

  it('renders an intentional maintenance empty state for a branch with no records', () => {
    render(<SubmissionDetails submission={submission} onBack={vi.fn()} />);

    fireEvent.click(screen.getByTestId('branch-card-title-11'));

    const maintenance = screen.getByRole('region', { name: 'Maintenance & logistics history' });
    expect(within(maintenance).getByText('No records to display')).toBeInTheDocument();
    expect(within(maintenance).getByText('No maintenance or logistics records match filter.')).toBeInTheDocument();
  });

  it('keeps long branch names readable beside the desktop action toolbar', () => {
    const longName = 'New Cairo International Roastery and Training Center Branch';
    const longNameSubmission = {
      ...structuredClone(submission),
      branches: [{ ...structuredClone(submission.branches[0]), branchName: longName }],
    } as FormData & { created_at: string };

    render(<SubmissionDetails submission={longNameSubmission} onBack={vi.fn()} />);

    const branchTitle = screen.getByTestId('branch-card-title-10');
    expect(branchTitle).toHaveTextContent(longName);
    expect(branchTitle).toHaveClass('break-words', 'whitespace-normal');
    expect(branchTitle).not.toHaveClass('truncate');
    const actionToolbar = screen.getByTestId('branch-card-actions-10');
    expect(actionToolbar).toHaveClass('min-w-0', 'flex-wrap', 'justify-end');
    expect(screen.getByRole('button', { name: /Export Full Report/ })).toBeInTheDocument();
  });


  it('keeps company and branch metrics aligned with date filters and report exclusions', () => {
    const filteredFixture = structuredClone(submission);
    const firstBranch = filteredFixture.branches[0];
    const rootVisit = firstBranch.maintenanceHistory[0];
    firstBranch.maintenanceHistory = [
      {
        ...rootVisit,
        maintenanceDate: '2026-07-24',
        followUpVisits: [
          {
            ...rootVisit,
            id: 102,
            maintenanceDate: '2026-07-25',
            hadProblem: false,
            problemSolved: true,
            followUpVisits: [],
          },
        ],
      },
      {
        ...rootVisit,
        id: 103,
        maintenanceDate: '2026-07-26',
        isLogisticsVisit: true,
      },
    ];

    render(<SubmissionDetails submission={filteredFixture} onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Filter start date'), {
      target: { value: '2026-07-23' },
    });
    fireEvent.change(screen.getByLabelText('Filter end date'), {
      target: { value: '2026-07-31' },
    });

    expect(within(screen.getByTestId('summary-visits')).getByText('2')).toBeInTheDocument();
    expect(within(screen.getByTestId('summary-open-issues')).getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2 maintenance visits')).toBeInTheDocument();
    expect(screen.getByText(/1 open issue/)).toBeInTheDocument();
  });
});
