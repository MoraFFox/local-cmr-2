import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from './testUtils';
import MachineLogisticsSection from '../components/MachineLogisticsSection';
import { ToastProvider } from '../components/ToastContext';
import type { LogisticsOperation } from '../types';

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
      updateOperation: vi.fn(),
      deleteOperation: vi.fn(),
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

import { useLogisticsOperations } from '../hooks/useLogisticsOperations';

const renderWithProviders = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

const baseProps = {
  customerId: 1,
  recordId: 100,
  maintenanceDate: '2026-06-11',
};

const openOp: LogisticsOperation = {
  id: 1,
  customer_id: 1,
  operation_type: 'pickup_and_deliver',
  status: 'open',
  open_date: '2026-06-11',
  machine_category: 'coffee',
  machine_type: 'manual',
  given_machine_category: 'grinder',
  given_machine_type: 'automatic',
  monthly_rental_price: 3000,
};

const closedOp: LogisticsOperation = {
  ...openOp,
  id: 2,
  status: 'closed',
  close_date: '2026-06-20',
  total_logistics_cost: 4000,
  maintenance_cost: 500,
  work_done: 'تغيير قطع غيار',
};

describe('MachineLogisticsSection', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
    // Restore the default (empty) return value used by tests that don't call mockHook
    vi.mocked(useLogisticsOperations).mockReturnValue({
      operations: [],
      isLoading: false,
      error: null,
      createOperation: vi.fn(),
      closeOperation: vi.fn(),
      updateOperation: vi.fn(),
      deleteOperation: vi.fn(),
      refresh: vi.fn(),
    });
  });

  const mockHook = (ops: LogisticsOperation[]) => {
    const hook = vi.mocked(useLogisticsOperations);
    hook.mockReturnValue({
      operations: ops,
      isLoading: false,
      error: null,
      createOperation: vi.fn(),
      closeOperation: vi.fn(),
      updateOperation: vi.fn(),
      deleteOperation: vi.fn(),
      refresh: vi.fn(),
    });
    return hook;
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

  it('shows new operation form with client and given machine sections when a card is clicked', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة + تسليم بديلة'));

    await waitFor(() => {
      expect(screen.getByText('ماكينة العميل (المستلمة)')).toBeInTheDocument();
      // Both client and given machine sections render category/system selects
      expect(screen.getAllByText('فئة الماكينة').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('نظام الماكينة').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('الماكينة المقدمة للعميل')).toBeInTheDocument();
      expect(screen.getByText('حفظ العملية اللوجستية')).toBeInTheDocument();
    });
  });

  it('hides the given machine section for pickup_only operations', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة العميل فقط'));

    await waitFor(() => {
      expect(screen.getByText('ماكينة العميل (المستلمة)')).toBeInTheDocument();
      expect(screen.queryByText('الماكينة المقدمة للعميل')).not.toBeInTheDocument();
    });
  });

  it('shows a custom category text input when "أخرى" is selected', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة العميل فقط'));

    const selects = await screen.findAllByDisplayValue('ماكينة قهوة');
    fireEvent.change(selects[0], { target: { value: 'other' } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('اكتب الفئة الجديدة...')).toBeInTheDocument();
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

  it('requires maintenance cost and work done to close an operation', async () => {
    mockHook([openOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('إغلاق هذه العملية'));

    await waitFor(() => {
      expect(screen.getByText(/تكلفة الصيانة المنفذة على ماكينة العميل/)).toBeInTheDocument();
    });

    // Attempt close with empty fields → validation error, close not called
    fireEvent.click(screen.getByText('تأكيد الإغلاق'));
    expect(
      screen.getByText('يجب إدخال تكلفة الصيانة (رقم موجب)'),
    ).toBeInTheDocument();

    // Fill in cost but no work done
    const costInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(costInput, { target: { value: '750' } });
    fireEvent.click(screen.getByText('تأكيد الإغلاق'));
    expect(
      screen.getByText('يجب توضيح الأعمال المنفذة على الماكينة'),
    ).toBeInTheDocument();

    // Fill work done and close successfully
    fireEvent.change(
      screen.getByPlaceholderText(/مثال: تغيير قطع غيار/),
      { target: { value: 'تغيير مجموعة التحضير' } },
    );
    fireEvent.click(screen.getByText('تأكيد الإغلاق'));

    const hook = vi.mocked(useLogisticsOperations);
    await waitFor(() => {
      expect(hook.mock.results[0].value.closeOperation).toHaveBeenCalledWith(1, {
        closed_by_record_id: 100,
        close_date: '2026-06-11',
        maintenance_cost: 750,
        work_done: 'تغيير مجموعة التحضير',
      });
    });
  });

  it('shows given machine and maintenance info on operation cards', async () => {
    mockHook([openOp, closedOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    // Both open and closed cards show given machine info
    expect(screen.getAllByText(/الماكينة المقدمة:/).length).toBe(2);

    // Closed op: maintenance cost + work done shown
    expect(screen.getByText(/تكلفة الصيانة: 500 ج\.م/)).toBeInTheDocument();
    expect(screen.getByText(/الأعمال: تغيير قطع غيار/)).toBeInTheDocument();
  });

  it('lets the user edit maintenance fields on a closed operation', async () => {
    mockHook([closedOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('تعديل'));

    await waitFor(() => {
      expect(screen.getByText('بيانات الإغلاق')).toBeInTheDocument();
    });

    // Pre-filled with existing close data
    const costInput = screen.getByDisplayValue('500');
    fireEvent.change(costInput, { target: { value: '650' } });
    fireEvent.change(
      screen.getByDisplayValue('تغيير قطع غيار'),
      { target: { value: 'تغيير مجموعة التحضير + تنظيف' } },
    );
    fireEvent.click(screen.getByText('حفظ التعديلات'));

    const hook = vi.mocked(useLogisticsOperations);
    await waitFor(() => {
      expect(hook.mock.results[0].value.updateOperation).toHaveBeenCalledWith(
        2,
        expect.objectContaining({ maintenance_cost: 650, work_done: 'تغيير مجموعة التحضير + تنظيف' }),
      );
    });
  });

  it('opens edit form pre-filled from an open operation', async () => {
    mockHook([openOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('تعديل'));

    await waitFor(() => {
      expect(screen.getByText(/تعديل العملية/)).toBeInTheDocument();
      expect(screen.getByText('حفظ التعديلات')).toBeInTheDocument();
    });

    // Save calls updateOperation with the edited payload
    fireEvent.click(screen.getByText('حفظ التعديلات'));
    const hook = vi.mocked(useLogisticsOperations);
    await waitFor(() => {
      expect(hook.mock.results[0].value.updateOperation).toHaveBeenCalledWith(1, expect.objectContaining({
        operation_type: 'pickup_and_deliver',
        machine_category: 'coffee',
        given_machine_category: 'grinder',
      }));
    });
  });

  it('deletes an operation after confirmation', async () => {
    mockHook([openOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('حذف'));
    expect(screen.getByText('حذف هذه العملية؟')).toBeInTheDocument();

    fireEvent.click(screen.getByText('تأكيد'));

    const hook = vi.mocked(useLogisticsOperations);
    await waitFor(() => {
      expect(hook.mock.results[0].value.deleteOperation).toHaveBeenCalledWith(1);
    });
  });
});
