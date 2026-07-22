import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import SafeModal from '../components/form-ui/SafeModal';
import BottomSheet from '../components/BottomSheet';
import CameraBottomSheet from '../components/technician-portal/CameraBottomSheet';
import { ar } from '../utils/arabicTranslations';

describe('SafeModal unsaved-changes protection', () => {
  it('shows confirmation when X is pressed while hasUnsavedChanges is true', () => {
    const onClose = vi.fn();
    render(
      <SafeModal isOpen onClose={onClose} title="Editor" hasUnsavedChanges>
        <div>Modal content</div>
      </SafeModal>
    );

    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(ar.common.unsavedChangesMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.common.discardChanges })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.common.keepEditing })).toBeInTheDocument();
  });
});

describe('ConfirmDialog migrated to SafeModal', () => {
  it('renders title, message and action buttons', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Confirm Action"
        message="Are you sure?"
        onConfirm={() => {}}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تأكيد/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /إلغاء/i })).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog isOpen title="Confirm" message="msg" onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole('button', { name: /تأكيد/i }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmDialog isOpen title="Confirm" message="msg" onConfirm={() => {}} onCancel={onCancel} />);

    fireEvent.click(screen.getByRole('button', { name: /إلغاء/i }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('does not close when the backdrop is clicked', () => {
    const onCancel = vi.fn();
    const onClose = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        title="Confirm"
        message="msg"
        onConfirm={() => {}}
        onCancel={onCancel}
        onClose={onClose}
      />
    );

    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);

    expect(onCancel).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('BottomSheet unsaved-changes protection', () => {
  it('closes immediately when hasUnsavedChanges is false and backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Editor">
        <div>Sheet content</div>
      </BottomSheet>
    );

    const backdrop = screen.getByTestId('bottom-sheet');
    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalled();
  });

  it('shows confirmation when hasUnsavedChanges is true and backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Editor" hasUnsavedChanges>
        <div>Sheet content</div>
      </BottomSheet>
    );

    const backdrop = screen.getByTestId('bottom-sheet');
    fireEvent.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(ar.common.unsavedChangesMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.common.discardChanges })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.common.keepEditing })).toBeInTheDocument();
  });

  it('shows confirmation when the X button is clicked with unsaved changes', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Editor" hasUnsavedChanges>
        <div>Sheet content</div>
      </BottomSheet>
    );

    const closeButton = screen.getByLabelText('إغلاق');
    fireEvent.click(closeButton);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(ar.common.unsavedChangesMessage)).toBeInTheDocument();
  });

  it('closes when discard-changes button is selected', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Editor" hasUnsavedChanges>
        <div>Sheet content</div>
      </BottomSheet>
    );

    fireEvent.click(screen.getByTestId('bottom-sheet'));

    fireEvent.click(screen.getByRole('button', { name: ar.common.discardChanges }));
    expect(onClose).toHaveBeenCalled();
  });

  it('returns to the sheet when keep-editing button is selected', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Editor" hasUnsavedChanges>
        <div>Sheet content</div>
      </BottomSheet>
    );

    fireEvent.click(screen.getByTestId('bottom-sheet'));

    fireEvent.click(screen.getByRole('button', { name: ar.common.keepEditing }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('shows confirmation when the sheet is dragged down past the threshold with unsaved changes', () => {
    const onClose = vi.fn();
    render(
      <BottomSheet isOpen onClose={onClose} title="Editor" hasUnsavedChanges>
        <div>Sheet content</div>
      </BottomSheet>
    );

    const sheet = screen.getByRole('dialog');
    fireEvent.touchStart(sheet, { touches: [{ clientY: 0 }] });
    fireEvent.touchMove(sheet, { touches: [{ clientY: 150 }] });
    fireEvent.touchEnd(sheet);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(ar.common.unsavedChangesMessage)).toBeInTheDocument();
  });
});

describe('CameraBottomSheet close protection', () => {
  it('shows confirmation when hasUnsavedChanges is true and overlay is clicked', () => {
    const onClose = vi.fn();
    render(
      <CameraBottomSheet
        isOpen
        onClose={onClose}
        photos={[]}
        onPhotosChange={() => {}}
        hasUnsavedChanges
      />
    );

    const overlay = screen.getByTestId('camera-overlay');
    fireEvent.click(overlay);

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText(ar.common.unsavedChangesMessage)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.common.discardChanges })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ar.common.keepEditing })).toBeInTheDocument();
  });

  it('closes without confirmation when no unsaved changes and overlay is clicked', () => {
    const onClose = vi.fn();
    render(
      <CameraBottomSheet
        isOpen
        onClose={onClose}
        photos={[]}
        onPhotosChange={() => {}}
      />
    );

    const overlay = screen.getByTestId('camera-overlay');
    fireEvent.click(overlay);

    expect(onClose).toHaveBeenCalled();
  });
});
