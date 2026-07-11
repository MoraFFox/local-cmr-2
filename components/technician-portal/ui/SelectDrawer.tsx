import React, { useState } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import BottomSheet from '../../BottomSheet';
import TechButton from './TechButton';

interface Option {
    value: string | number;
    label: string;
    description?: string;
    icon?: React.ReactNode;
}

interface SelectDrawerProps {
    label: string;
    value: string | number | null;
    options: Option[];
    onChange: (value: string | number) => void;
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    icon?: React.ReactNode;
}

const SelectDrawer: React.FC<SelectDrawerProps> = ({
    label,
    value,
    options,
    onChange,
    placeholder = "Select an option",
    searchable = false,
    disabled = false,
    icon
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const selectedOption = options.find(o => String(o.value) === String(value));

    const filteredOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(search.toLowerCase()) || 
        opt.description?.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (val: string | number) => {
        onChange(val);
        setIsOpen(false);
        setSearch(''); // Reset search on close
    };

    return (
        <div className="w-full">
            <label className="block text-xs font-bold uppercase tracking-wider text-latte mb-2 ml-1">
                {label}
            </label>

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-between px-4 py-3.5
                    bg-espresso-light/50 border rounded-xl text-left transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed border-hairline' : 'border-hairline hover:border-brass active:bg-espresso-light'}
                    ${value ? 'text-cream' : 'text-latte'}
                `}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {icon && <span className="text-latte">{icon}</span>}
                    <div className="flex flex-col truncate">
                        <span className="truncate font-medium">
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        {selectedOption?.description && (
                            <span className="text-xs text-latte truncate">{selectedOption.description}</span>
                        )}
                    </div>
                </div>
                <ChevronDownIcon className="w-5 h-5 text-latte flex-shrink-0" />
            </button>

            <BottomSheet
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={label}
                maxHeight="85vh"
                contentClassName="flex flex-col h-full"
            >
                <div className="p-4 bg-espresso h-full flex flex-col overflow-hidden">
                    {searchable && (
                        <div className="mb-4 relative flex-shrink-0">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-latte" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-espresso-light text-cream rounded-lg pl-10 pr-4 py-3 border border-hairline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus:border-primary transition-colors"
                            />
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 pb-4 min-h-0">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={`
                                        w-full flex items-center justify-between p-4 rounded-xl border transition-all text-right
                                        ${String(value) === String(opt.value)
                                            ? 'bg-primary/10 border-primary/50 text-cream'
                                            : 'bg-espresso-light/30 border-hairline text-cream hover:bg-espresso-light hover:border-brass'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        {opt.icon && <span className="text-2xl">{opt.icon}</span>}
                                        <div className="flex flex-col">
                                            <span className={`font-semibold ${String(value) === String(opt.value) ? 'text-primary-400' : 'text-cream'}`}>
                                                {opt.label}
                                            </span>
                                            {opt.description && (
                                                <span className="text-xs text-latte">{opt.description}</span>
                                            )}
                                        </div>
                                    </div>

                                    {String(value) === String(opt.value) && (
                                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                            <CheckIcon className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 text-latte">
                                No options found.
                            </div>
                        )}
                    </div>

                     <div className="pt-4 pb-8 border-t border-hairline mt-auto bg-espresso flex-shrink-0">
                         <TechButton variant="secondary" fullWidth onClick={() => setIsOpen(false)}>
                             Cancel
                         </TechButton>
                     </div>
                </div>
            </BottomSheet>
        </div>
    );
};

export default SelectDrawer;
