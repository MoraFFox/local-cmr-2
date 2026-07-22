import React from 'react';

interface SkeletonProps {
  className?: string;
  /** Use shimmer animation instead of pulse for a more polished look */
  variant?: 'pulse' | 'shimmer';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'shimmer' }) => {
  const animationClass = variant === 'shimmer'
    ? 'animate-skeleton-shimmer'
    : 'animate-pulse';

  return (
    <div className={`bg-cream-2 dark:bg-espresso-light rounded-lg ${animationClass} ${className}`} />
  );
};

export const SkeletonText: React.FC<{ lines?: number; className?: string; variant?: 'pulse' | 'shimmer' }> = ({ lines = 1, className = '', variant }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} variant={variant} className="h-4 w-full last:w-4/5" />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string; variant?: 'pulse' | 'shimmer' }> = ({ className = '', variant }) => {
  return (
    <div className={`bg-cream border border-hairline rounded-xl p-4 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton variant={variant} className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton variant={variant} className="h-4 w-1/3" />
          <Skeleton variant={variant} className="h-3 w-1/2" />
        </div>
      </div>
      <SkeletonText variant={variant} lines={2} />
    </div>
  );
};
