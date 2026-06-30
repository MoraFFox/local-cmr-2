import React from 'react';

interface EmptyStateProps {
    icon: React.ReactNode;
    title: string;
    message: string;
    children?: React.ReactNode; // For the action button
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, children }) => {
    return (
        <div className="text-center py-10 px-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed border-slate-200 dark:border-slate-700">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                {icon}
            </div>
            <h4 className="mt-4 font-semibold text-slate-700 dark:text-slate-300">{title}</h4>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{message}</p>
            {children && <div className="mt-6">{children}</div>}
        </div>
    );
};

export default EmptyState;
