import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';

interface ThemeToggleProps {
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    expanded?: boolean;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, toggleTheme, expanded = true }) => {
    const label = theme === 'light' ? 'الوضع الليلي' : 'الوضع النهاري';
    return (
        <button
            onClick={toggleTheme}
            className="w-full flex items-center p-3 rounded-md text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors justify-center lg:justify-start gap-3"
            aria-label={label}
            title={label}
        >
            {theme === 'light' ? (
                <MoonIcon className="h-5 w-5" />
            ) : (
                <SunIcon className="h-5 w-5" />
            )}
            {expanded && <span className="hidden lg:inline">{label}</span>}
        </button>
    );
};

export default ThemeToggle;