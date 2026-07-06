import React from 'react';

interface TechCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'alert' | 'success' | 'active';
  onClick?: () => void;
}

const TechCard: React.FC<TechCardProps> = ({ 
    children, 
    title, 
    icon, 
    className = "", 
    variant = 'default',
    onClick
}) => {
  const getBorderColor = () => {
      switch (variant) {
          case 'alert': return 'border-ember-500/50';
          case 'success': return 'border-leaf-500/50';
          case 'active': return 'border-copper-500/50';
          default: return 'border-hairline';
      }
  };

  const getBgColor = () => {
    switch (variant) {
        case 'alert': return 'from-espresso to-ember-500/10';
        case 'success': return 'from-espresso to-leaf-500/10';
        case 'active': return 'from-espresso to-copper-500/10';
        default: return 'bg-espresso/50';
    }
};

  return (
    <div 
        onClick={onClick}
        className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br backdrop-blur-sm transition-all duration-200 ${getBorderColor()} ${getBgColor()} ${onClick ? 'cursor-pointer active:scale-[0.98] hover:border-brass' : ''} ${className}`}
    >
      {/* Header */}
      {title && (
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/5">
              {icon && <div className={`w-4 h-4 ${variant === 'active' ? 'text-copper-400' : 'text-latte'}`}>{icon}</div>}
              <h3 className="text-xs font-bold uppercase tracking-wider text-cream">{title}</h3>
          </div>
      )}

      {/* Content */}
      <div className="p-4">
          {children}
      </div>

      {/* Decorative Corner */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 border-t border-r ${
          variant === 'active' ? 'border-copper-500' : 'border-brass'
      } opacity-50`} />
      <div className={`absolute -bottom-1 -left-1 w-3 h-3 border-b border-l ${
           variant === 'active' ? 'border-copper-500' : 'border-brass'
      } opacity-50`} />
    </div>
  );
};

export default TechCard;
