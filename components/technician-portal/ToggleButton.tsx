import React from 'react';

interface ToggleOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  description?: string;
}

interface ToggleButtonProps {
  options: ToggleOption[];
  value: string;
  onChange: (value: string) => void;
  size?: 'default' | 'large';
  accentColor?: 'teal' | 'red' | 'blue' | 'amber';
}

const activeMap = {
  teal: 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 shadow-sm',
  red: 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 shadow-sm',
  blue: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm',
  amber: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 shadow-sm',
};

const ToggleButton: React.FC<ToggleButtonProps> = ({
  options,
  value,
  onChange,
  size = 'default',
  accentColor = 'teal',
}) => {
  const isLarge = size === 'large';

  return (
    <div className={`grid gap-3 ${options.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex items-center justify-center gap-2 rounded-xl border-2 transition-all duration-200 active:scale-[0.98] ${
              isLarge ? 'py-4 px-4 min-h-[56px]' : 'py-3 px-4 min-h-[48px]'
            } ${
              isActive
                ? activeMap[accentColor]
                : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            {option.icon && (
              <span className={isLarge ? 'w-6 h-6' : 'w-5 h-5'}>
                {option.icon}
              </span>
            )}
            <div className={`text-center ${isLarge ? '' : ''}`}>
              <span className={`font-semibold ${isLarge ? 'text-base' : 'text-sm'}`}>
                {option.label}
              </span>
              {option.description && (
                <span className="block text-xs mt-0.5 opacity-70">
                  {option.description}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default ToggleButton;
