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
                return 'bg-teal-600 text-white shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:bg-teal-500 active:bg-teal-700 border border-teal-500/50';
            case 'secondary':
                return 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 active:bg-slate-900';
            case 'danger':
                return 'bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20 active:bg-red-500/30';
            case 'ghost':
                return 'bg-transparent text-slate-400 hover:text-white active:bg-white/5';
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
