import React from 'react';

export interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message?: string;
    children?: React.ReactNode;
    variant?: 'primary' | 'inline' | 'search';
    className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ 
    icon, 
    title, 
    message, 
    children, 
    variant = 'primary',
    className = '' 
}) => {
    if (variant === 'inline') {
        return (
            <div className={`flex flex-col items-center justify-center py-8 px-4 text-center bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 animate-fade-in ${className}`}>
                <div className="text-slate-400 dark:text-slate-500 mb-3">
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}
                </div>
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h4>
                {message && <p className="mt-1 text-xs text-slate-500 dark:text-slate-500 max-w-sm">{message}</p>}
                {children && <div className="mt-4">{children}</div>}
            </div>
        );
    }

    if (variant === 'search') {
        return (
            <div className={`flex flex-col items-center justify-center py-16 px-4 text-center animate-content-fade-in ${className}`}>
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-brand-cream dark:bg-slate-800 rounded-full scale-150 opacity-50 blur-xl"></div>
                    <div className="relative bg-white dark:bg-slate-800 w-16 h-16 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-slate-400 rotate-3 transition-transform hover:rotate-0 duration-300">
                        {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}
                    </div>
                </div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h4>
                {message && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">{message}</p>}
                {children && <div className="mt-6">{children}</div>}
            </div>
        );
    }

    // Primary variant (used for main pages without data)
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 animate-content-fade-in ${className}`}>
            <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-success-100 dark:bg-success-900/20 rounded-full scale-150 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-success-50 dark:bg-success-900/30 w-20 h-20 rounded-full flex items-center justify-center text-success-600 dark:text-success-400 ring-8 ring-white dark:ring-slate-900 transition-transform duration-500 group-hover:scale-110">
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-10 h-10' })}
                </div>
            </div>
            <h4 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h4>
            {message && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">{message}</p>}
            {children && <div className="mt-8">{children}</div>}
        </div>
    );
};

export default EmptyState;
