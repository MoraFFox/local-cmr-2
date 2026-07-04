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
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 ml-1">
                {label}
            </label>
            
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(true)}
                disabled={disabled}
                className={`
                    w-full flex items-center justify-between px-4 py-3.5 
                    bg-slate-800/50 border rounded-xl text-left transition-all
                    ${disabled ? 'opacity-50 cursor-not-allowed border-slate-800' : 'border-slate-700 hover:border-slate-600 active:bg-slate-800'}
                    ${value ? 'text-slate-100' : 'text-slate-500'}
                `}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {icon && <span className="text-slate-400">{icon}</span>}
                    <div className="flex flex-col truncate">
                        <span className="truncate font-medium">
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        {selectedOption?.description && (
                            <span className="text-xs text-slate-500 truncate">{selectedOption.description}</span>
                        )}
                    </div>
                </div>
                <ChevronDownIcon className="w-5 h-5 text-slate-500 flex-shrink-0" />
            </button>

            <BottomSheet
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title={label}
                maxHeight="85vh"
                contentClassName="flex flex-col h-full"
            >
                <div className="p-4 bg-slate-900 h-full flex flex-col overflow-hidden">
                    {searchable && (
                        <div className="mb-4 relative flex-shrink-0">
                            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-slate-800 text-white rounded-lg pl-10 pr-4 py-3 border border-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus:border-teal-500 transition-colors"
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
                                            ? 'bg-teal-500/10 border-teal-500/50 text-teal-100'
                                            : 'bg-slate-800/30 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 text-left">
                                        {opt.icon && <span className="text-2xl">{opt.icon}</span>}
                                        <div className="flex flex-col">
                                            <span className={`font-semibold ${String(value) === String(opt.value) ? 'text-teal-400' : 'text-slate-200'}`}>
                                                {opt.label}
                                            </span>
                                            {opt.description && (
                                                <span className="text-xs text-slate-500">{opt.description}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {String(value) === String(opt.value) && (
                                        <div className="w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                                            <CheckIcon className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                </button>
                            ))
                        ) : (
                            <div className="text-center py-8 text-slate-500">
                                No options found.
                            </div>
                        )}
                    </div>
                    
                     <div className="pt-4 pb-8 border-t border-slate-800 mt-auto bg-slate-900 flex-shrink-0">
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
