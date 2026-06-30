import React, { useState } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    initiallyOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, initiallyOpen = false }) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);

    return (
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white/50 dark:bg-slate-800/20">
            <button
                type="button" // Prevent form submission
                className="w-full flex justify-between items-center p-3 sm:p-4 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <h5 className="font-semibold text-slate-700 dark:text-slate-300">{title}</h5>
                <ChevronUpIcon className={`w-5 h-5 text-slate-400 transform transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
            </button>
            <div
                className={`transition-all duration-300 ease-in-out grid ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-700">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;
