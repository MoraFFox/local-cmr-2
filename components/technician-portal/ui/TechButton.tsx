import React from 'react';

interface TechButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const TechButton: React.FC<TechButtonProps> = ({ 
    children, 
    variant = 'primary', 
    fullWidth = false, 
    className = "", 
    icon,
    disabled,
    ...props 
}) => {
    
    const getBaseStyles = () => {
        switch (variant) {
            case 'primary':
                return 'btn-primary';
            case 'secondary':
                return 'bg-surface border border-default text-primary hover:bg-surface-elevated active:bg-surface-3';
            case 'danger':
                return 'bg-ember-500/10 text-ember-700 border border-ember-500/50 hover:bg-ember-500/20 active:bg-ember-500/30';
            case 'ghost':
                return 'bg-transparent text-secondary hover:text-primary active:bg-brand-red/5';
        }
    };

    return (
        <button
            className={`
                relative px-6 py-4 rounded-lg font-bold text-sm tracking-wide uppercase transition-all duration-200
                flex items-center justify-center gap-2
                disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                active:scale-[0.98]
                ${fullWidth ? 'w-full' : ''}
                ${getBaseStyles()}
                ${className}
            `}
            disabled={disabled}
            {...props}
        >
            {icon && <span className="w-5 h-5">{icon}</span>}
            {children}
            
            {/* Tech Scan Line Effect on Primary */}
            {variant === 'primary' && !disabled && (
                <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
                    <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[shimmer_3s_infinite]" />
                </div>
            )}
        </button>
    );
};

export default TechButton;
