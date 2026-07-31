import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from './testUtils';
import MobileMaintenanceEditor from '../components/MobileMaintenanceEditor';
import { ToastProvider } from '../components/ToastContext';
import { partsList, servicesList, problemCategories } from '../constants';
import { MaintenanceRecord } from '../types';

vi.mock('../components/forms/hooks/useAutoSave', () => ({
  useAutoSave: vi.fn(() => ({
    isSaving: false, lastSaved: null, hasUnsavedChanges: false, versionCount: 0,
    saveNow: vi.fn(), clearSaved: vi.fn(), restore: vi.fn(), getVersions: vi.fn(), restoreVersion: vi.fn(),
  })),
}));

import { useAutoSave } from '../components/forms/hooks/useAutoSave';

const allPredefinedProblems = problemCategories.flatMap((cat) =>
  cat.options.map((opt) => opt.value)
);

const renderWithProviders = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

const createRecord = (overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord => ({
  id: 1, maintenanceDate: '2025-06-15', baristaName: 'Test Technician',
  hadProblem: true, problems: [], partsWereReplaced: false, partsReplaced: [],
  servicesPerformed: [], notes: '', recommendations: '', type: 'scheduled',
  problemSolved: false, paidBy: 'company', visitRating: 0, visitZone: null,
  followUpVisits: [], machines: [], supervisors: [], dailyLeaseCost: undefined,
  nextVisitDate: '', photos: [], ...overrides,
});

// Helper: navigate to a stepper step
const goToStep = (step: number) => {
  const btn = document.querySelector(`#step-node-${step} button`) as HTMLButtonElement;
  if (btn) fireEvent.click(btn);
};

describe('MobileMaintenanceEditor', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => {
    cleanup(); localStorage.clear();
    // Ensure the per-test useAutoSave mock override (if any) never leaks into
    // other tests, even when the test body fails early.
    vi.mocked(useAutoSave).mockImplementation(
      () => ({
        isSaving: false, lastSaved: null, hasUnsavedChanges: false, versionCount: 0,
        saveNow: vi.fn(), clearSaved: vi.fn(), restore: vi.fn(),
        getVersions: vi.fn(), restoreVersion: vi.fn(),
      }),
    );
  });

  const baseProps = {
    onChange: vi.fn(), partsList, servicesList, problemCategories,
    allPredefinedProblems, baristas: [],
  } as const;

  it('navigates from basic info to problems step using the stepper', () => {
    const record = createRecord();
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));
    goToStep(2);

    expect(screen.getByText(problemCategories[0].title)).toBeInTheDocument();
  });

  it('stores selected parts using PartRecord shape (name/count/cost)', () => {
    const record = createRecord({ partsWereReplaced: true });
    const onChange = vi.fn();
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} onChange={onChange} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));
    goToStep(3);

    const partButton = screen.getByText(partsList[0].label);
    fireEvent.click(partButton);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        partsReplaced: [{ name: partsList[0].label, count: 1, cost: partsList[0].cost }],
      }),
    ]);
  });

  it('stores selected services using ServiceRecord shape (name/count/cost)', () => {
    const record = createRecord();
    const onChange = vi.fn();
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} onChange={onChange} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));
    goToStep(4);

    const serviceButton = screen.getByText(servicesList[0].label);
    fireEvent.click(serviceButton);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        servicesPerformed: [{ name: servicesList[0].label, count: 1, cost: servicesList[0].cost }],
      }),
    ]);
  });

  it('deselects a part when clicking an already selected part', () => {
    const record = createRecord({
      partsWereReplaced: true,
      partsReplaced: [{ name: partsList[0].label, count: 1, cost: partsList[0].cost }],
    });
    const onChange = vi.fn();
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} onChange={onChange} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));
    goToStep(3);

    const partButton = screen.getByText(partsList[0].label);
    fireEvent.click(partButton);

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ partsReplaced: [] })]);
  });

  it('deselects a service when clicking an already selected service', () => {
    const record = createRecord({
      servicesPerformed: [{ name: servicesList[0].label, count: 1, cost: servicesList[0].cost }],
    });
    const onChange = vi.fn();
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} onChange={onChange} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));
    goToStep(4);

    const serviceButton = screen.getByText(servicesList[0].label);
    fireEvent.click(serviceButton);

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ servicesPerformed: [] })]);
  });

  it('toggles partsWereReplaced when the checkbox is clicked', () => {
    const record = createRecord({ partsWereReplaced: false });
    const onChange = vi.fn();
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} onChange={onChange} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));
    goToStep(3);

    const checkbox = screen.getByTestId('parts-were-replaced');
    fireEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ partsWereReplaced: true })]);
  });

  it('applies selected styling to selected parts and services', () => {
    const record = createRecord({
      partsWereReplaced: true,
      partsReplaced: [{ name: partsList[0].label, count: 1, cost: partsList[0].cost }],
      servicesPerformed: [{ name: servicesList[0].label, count: 1, cost: servicesList[0].cost }],
    });
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));

    goToStep(3);
    const partButton = screen.getByText(partsList[0].label).closest('button');
    expect(partButton).toHaveClass('border-teal-500');

    goToStep(4);
    const serviceButton = screen.getByText(servicesList[0].label).closest('button');
    expect(serviceButton).toHaveClass('border-teal-500');
  });

  it('shows empty state on problems step when no problems reported', () => {
    const record = createRecord({ hadProblem: false });
    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} />);

    fireEvent.click(screen.getByText(record.maintenanceDate));
    goToStep(2);

    expect(screen.getByText('لم يتم الإبلاغ عن أي مشاكل')).toBeInTheDocument();
  });

  it('restores an auto-saved draft when the editor opens', () => {
    const record = createRecord();
    const saved = { ...record, baristaName: 'Restored Tech' };
    const onChange = vi.fn();

    // useAutoSave is called on every render (the hook is called twice: once
    // before the editor opens, once after), so mockImplementation is required
    // rather than mockReturnValueOnce. afterEach resets it for other tests.
    vi.mocked(useAutoSave).mockImplementation(() => ({
      isSaving: false, lastSaved: null, hasUnsavedChanges: false, versionCount: 0,
      saveNow: vi.fn(), clearSaved: vi.fn(), restore: () => saved,
      getVersions: vi.fn(), restoreVersion: vi.fn(),
    }));

    renderWithProviders(<MobileMaintenanceEditor records={[record]} {...baseProps} onChange={onChange} />);

    // Open the editor — the auto-saved draft should be pushed back to the parent
    fireEvent.click(screen.getByText(record.maintenanceDate));

    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ baristaName: 'Restored Tech' })]);
  });
});
