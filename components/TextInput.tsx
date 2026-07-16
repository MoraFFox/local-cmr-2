import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
  suggestions?: string[];
}

const TextInput: React.FC<TextInputProps> = ({ label, name, className, icon, error, required, suggestions, ...props }) => {
  const inputId = props.id || name;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isCombobox = suggestions !== undefined;

  useEffect(() => {
    if (!isCombobox) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCombobox]);

  const filteredSuggestions = isCombobox
    ? suggestions.filter(s => s.toLowerCase().includes(String(props.value || '').toLowerCase()))
    : [];

  const handleSuggestionClick = (s: string) => {
    if (props.onChange) {
      props.onChange({
        target: { name, value: s }
      } as React.ChangeEvent<HTMLInputElement>);
    }
    setIsOpen(false);
  };

  return (
    <div className={className} ref={containerRef}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-primary mb-1.5">
          {label}
          {required && <span className="text-primary mr-1">*</span>}
        </label>
      )}
      <div className="relative group focus-within:text-primary">
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-latte group-focus-within:text-primary transition-colors">
            {React.cloneElement(icon as React.ReactElement, {
              className: 'w-4 h-4',
              'aria-hidden': 'true',
            })}
          </div>
        )}
        <input
          id={inputId}
          name={name}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          autoComplete={isCombobox ? "off" : props.autoComplete}
          onFocus={(e) => {
            if (isCombobox) setIsOpen(true);
            props.onFocus?.(e);
          }}
          {...props}
          className={`block w-full ${icon ? 'pr-10' : 'pr-4'} ${isCombobox ? 'pl-10' : 'pl-4'} h-[50px] bg-cream text-primary rounded-lg placeholder-latte focus:outline-none focus:ring-2 border transition-colors ${
            error
              ? 'border-ember-500 focus:border-primary focus:ring-primary/20 animate-shake'
              : 'border-hairline focus:border-primary focus:ring-primary/20'
          }`}
        />
        
        {isCombobox && (
          <div 
            className="absolute inset-y-0 left-0 pl-3.5 flex items-center cursor-pointer text-latte group-focus-within:text-primary transition-colors"
            onClick={() => setIsOpen(!isOpen)}
          >
            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        )}

        {isCombobox && isOpen && (
          <ul className="absolute z-50 w-full mt-1 bg-paper border border-hairline rounded-lg shadow-lg max-h-60 overflow-auto">
            {filteredSuggestions.length > 0 ? (
              filteredSuggestions.map((s, idx) => (
                <li
                  key={idx}
                  className="px-4 py-2 hover:bg-cream cursor-pointer text-sm text-primary transition-colors"
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
          </ul>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-ember-500 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextInput;
