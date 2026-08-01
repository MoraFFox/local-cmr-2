import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from './testUtils';
import CompanyMachinesSettings from '../src/views/CompanyMachinesSettings';
import { ToastProvider } from '../components/ToastContext';

// Mock the logistics hooks — the settings page uses both company machines and
// saved machine names management.
vi.mock('../hooks/useLogisticsOperations', async () => {
  const actual = await vi.importActual('../hooks/useLogisticsOperations');
  return {
    ...actual,
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

import { useMachineNames, useCompanyMachines } from '../hooks/useLogisticsOperations';

const renderPage = () =>
  render(
    <ToastProvider>
      <CompanyMachinesSettings />
    </ToastProvider>,
  );

describe('CompanyMachinesSettings — saved machine names', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
    vi.mocked(useCompanyMachines).mockReturnValue({
      machines: [],
      isLoading: false,
      error: null,
      addMachine: vi.fn(),
      updateMachine: vi.fn(),
      deleteMachine: vi.fn(),
      refresh: vi.fn(),
    });
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

  it('shows the saved machine names section', () => {
    renderPage();
    expect(screen.getByText('أسماء الماكينات المحفوظة')).toBeInTheDocument();
  });

  it('lists saved machine names', () => {
    vi.mocked(useMachineNames).mockReturnValue({
      names: [
        { id: 1, name: 'La Marzocco Linea' },
        { id: 2, name: 'Mazzer Super Jolly' },
      ],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName: vi.fn(),
      mergeMachineNames: vi.fn(),
      refresh: vi.fn(),
    });
    renderPage();
    expect(screen.getByText('La Marzocco Linea')).toBeInTheDocument();
    expect(screen.getByText('Mazzer Super Jolly')).toBeInTheDocument();
  });

  it('adds a new machine name', async () => {
    const addMachineName = vi.fn().mockResolvedValue({ id: 3, name: 'Nuova Simonelli' });
    vi.mocked(useMachineNames).mockReturnValue({
      names: [],
      isLoading: false,
      error: null,
      addMachineName,
      deleteMachineName: vi.fn(),
      mergeMachineNames: vi.fn(),
      refresh: vi.fn(),
    });
    renderPage();

    const input = screen.getByPlaceholderText('اكتب اسم ماكينة جديد...');
    fireEvent.change(input, { target: { value: 'Nuova Simonelli' } });
    // Exact name — the page also has "إضافة ماكينة" buttons (header + empty state)
    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }));

    await waitFor(() => {
      expect(addMachineName).toHaveBeenCalledWith('Nuova Simonelli');
    });
    await waitFor(() => {
      expect((input as HTMLInputElement).value).toBe('');
    });
  });

  it('rejects an empty machine name', async () => {
    const addMachineName = vi.fn().mockResolvedValue({ id: 3, name: 'x' });
    vi.mocked(useMachineNames).mockReturnValue({
      names: [],
      isLoading: false,
      error: null,
      addMachineName,
      deleteMachineName: vi.fn(),
      mergeMachineNames: vi.fn(),
      refresh: vi.fn(),
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'إضافة' }));

    await waitFor(() => {
      expect(screen.getByText('اكتب اسم الماكينة أولاً')).toBeInTheDocument();
    });
    expect(addMachineName).not.toHaveBeenCalled();
  });

  it('shows the merge section when case-insensitive duplicates exist', () => {
    vi.mocked(useMachineNames).mockReturnValue({
      names: [
        { id: 1, name: 'La Marzocco' },
        { id: 2, name: 'la marzocco' },
        { id: 3, name: 'Mazzer' },
      ],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName: vi.fn(),
      mergeMachineNames: vi.fn(),
      refresh: vi.fn(),
    });
    renderPage();

    expect(screen.getByText('أسماء مكررة')).toBeInTheDocument();
    // The merge select shows both members, defaulting to the first as keeper
    const keeperSelect = screen.getByLabelText('الاسم الذي سيتم الاحتفاظ به');
    expect(keeperSelect).toHaveValue('1');
    expect(screen.getByRole('option', { name: 'La Marzocco' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'la marzocco' })).toBeInTheDocument();
    // The duplicate to be deleted is listed
    expect(screen.getByText(/سيتم حذف: la marzocco/)).toBeInTheDocument();
  });

  it('merges duplicates keeping the chosen name', async () => {
    const mergeMachineNames = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useMachineNames).mockReturnValue({
      names: [
        { id: 1, name: 'La Marzocco' },
        { id: 2, name: 'la marzocco' },
      ],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName: vi.fn(),
      mergeMachineNames,
      refresh: vi.fn(),
    });
    renderPage();

    // Pick the second (lowercase) variant as the keeper, then merge
    fireEvent.change(screen.getByLabelText('الاسم الذي سيتم الاحتفاظ به'), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'دمج' }));

    await waitFor(() => {
      expect(mergeMachineNames).toHaveBeenCalledWith(2, [1]);
    });
  });

  it('merges duplicates keeping the default first name', async () => {
    const mergeMachineNames = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useMachineNames).mockReturnValue({
      names: [
        { id: 1, name: 'Mazzer Super Jolly' },
        { id: 2, name: '  mazzer super jolly ' },
      ],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName: vi.fn(),
      mergeMachineNames,
      refresh: vi.fn(),
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'دمج' }));

    await waitFor(() => {
      expect(mergeMachineNames).toHaveBeenCalledWith(1, [2]);
    });
  });

  it('does not show the merge section when there are no duplicates', () => {
    renderPage();
    expect(screen.queryByText('أسماء مكررة')).not.toBeInTheDocument();
  });

  it('deletes a saved machine name after confirmation', async () => {
    const deleteMachineName = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useMachineNames).mockReturnValue({
      names: [{ id: 1, name: 'La Marzocco Linea' }],
      isLoading: false,
      error: null,
      addMachineName: vi.fn(),
      deleteMachineName,
      mergeMachineNames: vi.fn(),
      refresh: vi.fn(),
    });
    renderPage();

    fireEvent.click(screen.getAllByTitle('حذف')[0]);
    // The confirm action lives inside the dialog — scope the query so the row's
    // "حذف" delete buttons don't collide with the dialog's confirm button.
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'حذف' }));

    await waitFor(() => {
      expect(deleteMachineName).toHaveBeenCalledWith(1);
    });
  });
});
