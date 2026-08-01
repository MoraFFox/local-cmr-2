import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../utils/LanguageContext';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    expanded?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme, expanded = true }) => {
    const { t } = useLanguage();
    const label = theme === 'light'
        ? t.admin.sidebar.switchToDark
        : t.admin.sidebar.switchToLight;
    return (
        <button
            type="button"
            onClick={toggleTheme}
            className={expanded
                ? "w-full flex items-center p-3 rounded-md text-sm font-medium text-latte dark:text-latte/70 hover:bg-cream-2 dark:hover:bg-espresso-light/50 hover:text-primary dark:hover:text-white transition-colors justify-center ltr:justify-start rtl:justify-end gap-3"
                : "w-10 h-10 min-w-10 mx-auto p-0 flex items-center justify-center shrink-0 rounded-md text-sm font-medium text-latte dark:text-latte/70 hover:bg-cream-2 dark:hover:bg-espresso-light/50 hover:text-primary dark:hover:text-white transition-colors"}
            aria-label={label}
            title={label}
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