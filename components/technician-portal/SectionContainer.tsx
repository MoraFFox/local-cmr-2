/** @format */

import React, { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface SectionContainerProps {
  children: React.ReactNode;
  variant: 'primary' | 'secondary' | 'tertiary';
  title?: string;
  icon?: React.ReactNode;
  accentColor?: 'teal' | 'red' | 'blue' | 'amber' | 'slate';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  badge?: string | number;
  className?: string;
}

const accentBorderMap = {
  teal: 'border-l-teal-500 dark:border-l-teal-400',
  red: 'border-l-red-500 dark:border-l-red-400',
  blue: 'border-l-blue-500 dark:border-l-blue-400',
  amber: 'border-l-amber-500 dark:border-l-amber-400',
  slate: 'border-l-slate-300 dark:border-l-slate-600',
};

const iconBgMap = {
  teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  slate: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
};

const badgeBgMap = {
  teal: 'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300',
  red: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300',
  blue: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  amber: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
  slate: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
};

const variantStyles = {
  primary: 'bg-white dark:bg-slate-800/80 p-6 shadow-lg border-l-4 rounded-2xl',
  secondary: 'bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl',
  tertiary: 'py-3',
};

const SectionContainer: React.FC<SectionContainerProps> = ({
  children,
  variant,
  title,
  icon,
  accentColor = 'teal',
  collapsible = false,
  defaultCollapsed = false,
  badge,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const containerClasses = [
    variantStyles[variant],
    variant === 'primary' ? accentBorderMap[accentColor] : '',
    collapsible ? 'cursor-pointer' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const renderHeader = () => {
    if (!title && !icon && !badge && variant === 'tertiary' && !collapsible) {
      return null;
    }

    const showHeader = title || icon || badge || collapsible;

    if (!showHeader) return null;

    return (
      <div
        className={`flex items-center gap-3 ${variant !== 'tertiary' ? 'mb-4' : 'mb-2'} ${collapsible ? 'select-none' : ''}`}
        onClick={collapsible ? handleToggle : undefined}
      >
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBgMap[accentColor]}`}>
            {icon}
          </div>
        )}

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {title && (
            <h3 className="text-base font-semibold text-slate-900 dark:text-white truncate">
              {title}
            </h3>
          )}
          {badge !== undefined && (
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full flex-shrink-0 ${badgeBgMap[accentColor]}`}
            >
              {badge}
            </span>
          )}
        </div>

        {collapsible && (
          <ChevronDownIcon
            className={`w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-200 ${
              isCollapsed ? '' : 'rotate-180'
            }`}
          />
        )}
      </div>
    );
  };

  return (
    <div className={containerClasses}>
      {renderHeader()}
      <div
        className={`transition-all duration-200 overflow-hidden ${
          collapsible && isCollapsed ? 'max-h-0 opacity-0' : 'max-h-full opacity-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
};

export default SectionContainer;