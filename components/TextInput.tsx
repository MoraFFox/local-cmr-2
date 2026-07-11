import React from 'react';

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
}

const TextInput: React.FC<TextInputProps> = ({ label, name, className, icon, error, required, ...props }) => {
  const inputId = props.id || name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ink mb-1.5">
          {label}
          {required && <span className="text-brand-red mr-1">*</span>}
        </label>
      )}
      <div className="relative group focus-within:text-brand-red">
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-latte group-focus-within:text-brand-red transition-colors">
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
          {...props}
          className={`block w-full ${icon ? 'pr-10 pl-4' : 'px-4'} h-[50px] bg-cream text-ink rounded-lg placeholder-latte focus:outline-none focus:ring-2 border transition-colors ${
            error
              ? 'border-ember-500 focus:border-primary focus:ring-primary/20 animate-shake'
              : 'border-hairline focus:border-primary focus:ring-primary/20'
          }`}
        />
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
