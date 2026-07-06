import React, { useRef, useCallback } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface RadioOption<T = string | boolean> {
    label: string;
    value: T;
    description?: string;
}

interface RadioGroupProps<T = string | boolean> {
    name: string;
    label?: string;
    options: RadioOption<T>[];
    value: T;
    onChange: (value: T) => void;
    inline?: boolean;
    disabled?: boolean;
}

function RadioGroup<T extends string | boolean>({ name, label, options, value, onChange, inline, disabled = false }: RadioGroupProps<T>) {
    const groupRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (disabled) return;
        const enabled = options.map((o, i) => ({ ...o, index: i })).filter(o => value === o.value);
        const currentIndex = enabled.length > 0 ? enabled[0].index : -1;
        let nextIndex = currentIndex;

        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault();
            nextIndex = (currentIndex + 1) % options.length;
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault();
            nextIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
        } else if (e.key === 'Home') {
            e.preventDefault();
            nextIndex = 0;
        } else if (e.key === 'End') {
            e.preventDefault();
            nextIndex = options.length - 1;
        }

        if (nextIndex !== currentIndex && nextIndex >= 0) {
            onChange(options[nextIndex].value);
            const buttons = groupRef.current?.querySelectorAll('[role="radio"]');
            (buttons?.[nextIndex] as HTMLElement)?.focus();
        }
    }, [disabled, options, value, onChange]);

    const selectedClasses = 'border-copper-500 bg-copper-500/10 text-copper-700 dark:text-copper-400';
    const unselectedClasses = 'border-hairline bg-cream text-ink hover:border-copper-500/30';

    const commonButtonClasses = `
        relative flex items-center gap-3 rounded-xl border-2 transition-all duration-200
        ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'}
    `;

    const renderOption = (option: RadioOption<T>, isSelected: boolean) => {
        const inputId = `${name}-${String(option.value)}`;
        return (
            <button
                key={inputId}
                type="button"
                role="radio"
                id={inputId}
                aria-checked={isSelected}
                tabIndex={isSelected ? 0 : -1}
                onClick={() => !disabled && onChange(option.value)}
                disabled={disabled}
                className={`
                    ${commonButtonClasses}
                    ${isSelected ? selectedClasses : unselectedClasses}
                    ${inline ? 'px-4 py-3 flex-nowrap' : 'w-full p-4 text-left'}
                `}
            >
                <div className={`
                    rounded-full border-2 flex items-center justify-center transition-colors
                    ${inline ? 'w-5 h-5' : 'w-6 h-6 flex-shrink-0'}
                    ${isSelected ? 'border-copper-500 bg-copper-500' : 'border-hairline'}
                `}>
                    {isSelected && <div className={`rounded-full bg-white ${inline ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />}
                </div>

                <div className={`flex-1 min-w-0 ${inline ? '' : ''}`}>
                    <div className={`font-semibold ${isSelected ? 'text-copper-700 dark:text-copper-400' : 'text-ink'}`}>
                        {option.label}
                    </div>
                    {option.description && !inline && (
                        <div className="text-sm text-latte mt-0.5">
                            {option.description}
                        </div>
                    )}
                </div>

                {isSelected && !inline && (
                    <CheckCircleIcon className="w-6 h-6 text-copper-500 flex-shrink-0" />
                )}
            </button>
        );
    };

    return (
        <div
            ref={groupRef}
            role="radiogroup"
            aria-label={label}
            onKeyDown={handleKeyDown}
            className={disabled ? 'opacity-60' : ''}
        >
            {label && <label className="text-sm font-medium text-ink block mb-3">{label}</label>}
            <div className={inline ? 'flex flex-wrap gap-3' : 'space-y-2'}>
                {options.map((option) => renderOption(option, value === option.value))}
            </div>
        </div>
    );
}

export default RadioGroup;
