import React, { useState, useEffect, useMemo } from 'react';
import { ar } from '../utils/arabicTranslations';
import { PlusCircleIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import TechInput from './technician-portal/ui/TechInput'; // Reuse our new input

interface CheckboxOption {
    label: string;
    value: string;
}

interface CheckboxCategory {
    title: string;
    options: CheckboxOption[];
}

interface CheckboxGroupProps {
    categories: CheckboxCategory[];
    selectedValues?: string[];
    onChange: (selected: string[]) => void;
    predefinedProblems: string[];
}

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ categories, selectedValues = [], onChange, predefinedProblems }) => {
    const [customProblems, setCustomProblems] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        const customs = (selectedValues || []).filter(v => !predefinedProblems.includes(v));
        setCustomProblems(customs);
    }, [selectedValues, predefinedProblems]);

    const handleCheckboxChange = (value: string) => {
        const currentSelected = selectedValues || [];
        const newSelected = currentSelected.includes(value)
            ? currentSelected.filter(v => v !== value)
            : [...currentSelected, value];
        onChange(newSelected);
    };
    
    const handleAddCustomProblem = () => {
        setCustomProblems([...customProblems, '']);
    };
    
    const handleCustomProblemChange = (index: number, value: string) => {
        const oldCustomValue = customProblems[index];
        const newCustomProblems = [...customProblems];
        newCustomProblems[index] = value;
        setCustomProblems(newCustomProblems);

        const currentSelected = selectedValues || [];
        const newSelected = currentSelected.filter(v => v !== oldCustomValue);
        if (value.trim()) {
            newSelected.push(value.trim());
        }
        onChange(newSelected);
    };
    
    const handleRemoveCustomProblem = (index: number) => {
        const valueToRemove = customProblems[index];
        const newCustomProblems = customProblems.filter((_, i) => i !== index);
        setCustomProblems(newCustomProblems);
        const currentSelected = selectedValues || [];
        onChange(currentSelected.filter(v => v !== valueToRemove));
    };

    const filteredCategories = useMemo(() => {
        if (!searchTerm) return categories;
        const lowercasedFilter = searchTerm.toLowerCase();

        return categories.reduce((acc: CheckboxCategory[], category) => {
            const categoryTitleMatch = category.title.toLowerCase().includes(lowercasedFilter);
            const matchingOptions = category.options.filter(option =>
                option.label.toLowerCase().includes(lowercasedFilter)
            );

            if (categoryTitleMatch || matchingOptions.length > 0) {
                acc.push({
                    ...category,
                    options: categoryTitleMatch ? category.options : matchingOptions,
                });
            }
            return acc;
        }, []);
    }, [categories, searchTerm]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Search */}
            <div className="relative">
                <TechInput 
                    placeholder={ar.selectors.searchProblems}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<MagnifyingGlassIcon className="w-5 h-5 text-latte" />}
                />
            </div>
            
            {/* Categories */}
            {filteredCategories.length > 0 ? (
                <div className="space-y-6">
                    {filteredCategories.map((category) => (
                        <div key={category.title} className="bg-cream-2 border border-hairline rounded-xl p-4">
                            <h3 className="text-sm font-bold text-text uppercase tracking-wider mb-4 border-b border-hairline pb-2">
                                {category.title}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {category.options.map((option) => {
                                    const isSelected = (selectedValues || []).includes(option.value);
                                    return (
                                        <label
                                            key={option.value}
                                            className={`relative flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                                                isSelected
                                                    ? 'bg-primary/10 border-primary/50 shadow-[0_0_10px_rgba(182,30,36,0.2)]'
                                                    : 'bg-cream border-hairline hover:border-primary/30'
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleCheckboxChange(option.value)}
                                                className="sr-only"
                                            />
                                            <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                isSelected ? 'bg-primary border-primary' : 'border-hairline bg-cream-2'
                                            }`}>
                                                {isSelected && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            <span className={`text-sm font-medium leading-tight ${isSelected ? 'text-primary' : 'text-text'}`}>
                                                {option.label}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                 <div className="text-center py-12 bg-cream-2 rounded-xl border border-dashed border-hairline">
                    <p className="text-latte">{ar.selectors.noProblemsMatch} "{searchTerm}".</p>
                </div>
            )}

            {/* Custom Problems */}
            <div className="bg-cream-2 border border-hairline rounded-xl p-4">
                <h4 className="text-sm font-bold text-text uppercase tracking-wider mb-4">
                    {ar.selectors.customProblems}
                </h4>

                <div className="space-y-3">
                    {customProblems.map((problem, index) => (
                        <div key={index} className="flex items-center gap-2 animate-in slide-in-from-left-2">
                             <input
                                type="text"
                                value={problem}
                                onChange={(e) => handleCustomProblemChange(index, e.target.value)}
                                className="block w-full px-4 py-3 bg-cream text-text rounded-lg border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/50 placeholder-latte outline-none transition-all"
                                placeholder={ar.selectors.problemPlaceholder}
                            />
                             <button
                                onClick={() => handleRemoveCustomProblem(index)}
                                className="p-3 text-latte hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                            >
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}

                    <button
                        onClick={handleAddCustomProblem}
                        className="w-full py-3 border-2 border-dashed border-hairline rounded-lg text-latte hover:text-text hover:border-primary hover:bg-cream transition-all flex items-center justify-center gap-2 font-medium"
                    >
                        <PlusCircleIcon className="w-5 h-5"/>
                        {ar.selectors.addCustomProblem}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheckboxGroup;
