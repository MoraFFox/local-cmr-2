import React from 'react';

interface CardProps {
    title?: string;
    children: React.ReactNode;
    className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-slate-900 shadow-sm dark:shadow-black/20 rounded-xl p-5 sm:p-6 lg:p-8 border border-slate-200 dark:border-slate-800 ${className}`}>
            {title && (
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-50 mb-6 sm:mb-8">
                    {title}
                </h2>
            )}
            {children}
        </div>
    );
};

export default Card;