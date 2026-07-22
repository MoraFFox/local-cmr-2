import React, { useRef, useCallback, useId } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import HelpTooltip from './form-ui/HelpTooltip';

interface RadioOption<T = string | boolean> {
    label: string;
    value: T;
    description?: string;
}

interface RadioGroupProps<T = string | boolean> {
    name: string;
    label?: React.ReactNode;
    helpText?: string;
    options: RadioOption<T>[];
    value: T;
    onChange: (value: T) => void;
    inline?: boolean;
    disabled?: boolean;
}

function RadioGroup<T extends string | boolean>({ name, label, helpText, options, value, onChange, inline, disabled = false }: RadioGroupProps<T>) {
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

    const selectedClasses = 'border-primary bg-primary/10 text-primary dark:text-primary/80';
    const unselectedClasses = 'border-hairline bg-cream text-primary hover:border-primary/30';

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
                    ${isSelected ? 'border-primary bg-primary' : 'border-hairline'}
                `}>
                    {isSelected && <div className={`rounded-full bg-white ${inline ? 'w-2 h-2' : 'w-2.5 h-2.5'}`} />}
                </div>

                <div className={`flex-1 min-w-0 ${inline ? '' : ''}`}>
                    <div className={`font-semibold ${isSelected ? 'text-primary dark:text-primary/80' : 'text-primary'}`}>
                        {option.label}
                    </div>
                    {option.description && !inline && (
                        <div className="text-sm text-latte mt-0.5">
                            {option.description}
                        </div>
                    )}
                </div>

                {isSelected && !inline && (
                    <CheckCircleIcon className="w-6 h-6 text-primary flex-shrink-0" />
                )}
            </button>
        );
    };

    const labelId = useId();
    const hasLabelNode = React.isValidElement(label);

    return (
        <div
            ref={groupRef}
            role="radiogroup"
            aria-label={typeof label === 'string' ? label : undefined}
            aria-labelledby={hasLabelNode ? labelId : undefined}
            onKeyDown={handleKeyDown}
            className={disabled ? 'opacity-60' : ''}
        >
            {(label || helpText) && (
                <div id={labelId} className="flex items-center gap-2 text-sm font-medium text-primary mb-3">
                    {label && <span>{label}</span>}
                    {helpText && <HelpTooltip text={helpText} variant="inline" size="sm" />}
                </div>
            )}
            <div className={inline ? 'flex flex-wrap gap-3' : 'space-y-2'}>
                {options.map((option) => renderOption(option, value === option.value))}
            </div>
        </div>
    );
}

export default RadioGroup;
