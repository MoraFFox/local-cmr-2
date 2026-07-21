import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import MaintenanceRecordEditor from '../components/MaintenanceRecordEditor';
import { ToastProvider } from '../components/ToastContext';
import { generateMockMaintenanceRecord } from '../utils/mockData';
import { MaintenancePhoto } from '../types';
import {
  partsList,
  servicesList,
  problemCategories,
} from '../constants';

// Avoid auto-save timers leaking between tests; we only test rendering here.
vi.mock('../components/forms/hooks/useAutoSave', () => ({
  useAutoSave: () => ({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    versionCount: 0,
    saveNow: vi.fn(),
    clearSaved: vi.fn(),
    restore: vi.fn(),
    getVersions: vi.fn(),
    restoreVersion: vi.fn(),
  }),
}));

const allPredefinedProblems = problemCategories.flatMap((cat) =>
  cat.options.map((opt) => opt.value)
);

const renderWithProviders = (ui: React.ReactElement) => {
  const renderResult = render(<ToastProvider>{ui}</ToastProvider>);
  const rerender = (rerenderUi: React.ReactElement) =>
    renderResult.rerender(<ToastProvider>{rerenderUi}</ToastProvider>);
  return { ...renderResult, rerender };
};

describe('MaintenanceRecordEditor photo thumbnails', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  const baseProps = {
    onSave: vi.fn(),
    onCancel: vi.fn(),
    partsList,
    servicesList,
    problemCategories,
    allPredefinedProblems,
    baristas: [],
    clientBaristas: [],
  };

  const createRecordWithPhotos = (id: number, photos: MaintenancePhoto[]) => ({
    ...generateMockMaintenanceRecord(id, { partsList, servicesList }),
    photos,
  });

  const getPhotosSection = () => {
    const header = screen.getByTestId('section-photos');
    if (!header.parentElement) {
      throw new Error('Photos section container not found');
    }
    return header.parentElement;
  };

  it('renders before, after, and legacy photo thumbnails from mock data', () => {
    const photos: MaintenancePhoto[] = [
      { url: 'https://example.com/before1.jpg', type: 'before' },
      { url: 'https://example.com/before2.jpg', type: 'before' },
      { url: 'https://example.com/after1.jpg', type: 'after' },
      { url: 'https://example.com/legacy1.jpg', type: 'legacy' },
    ];

    const record = createRecordWithPhotos(1, photos);

    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    const thumbnails = within(getPhotosSection()).getAllByRole('img');
    expect(thumbnails).toHaveLength(4);

    const srcs = thumbnails.map((img) => (img as HTMLImageElement).src);
    photos.forEach((photo) => {
      expect(srcs).toContain(photo.url);
    });

    expect(screen.getByText('Before Photos')).toBeInTheDocument();
    expect(screen.getByText('After Photos')).toBeInTheDocument();
    expect(screen.getByText('Legacy Photos')).toBeInTheDocument();
  });

  it('groups before and after photos in separate sections', () => {
    const photos: MaintenancePhoto[] = [
      { url: 'https://example.com/before-a.jpg', type: 'before' },
      { url: 'https://example.com/after-a.jpg', type: 'after' },
    ];

    const record = createRecordWithPhotos(2, photos);

    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    const beforeImg = within(getPhotosSection()).getByRole('img', {
      name: /Before photo 1/i,
    }) as HTMLImageElement;
    const afterImg = within(getPhotosSection()).getByRole('img', {
      name: /After photo 1/i,
    }) as HTMLImageElement;

    expect(beforeImg.src).toBe('https://example.com/before-a.jpg');
    expect(afterImg.src).toBe('https://example.com/after-a.jpg');
  });

  it('shows empty placeholders when the mock record has no photos', () => {
    const record = createRecordWithPhotos(3, []);

    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    // Photos section is collapsed when there are no photos; expand it first.
    fireEvent.click(screen.getByTestId('section-photos'));

    expect(screen.getByText('No before photos')).toBeInTheDocument();
    expect(screen.getByText('No after photos')).toBeInTheDocument();
    expect(screen.queryByText('Legacy Photos')).not.toBeInTheDocument();
  });

  it('displays the photo count badge on the photos section header', () => {
    const record = createRecordWithPhotos(4, [
      { url: 'https://example.com/b.jpg', type: 'before' },
      { url: 'https://example.com/a.jpg', type: 'after' },
    ]);

    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    const header = screen.getByTestId('section-photos');
    expect(header).toHaveTextContent('2 photo(s)');
  });

  it('auto-expands the photos section when the mock record contains photos', () => {
    const record = createRecordWithPhotos(5, [
      { url: 'https://example.com/legacy.jpg', type: 'legacy' },
    ]);

    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    expect(screen.getByText('Legacy Photos')).toBeInTheDocument();
    expect(
      within(getPhotosSection()).getByRole('img', { name: /Legacy photo 1/i })
    ).toBeInTheDocument();
  });

  it('renders a remove button for each photo thumbnail', () => {
    const photos: MaintenancePhoto[] = [
      { url: 'https://example.com/before.jpg', type: 'before' },
      { url: 'https://example.com/after.jpg', type: 'after' },
    ];

    const record = createRecordWithPhotos(6, photos);

    renderWithProviders(<MaintenanceRecordEditor {...baseProps} record={record} />);

    const removeButtons = within(getPhotosSection()).getAllByRole('button', {
      name: /إزالة الصورة/i,
    });
    expect(removeButtons).toHaveLength(photos.length);
  });

  it('re-syncs form state when the record prop is replaced with a different object (same id)', () => {
    const baseRecord = generateMockMaintenanceRecord(7, { partsList, servicesList });
    const emptyRecord: typeof baseRecord = {
      ...baseRecord,
      baristaName: '',
      maintenanceDate: '2024-01-01',
      photos: [],
    };
    const mockRecord: typeof baseRecord = {
      ...baseRecord,
      baristaName: 'Mock Technician',
      maintenanceDate: '2025-06-15',
      photos: [{ url: 'https://example.com/mock-before.jpg', type: 'before' }],
    };

    const { rerender } = renderWithProviders(
      <MaintenanceRecordEditor {...baseProps} record={emptyRecord} />
    );

    expect(screen.queryByText('Before Photos')).not.toBeInTheDocument();

    rerender(<MaintenanceRecordEditor {...baseProps} record={mockRecord} />);

    expect(screen.getByDisplayValue('Mock Technician')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2025-06-15')).toBeInTheDocument();
    expect(screen.getByText('Before Photos')).toBeInTheDocument();
  });

  it('does not re-sync when the same record object reference is passed', () => {
    const record = generateMockMaintenanceRecord(8, { partsList, servicesList });

    const { rerender } = renderWithProviders(
      <MaintenanceRecordEditor {...baseProps} record={record} />
    );

    const baristaInput = document.querySelector('input[name="baristaName"]') as HTMLInputElement;
    fireEvent.change(baristaInput, { target: { value: 'Updated Name' } });

    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();

    rerender(<MaintenanceRecordEditor {...baseProps} record={record} />);

    expect(screen.getByDisplayValue('Updated Name')).toBeInTheDocument();
  });
});
