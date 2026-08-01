import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { RequiredFieldBadge } from '@/packages/form-progress';
import { HelpTooltip } from './form-ui/HelpTooltip';
import { useFloatingMenu } from '../hooks/useFloatingMenu';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: React.ReactNode;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
  suggestions?: string[];
  helpText?: string;
}

const TextInput: React.FC<TextInputProps> = ({ label, name, className, icon, error, required, suggestions, helpText, ...props }) => {
  const inputId = props.id || name;
  const [menuWidth, setMenuWidth] = useState(224);
  const [activeIndex, setActiveIndex] = useState(-1);
  const menu = useFloatingMenu({ menuWidth });
  const isCombobox = suggestions !== undefined;

  const filteredSuggestions = isCombobox
    ? suggestions.filter(s => s.toLowerCase().includes(String(props.value || '').toLowerCase()))
    : [];

  useEffect(() => {
    if (activeIndex >= filteredSuggestions.length) {
      setActiveIndex(filteredSuggestions.length > 0 ? filteredSuggestions.length - 1 : -1);
    }
  }, [activeIndex, filteredSuggestions.length]);

  const openSuggestions = () => {
    if (!isCombobox) return;
    if (menu.triggerRef.current) {
      setMenuWidth(Math.max(menu.triggerRef.current.offsetWidth, 224));
    }
    menu.setOpen(true);
    setActiveIndex(filteredSuggestions.length > 0 ? 0 : -1);
  };

  const closeSuggestions = () => {
    menu.setOpen(false);
    setActiveIndex(-1);
  };

  const handleSuggestionClick = (s: string) => {
    props.onChange?.({
      target: { name, value: s },
    } as React.ChangeEvent<HTMLInputElement>);
    closeSuggestions();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isCombobox) {
      props.onKeyDown?.(e);
      return;
    }

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!menu.open) {
        openSuggestions();
      } else if (filteredSuggestions.length > 0) {
        setActiveIndex((current) => {
          if (e.key === 'ArrowDown') return current < filteredSuggestions.length - 1 ? current + 1 : 0;
          return current > 0 ? current - 1 : filteredSuggestions.length - 1;
        });
      }
    } else if (e.key === 'Enter' && menu.open && activeIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(filteredSuggestions[activeIndex]);
    } else if (e.key === 'Escape' && menu.open) {
      e.preventDefault();
      closeSuggestions();
    }

    props.onKeyDown?.(e);
  };

  return (
    <div className={className}>
      {label && (
        <div className="flex items-center gap-1.5 mb-1.5">
          <label htmlFor={inputId} className="text-xs sm:text-sm font-medium text-primary">
            {label}
          </label>
          {required && <RequiredFieldBadge />}
          {helpText && <HelpTooltip text={helpText} variant="inline" size="sm" />}
        </div>
      )}
      <div className="relative group focus-within:text-primary">
        {icon && (
          <div className="absolute inset-y-0 end-0 pe-3.5 flex items-center pointer-events-none text-latte group-focus-within:text-primary transition-colors">
            {React.cloneElement(icon as React.ReactElement, {
              className: 'w-4 h-4',
              'aria-hidden': 'true',
            })}
          </div>
        )}
        <input
          {...props}
          id={inputId}
          name={name}
          ref={isCombobox ? menu.triggerRef as React.RefObject<HTMLInputElement> : undefined}
          role={isCombobox ? 'combobox' : undefined}
          aria-expanded={isCombobox ? menu.open : undefined}
          aria-controls={isCombobox ? `${inputId}-suggestions` : undefined}
          aria-activedescendant={isCombobox && menu.open && activeIndex >= 0 ? `${inputId}-suggestion-${activeIndex}` : undefined}
          aria-autocomplete={isCombobox ? 'list' : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          autoComplete={isCombobox ? "off" : props.autoComplete}
          onFocus={(e) => {
            if (isCombobox && !menu.open) openSuggestions();
            props.onFocus?.(e);
          }}
          onKeyDown={handleKeyDown}
          className={`block w-full ${icon ? 'pe-14' : 'pe-4'} ${isCombobox ? 'ps-10' : 'ps-4'} h-[44px] sm:h-[50px] bg-cream text-base text-primary rounded-lg placeholder-latte focus:outline-none focus:ring-2 border transition-colors ${
            error
              ? 'border-ember-500 dark:border-ember-400 focus:border-primary focus:ring-primary/20 animate-shake'
              : 'border-hairline focus:border-primary focus:ring-primary/20'
          }`}
        />
        {isCombobox && (
          <button
            type="button"
            aria-label="عرض الاقتراحات"
            tabIndex={-1}
            className="absolute inset-y-0 start-0 ps-3.5 flex items-center cursor-pointer text-latte group-focus-within:text-primary transition-colors"
            onMouseDown={(e) => {
              // The floating menu listens on document for outside clicks. Keep
              // this control from racing that handler before onClick toggles.
              e.preventDefault();
              e.stopPropagation();
            }}
            onClick={() => (menu.open ? closeSuggestions() : openSuggestions())}
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${menu.open ? 'rotate-180' : ''}`} />
          </button>
        )}

        {isCombobox && menu.open && createPortal(
          <ul
            id={`${inputId}-suggestions`}
            ref={menu.contentRef as React.RefObject<HTMLUListElement>}
            role="listbox"
            aria-label={label ? String(label) : 'الاقتراحات'}
            style={{ ...menu.style, width: menuWidth }}
            className="fixed z-[9999] bg-paper border border-hairline rounded-lg shadow-xl max-h-60 overflow-auto animate-scale-in"
          >
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  id={`${inputId}-suggestion-${idx}`}
                  role="option"
                  aria-selected={idx === activeIndex}
                  className={`px-4 py-2 cursor-pointer text-sm text-primary transition-colors ${idx === activeIndex ? 'bg-cream' : 'hover:bg-cream'}`}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSuggestionClick(s)}
                >
                  {s}
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-latte italic text-center">
                اكتب لإضافة قيمة جديدة...
              </li>
            )}
          </ul>,
          document.body,
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-ember-700 dark:text-ember-300 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextInput;
