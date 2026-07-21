/**
 * useFormValidation Hook
 *
 * Comprehensive form validation with real-time feedback,
 * error summaries, and progressive validation strategies
 *
 * @example
 * ```tsx
 * const validation = useFormValidation(formData, {
 *   companyName: { required: true, minLength: 2 },
 *   email: { required: false, pattern: EMAIL_REGEX }
 * }, {
 *   mode: 'onBlur', // Validate when user leaves field
 *   showSummary: true
 * });
 *
 * return (
 *   <form onSubmit={validation.handleSubmit}>
 *     {validation.hasErrors && <ErrorSummary errors={validation.allErrors} />}
 *     <TextInput name="companyName" error={validation.errors.companyName} />
 *   </form>
 * );
 * ```
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ============== Types ==============

type ValidationMode = 'onChange' | 'onBlur' | 'onSubmit';

interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  min?: number;
  max?: number;
  custom?: (value: unknown) => string | null;
  message?: string;
}

type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule;
};

interface ValidationError {
  field: string;
  message: string;
}

interface ValidationOptions {
  /** When to validate fields */
  mode?: ValidationMode;
  /** Show validation summary */
  showSummary?: boolean;
  /** Validate all fields on mount */
  validateOnMount?: boolean;
  /** Callback when validation state changes */
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
}

interface ValidationState {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  errorCount: number;
}

interface FormValidationReturn<T> extends ValidationState {
  /** Validate a single field */
  validateField: (fieldName: string, value: unknown) => boolean;
  /** Validate all fields */
  validateAll: () => boolean;
  /** Mark field as touched (triggers validation in onBlur mode) */
  touchField: (fieldName: string) => void;
  /** Reset all validation state */
  resetValidation: () => void;
  /** Clear specific field error */
  clearFieldError: (fieldName: string) => void;
  /** Alias for clearFieldError (backward-compatible name) */
  clearError: (fieldName: string) => void;
  /** Get all errors as array */
  allErrors: ValidationError[];
  /** Get errors by section/group */
  errorsBySection: Record<string, ValidationError[]>;
  /** Handle form submit with validation (event is optional so it can be called from button onClick) */
  handleSubmit: (onValid: () => void, onInvalid?: () => void) => (e?: React.FormEvent) => void;
  /** Focus next error field */
  focusNextError: () => void;
}

// ============== Validation Functions ==============

/**
 * Validate a single value against rules
 */
function validateValue(
  value: unknown,
  rules: ValidationRule,
  fieldName: string
): string | null {
  // Required check
  if (rules.required) {
    if (value === null || value === undefined || value === '') {
      return rules.message || `${fieldName} is required`;
    }
  }

  // Skip other validations if empty and not required
  if (value === null || value === undefined || value === '') {
    return null;
  }

  // String validations
  if (typeof value === 'string') {
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      return rules.message || `Must be at least ${rules.minLength} characters`;
    }
    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      return rules.message || `Must be no more than ${rules.maxLength} characters`;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      return rules.message || 'Invalid format';
    }
  }

  // Number validations
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return rules.message || `Must be at least ${rules.min}`;
    }
    if (rules.max !== undefined && value > rules.max) {
      return rules.message || `Must be no more than ${rules.max}`;
    }
  }

  // Custom validation
  if (rules.custom) {
    const customError = rules.custom(value);
    if (customError) return customError;
  }

  return null;
}

/**
 * Get field label from field name (for error messages)
 */
function getFieldLabel(fieldName: string): string {
  return fieldName
    .split(/(?=[A-Z])/)
    .join(' ')
    .replace(/^./, char => char.toUpperCase());
}

// ============== Main Hook ==============

export function useFormValidation<T extends Record<string, unknown>>(
  formData: T,
  validationRules: ValidationRules<T>,
  options: ValidationOptions = {}
): FormValidationReturn<T> {
  const {
    mode = 'onBlur',
    showSummary = true,
    validateOnMount = false,
    onValidationChange
  } = options;

  const [state, setState] = useState<ValidationState>({
    errors: {},
    touched: {},
    isValid: true,
    isDirty: false,
    hasErrors: false,
    errorCount: 0
  });

  /**
   * Validate a single field
   */
  const validateField = useCallback((fieldName: string, value: unknown): boolean => {
    const rules = validationRules[fieldName as keyof T];
    if (!rules) return true;

    const label = getFieldLabel(fieldName);
    const error = validateValue(value, rules, label);

    // Recompute derived state from the full errors map so that fixing the
    // last error correctly resets isValid/hasErrors/errorCount to valid.
    setState(prev => {
      const nextErrors = { ...prev.errors, [fieldName]: error || '' };
      const errorKeys = Object.keys(nextErrors).filter(k => nextErrors[k]);
      const cleanErrors: Record<string, string> = {};
      errorKeys.forEach(k => { cleanErrors[k] = nextErrors[k]; });
      const hasErrors = errorKeys.length > 0;
      return {
        ...prev,
        errors: cleanErrors,
        isValid: !hasErrors,
        hasErrors,
        errorCount: errorKeys.length
      };
    });

    return !error;
  }, [validationRules]);

  /**
   * Validate all fields
   */
  const validateAll = useCallback((): boolean => {
    let hasErrors = false;
    const newErrors: Record<string, string> = {};

    Object.keys(validationRules).forEach(fieldName => {
      const value = formData[fieldName as keyof T];
      const rules = validationRules[fieldName as keyof T];

      if (rules) {
        const label = getFieldLabel(fieldName);
        const error = validateValue(value, rules, label);

        if (error) {
          newErrors[fieldName] = error;
          hasErrors = true;
        }
      }
    });

    setState(prev => ({
      ...prev,
      errors: newErrors,
      touched: Object.keys(validationRules).reduce((acc, key) => ({ ...acc, [key]: true }), {}),
      isValid: !hasErrors,
      hasErrors,
      errorCount: Object.keys(newErrors).length
    }));

    onValidationChange?.(!hasErrors, Object.entries(newErrors).map(([field, message]) => ({ field, message })));

    return !hasErrors;
  }, [formData, validationRules, onValidationChange]);

  /**
   * Mark field as touched
   */
  const touchField = useCallback((fieldName: string) => {
    setState(prev => {
      if (prev.touched[fieldName]) return prev;

      return {
        ...prev,
        touched: { ...prev.touched, [fieldName]: true },
        isDirty: true
      };
    });

    // Validate in onBlur mode
    if (mode === 'onBlur') {
      validateField(fieldName, formData[fieldName as keyof T]);
    }
  }, [mode, validateField, formData]);

  /**
   * Reset validation state
   */
  const resetValidation = useCallback(() => {
    setState({
      errors: {},
      touched: {},
      isValid: true,
      isDirty: false,
      hasErrors: false,
      errorCount: 0
    });
  }, []);

  /**
   * Clear specific field error
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setState(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[fieldName];
      const hasErrors = Object.keys(newErrors).length > 0;

      return {
        ...prev,
        errors: newErrors,
        hasErrors,
        errorCount: Object.keys(newErrors).length,
        isValid: !hasErrors
      };
    });
  }, []);

  /**
   * Get all errors as array
   */
  const allErrors = useMemo(() => {
    return Object.entries(state.errors)
      .filter(([_, message]) => message)
      .map(([field, message]) => ({ field, message }));
  }, [state.errors]);

  /**
   * Get errors by section (for grouped forms)
   */
  const errorsBySection = useMemo(() => {
    const grouped: Record<string, ValidationError[]> = {};

    allErrors.forEach(error => {
      const section = error.field.split('.')[0] || 'general';
      if (!grouped[section]) {
        grouped[section] = [];
      }
      grouped[section].push(error);
    });

    return grouped;
  }, [allErrors]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback((
    onValid: () => void,
    onInvalid?: () => void
  ) => {
    return (e?: React.FormEvent) => {
      // Event is optional: preventDefault only when called from a real form event.
      e?.preventDefault?.();

      const isValid = validateAll();

      if (isValid) {
        onValid();
      } else {
        onInvalid?.();
      }
    };
  }, [validateAll]);

  /**
   * Focus next error field
   */
  const focusNextError = useCallback(() => {
    const firstErrorField = Object.keys(state.errors).find(key => state.errors[key]);

    if (firstErrorField) {
      const element = document.querySelector(`[name="${firstErrorField}"]`) as HTMLInputElement;
      element?.focus();
      element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [state.errors]);

  /**
   * Effect: Validate on change in onChange mode
   */
  useEffect(() => {
    if (mode !== 'onChange') return;

    Object.keys(validationRules).forEach(fieldName => {
      if (state.touched[fieldName]) {
        validateField(fieldName, formData[fieldName as keyof T]);
      }
    });
  }, [formData, mode, state.touched, validateField, validationRules]);

  /**
   * Effect: Validate on mount if enabled
   */
  useEffect(() => {
    if (validateOnMount) {
      validateAll();
    }
  }, [validateOnMount, validateAll]);

  return {
    errors: state.errors,
    touched: state.touched,
    isValid: state.isValid,
    isDirty: state.isDirty,
    hasErrors: state.hasErrors,
    errorCount: state.errorCount,
    validateField,
    validateAll,
    touchField,
    resetValidation,
    clearFieldError,
    clearError: clearFieldError,
    allErrors,
    errorsBySection,
    handleSubmit,
    focusNextError
  };
}

// ============== Utility Functions ==============

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]+$/,
  EGYPT_PHONE: /^01[0125][0-9]{8}$/,
  URL: /^https?:\/\/.+/,
  NUMBER: /^\d+$/,
  DECIMAL: /^\d+\.?\d*$/,
  TAX_NUMBER: /^\d+$/
};

/**
 * Common validation messages (Arabic)
 */
export const ValidationMessages = {
  required: (field: string) => `${field} مطلوب`,
  email: 'بريد إلكتروني غير صالح',
  phone: 'رقم هاتف غير صالح',
  minLength: (min: number) => `يجب أن يكون ${min} أحرف على الأقل`,
  maxLength: (max: number) => `يجب ألا يتجاوز ${max} حرفًا`,
  pattern: 'تنسيق غير صالح'
};

/**
 * Preset validation rule builders
 */
export const ValidationRules = {
  required: (message?: string): ValidationRule => ({
    required: true,
    message
  }),

  email: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.EMAIL,
    message: message || ValidationMessages.email
  }),

  phone: (message?: string): ValidationRule => ({
    pattern: ValidationPatterns.PHONE,
    message: message || ValidationMessages.phone
  }),

  minLength: (min: number, message?: string): ValidationRule => ({
    minLength: min,
    message: message || ValidationMessages.minLength(min)
  }),

  maxLength: (max: number, message?: string): ValidationRule => ({
    maxLength: max,
    message: message || ValidationMessages.maxLength(max)
  }),

  custom: (fn: (value: unknown) => string | null, message?: string): ValidationRule => ({
    custom: fn,
    message
  })
};

export default useFormValidation;