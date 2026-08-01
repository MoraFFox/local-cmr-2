import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../utils/LanguageContext';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    expanded?: boolean;
    onClick?: React.MouseEventHandler<HTMLButtonElement>;
    onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
    onFocus?: React.FocusEventHandler<HTMLButtonElement>;
    onBlur?: React.FocusEventHandler<HTMLButtonElement>;
    'aria-describedby'?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
    theme,
    toggleTheme,
    expanded = true,
    onClick,
    onMouseEnter,
    onMouseLeave,
    onFocus,
    onBlur,
    'aria-describedby': ariaDescribedBy,
}) => {
    const { t } = useLanguage();
    const label = theme === 'light'
        ? t.admin.sidebar.switchToDark
        : t.admin.sidebar.switchToLight;
    return (
        <button
            type="button"
            onClick={(event) => {
                toggleTheme();
                onClick?.(event);
            }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
            className={expanded
                ? "w-full min-h-[44px] flex items-center p-3 rounded-lg border border-hairline/50 bg-cream/50 dark:bg-espresso-light/30 text-sm font-medium text-latte dark:text-latte/70 hover:bg-cream-2 dark:hover:bg-espresso-light/50 hover:text-primary dark:hover:text-white transition-colors justify-center ltr:justify-start rtl:justify-end gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                : "w-11 h-11 min-w-[44px] min-h-[44px] mx-auto p-0 flex items-center justify-center shrink-0 rounded-lg border border-hairline/50 bg-cream/50 dark:bg-espresso-light/30 text-sm font-medium text-latte dark:text-latte/70 hover:bg-cream-2 dark:hover:bg-espresso-light/50 hover:text-primary dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"}
            aria-label={label}
            aria-describedby={ariaDescribedBy}
            title={expanded ? label : undefined}
        >
            {theme === 'light' ? (
                <MoonIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            ) : (
                <SunIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
            )}
            {expanded && <span className="truncate">{label}</span>}
        </button>
    );
};

export default ThemeToggle;