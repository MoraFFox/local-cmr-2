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
        <div className="border border-hairline dark:border-hairline rounded-lg bg-cream/50 dark:bg-espresso/20">
            <button
                type="button" // Prevent form submission
                className="w-full flex justify-between items-center p-3 sm:p-4 text-left"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <h5 className="font-semibold text-primary dark:text-latte/70">{title}</h5>
                <ChevronUpIcon className={`w-5 h-5 text-latte transform transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
            </button>
            <div
                className={`transition-all duration-300 ease-in-out grid ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden">
                    <div className="p-3 sm:p-4 border-t border-hairline dark:border-hairline">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollapsibleSection;
