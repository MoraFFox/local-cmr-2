import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeyboardShortcutsHelpProvider, KeyboardShortcutsHelpButton } from '../components/KeyboardShortcutsHelp';
import { ar } from '../utils/arabicTranslations';

describe('KeyboardShortcutsHelp', () => {
  it('opens the modal when the ? key is pressed outside an input', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: '?' });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent(ar.common.keyboardShortcuts);
  });

  it('opens the modal when Shift+/ is pressed', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.keyDown(document.body, { key: '/', shiftKey: true });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not open the modal when ? is pressed while typing in an input', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <input data-testid="name-input" />
      </KeyboardShortcutsHelpProvider>
    );

    const input = screen.getByTestId('name-input');
    input.focus();
    fireEvent.keyDown(input, { key: '?' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open the modal when Ctrl+Shift+? is pressed', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.keyDown(document.body, { key: '?', ctrlKey: true, shiftKey: true });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not open the modal when Alt+? is pressed', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.keyDown(document.body, { key: '?', altKey: true });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens the modal when the help button is clicked', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <KeyboardShortcutsHelpButton />
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: ar.common.keyboardShortcuts }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not close the modal when ? is pressed again while open', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.keyDown(document.body, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes the modal with the Escape key', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.keyDown(document.body, { key: '?' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists the Alt+J and ? shortcuts', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.keyDown(document.body, { key: '?' });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(ar.ui.formProgress.jumpToNextIncomplete);
    expect(dialog).toHaveTextContent(ar.common.keyboardShortcutsHint);
    expect(dialog).toHaveTextContent('Alt + J');
  });

  it('shows the localized typing guard message', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <div data-testid="app">App content</div>
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.keyDown(document.body, { key: '?' });

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent(ar.ui.formProgress.shortcutTypingGuard);
  });

  it('focuses the close button when opened so SafeModal focus trap works', () => {
    render(
      <KeyboardShortcutsHelpProvider>
        <KeyboardShortcutsHelpButton />
      </KeyboardShortcutsHelpProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: ar.common.keyboardShortcuts }));

    const closeButton = screen.getByRole('button', { name: /close modal/i });
    expect(document.activeElement).toBe(closeButton);
  });
});
