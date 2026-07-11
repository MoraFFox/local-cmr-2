import React from 'react';

interface TechInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const TechInput: React.FC<TechInputProps> = ({ 
    label, 
    icon, 
    rightElement, 
    className = "", 
    disabled,
    ...props 
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2 ml-1">
          {label}
        </label>
      )}

      <div className={`
        relative flex items-center bg-chrome-light/50 border rounded-xl overflow-hidden transition-all duration-200 px-4
        ${disabled ? 'opacity-50 cursor-not-allowed border-default' : 'border-default hover:border-brass focus-within:border-brand-red/50 focus-within:ring-2 focus-within:ring-brand-red/20'}
      `}>
        {icon && (
          <div className="text-secondary shrink-0">
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
