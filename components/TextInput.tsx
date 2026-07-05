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
                <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <div className="relative">
                {icon && (
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        {icon}
                    </div>
                )}
                <input
                    id={inputId}
                    name={name}
                    aria-invalid={error ? 'true' : undefined}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    {...props}
                    className={`block w-full ${icon ? 'pl-10' : 'px-4'} h-[50px] bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 border shadow-sm transition-colors ${
                        error
                            ? 'border-red-300 focus:border-red-400 focus:ring-red-400/20 dark:border-red-600'
                            : 'border-slate-200 dark:border-slate-700 focus:border-success-500 focus:ring-success-500/20'
                    }`}
                />
            </div>
            {error && (
                <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                    {error}
                </p>
            )}
        </div>
    );
};

export default TextInput;