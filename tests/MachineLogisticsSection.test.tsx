import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from './testUtils';
import MachineLogisticsSection from '../components/MachineLogisticsSection';
import { ToastProvider } from '../components/ToastContext';

// Mock the hooks
vi.mock('../hooks/useLogisticsOperations', async () => {
  const actual = await vi.importActual('../hooks/useLogisticsOperations');
  return {
    ...actual,
    useLogisticsOperations: vi.fn(() => ({
      operations: [],
      isLoading: false,
      error: null,
      createOperation: vi.fn(),
      closeOperation: vi.fn(),
      refresh: vi.fn(),
    })),
    useCompanyMachines: vi.fn(() => ({
      machines: [],
      isLoading: false,
      error: null,
      addMachine: vi.fn(),
      updateMachine: vi.fn(),
      deleteMachine: vi.fn(),
      refresh: vi.fn(),
    })),
  };
});

const renderWithProviders = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

describe('MachineLogisticsSection', () => {
  beforeEach(() => {
    cleanup();
  });

  const baseProps = {
    customerId: 1,
    recordId: 100,
    maintenanceDate: '2026-06-11',
  };

  it('renders three visual action cards when no operations exist', () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    expect(screen.getByText('استلام ماكينة + تسليم بديلة')).toBeInTheDocument();
    expect(screen.getByText('تسليم ماكينة بديلة فقط')).toBeInTheDocument();
    expect(screen.getByText('استلام ماكينة العميل فقط')).toBeInTheDocument();
  });

  it('shows empty state when no operations and no action selected', () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    expect(screen.getByText('لا توجد عمليات لوجستية')).toBeInTheDocument();
    expect(
      screen.getByText('أضف عملية لوجستية جديدة لتتبع حركة الماكينات بين العميل والشركة'),
    ).toBeInTheDocument();
  });

  it('shows new operation form when a card is clicked', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة العميل فقط'));

    await waitFor(() => {
      expect(screen.getByText('فئة الماكينة')).toBeInTheDocument();
      expect(screen.getByText('نوع الماكينة')).toBeInTheDocument();
      expect(screen.getByText('حفظ العملية اللوجستية')).toBeInTheDocument();
    });
  });

  it('hides monthly rental price field for pickup_only scenario', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة العميل فقط'));

    await waitFor(() => {
      expect(screen.getByText('تكلفة الاستلام (ج.م)')).toBeInTheDocument();
      expect(screen.getByText('تكلفة الإرجاع (ج.م)')).toBeInTheDocument();
    });

    // Monthly rental should not appear for pickup_only
    expect(screen.queryByText('الإيجار الشهري (ج.م)')).not.toBeInTheDocument();
  });

  it('shows monthly rental price field for pickup_and_deliver scenario', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة + تسليم بديلة'));

    await waitFor(() => {
      expect(screen.getByText('الإيجار الشهري (ج.م)')).toBeInTheDocument();
    });
  });

  it('shows cancel button that resets the form', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    // Click a card to open the form
    fireEvent.click(screen.getByText('استلام ماكينة العميل فقط'));
    await waitFor(() => {
      expect(screen.getByText('حفظ العملية اللوجستية')).toBeInTheDocument();
    });

    // Click cancel
    fireEvent.click(screen.getByText('إلغاء'));

    await waitFor(() => {
      // Should be back to the three cards
      expect(screen.getByText('استلام ماكينة + تسليم بديلة')).toBeInTheDocument();
      expect(screen.queryByText('حفظ العملية اللوجستية')).not.toBeInTheDocument();
    });
  });
});
