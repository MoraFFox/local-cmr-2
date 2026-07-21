/**
 * EnhancedInput Component
 *
 * Unified input component with:
 * - Required field indication
 * - Error states
 * - Auto-save integration
 * - Mobile keyboard handling
 * - Accessibility
 *
 * @example
 * ```tsx
 * <EnhancedInput
 *   name="companyName"
 *   label="Company Name"
 *   value={formData.companyName}
 *   onChange={handleChange}
 *   required
 *   error={errors.companyName}
 *   inputMode="text"
 *   autoComplete="organization"
 * />
 * ```
 */

import React, { useRef, useState, useEffect } from 'react';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { RequiredFieldBadge } from './RequiredFieldBadge';

interface EnhancedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Field name for error tracking */
  name: string;
  /** Label text */
  label?: string;
  /** Error message */
  error?: string;
  /** Required field indicator */
  required?: boolean;
  /** Icon to display inside input */
  icon?: React.ReactNode;
  /** Right-side element (e.g., validation icon) */
  rightElement?: React.ReactNode;
  /** Suggestions/autocomplete options */
  suggestions?: string[];
  /** Input mode for mobile keyboards */
  inputMode?: 'text' | 'tel' | 'email' | 'url' | 'numeric' | 'decimal' | 'search';
  /** Auto-capitalize setting */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** Auto-complete type */
  autoComplete?: string;
  /** Display variant */
  variant?: 'default' | 'filled' | 'outlined';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show character count */
  showCharCount?: boolean;
  /** Max length for character count */
  maxLength?: number;
  /** Enable auto-scroll on focus (mobile) */
  autoScroll?: boolean;
  /** On focus callback */
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  /** On blur callback */
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

const sizeStyles = {
  sm: {
    input: 'h-10 px-3 text-sm',
    label: 'text-sm',
    icon: 'w-4 h-4'
  },
  md: {
    input: 'h-12 px-4 text-base',
    label: 'text-base',
    icon: 'w-5 h-5'
  },
  lg: {
    input: 'h-14 px-5 text-lg',
    label: 'text-lg',
    icon: 'w-6 h-6'
  }
};

const variantStyles = {
  default: 'bg-cream border border-hairline',
  filled: 'bg-cream-2 border-transparent',
  outlined: 'bg-transparent border-2 border-hairline'
};

/**
 * Get input mode attribute for mobile keyboard optimization
 */
function getInputModeType(inputMode?: string): React.InputHTMLAttributes<HTMLInputElement>['inputMode'] {
  const modeMap: Record<string, React.InputHTMLAttributes<HTMLInputElement>['inputMode']> = {
    text: 'text',
    tel: 'tel',
    email: 'email',
    url: 'url',
    numeric: 'numeric',
    decimal: 'decimal',
    search: 'search'
  };

  return modeMap[inputMode || 'text'] || 'text';
}

export const EnhancedInput: React.FC<EnhancedInputProps> = ({
  name,
  label,
  error,
  required = false,
  icon,
  rightElement,
  suggestions,
  inputMode = 'text',
  autoCapitalize = 'none',
  autoComplete = 'off',
  variant = 'default',
  size = 'md',
  showCharCount = false,
  maxLength,
  autoScroll = true,
  onFocus,
  onBlur,
  className = '',
  value,
  onChange,
  type = 'text',
  ...rest
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const styles = sizeStyles[size];
  const actualType = type === 'password' && showPassword ? 'text' : type;
  const hasError = !!error;
  const charCount = typeof value === 'string' ? value.length : 0;

  /**
   * Auto-scroll on focus for mobile
   */
  useEffect(() => {
    if (!autoScroll || !isFocused) return;

    const input = inputRef.current;
    if (!input) return;

    // Scroll input into view with 20% padding from bottom
    const scrollIntoView = () => {
      const viewportHeight = window.innerHeight;
      const inputRect = input.getBoundingClientRect();
      const targetY = inputRect.top - (viewportHeight * 0.2);

      window.scrollTo({
        top: window.scrollY + targetY,
        behavior: 'smooth'
      });
    };

    // Delay slightly for keyboard animation
    const timer = setTimeout(scrollIntoView, 300);
    return () => clearTimeout(timer);
  }, [autoScroll, isFocused]);

  /**
   * Handle suggestion selection
   */
  const handleSuggestionClick = (suggestion: string) => {
    if (onChange) {
      onChange({
        target: { name, value: suggestion }
      } as React.ChangeEvent<HTMLInputElement>);
    }
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  /**
   * Handle focus
   */
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (suggestions && suggestions.length > 0) {
      setShowSuggestions(true);
    }
    onFocus?.(e);
  };

  /**
   * Handle blur
   */
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    // Delay to allow suggestion click
    setTimeout(() => setShowSuggestions(false), 200);
    onBlur?.(e);
  };

  /**
   * Filter suggestions
   */
  const filteredSuggestions = suggestions?.filter(s =>
    s.toLowerCase().includes(String(value || '').toLowerCase())
  ) || [];

  const inputClasses = `
    ${styles.input} ${variantStyles[variant]}
    w-full rounded-lg transition-all duration-200 outline-none
    ${icon ? 'pr-12' : rightElement ? 'pr-12' : 'pr-4'}
    ${suggestions ? 'pl-12' : 'pl-4'}
    ${hasError
      ? 'border-ember-500 focus:border-ember-500 focus:ring-2 focus:ring-ember-500/20'
      : 'focus:border-primary focus:ring-2 focus:ring-primary/20'
    }
    ${isFocused && !hasError ? 'shadow-[0_0_0_3px_rgba(184,115,51,0.1)]' : ''}
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Label */}
      {label && (
        <label
          htmlFor={name}
          className={`flex items-center gap-2 ${styles.label} font-medium text-primary mb-2`}
        >
          {label}
          {required && <RequiredFieldBadge size={size} />}
        </label>
      )}

      {/* Input Container */}
      <div className="relative">
        {/* Left Icon / Suggestion Toggle */}
        {(suggestions || icon) && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-latte">
            {icon || <div className="w-4 h-4" />}
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          id={name}
          name={name}
          type={actualType}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={inputClasses}
          inputMode={getInputModeType(inputMode)}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          aria-invalid={hasError}
          aria-describedby={error ? `${name}-error` : undefined}
          maxLength={maxLength}
          {...rest}
        />

        {/* Right Element */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center gap-1">
          {/* Show/hide password toggle */}
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="p-1 text-latte hover:text-primary transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeSlashIcon className={styles.icon} />
              ) : (
                <EyeIcon className={styles.icon} />
              )}
            </button>
          )}

          {/* Custom right element */}
          {rightElement}

          {/* Error icon */}
          {hasError && !rightElement && (
            <svg className={`w-5 h-5 text-ember-500`} fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          )}

          {/* Success indicator */}
          {!hasError && value && !rightElement && (
            <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-paper border border-hairline rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredSuggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full px-4 py-3 text-left hover:bg-cream transition-colors text-sm text-primary"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-sm text-ember-500 animate-fade-in flex items-center gap-1">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}

      {/* Character Count */}
      {showCharCount && maxLength && (
        <div className="mt-1 text-xs text-latte text-right">
          {charCount} / {maxLength}
          {charCount > maxLength * 0.9 && (
            <span className="text-amber-500 ml-1">
              {charCount >= maxLength ? ' (Limit reached)' : ' (Almost at limit)'}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * DatePresetButtons Component
 *
 * Standalone quick-select buttons (Today / Yesterday / Tomorrow) that can be
 * placed above ANY existing date input — without replacing it. This keeps the
 * caller's custom styling, icons, validation, and error handling intact while
 * adding the quick-select functionality from audit issue #13.
 *
 * The buttons highlight when the current value matches a preset.
 *
 * @example
 * ```tsx
 * <DatePresetButtons value={record.maintenanceDate} onChange={(d) => setDate(d)} />
 * <input type="date" value={record.maintenanceDate} onChange={...} />
 * ```
 */
interface DatePresetButtonsProps {
  /** Current date value in YYYY-MM-DD format (used to highlight the active preset) */
  value?: string;
  /** Callback fired when a preset button is clicked, with the YYYY-MM-DD date */
  onChange: (date: string) => void;
  /** Custom presets (defaults to Today / Yesterday / Tomorrow) */
  presets?: Array<{ label: string; date: string }>;
  /** Theme variant to match the surrounding editor */
  variant?: 'cream' | 'slate';
  /** Extra classes for the button row container */
  className?: string;
}

/**
 * Default presets computed at call time (not module load) so "Today" stays
 * correct even if the app stays open across midnight.
 */
const DEFAULT_DATE_PRESETS = (): Array<{ label: string; date: string }> => [
  { label: 'Today', date: new Date().toISOString().split('T')[0] },
  { label: 'Yesterday', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
  { label: 'Tomorrow', date: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
];

export const DatePresetButtons: React.FC<DatePresetButtonsProps> = ({
  value,
  onChange,
  presets,
  variant = 'cream',
  className = ''
}) => {
  const effectivePresets = presets ?? DEFAULT_DATE_PRESETS();

  const activeClasses = 'bg-primary text-white';
  const inactiveClasses =
    variant === 'slate'
      ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
      : 'bg-cream-2 text-latte hover:bg-cream-3 hover:text-primary';

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {effectivePresets.map(preset => (
        <button
          key={preset.label}
          type="button"
          onClick={() => onChange(preset.date)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
            value === preset.date ? activeClasses : inactiveClasses
          }`}
          aria-pressed={value === preset.date}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

/**
 * Quick date input with preset buttons.
 *
 * Convenience wrapper that bundles DatePresetButtons with an EnhancedInput date field.
 * For editors that already have their own styled date input, use DatePresetButtons
 * on its own to avoid replacing the existing markup.
 */
interface DateInputWithPresetsProps {
  name: string;
  label?: string;
  value?: string;
  onChange: (date: string) => void;
  required?: boolean;
  error?: string;
  presets?: Array<{ label: string; date: string }>;
}

export const DateInputWithPresets: React.FC<DateInputWithPresetsProps> = ({
  name,
  label,
  value,
  onChange,
  required = false,
  error,
  presets
}) => {
  return (
    <div>
      <DatePresetButtons
        value={value}
        onChange={onChange}
        presets={presets}
        className="mb-2"
      />

      <EnhancedInput
        name={name}
        label={label}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        error={error}
      />
    </div>
  );
};

export default EnhancedInput;