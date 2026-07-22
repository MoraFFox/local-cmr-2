import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormProgress, RequiredFieldsProgress } from '../packages/form-progress';
import { ar } from '../utils/arabicTranslations';

const sections = [
  { id: 'basic', label: 'Basic Info', required: true },
  { id: 'problems', label: 'Problems', required: false },
  { id: 'services', label: 'Services', required: false },
];

const t = ar.ui.formProgress;

describe('FormProgress', () => {
  it('renders progress count and percentage in compact variant', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="compact"
      />
    );

    expect(screen.getByText(`1 ${t.of} 3 ${t.completed}`)).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('shows the jump button with the default Arabic label when there are incomplete sections', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="compact"
        onJumpToNextIncomplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: new RegExp(ar.ui.formProgress.jumpToNextIncomplete) })).toBeInTheDocument();
  });

  it('calls onJumpToNextIncomplete with the first incomplete section id when clicked', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="compact"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /الانتقال للقسم التالي غير المكتمل/ }));
    expect(onJump).toHaveBeenCalledTimes(1);
    expect(onJump).toHaveBeenCalledWith('problems');
  });

  it('applies the jump button animation classes when there is an incomplete section', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="compact"
        onJumpToNextIncomplete={vi.fn()}
      />
    );

    const button = screen.getByRole('button', { name: /الانتقال للقسم التالي غير المكتمل/ });
    expect(button.className).toContain('animate-jump-button-pulse');
    expect(button.className).toContain('animate-jump-button-glow');
  });

  it('does not render the jump button when all sections are complete', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic', 'problems', 'services'])}
        currentSection="basic"
        variant="compact"
      />
    );

    expect(screen.queryByRole('button', { name: /الانتقال للقسم التالي غير المكتمل/ })).not.toBeInTheDocument();
  });

  it('does not render the jump button when onJumpToNextIncomplete is not provided', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="compact"
      />
    );

    expect(screen.queryByRole('button', { name: /الانتقال للقسم التالي غير المكتمل/ })).not.toBeInTheDocument();
  });

  it('renders localized horizontal variant header and count', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="horizontal"
      />
    );

    expect(screen.getByText(t.formProgress)).toBeInTheDocument();
    expect(screen.getByText(`1/3 ${t.completed}`)).toBeInTheDocument();
  });

  it('renders localized vertical variant header', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="vertical"
      />
    );

    expect(screen.getByText(t.sections)).toBeInTheDocument();
  });

  it('renders jump button in horizontal variant when there are incomplete sections', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="horizontal"
        onJumpToNextIncomplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: new RegExp(ar.ui.formProgress.jumpToNextIncomplete) })).toBeInTheDocument();
  });

  it('calls onJumpToNextIncomplete from the horizontal variant jump button', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="horizontal"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(ar.ui.formProgress.jumpToNextIncomplete) }));
    expect(onJump).toHaveBeenCalledWith('problems');
  });

  it('renders jump button in vertical variant when there are incomplete sections', () => {
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="vertical"
        onJumpToNextIncomplete={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: new RegExp(ar.ui.formProgress.jumpToNextIncomplete) })).toBeInTheDocument();
  });

  it('calls onJumpToNextIncomplete from the vertical variant jump button', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        variant="vertical"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: new RegExp(ar.ui.formProgress.jumpToNextIncomplete) }));
    expect(onJump).toHaveBeenCalledWith('problems');
  });

  it('triggers onJumpToNextIncomplete when Alt+J is pressed', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.keyDown(document.body, { key: 'j', altKey: true });

    expect(onJump).toHaveBeenCalledTimes(1);
    expect(onJump).toHaveBeenCalledWith('problems');
  });

  it('does not trigger onJumpToNextIncomplete when Alt+Shift+J is pressed', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.keyDown(document.body, { key: 'J', altKey: true, shiftKey: true });

    expect(onJump).not.toHaveBeenCalled();
  });

  it('does not trigger onJumpToNextIncomplete when Alt+Ctrl+J is pressed', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.keyDown(document.body, { key: 'j', altKey: true, ctrlKey: true });

    expect(onJump).not.toHaveBeenCalled();
  });

  it('does not trigger onJumpToNextIncomplete when Alt+Meta+J is pressed', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.keyDown(document.body, { key: 'j', altKey: true, metaKey: true });

    expect(onJump).not.toHaveBeenCalled();
  });

  it('does not trigger onJumpToNextIncomplete when J is pressed without Alt', () => {
    const onJump = vi.fn();
    render(
      <FormProgress
        sections={sections}
        completedSections={new Set(['basic'])}
        currentSection="basic"
        onJumpToNextIncomplete={onJump}
      />
    );

    fireEvent.keyDown(document.body, { key: 'j' });

    expect(onJump).not.toHaveBeenCalled();
  });

  it('does not trigger onJumpToNextIncomplete when typing Alt+J inside an input', () => {
    const onJump = vi.fn();
    render(
      <>
        <input data-testid="name-input" />
        <FormProgress
          sections={sections}
          completedSections={new Set(['basic'])}
          currentSection="basic"
          onJumpToNextIncomplete={onJump}
        />
      </>
    );

    const input = screen.getByTestId('name-input');
    input.focus();

    fireEvent.keyDown(input, { key: 'j', altKey: true });

    expect(onJump).not.toHaveBeenCalled();
  });
});

describe('RequiredFieldsProgress', () => {
  it('renders localized required fields label', () => {
    render(<RequiredFieldsProgress totalRequired={5} completedRequired={2} />);

    expect(screen.getByText(`${t.requiredFields}: 2/5`)).toBeInTheDocument();
  });
});
