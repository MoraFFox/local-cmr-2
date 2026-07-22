import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within, waitFor } from '@testing-library/react';
import MaintenanceRecordEditor from '../components/MaintenanceRecordEditor';
import { ToastProvider } from '../components/ToastContext';
import { generateMockMaintenanceRecord } from '../utils/mockData';
import { MaintenancePhoto } from '../types';
import { ar } from '../utils/arabicTranslations';
import { partsList, servicesList, problemCategories } from '../constants';

vi.mock('../components/forms/hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    isSaving: false, lastSaved: null, hasUnsavedChanges: false, versionCount: 0,
    saveNow: vi.fn(), clearSaved: vi.fn(), restore: vi.fn(), getVersions: vi.fn(), restoreVersion: vi.fn(),
  }),
}));

const allPredefinedProblems = problemCategories.flatMap((cat) => cat.options.map((opt) => opt.value));

const renderWithProviders = (ui: React.ReactElement) => {
  const renderResult = render(<ToastProvider>{ui}</ToastProvider>);
  const rerender = (rerenderUi: React.ReactElement) =>
    renderResult.rerender(<ToastProvider>{rerenderUi}</ToastProvider>);
  return { ...renderResult, rerender };
};

// Helper: navigate the stepper to a specific step by clicking the stepper button
const goToStep = (step: number) => {
  const stepperButton = document.querySelector(`#step-node-${step} button`) as HTMLButtonElement;
  if (stepperButton) fireEvent.click(stepperButton);
};

// Get the step content container
const getStepContent = (step: number) => {
  return document.getElementById(`step-content-${step}`);
};

describe('MaintenanceRecordEditor (stepper)', () => {
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { cleanup(); localStorage.clear(); });

  const baseProps = {
    onSave: vi.fn(), onCancel: vi.fn(), partsList, servicesList, problemCategories,
    allPredefinedProblems, baristas: [], clientBaristas: [],
  };

  const createRecordWithPhotos = (id: number, photos: MaintenancePhoto[]) => ({
    ...generateMockMaintenanceRecord(id, { partsList, servicesList }), photos,
  });

  it('renders before, after, and legacy photo thumbnails from mock data', async () => {
    const photos: MaintenancePhoto[] = [
      { url: 'https://example.com/before1.jpg', type: 'before' },
      { url: 'https://example.com/before2.jpg', type: 'before' },
      { url: 'https://example.com/after1.jpg', type: 'after' },
      { url: 'https://example.com/legacy1.jpg', type: 'legacy' },
    ];
    const record = createRecordWithPhotos(1, photos);
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);
    goToStep(8);
    await waitFor(() => expect(getStepContent(8)).toBeInTheDocument());

    const thumbnails = within(getStepContent(8)!).getAllByRole('img');
    expect(thumbnails).toHaveLength(4);
    const srcs = thumbnails.map((img) => (img as HTMLImageElement).src);
    photos.forEach((photo) => { expect(srcs).toContain(photo.url); });
    expect(screen.getByText(ar.ui.maintenanceEditor.beforePhotos)).toBeInTheDocument();
    expect(screen.getByText(ar.ui.maintenanceEditor.afterPhotos)).toBeInTheDocument();
    expect(screen.getByText(ar.ui.maintenanceEditor.legacyPhotos)).toBeInTheDocument();
  });

  it('groups before and after photos in separate sections', async () => {
    const photos: MaintenancePhoto[] = [
      { url: 'https://example.com/before-a.jpg', type: 'before' },
      { url: 'https://example.com/after-a.jpg', type: 'after' },
    ];
    const record = createRecordWithPhotos(2, photos);
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);
    goToStep(8);
    await waitFor(() => expect(getStepContent(8)).toBeInTheDocument());

    const beforeImg = within(getStepContent(8)!).getByRole('img', {
      name: new RegExp(`${ar.ui.maintenanceEditor.before} 1`),
    }) as HTMLImageElement;
    const afterImg = within(getStepContent(8)!).getByRole('img', {
      name: new RegExp(`${ar.ui.maintenanceEditor.after} 1`),
    }) as HTMLImageElement;
    expect(beforeImg.src).toBe('https://example.com/before-a.jpg');
    expect(afterImg.src).toBe('https://example.com/after-a.jpg');
  });

  it('shows empty placeholders when the mock record has no photos', async () => {
    const record = createRecordWithPhotos(3, []);
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);
    goToStep(8);
    await waitFor(() => expect(getStepContent(8)).toBeInTheDocument());

    expect(screen.getByText(ar.ui.maintenanceEditor.noBeforePhotos)).toBeInTheDocument();
    expect(screen.getByText(ar.ui.maintenanceEditor.noAfterPhotos)).toBeInTheDocument();
    expect(screen.queryByText(ar.ui.maintenanceEditor.legacyPhotos)).not.toBeInTheDocument();
  });

  it('displays the photo count badge on the photos step header', async () => {
    const record = createRecordWithPhotos(4, [
      { url: 'https://example.com/b.jpg', type: 'before' },
      { url: 'https://example.com/a.jpg', type: 'after' },
    ]);
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);
    goToStep(8);
    await waitFor(() => expect(getStepContent(8)).toBeInTheDocument());

    const content = getStepContent(8)!;
    expect(content.textContent).toContain('2');
  });

  it('auto-expands to photos when the mock record contains photos', async () => {
    const record = createRecordWithPhotos(5, [
      { url: 'https://example.com/legacy.jpg', type: 'legacy' },
    ]);
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);
    goToStep(8);
    await waitFor(() => expect(getStepContent(8)).toBeInTheDocument());

    expect(screen.getByText(ar.ui.maintenanceEditor.legacyPhotos)).toBeInTheDocument();
    expect(
      within(getStepContent(8)!).getByRole('img', { name: new RegExp(`${ar.ui.maintenanceEditor.legacyPhotos} 1`) })
    ).toBeInTheDocument();
  });

  it('renders a remove button for each photo thumbnail', async () => {
    const photos: MaintenancePhoto[] = [
      { url: 'https://example.com/before.jpg', type: 'before' },
      { url: 'https://example.com/after.jpg', type: 'after' },
    ];
    const record = createRecordWithPhotos(6, photos);
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);
    goToStep(8);
    await waitFor(() => expect(getStepContent(8)).toBeInTheDocument());

    const removeButtons = within(getStepContent(8)!).getAllByRole('button', { name: /إزالة الصورة/i });
    expect(removeButtons).toHaveLength(photos.length);
  });

  it('re-syncs form state when the record prop is replaced', () => {
    const baseRecord = generateMockMaintenanceRecord(7, { partsList, servicesList });
    const emptyRecord = { ...baseRecord, baristaName: '', maintenanceDate: '2024-01-01', photos: [] };
    const mockRecord = { ...baseRecord, baristaName: 'Mock Technician', maintenanceDate: '2025-06-15', photos: [{ url: 'https://example.com/mock-before.jpg', type: 'before' as const }] };

    const { rerender } = renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={emptyRecord} />);
    expect(getStepContent(8)).toBeNull();

    rerender(<MaintenanceRecordEditor {...baseProps} record={mockRecord} />);

    expect(screen.getByDisplayValue('Mock Technician')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
  });

  it('does not re-sync when the same record object reference is passed', () => {
    const record = generateMockMaintenanceRecord(8, { partsList, servicesList });
    const { rerender } = renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    const baristaInput = document.querySelector('input[name="baristaName"]') as HTMLInputElement;
    fireEvent.change(baristaInput, { target: { value: 'Updated Name' } });
    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();

    rerender(<MaintenanceRecordEditor {...baseProps} record={record} />);
    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
  });

  it('navigates between steps using the stepper', async () => {
    const record = generateMockMaintenanceRecord(9, { partsList, servicesList });
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    expect(getStepContent(1)).toBeInTheDocument();
    expect(getStepContent(3)).toBeNull();

    goToStep(3);
    await waitFor(() => expect(getStepContent(3)).toBeInTheDocument());
    expect(getStepContent(1)).toBeNull();
  });

  it('cross-step auto-jump: navigates to step 6 when supervisor validation fails from step 1', async () => {
    // Create a record with step-1 fields valid but supervisors empty.
    // The custom supervisor validator requires at least one supervisor with a non-blank name.
    const record = {
      ...generateMockMaintenanceRecord(99, { partsList, servicesList }),
      maintenanceDate: '2025-06-15',
      baristaName: 'Test Tech',
      supervisors: [], // ← triggers "At least one supervisor is required"
    };
    const onSave = vi.fn();
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} onSave={onSave} />);

    // Start on step 1 — verify
    expect(getStepContent(1)).toBeInTheDocument();
    expect(getStepContent(6)).toBeNull();

    // Click Save — should trigger validation, fail, and auto-jump to step 6
    const saveBtn = screen.getByRole('button', { name: ar.ui.maintenanceEditor.save });
    fireEvent.click(saveBtn);

    // After React re-renders + rAF callbacks, step 6 should be visible
    await waitFor(() => expect(getStepContent(6)).toBeInTheDocument());

    // Step 1 should no longer be visible (conditional rendering)
    expect(getStepContent(1)).toBeNull();

    // onSave must NOT have been called (validation blocked it)
    expect(onSave).not.toHaveBeenCalled();

    // The supervisor section should contain the "مطلوب" (required) badge
    expect(getStepContent(6)!.textContent).toContain('مطلوب');
  });

  it('navigates using Next/Back buttons', async () => {
    const record = generateMockMaintenanceRecord(10, { partsList, servicesList });
    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    expect(getStepContent(1)).toBeInTheDocument();

    // Click Next in the step footer (scoped to step-1 content to avoid stepper ambiguity)
    const step1 = getStepContent(1)!;
    const nextBtn = within(step1).getByRole('button', { name: /المشاكل/ });
    fireEvent.click(nextBtn);
    await waitFor(() => expect(getStepContent(2)).toBeInTheDocument());

    // Click Back in the step footer
    const step2 = getStepContent(2)!;
    const backBtn = within(step2).getByRole('button', { name: /السابق/ });
    fireEvent.click(backBtn);
    await waitFor(() => expect(getStepContent(1)).toBeInTheDocument());
  });
});
