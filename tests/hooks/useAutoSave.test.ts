import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../../components/forms/hooks/useAutoSave';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('useAutoSave', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('should not save on initial mount', () => {
    const onSave = vi.fn();
    renderHook(() =>
      useAutoSave('test-form', { name: 'John' }, { debounceMs: 10, onSave, maxVersions: 1 })
    );
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should save after debounce when data changes', async () => {
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ data }) => useAutoSave('test-form', data, { debounceMs: 10, onSave, maxVersions: 1 }),
      { initialProps: { data: { name: 'John' } } }
    );

    rerender({ data: { name: 'Jane' } });
    // debounce (10ms) + inner save delay (100ms)
    await wait(150);

    expect(onSave).toHaveBeenCalledWith({ name: 'Jane' });
  });

  it('should save manually via saveNow', async () => {
    const onSave = vi.fn();
    const { result } = renderHook(() =>
      useAutoSave('test-form', { name: 'Jane' }, { debounceMs: 10, onSave, maxVersions: 1 })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.isSaving).toBe(false);
    expect(onSave).toHaveBeenCalledWith({ name: 'Jane' });
    expect(result.current.lastSaved).not.toBeNull();
  });

  it('should save to localStorage and restore', async () => {
    const { result } = renderHook(() =>
      useAutoSave('test-form', { name: 'Jane' }, { debounceMs: 10, maxVersions: 1 })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.restore()).toEqual({ name: 'Jane' });
  });

  it('should clear saved data', async () => {
    const { result } = renderHook(() =>
      useAutoSave('test-form', { name: 'Jane' }, { debounceMs: 10, maxVersions: 1 })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.restore()).toEqual({ name: 'Jane' });

    act(() => {
      result.current.clearSaved();
    });

    expect(result.current.restore()).toBeNull();
  });

  it('should call onSaveError when localStorage throws', async () => {
    const onSaveError = vi.fn();
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota exceeded');
    });

    const { result, unmount } = renderHook(() =>
      useAutoSave('test-form', { name: 'Jane' }, { debounceMs: 10, onSaveError, maxVersions: 1 })
    );

    await act(async () => {
      await result.current.saveNow();
    });

    expect(result.current.isSaving).toBe(false);
    expect(onSaveError).toHaveBeenCalledWith(expect.any(Error));

    spy.mockRestore();
    unmount();
  });
});
