import React, { useState } from 'react';
import { ChevronUpIcon } from '@heroicons/react/24/solid';

interface CollapsibleCardProps {
    titleContent: React.ReactNode;
    children: React.ReactNode;
    initiallyOpen?: boolean;
    onRemove?: () => void;
    removeLabel?: string;
    /** Optional key used by the wizard jump feature to auto-open this card. */
    wizardKey?: string;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({ titleContent, children, initiallyOpen = false, onRemove, removeLabel = 'حذف', wizardKey }) => {
    const [isOpen, setIsOpen] = useState(initiallyOpen);
    const [hasBeenOpened, setHasBeenOpened] = useState(initiallyOpen);

    React.useEffect(() => {
        if (isOpen && !hasBeenOpened) {
            setHasBeenOpened(true);
        }
    }, [isOpen, hasBeenOpened]);

    // Listen for wizard jump open events targeting this card's key.
    React.useEffect(() => {
        if (!wizardKey) return;
        const handleOpen = ((event: CustomEvent<string>) => {
            const targetKey = event.detail;
            if (targetKey === wizardKey || targetKey.startsWith(`${wizardKey}.`)) {
                setIsOpen(true);
            }
        }) as EventListener;
        window.addEventListener("wizard:open", handleOpen);
        return () => window.removeEventListener("wizard:open", handleOpen);
    }, [wizardKey]);

    const shouldRenderChildren = isOpen || hasBeenOpened;

    return (
        <div className={`border border-hairline rounded-xl bg-cream shadow-md transition-all duration-300 hover:shadow-lg ${isOpen ? 'shadow-lg' : 'shadow-md'}`}>
            <div
                role="button"
                tabIndex={0}
                className={`w-full flex justify-between items-start sm:items-center p-4 cursor-pointer rounded-t-xl ${!isOpen ? 'rounded-b-xl' : ''} focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 gap-4 hover:bg-cream-2 dark:hover:bg-espresso-light/30 transition-colors duration-150`}
                onClick={(e) => {
                    // Prevent toggling if a nested interactive element is clicked
                    if ((e.target as HTMLElement).closest('button, input, textarea, select, a')) return;
                    setIsOpen(!isOpen);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if ((e.target as HTMLElement).closest('button, input, textarea, select, a')) return;
                        setIsOpen(!isOpen);
                    }
                }}
                aria-expanded={isOpen}
            >
                <div className="flex-1 min-w-0 font-semibold text-primary relative text-right pointer-events-auto">
                    {titleContent}
                </div>
                <div className="flex items-center shrink-0 gap-3 pt-1 sm:pt-0 pointer-events-auto">
                    {onRemove && (
                        <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => { e.stopPropagation(); onRemove(); }}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onRemove(); } }}
                            className="text-xs font-semibold text-latte hover:text-ember-600 transition-colors cursor-pointer"
                            aria-label={removeLabel}
                        >
                            حذف
                        </span>
                    )}
                    <div 
                        className="cursor-pointer"
                        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                    >
                        <ChevronUpIcon className={`w-5 h-5 text-latte transform transition-transform duration-300 ${isOpen ? '' : 'rotate-180'}`} />
                    </div>
                </div>
            </div>
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