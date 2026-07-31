import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from './testUtils';
import { ToastProvider } from '../components/ToastContext';
import ServiceSelector from '../components/ServiceSelector';
import PartsSelector from '../components/PartsSelector';
import CheckboxGroup from '../components/CheckboxGroup';
import { ar } from '../utils/arabicTranslations';
import type { Part, PartRecord, Service, ServiceRecord } from '../types';

// ── Fixtures ──

const partsFixture: Part[] = [
  { value: 'gasket', label: 'Gasket', cost: 100 },
  { value: 'valve', label: 'Valve', cost: 50 },
];

const servicesFixture: Service[] = [
  { value: 'backflush', label: 'Backflush', cost: 200, category: 'Cleaning' },
];

const problemsFixture: { title: string; options: { label: string; value: string }[] }[] = [
  { title: 'Cleaning', options: [{ label: 'Dirty wand', value: 'dirty-wand' }] },
];

// ── Controlled harnesses (so selectedValues actually change on add) ──

const PartsHarness = () => {
  const [selected, setSelected] = useState<PartRecord[]>([]);
  return <PartsSelector options={partsFixture} selectedValues={selected} onChange={setSelected} />;
};

const ServicesHarness = () => {
  const [selected, setSelected] = useState<ServiceRecord[]>([]);
  return <ServiceSelector options={servicesFixture} selectedValues={selected} onChange={setSelected} />;
};

const ProblemsHarness = () => {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <CheckboxGroup
      categories={problemsFixture}
      selectedValues={selected}
      onChange={setSelected}
      predefinedProblems={['dirty-wand']}
    />
  );
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(<ToastProvider>{ui}</ToastProvider>);

describe('selector scroll-on-add regression', () => {
  beforeEach(() => {
    cleanup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockWindowScroll = () => {
    const scrollToSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    let scrollIntoViewSpy: ReturnType<typeof vi.spyOn> | undefined;
    if (typeof HTMLElement.prototype.scrollIntoView === 'function') {
      scrollIntoViewSpy = vi
        .spyOn(HTMLElement.prototype, 'scrollIntoView')
        .mockImplementation(() => {});
    }
    return { scrollToSpy, scrollIntoViewSpy };
  };

  describe('PartsSelector', () => {
    it('does not refocus or scroll the search box when a mouse user adds an item', () => {
      const { scrollToSpy, scrollIntoViewSpy } = mockWindowScroll();
      renderWithProviders(<PartsHarness />);

      const searchInput = screen.getByPlaceholderText(ar.selectors.searchParts);
      const focusSpy = vi.spyOn(searchInput, 'focus');

      const addBtn = screen.getByRole('button', { name: 'Add 1 Gasket' });
      fireEvent.mouseDown(addBtn);
      fireEvent.click(addBtn);

      // The search box was never focused, so the add must NOT refocus it —
      // an unconditional refocus is what scrolled the page back to the top.
      expect(focusSpy).not.toHaveBeenCalled();
      expect(scrollToSpy).not.toHaveBeenCalled();
      if (scrollIntoViewSpy) expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    });

    it('refocuses the search box with preventScroll when a typing user adds an item', () => {
      const { scrollToSpy } = mockWindowScroll();
      renderWithProviders(<PartsHarness />);

      const searchInput = screen.getByPlaceholderText(ar.selectors.searchParts) as HTMLInputElement;
      const focusSpy = vi.spyOn(searchInput, 'focus');

      // Simulate a user actively searching: the search box holds focus.
      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      const addBtn = screen.getByRole('button', { name: 'Add 1 Gasket' });
      fireEvent.mouseDown(addBtn);
      fireEvent.click(addBtn);

      // Typing users keep their momentum, but the refocus must not scroll.
      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });

  describe('ServiceSelector', () => {
    it('does not refocus or scroll the search box when a mouse user adds an item', () => {
      const { scrollToSpy, scrollIntoViewSpy } = mockWindowScroll();
      renderWithProviders(<ServicesHarness />);

      const searchInput = screen.getByPlaceholderText(ar.selectors.searchServices);
      const focusSpy = vi.spyOn(searchInput, 'focus');

      const addBtn = screen.getByRole('button', { name: 'Add 1 Backflush' });
      fireEvent.mouseDown(addBtn);
      fireEvent.click(addBtn);

      expect(focusSpy).not.toHaveBeenCalled();
      expect(scrollToSpy).not.toHaveBeenCalled();
      if (scrollIntoViewSpy) expect(scrollIntoViewSpy).not.toHaveBeenCalled();
    });

    it('refocuses the search box with preventScroll when a typing user adds an item', () => {
      const { scrollToSpy } = mockWindowScroll();
      renderWithProviders(<ServicesHarness />);

      const searchInput = screen.getByPlaceholderText(ar.selectors.searchServices) as HTMLInputElement;
      const focusSpy = vi.spyOn(searchInput, 'focus');

      searchInput.focus();
      expect(document.activeElement).toBe(searchInput);

      const addBtn = screen.getByRole('button', { name: 'Add 1 Backflush' });
      fireEvent.mouseDown(addBtn);
      fireEvent.click(addBtn);

      expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });

  describe('CheckboxGroup', () => {
    it('does not refocus or scroll the search box when a mouse user selects an option', () => {
      const { scrollToSpy } = mockWindowScroll();
      renderWithProviders(<ProblemsHarness />);

      const searchInput = screen.getByPlaceholderText(ar.selectors.searchProblems);
      const focusSpy = vi.spyOn(searchInput, 'focus');

      const chip = screen.getByRole('button', { name: 'Dirty wand' });
      fireEvent.mouseDown(chip);
      fireEvent.click(chip);

      expect(focusSpy).not.toHaveBeenCalled();
      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });
});
