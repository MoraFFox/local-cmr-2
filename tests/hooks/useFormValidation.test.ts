import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormValidation } from '../../components/forms/hooks/useFormValidation';

describe('useFormValidation', () => {
  it('should validate required fields', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: '' }, { name: { required: true } })
    );

    act(() => {
      result.current.validateAll();
    });

    expect(result.current.hasErrors).toBe(true);
    expect(result.current.errors.name).toBeDefined();
  });

  it('should pass validation when required field is filled', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: 'John' }, { name: { required: true } })
    );

    act(() => {
      result.current.validateAll();
    });

    expect(result.current.isValid).toBe(true);
    expect(result.current.hasErrors).toBe(false);
  });

  it('should validate minLength', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: 'Jo' }, { name: { minLength: 3 } })
    );

    act(() => {
      result.current.validateAll();
    });

    expect(result.current.hasErrors).toBe(true);
  });

  it('should validate email pattern', () => {
    const { result } = renderHook(() =>
      useFormValidation({ email: 'invalid' }, { email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ } })
    );

    act(() => {
      result.current.validateAll();
    });

    expect(result.current.hasErrors).toBe(true);
  });

  it('should handle onValidationChange callback', () => {
    const onValidationChange = vi.fn();
    const { result } = renderHook(() =>
      useFormValidation(
        { name: '' },
        { name: { required: true } },
        { onValidationChange }
      )
    );

    act(() => {
      result.current.validateAll();
    });

    expect(onValidationChange).toHaveBeenCalledWith(false, expect.any(Array));
  });

  it('should clear field error', () => {
    const { result } = renderHook(() =>
      useFormValidation({ name: '' }, { name: { required: true } })
    );

    act(() => {
      result.current.validateAll();
    });
    expect(result.current.hasErrors).toBe(true);

    act(() => {
      result.current.clearError('name');
    });

    expect(result.current.hasErrors).toBe(false);
  });

  it('should handle handleSubmit with onValid and onInvalid', () => {
    const onValid = vi.fn();
    const onInvalid = vi.fn();

    const { result } = renderHook(() =>
      useFormValidation({ name: '' }, { name: { required: true } })
    );

    act(() => {
      result.current.handleSubmit(onValid, onInvalid)();
    });

    expect(onInvalid).toHaveBeenCalled();
    expect(onValid).not.toHaveBeenCalled();
  });
});
