import React, { useRef } from 'react';
import { RequiredFieldBadge } from '@/packages/form-progress';
import { HelpTooltip } from '../../form-ui/HelpTooltip';

interface TechInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  required?: boolean;
  helpText?: string;
  /** Error message to display below the input */
  error?: string;
  /** Whether to auto-scroll the input into view on focus (mobile keyboards).
   *  Opt-in to avoid disruptive scrolling on desktop. */
  autoScroll?: boolean;
}

const TechInput: React.FC<TechInputProps> = ({
    label,
    icon,
    rightElement,
    className = "",
    disabled,
    required,
    helpText,
    error,
    autoScroll = false,
    onFocus,
    onBlur,
    ...props
  }) => {
  /**
   * Keep the focused input visible above the mobile virtual keyboard.
   */
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (autoScroll) {
      const input = e.currentTarget;
      // Delay slightly to allow the mobile keyboard to animate in, but only
      // scroll if the input is in the lower half of the viewport where the
      // keyboard would cover it.
      scrollTimerRef.current = setTimeout(() => {
        const viewportHeight = window.innerHeight;
        const rect = input.getBoundingClientRect();
        if (rect.top > viewportHeight * 0.5) {
          const targetY = rect.top - viewportHeight * 0.2;
          window.scrollTo({ top: window.scrollY + targetY, behavior: 'smooth' });
        }
      }, 300);
    }
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = null;
    }
    onBlur?.(e);
  };

  const inputId = props.id || props.name;

  return (
    <div className="w-full">
      {label && (
        <div className="flex items-center gap-1.5 mb-2 ml-1">
          <label htmlFor={inputId} className="block text-xs font-bold uppercase tracking-wider text-latte">
            {label}
          </label>
          {required && <RequiredFieldBadge size="sm" />}
          {helpText && <HelpTooltip text={helpText} variant="inline" size="sm" />}
        </div>
      )}

      <div className={`
        relative flex items-center bg-espresso-light/50 border rounded-xl overflow-hidden transition-all duration-200 px-4
        ${disabled ? 'opacity-50 cursor-not-allowed border-hairline' : error ? 'border-ember-500 dark:border-ember-400 focus-within:ring-2 focus-within:ring-ember-500/20' : 'border-hairline hover:border-brass focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20'}
      `}>
        {icon && (
          <div className="text-latte shrink-0">
            {icon}
          </div>
        )}

        <input
          id={inputId}
          className={`
            w-full bg-transparent px-3 py-3.5 text-cream placeholder-latte outline-none
            disabled:cursor-not-allowed
            ${className}
          `}
          disabled={disabled}
          onFocus={handleFocus}
          onBlur={handleBlur}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />

        {rightElement && (
           <div className="shrink-0">
               {rightElement}
           </div>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-ember-700 dark:text-ember-300 flex items-center gap-1 animate-fade-in">
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default TechInput;
