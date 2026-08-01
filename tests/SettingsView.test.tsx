import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from './testUtils';
import SettingsView from '../src/views/SettingsView';
import { ToastProvider } from '../components/ToastContext';
import { useMachineNames, useCompanyMachines } from '../hooks/useLogisticsOperations';
import { useCustomCatalog } from '../hooks/useCustomCatalog';

const machinesReturn = {
  machines: [],
  isLoading: false,
  error: null,
  addMachine: vi.fn(),
  updateMachine: vi.fn(),
  deleteMachine: vi.fn(),
  refresh: vi.fn(),
};

const namesReturn = {
  names: [],
  isLoading: false,
  error: null,
  addMachineName: vi.fn(),
  deleteMachineName: vi.fn(),
  mergeMachineNames: vi.fn(),
  refresh: vi.fn(),
};

const catalogReturn = {
  customParts: [],
  customServices: [],
  customProblems: [],
  isLoading: false,
  error: null,
  refresh: vi.fn(),
  addItem: vi.fn(),
  updateItem: vi.fn(),
  deleteItem: vi.fn(),
};

// Mock the logistics hooks — the machines tab uses both company machines and
// saved machine names management (mirrors CompanyMachinesSettings.test.tsx).
vi.mock('../hooks/useLogisticsOperations', async () => {
  const actual = await vi.importActual('../hooks/useLogisticsOperations');
  return {
    ...actual,
    useCompanyMachines: vi.fn(() => machinesReturn),
    useMachineNames: vi.fn(() => namesReturn),
  };
});

// Mock the custom catalog hook — the catalog tab lists services/parts/problems.
vi.mock('../hooks/useCustomCatalog', async () => {
  const actual = await vi.importActual('../hooks/useCustomCatalog');
  return {
    ...actual,
    useCustomCatalog: vi.fn(() => catalogReturn),
  };
});

const renderPage = () =>
  render(
    <ToastProvider>
      <SettingsView />
    </ToastProvider>,
  );

describe('SettingsView — tabs', () => {
  beforeEach(() => {
    cleanup();
    vi.resetAllMocks();
    // vi.resetAllMocks() wipes the factory implementations above — re-set the
    // hook return values so every test renders (mirrors CompanyMachinesSettings.test.tsx).
    vi.mocked(useCompanyMachines).mockReturnValue(machinesReturn);
    vi.mocked(useMachineNames).mockReturnValue(namesReturn);
    vi.mocked(useCustomCatalog).mockReturnValue(catalogReturn);
  });

  it('renders both tab buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'إدارة الماكينات' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'الكتالوج المخصص' })).toBeInTheDocument();
  });

  it('shows the machines settings by default', () => {
    renderPage();
    expect(screen.getByText('إدارة ماكينات الشركة')).toBeInTheDocument();
    expect(screen.queryByText('إدارة الكتالوج المخصص')).not.toBeInTheDocument();
  });

  it('switches to the custom catalog tab', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'الكتالوج المخصص' }));
    await waitFor(() => {
      expect(screen.getByText('إدارة الكتالوج المخصص')).toBeInTheDocument();
    });
    expect(screen.queryByText('إدارة ماكينات الشركة')).not.toBeInTheDocument();
  });

  it('switches back to the machines tab', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'الكتالوج المخصص' }));
    fireEvent.click(screen.getByRole('button', { name: 'إدارة الماكينات' }));
    expect(screen.getByText('إدارة ماكينات الشركة')).toBeInTheDocument();
  });
});
