import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

interface RadioOption {
    label: string;
    value: any;
    description?: string;
}

interface RadioGroupProps {
    name: string;
    label?: string;
    options: RadioOption[];
    value: any;
    onChange: (value: any) => void;
    inline?: boolean;
    disabled?: boolean;
}

const RadioGroup: React.FC<RadioGroupProps> = ({ name, label, options, value, onChange, inline, disabled = false }) => {
    if (inline) {
        return (
            <div className={disabled ? 'opacity-60' : ''}>
                {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">{label}</label>}
                <div className="flex flex-wrap gap-3">
                    {options.map((option) => {
                        const isSelected = value === option.value;
                        return (
                            <button
                                key={option.label}
                                type="button"
                                onClick={() => !disabled && onChange(option.value)}
                                disabled={disabled}
                                className={`
                                    relative flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200
                                    ${isSelected 
                                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-100' 
                                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                                    }
                                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
                                    ${isSelected 
                                        ? 'border-teal-500 bg-teal-500' 
                                        : 'border-slate-300 dark:border-slate-500'
                                    }
                                `}>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                                </div>
                                <span className="font-semibold text-sm">{option.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className={disabled ? 'opacity-60' : ''}>
            {label && <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">{label}</label>}
            <div className="space-y-2">
                {options.map((option) => {
                    const isSelected = value === option.value;
                    return (
                        <button
                            key={option.label}
                            type="button"
                            onClick={() => !disabled && onChange(option.value)}
                            disabled={disabled}
                            className={`
                                w-full relative flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200
                                ${isSelected 
                                    ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' 
                                    : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'
                                }
                                ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:shadow-md'}
                            `}
                        >
                            <div className={`
                                w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors
                                ${isSelected 
                                    ? 'border-teal-500 bg-teal-500' 
                                    : 'border-slate-300 dark:border-slate-500'
                                }
                            `}>
                                {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
                            </div>
                            
                            <div className="flex-1 min-w-0">
                                <div className={`font-semibold ${isSelected ? 'text-teal-900 dark:text-teal-100' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {option.label}
                                </div>
                                {option.description && (
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                        {option.description}
                                    </div>
                                )}
                            </div>
                            
                            {isSelected && (
                                <CheckCircleIcon className="w-6 h-6 text-teal-500 flex-shrink-0" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default RadioGroup;
