import React from 'react';
import { RequiredFieldBadge } from '../../form-ui/RequiredFieldBadge';

interface TechInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  required?: boolean;
}

const TechInput: React.FC<TechInputProps> = ({
    label,
    icon,
    rightElement,
    className = "",
    disabled,
    required,
    ...props
  }) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-latte mb-2 ml-1 flex items-center gap-1">
          {label}
          {required && <RequiredFieldBadge size="sm" />}
        </label>
      )}

      <div className={`
        relative flex items-center bg-espresso-light/50 border rounded-xl overflow-hidden transition-all duration-200 px-4
        ${disabled ? 'opacity-50 cursor-not-allowed border-hairline' : 'border-hairline hover:border-brass focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20'}
      `}>
        {icon && (
          <div className="text-latte shrink-0">
            {icon}
          </div>
        )}

        <input
          className={`
            w-full bg-transparent px-3 py-3.5 text-cream placeholder-latte outline-none
            disabled:cursor-not-allowed
            ${className}
          `}
          disabled={disabled}
          {...props}
        />

        {rightElement && (
           <div className="shrink-0">
               {rightElement}
           </div>
        )}
      </div>
    </div>
  );
};

export default TechInput;
