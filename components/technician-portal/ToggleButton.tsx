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
  teal: 'border-primary bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary shadow-sm',
  red: 'border-ember-500 bg-ember-500/10 dark:bg-ember-500/20 text-ember-700 dark:text-ember-300 shadow-sm',
  blue: 'border-primary bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary shadow-sm',
  amber: 'border-primary bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary shadow-sm',
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
                : 'border-default dark:border-default text-primary dark:text-cream hover:border-brass dark:hover:border-brass'
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
