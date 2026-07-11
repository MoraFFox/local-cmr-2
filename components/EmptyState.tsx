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
            <div className={`flex flex-col items-center justify-center py-8 px-4 text-center bg-surface-elevated/50 rounded-xl border border-dashed border-default animate-fade-in ${className}`}>
                <div className="text-secondary mb-3">
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}
                </div>
                <h4 className="text-sm font-semibold text-primary">{title}</h4>
                {message && <p className="mt-1 text-xs text-secondary max-w-sm">{message}</p>}
                {children && <div className="mt-4">{children}</div>}
            </div>
        );
    }

    if (variant === 'search') {
        return (
            <div className={`flex flex-col items-center justify-center py-16 px-4 text-center animate-content-fade-in ${className}`}>
                <div className="relative mb-6">
                    <div className="absolute inset-0 bg-surface-elevated rounded-full scale-150 opacity-50 blur-xl"></div>
                    <div className="relative bg-surface w-16 h-16 rounded-2xl shadow-sm border border-default flex items-center justify-center text-secondary rotate-3 transition-transform hover:rotate-0 duration-300">
                        {React.cloneElement(icon as React.ReactElement, { className: 'w-8 h-8' })}
                    </div>
                </div>
                <h4 className="text-lg font-bold text-primary">{title}</h4>
                {message && <p className="mt-2 text-sm text-secondary max-w-md mx-auto leading-relaxed">{message}</p>}
                {children && <div className="mt-6">{children}</div>}
            </div>
        );
    }

    // Primary variant (used for main pages without data)
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl bg-surface border-2 border-dashed border-default animate-content-fade-in ${className}`}>
            <div className="relative mb-6 group">
                <div className="absolute inset-0 bg-copper-500/10 rounded-full scale-150 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-copper-500/10 w-20 h-20 rounded-full flex items-center justify-center text-brand-red ring-8 ring-cream transition-transform duration-500 group-hover:scale-110">
                    {React.cloneElement(icon as React.ReactElement, { className: 'w-10 h-10' })}
                </div>
            </div>
            <h4 className="text-xl font-bold text-primary">{title}</h4>
            {message && <p className="mt-2 text-sm text-secondary max-w-sm mx-auto leading-relaxed">{message}</p>}
            {children && <div className="mt-8">{children}</div>}
        </div>
    );
};

export default EmptyState;
