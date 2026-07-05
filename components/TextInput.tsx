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
        <label htmlFor={inputId} className="block text-sm font-medium text-onyx mb-1.5">
          {label}
          {required && <span className="text-lava-500 mr-1">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-sage">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          name={name}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
          className={`block w-full ${icon ? 'pr-10' : 'px-4'} h-[50px] bg-deep text-onyx rounded-lg placeholder-sage focus:outline-none focus:ring-2 border transition-colors ${
            error
              ? 'border-lava-500 focus:border-lava-500 focus:ring-lava-500/20 animate-shake'
              : 'border-sea focus:border-lava-500 focus:ring-lava-500/20'
          }`}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1 text-sm text-lava-400 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};

export default TextInput;
