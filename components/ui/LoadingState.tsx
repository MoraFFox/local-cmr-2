import React from 'react';

export interface LoadingStateProps {
  label?: string;
  inline?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label = 'جاري التحميل...', inline = false }) => {
  if (inline) {
    return (
      <div className="flex justify-center py-8 animate-fade-in">
        <div className="w-8 h-8 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark:bg-chrome flex items-center justify-center p-4">
      <div className="text-center animate-content-fade-in">
        <div className="mx-auto mb-4 h-10 w-10 border-4 border-brand-red border-t-transparent rounded-full animate-spin" />
        <p className="text-primary dark:text-cream font-medium">
          {label}
        </p>
      </div>
    </div>
  );
};
