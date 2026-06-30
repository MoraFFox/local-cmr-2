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
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">
          {label}
        </label>
      )}
      
      <div className={`
        relative flex items-center bg-slate-800/50 border rounded-xl overflow-hidden transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed border-slate-800' : 'border-slate-700 hover:border-slate-600 focus-within:border-teal-500/50 focus-within:ring-2 focus-within:ring-teal-500/20'}
      `}>
        {icon && (
          <div className="pl-4 text-slate-400">
            {icon}
          </div>
        )}
        
        <input
          className={`
            w-full bg-transparent px-4 py-3.5 text-slate-100 placeholder-slate-600 outline-none
            disabled:cursor-not-allowed
            ${className}
          `}
          disabled={disabled}
          {...props}
        />

        {rightElement && (
           <div className="pr-4">
               {rightElement}
           </div>
        )}
      </div>
    </div>
  );
};

export default TechInput;
