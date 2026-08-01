import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from './testUtils';
import MaintenanceEditPage from '../components/MaintenanceEditPage';
import { initialFormData } from '../utils/sharedConstants';

vi.mock('../components/MaintenanceRecordEditor', () => ({
  default: () => <div data-testid="maintenance-record-editor" />,
}));

vi.mock('../components/MaintenanceRecordList', () => ({
  default: ({ onEdit }: { onEdit: (record: unknown, index: number) => void }) => (
    <button
      type="button"
      onClick={() => onEdit({ id: 1, maintenanceDate: '2026-08-01' }, 0)}
    >
      Edit record
    </button>
  ),
}));

describe('MaintenanceEditPage editor layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const submission = {
    ...initialFormData,
    id: 10,
    companyName: 'Roots medt',
    branches: [
      {
        ...initialFormData.branches[0],
        id: 20,
        branchName: 'Main Branch',
        maintenanceHistory: [{ id: 1, maintenanceDate: '2026-08-01' }],
      },
    ],
  } as any;

  const renderPage = () => render(
    <MaintenanceEditPage
      submission={submission}
      onBack={vi.fn()}
      onSave={vi.fn()}
      partsList={[]}
      servicesList={[]}
      problemCategories={[]}
      allPredefinedProblems={[]}
    />,
  );

  it('uses a wider editor shell for the editor content', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Main Branch/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit record' }));

    const editorShell = screen.getByTestId('maintenance-record-editor').parentElement!;
    expect(editorShell.className).toContain('max-w-5xl');
  });

  it('shows the mock-data button in development builds', () => {
    vi.stubEnv('DEV', true);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Main Branch/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit record' }));

    expect(screen.getByRole('button', { name: 'بيانات' })).toBeInTheDocument();
  });

  it('hides the mock-data button outside development builds', () => {
    vi.stubEnv('DEV', false);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Main Branch/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit record' }));

    expect(screen.queryByRole('button', { name: 'بيانات' })).not.toBeInTheDocument();
  });

  it('makes unavailable record navigation visibly disabled and explains why', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /Main Branch/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit record' }));

    const previous = screen.getByRole('button', { name: 'السابق' });
    const next = screen.getByRole('button', { name: 'التالي' });

    expect(previous).toBeDisabled();
    expect(next).toBeDisabled();
    expect(previous.className).toContain('disabled:opacity-50');
    expect(next.className).toContain('disabled:opacity-50');
    expect(previous).toHaveAttribute('title', 'لا يوجد سجل سابق');
    expect(next).toHaveAttribute('title', 'لا يوجد سجل لاحق');
  });
});
