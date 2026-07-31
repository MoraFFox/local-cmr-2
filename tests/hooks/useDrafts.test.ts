import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDrafts } from '../../hooks/useDrafts';
import { STORAGE_KEYS } from '../../utils/sharedConstants';
import type { FormData } from '../../types';

// Minimal FormData shape — useDrafts only reads companyName/email/taxNumber/
// location for the emptiness check and stores the whole object.
const makeForm = (overrides: Partial<FormData> = {}): FormData =>
  ({
    companyName: '',
    email: '',
    taxNumber: '',
    location: '',
    baristas: [],
    branches: [],
    machines: [],
    maintenanceHistory: [],
    contacts: [],
    warehouse: { contacts: [] },
    ...overrides,
  }) as unknown as FormData;

describe('useDrafts', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('flushes the latest draft synchronously on pagehide (tab close)', () => {
    const { rerender, unmount } = renderHook(
      ({ data }) => useDrafts(data, 2, true),
      { initialProps: { data: makeForm() } },
    );

    // Simulate typing a company name; the 1s debounce will not fire in time.
    rerender({ data: makeForm({ companyName: 'Acme' }) });

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });

    const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAFTS) || '[]');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].formData.companyName).toBe('Acme');
    expect(drafts[0].currentStep).toBe(2);
    unmount();
  });

  it('flushes on beforeunload too', () => {
    const { rerender, unmount } = renderHook(
      ({ data }) => useDrafts(data, 1, true),
      { initialProps: { data: makeForm() } },
    );

    rerender({ data: makeForm({ email: 'x@y.z' }) });

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const drafts = JSON.parse(localStorage.getItem(STORAGE_KEYS.DRAFTS) || '[]');
    expect(drafts).toHaveLength(1);
    expect(drafts[0].formData.email).toBe('x@y.z');
    unmount();
  });

  it('does not flush an empty untouched form', () => {
    renderHook(() => useDrafts(makeForm(), 1, true));
    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
    expect(localStorage.getItem(STORAGE_KEYS.DRAFTS)).toBeNull();
  });
});
