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
            <label className="block text-xs font-bold uppercase tracking-wider text-secondary mb-2 ml-1">
                {label}
            </label>

            <button
                type="button"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-between px-4 py-3.5
                    bg-chrome-light/50 border rounded-xl text-left transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed border-default' : 'border-default hover:border-brass active:bg-chrome-light'}
                    ${value ? 'text-cream' : 'text-secondary'}
                `}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {icon && <span className="text-secondary">{icon}</span>}
                    <div className="flex flex-col truncate">
                        <span className="truncate font-medium">
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        {selectedOption?.description && (
                            <span className="text-xs text-secondary truncate">{selectedOption.description}</span>
                        )}
                    </div>
                </div>
                <ChevronDownIcon className="w-5 h-5 text-secondary flex-shrink-0" />
            </button>

            <BottomSheet
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={label}
                maxHeight="85vh"
                contentClassName="flex flex-col h-full"
            >
                <div className="p-4 bg-chrome h-full flex flex-col overflow-hidden">
                    {searchable && (
                        <div className="mb-4 relative flex-shrink-0">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-chrome-light text-cream rounded-lg pl-10 pr-4 py-3 border border-default focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus:border-brand-red transition-colors"
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
                                            ? 'bg-brand-red/10 border-brand-red/50 text-cream'
                                            : 'bg-chrome-light/30 border-default text-cream hover:bg-chrome-light hover:border-brass'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        {opt.icon && <span className="text-2xl">{opt.icon}</span>}
                                        <div className="flex flex-col">
                                            <span className={`font-semibold ${String(value) === String(opt.value) ? 'text-brand-red-400' : 'text-cream'}`}>
                                                {opt.label}
                                            </span>
                                            {opt.description && (
                                                <span className="text-xs text-secondary">{opt.description}</span>
                                            )}
                                        </div>
                                    </div>

                                    {String(value) === String(opt.value) && (
                                        <div className="w-6 h-6 rounded-full bg-brand-red flex items-center justify-center">
                                            <CheckIcon className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 text-secondary">
                                No options found.
                            </div>
                        )}
                    </div>

                     <div className="pt-4 pb-8 border-t border-default mt-auto bg-chrome flex-shrink-0">
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
