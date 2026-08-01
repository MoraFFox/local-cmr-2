import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from './testUtils';
import MachineLogisticsSection from '../components/MachineLogisticsSection';
import { ToastProvider } from '../components/ToastContext';
import type { LogisticsOperation } from '../types';
import { partsList, servicesList, problemCategories } from '../constants';

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
    useMachineNames: vi.fn(() => ({
      names: [],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName: vi.fn(),
      mergeMachineNames: vi.fn(),
      refresh: vi.fn(),
    })),
  };
});

// Mock the merged catalog (parts/services/problem lists) so the selectors render
// the standard constants deterministically without hitting Supabase.
vi.mock('../hooks/useCustomCatalog', async () => {
  const actual = await vi.importActual('../hooks/useCustomCatalog');
  return {
    ...actual,
    useMergedCatalog: vi.fn(() => ({
      parts: partsList,
      services: servicesList,
      problemCategoriesWithCustoms: problemCategories,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      addItem: vi.fn(),
      updateItem: vi.fn(),
      deleteItem: vi.fn(),
    })),
  };
});

import { useLogisticsOperations, useCompanyMachines, useMachineNames } from '../hooks/useLogisticsOperations';

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
  maintenance_issues: ['هاندات غير نظيفة'],
  maintenance_services: [{ name: 'تغيير جوانات', count: 1, cost: 400, paidByClient: false }],
  maintenance_parts: [{ name: 'جوان', count: 1, cost: 100, paidByClient: false }],
  work_done: 'المشاكل: هاندات غير نظيفة | الخدمات: تغيير جوانات | القطع: جوان',
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
    // Restore the empty inventory so tests that stub useCompanyMachines
    // (e.g. the replacement-machine auto-fill test) don't leak state.
    vi.mocked(useCompanyMachines).mockReturnValue({
      machines: [],
      isLoading: false,
      error: null,
      addMachine: vi.fn(),
      updateMachine: vi.fn(),
      deleteMachine: vi.fn(),
      refresh: vi.fn(),
    });
    // Restore the empty saved machine names so tests that stub useMachineNames
    // (e.g. the suggestions dropdown test) don't leak state.
    vi.mocked(useMachineNames).mockReturnValue({
      names: [],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName: vi.fn(),
      mergeMachineNames: vi.fn(),
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
      expect(screen.getByText('Client Machine (Received)')).toBeInTheDocument();
      // Both client and given machine sections render name/type/system fields
      expect(screen.getAllByText('Machine Name').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Machine Type').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('Machine System').length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Given Machine (Delivered to Client)')).toBeInTheDocument();
      expect(screen.getByText('حفظ العملية اللوجستية')).toBeInTheDocument();
    });
  });

  it('saves the machine name fields when creating an operation', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة + تسليم بديلة'));

    await waitFor(() => {
      expect(screen.getByText('حفظ العملية اللوجستية')).toBeInTheDocument();
    });

    // Client + given machine name inputs
    const nameInputs = screen.getAllByPlaceholderText('e.g. La Marzocco Linea');
    expect(nameInputs.length).toBe(2);
    fireEvent.change(nameInputs[0], { target: { value: 'La Marzocco Linea' } });
    fireEvent.change(nameInputs[1], { target: { value: 'Mazzer Super Jolly' } });

    fireEvent.click(screen.getByText('حفظ العملية اللوجستية'));

    const hook = vi.mocked(useLogisticsOperations);
    await waitFor(() => {
      expect(hook.mock.results[0].value.createOperation).toHaveBeenCalledWith(
        expect.objectContaining({
          machine_name: 'La Marzocco Linea',
          given_machine_name: 'Mazzer Super Jolly',
        }),
        100,
      );
    });
  });

  it('auto-fills the given machine name from the selected inventory machine', async () => {
    vi.mocked(useCompanyMachines).mockReturnValue({
      machines: [{ id: 5, name: 'Mazzer Super Jolly', category: 'grinder', machine_type: 'automatic', status: 'available', monthly_rental_price: 2000 }],
      isLoading: false,
      error: null,
      addMachine: vi.fn(),
      updateMachine: vi.fn(),
      deleteMachine: vi.fn(),
      refresh: vi.fn(),
    });

    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة + تسليم بديلة'));

    await waitFor(() => {
      expect(screen.getByText('حفظ العملية اللوجستية')).toBeInTheDocument();
    });

    // Pick the inventory machine as replacement
    const replacementSelect = screen.getByText('الماكينة البديلة (من المخزن)').closest('div')?.querySelector('select');
    expect(replacementSelect).toBeTruthy();
    fireEvent.change(replacementSelect as HTMLSelectElement, { target: { value: '5' } });

    await waitFor(() => {
      const givenName = screen.getAllByPlaceholderText('e.g. La Marzocco Linea')[1];
      expect((givenName as HTMLInputElement).value).toBe('Mazzer Super Jolly');
    });
  });

  it('suggests saved machine names in the name field dropdown', async () => {
    vi.mocked(useMachineNames).mockReturnValue({
      names: [{ id: 1, name: 'La Marzocco Linea' }, { id: 2, name: 'Mazzer Super Jolly' }],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName: vi.fn(),
      mergeMachineNames: vi.fn(),
      refresh: vi.fn(),
    });

    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة + تسليم بديلة'));

    await waitFor(() => {
      expect(screen.getByText('حفظ العملية اللوجستية')).toBeInTheDocument();
    });

    // Focus the client-machine name field → dropdown lists saved names
    const nameInputs = screen.getAllByPlaceholderText('e.g. La Marzocco Linea');
    fireEvent.focus(nameInputs[0]);

    await waitFor(() => {
      expect(screen.getByText('Mazzer Super Jolly')).toBeInTheDocument();
    });

    // Selecting a suggestion fills the field
    fireEvent.click(screen.getByText('Mazzer Super Jolly'));
    expect((nameInputs[0] as HTMLInputElement).value).toBe('Mazzer Super Jolly');
  });

  it('hides the given machine section for pickup_only operations', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة العميل فقط'));

    await waitFor(() => {
      expect(screen.getByText('Client Machine (Received)')).toBeInTheDocument();
      expect(screen.queryByText('Given Machine (Delivered to Client)')).not.toBeInTheDocument();
    });
  });

  it('shows a custom category text input when "Custom" is selected', async () => {
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('استلام ماكينة العميل فقط'));

    const selects = await screen.findAllByDisplayValue('Coffee Machine');
    fireEvent.change(selects[0], { target: { value: 'other' } });

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Type custom type...')).toBeInTheDocument();
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

  it('requires maintenance cost and at least one issue to close an operation', async () => {
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

    // Fill in cost but no issue → issues validation error
    const costInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(costInput, { target: { value: '750' } });
    fireEvent.click(screen.getByText('تأكيد الإغلاق'));
    expect(
      screen.getByText('يجب اختيار مشكلة واحدة على الأقل'),
    ).toBeInTheDocument();

    // Select an issue (Common chip in CheckboxGroup) and close successfully
    fireEvent.click(screen.getByText('هاندات غير نظيفة'));
    fireEvent.click(screen.getByText('تأكيد الإغلاق'));

    const hook = vi.mocked(useLogisticsOperations);
    await waitFor(() => {
      expect(hook.mock.results[0].value.closeOperation).toHaveBeenCalledWith(1, {
        closed_by_record_id: 100,
        close_date: '2026-06-11',
        maintenance_cost: 750,
        maintenance_issues: ['هاندات غير نظيفة'],
        maintenance_services: [],
        maintenance_parts: [],
      });
    });
  });

  it('keeps services and parts sections toggled off by default in the close form', async () => {
    mockHook([openOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('إغلاق هذه العملية'));

    await waitFor(() => {
      expect(screen.getByText(/تكلفة الصيانة المنفذة على ماكينة العميل/)).toBeInTheDocument();
    });

    // Issues section is always visible (required)
    expect(screen.getByText('المشاكل المكتشفة على الماكينة')).toBeInTheDocument();

    // Services & parts bodies hidden by default
    expect(screen.queryByTestId('close-services-body')).not.toBeInTheDocument();
    expect(screen.queryByTestId('close-parts-body')).not.toBeInTheDocument();

    // Toggling them shows the selectors
    fireEvent.click(screen.getByText('الخدمات المنفذة'));
    expect(screen.getByTestId('close-services-body')).toBeInTheDocument();
    fireEvent.click(screen.getByText('قطع الغيار المستبدلة'));
    expect(screen.getByTestId('close-parts-body')).toBeInTheDocument();
  });

  it('auto-fills maintenance cost from selected services and parts in the close form', async () => {
    mockHook([openOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('إغلاق هذه العملية'));

    await waitFor(() => {
      expect(screen.getByText(/تكلفة الصيانة المنفذة على ماكينة العميل/)).toBeInTheDocument();
    });

    const costInput = screen.getByPlaceholderText('0.00');
    expect((costInput as HTMLInputElement).value).toBe(''); // empty initially

    // Add one service (تغيير جوانات = 400)
    fireEvent.click(screen.getByText('الخدمات المنفذة'));
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 تغيير جوانات' }));
    expect((costInput as HTMLInputElement).value).toBe('400');

    // Add one part (جوان = 100) → total 500
    fireEvent.click(screen.getByText('قطع الغيار المستبدلة'));
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 جوان' }));
    expect((costInput as HTMLInputElement).value).toBe('500');

    // Auto-calc hint with live breakdown is shown
    expect(screen.getByText(/محسوبة تلقائياً/)).toBeInTheDocument();
  });

  it('lets the user manually override the auto-calculated cost and recalcs on item changes', async () => {
    mockHook([openOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('إغلاق هذه العملية'));

    await waitFor(() => {
      expect(screen.getByText(/تكلفة الصيانة المنفذة على ماكينة العميل/)).toBeInTheDocument();
    });

    const costInput = screen.getByPlaceholderText('0.00');

    // Add a service → auto 400
    fireEvent.click(screen.getByText('الخدمات المنفذة'));
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 تغيير جوانات' }));
    expect((costInput as HTMLInputElement).value).toBe('400');

    // Manual override is kept
    fireEvent.change(costInput, { target: { value: '999' } });
    expect((costInput as HTMLInputElement).value).toBe('999');

    // Adding another service (تنظيف شاورات = 400) recalculates automatically
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 تنظيف شاورات' }));
    expect((costInput as HTMLInputElement).value).toBe('800');
  });

  it('recalculates maintenance cost when editing services on a closed operation', async () => {
    mockHook([closedOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('تعديل'));

    await waitFor(() => {
      expect(screen.getByText('بيانات الإغلاق')).toBeInTheDocument();
    });

    // Pre-filled from stored close data (400 service + 100 part = 500)
    const costInput = screen.getByDisplayValue('500');

    // The services section is already open (pre-filled). Add another one
    // (تغيير شاورات = 400) → auto-recalc to 900
    fireEvent.click(screen.getByRole('button', { name: 'Add 1 تغيير شاورات' }));
    expect((costInput as HTMLInputElement).value).toBe('900');
  });

  it('shows given machine and structured maintenance info on operation cards', async () => {
    mockHook([openOp, closedOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    // Both open and closed cards show given machine info
    expect(screen.getAllByText(/الماكينة المقدمة:/).length).toBe(2);

    // Operations are numbered sequentially (matching the PDF reports)
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();

    // Closed op: maintenance cost + structured labeled sections shown
    expect(screen.getByText(/تكلفة الصيانة: 500 ج\.م/)).toBeInTheDocument();
    expect(screen.getByText('المشاكل:')).toBeInTheDocument();
    expect(screen.getByText('الخدمات:')).toBeInTheDocument();
    expect(screen.getByText('القطع:')).toBeInTheDocument();

    // Bulleted items render individually (like the PDF sections)
    expect(screen.getByText('هاندات غير نظيفة')).toBeInTheDocument();
    expect(screen.getByText('تغيير جوانات')).toBeInTheDocument();
    expect(screen.getByText('جوان')).toBeInTheDocument();
  });

  it('falls back to legacy work_done text when no structured close data exists', async () => {
    const legacyClosedOp: LogisticsOperation = {
      ...openOp,
      id: 7,
      status: 'closed',
      close_date: '2026-06-25',
      maintenance_cost: 300,
      work_done: 'المشاكل: تسريب مياة | الخدمات: غسيل كامل',
    };
    mockHook([legacyClosedOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    expect(screen.getByText(/الأعمال: المشاكل: تسريب مياة/)).toBeInTheDocument();
  });

  it('opens a printable work order for a single operation with structured details', async () => {
    mockHook([openOp, closedOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    // Both open and closed cards expose a print action
    const printButtons = screen.getAllByText('طباعة أمر العمل');
    expect(printButtons.length).toBe(2);

    // Print the closed operation (#2 — carries the structured close data)
    fireEvent.click(printButtons[1]);

    await waitFor(() => {
      expect(screen.getByText('أمر عمل لوجستي')).toBeInTheDocument();
    });

    // Numbered operation + type + status shown
    expect(screen.getByText('#2')).toBeInTheDocument();
    expect(screen.getByText('استلام ماكينة + تسليم بديلة')).toBeInTheDocument();
    expect(screen.getByText('مغلقة')).toBeInTheDocument();

    // Machines section
    expect(screen.getByText('الماكينات')).toBeInTheDocument();
    expect(screen.getByText(/ماكينة قهوة/)).toBeInTheDocument();

    // Costs section (label and value render as separate spans)
    expect(screen.getByText('التكاليف')).toBeInTheDocument();
    expect(screen.getByText('تكلفة الصيانة:')).toBeInTheDocument();
    expect(screen.getByText('500 ج.م')).toBeInTheDocument();

    // Structured work sections with bullets (matches PDF format)
    expect(screen.getByText('المشاكل:')).toBeInTheDocument();
    expect(screen.getByText('الخدمات:')).toBeInTheDocument();
    expect(screen.getByText('القطع:')).toBeInTheDocument();
    expect(screen.getByText('هاندات غير نظيفة')).toBeInTheDocument();
    expect(screen.getByText('تغيير جوانات')).toBeInTheDocument();
    expect(screen.getByText('جوان')).toBeInTheDocument();
  });

  it('returns to the timeline when going back from the work order', async () => {
    mockHook([openOp]);
    renderWithProviders(<MachineLogisticsSection {...baseProps} />);

    fireEvent.click(screen.getByText('طباعة أمر العمل'));
    await waitFor(() => {
      expect(screen.getByText('أمر عمل لوجستي')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('رجوع'));

    await waitFor(() => {
      expect(screen.getByText(/عمليات لوجستية مفتوحة \(1\)/)).toBeInTheDocument();
      expect(screen.queryByText('أمر عمل لوجستي')).not.toBeInTheDocument();
    });
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
    // Add a second issue
    fireEvent.click(screen.getByText('ضغط الماكينة غير منضبط'));
    fireEvent.click(screen.getByText('حفظ التعديلات'));

    const hook = vi.mocked(useLogisticsOperations);
    await waitFor(() => {
      expect(hook.mock.results[0].value.updateOperation).toHaveBeenCalledWith(
        2,
        expect.objectContaining({
          maintenance_cost: 650,
          maintenance_issues: ['هاندات غير نظيفة', 'ضغط الماكينة غير منضبط'],
          maintenance_services: [{ name: 'تغيير جوانات', count: 1, cost: 400, paidByClient: false }],
          maintenance_parts: [{ name: 'جوان', count: 1, cost: 100, paidByClient: false }],
        }),
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
