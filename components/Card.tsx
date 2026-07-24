import React from 'react';

type MaxWidthKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl' | 'full' | 'none';

const MAX_WIDTH_CLASSES: Record<MaxWidthKey, string> = {
  xs: 'max-w-xs',
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-full',
  none: 'max-w-none',
};

interface CardProps {
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  maxWidth?: MaxWidthKey;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', maxWidth = 'none' }) => {
  return (
    <div className={`bg-cream border border-hairline rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 ${MAX_WIDTH_CLASSES[maxWidth]} ${className}`}>
      {title && (
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-ink mb-3 sm:mb-4">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default Card;
