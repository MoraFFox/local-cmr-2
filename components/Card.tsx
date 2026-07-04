import React from 'react';

interface CardProps {
    title?: string;
    children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => {
    return (
        <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm dark:shadow-black/30 rounded-2xl p-6 sm:p-8 lg:p-12 border border-black/5 dark:border-white/5">
            {title && (
                <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 dark:text-slate-100 mb-8 sm:mb-10 text-center hidden lg:block">
                    {title}
                </h2>
            )}
            {children}
        </div>
    );
};

export default Card;