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
  teal: 'border-l-copper-500 dark:border-l-copper-400',
  red: 'border-l-ember-500 dark:border-l-ember-400',
  blue: 'border-l-copper-500 dark:border-l-copper-400',
  amber: 'border-l-copper-500 dark:border-l-copper-400',
  slate: 'border-l-hairline dark:border-l-hairline',
};

const iconBgMap = {
  teal: 'bg-copper-500/10 dark:bg-copper-500/20 text-copper-600 dark:text-copper-400',
  red: 'bg-ember-500/10 dark:bg-ember-500/20 text-ember-700 dark:text-ember-300',
  blue: 'bg-copper-500/10 dark:bg-copper-500/20 text-copper-600 dark:text-copper-400',
  amber: 'bg-copper-500/10 dark:bg-copper-500/20 text-copper-600 dark:text-copper-400',
  slate: 'bg-cream-2 dark:bg-espresso-light text-latte dark:text-cream/70',
};

const badgeBgMap = {
  teal: 'bg-copper-500/10 dark:bg-copper-500/20 text-copper-700 dark:text-copper-400',
  red: 'bg-ember-500/10 dark:bg-ember-500/20 text-ember-700 dark:text-ember-300',
  blue: 'bg-copper-500/10 dark:bg-copper-500/20 text-copper-700 dark:text-copper-400',
  amber: 'bg-copper-500/10 dark:bg-copper-500/20 text-copper-700 dark:text-copper-400',
  slate: 'bg-cream-2 dark:bg-espresso-light text-ink dark:text-cream',
};

const variantStyles = {
  primary: 'bg-cream dark:bg-espresso-light/80 p-6 shadow-lg border-l-4 rounded-2xl',
  secondary: 'bg-cream dark:bg-espresso-light/50 p-4 rounded-xl',
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
            <h3 className="text-base font-semibold text-ink dark:text-cream truncate">
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
            className={`w-5 h-5 text-latte dark:text-cream/70 flex-shrink-0 transition-transform duration-200 ${
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