import React, { useState } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';

interface CollapsibleCardProps {
    titleContent: React.ReactNode;
    children: React.ReactNode;
    initiallyOpen?: boolean;
    onRemove?: () => void;
    removeLabel?: string;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ titleContent, children, initiallyOpen = false, onRemove, removeLabel = 'حذف' }) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    const [hasBeenOpened, setHasBeenOpened] = useState(initiallyOpen);

    React.useEffect(() => {
        if (isOpen && !hasBeenOpened) {
            setHasBeenOpened(true);
        }
    }, [isOpen, hasBeenOpened]);

    const shouldRenderChildren = isOpen || hasBeenOpened;

    return (
        <div className={`border border-hairline rounded-xl bg-cream shadow-md transition-shadow duration-300 ${isOpen ? 'shadow-lg' : 'shadow-md'}`}>
            <button
                type="button"
                className={`w-full flex justify-between items-start sm:items-center p-4 cursor-pointer rounded-t-xl ${!isOpen ? 'rounded-b-xl' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-copper-500/30 gap-4`}
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex-1 min-w-0 font-semibold text-ink relative text-right">
                    {titleContent}
                </div>
                <div className="flex items-center shrink-0 gap-3 pt-1 sm:pt-0">
                    {onRemove && (
                        <span
                            role="button"
                            tabIndex={-1}
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            className="text-xs font-semibold text-latte hover:text-ember-600 transition-colors"
                            aria-label={removeLabel}
                        >
                            حذف
                        </span>
                    )}
                    <ChevronUpIcon className={`w-5 h-5 text-latte transform transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
                </div>
            </button>
            <div
                className={`transition-[grid-template-rows,opacity] duration-300 ease-in-out grid ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                }`}
            >
                <div className="overflow-hidden rounded-b-xl">
                    <div className="p-4 border-t border-hairline">
                        {shouldRenderChildren && children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CollapsibleCard;