import React from 'react';
import { Skeleton, SkeletonText } from './Skeleton';

export interface LoadingStateProps {
  label?: string;
  inline?: boolean;
  /** Visual variant */
  variant?: 'spinner' | 'skeleton' | 'skeleton-card';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  label = 'جاري التحميل...',
  inline = false,
  variant = 'spinner'
}) => {
  // Skeleton variant — for inline content placeholders
  if (variant === 'skeleton') {
    return (
      <div className="space-y-3 animate-fade-in" role="status" aria-label={label}>
        <Skeleton className="h-6 w-1/3" />
        <SkeletonText lines={3} />
      </div>
    );
  }

  // Skeleton card variant — for page-level card placeholders
  if (variant === 'skeleton-card') {
    return (
      <div className="space-y-4 animate-fade-in" role="status" aria-label={label}>
        <Skeleton className="h-8 w-1/4 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <SkeletonText lines={2} />
      </div>
    );
  }

  // Spinner variant (default)
  if (inline) {
    return (
      <div className="flex justify-center py-8 animate-fade-in" role="status" aria-label={label}>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper dark:bg-espresso flex items-center justify-center p-4" role="status" aria-label={label}>
      <div className="text-center animate-content-fade-in">
        <div className="mx-auto mb-4 h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-primary dark:text-cream font-medium">
          {label}
        </p>
      </div>
    </div>
  );
};
