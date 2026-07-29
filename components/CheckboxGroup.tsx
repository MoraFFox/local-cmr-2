import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ar } from '../utils/arabicTranslations';
import { PlusCircleIcon, TrashIcon, MagnifyingGlassIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon } from '@heroicons/react/24/outline';
import TechInput from './technician-portal/ui/TechInput'; // Reuse our new input
import { announce } from '../utils/ariaAnnouncer';

const COMMON_COUNT = 5;
const CUSTOM_HISTORY_KEY = 'cmr-custom-problems-history';
const MAX_HISTORY_SIZE = 30;
const USE_AGAIN_COUNT = 5;

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

// ── Custom Problem History (localStorage) ──

function getCustomHistory(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOM_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addToCustomHistory(problems: string[]): void {
  const existing = getCustomHistory();
  const trimmed = problems
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (trimmed.length === 0) return;

  // Remove duplicates so they can be bumped to the front
  const withoutDupes = existing.filter(p => !trimmed.includes(p));
  const updated = [...trimmed, ...withoutDupes].slice(0, MAX_HISTORY_SIZE);
  try {
    localStorage.setItem(CUSTOM_HISTORY_KEY, JSON.stringify(updated));
  } catch { /* storage full — silently skip */ }
}

// ── Component ──

const CheckboxGroup: React.FC<CheckboxGroupProps> = ({ categories, selectedValues = [], onChange, predefinedProblems }) => {
    const [customProblems, setCustomProblems] = useState<string[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = useRef<HTMLDivElement>(null);
    // NEW: accordion state — categories collapsed by default (audit issue #9)
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    // NEW: autocomplete state (audit issue #14)
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);
    const [highlightedSuggestionIdx, setHighlightedSuggestionIdx] = useState<number>(0);
    const suggestionDropdownRef = useRef<HTMLDivElement>(null);
    const inputRefs = useRef<Map<number, HTMLInputElement>>(new Map());
    const suggestionListId = useRef(`cmr-suggestions-${Math.random().toString(36).substr(2, 9)}`);
    // When we update both customProblems AND selectedValues in the same handler,
    // skip the useEffect sync to avoid overwriting the user's in-progress input
    // with trimmed values (which was eating spaces live). External changes
    // (draft loads, parent re-renders) still trigger a full sync.
    const skipSyncRef = useRef(false);

    // Sync custom problems from selectedValues (for external changes like draft loads)
    // and persist to history. Skips when the change originated from our own handlers
    // that already set customProblems directly.
    useEffect(() => {
        if (skipSyncRef.current) {
            skipSyncRef.current = false;
            return;
        }
        const customs = (selectedValues || []).filter(v => !predefinedProblems.includes(v));
        setCustomProblems(customs);
        const nonEmpty = customs.filter(v => v.trim().length > 0);
        if (nonEmpty.length > 0) {
            addToCustomHistory(nonEmpty);
        }
    }, [selectedValues, predefinedProblems]);

    // Announce selection count to screen readers (accessibility #42)
    useEffect(() => {
      const count = (selectedValues || []).length;
      if (count > 0) {
        announce(`تم تحديد ${count} ${count === 1 ? 'مشكلة' : 'مشاكل'}`);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(selectedValues || []).length]);

    // Read custom history once per selection change (avoids localStorage reads in render/event handlers)
    const customHistorySnapshot = useMemo(() => getCustomHistory(), [selectedValues]);// selectedValues dep guarantees fresh read after addToCustomHistory writes

    // Recent custom problems (last 5 unique from history, not already selected)
    const recentCustomProblems = useMemo(() => {
        const selectedSet = new Set((selectedValues || []).map(v => v.trim()).filter(Boolean));
        return customHistorySnapshot
            .filter(p => !selectedSet.has(p) && !predefinedProblems.includes(p))
            .slice(0, USE_AGAIN_COUNT);
    }, [customHistorySnapshot, selectedValues, predefinedProblems]);

    // Click outside to close suggestion dropdown
    useEffect(() => {
        if (activeSuggestionIndex === null) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (suggestionDropdownRef.current && !suggestionDropdownRef.current.contains(e.target as Node)) {
                setActiveSuggestionIndex(null);
                setHighlightedSuggestionIdx(0);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeSuggestionIndex]);

    // Refocus search input after selection so the user can keep
    // finding more items without re-clicking (audit issue #19).
    // useEffect guarantees focus after React commits the re-render.
    // The first-render guard prevents focus from stealing on mount
    // when editing an existing record with pre-selected items.
    const didMountRef = useRef(false);
    useEffect(() => {
        if (!didMountRef.current) {
            didMountRef.current = true;
            return;
        }
        if ((selectedValues || []).length > 0) {
            searchInputRef.current?.querySelector('input')?.focus();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(selectedValues || []).length]);

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
        skipSyncRef.current = true;
        onChange(newSelected);
    };

    const handleRemoveCustomProblem = (index: number) => {
        const valueToRemove = customProblems[index];
        const newCustomProblems = customProblems.filter((_, i) => i !== index);
        setCustomProblems(newCustomProblems);
        const currentSelected = selectedValues || [];
        skipSyncRef.current = true;
        onChange(currentSelected.filter(v => v !== valueToRemove));
        setActiveSuggestionIndex(null);
    };

    // ── Autocomplete helpers (audit issue #14) ──

    /** Compute suggestions from the cached history snapshot (no localStorage in render) */
    const computeSuggestions = useCallback((inputValue: string): { previous: string[]; similar: string[] } => {
        if (!inputValue || !inputValue.trim()) return { previous: [], similar: [] };
        const trimmed = inputValue.trim().toLowerCase();

        const selectedSet = new Set((selectedValues || []).map(v => v.trim().toLowerCase()));
        const previous = customHistorySnapshot
            .filter(p => p.toLowerCase().includes(trimmed) && !selectedSet.has(p.toLowerCase()))
            .slice(0, 5);

        const similar = predefinedProblems
            .filter(p => p.toLowerCase().includes(trimmed) && !selectedSet.has(p.toLowerCase()))
            .slice(0, 5);

        return { previous, similar };
    }, [selectedValues, predefinedProblems, customHistorySnapshot]);

    const handleCustomInputFocus = useCallback((index: number) => {
        const value = customProblems[index];
        if (value && value.trim()) {
            setActiveSuggestionIndex(index);
            setHighlightedSuggestionIdx(0);
        }
    }, [customProblems]);

    const handleSuggestionSelect = useCallback((index: number, suggestion: string) => {
        // Inline the change logic to avoid stale-closure issues
        const oldCustomValue = customProblems[index];
        const newCustomProblems = [...customProblems];
        newCustomProblems[index] = suggestion;
        setCustomProblems(newCustomProblems);

        const currentSelected = selectedValues || [];
        const newSelected = currentSelected.filter(v => v !== oldCustomValue);
        newSelected.push(suggestion.trim());
        skipSyncRef.current = true;
        onChange(newSelected);

        setActiveSuggestionIndex(null);
        setHighlightedSuggestionIdx(0);
        const input = inputRefs.current.get(index);
        input?.focus();
    }, [customProblems, selectedValues, onChange]);

    // Stable refs for the keydown handler to avoid re-binding on every keystroke
    const customProblemsRef = useRef(customProblems);
    customProblemsRef.current = customProblems;
    const selectedValuesRef = useRef(selectedValues);
    selectedValuesRef.current = selectedValues;
    const activeSuggestionIndexRef = useRef(activeSuggestionIndex);
    activeSuggestionIndexRef.current = activeSuggestionIndex;
    const highlightedSuggestionIdxRef = useRef(highlightedSuggestionIdx);
    highlightedSuggestionIdxRef.current = highlightedSuggestionIdx;

    const handleCustomInputKeyDown = useCallback((index: number, e: React.KeyboardEvent, totalSuggestions: number) => {
        if (e.key === 'Escape') {
            setActiveSuggestionIndex(null);
            setHighlightedSuggestionIdx(0);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedSuggestionIdx(prev => Math.min(prev + 1, totalSuggestions - 1));
            return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedSuggestionIdx(prev => Math.max(prev - 1, 0));
            return;
        }
        if (e.key === 'Enter' && activeSuggestionIndexRef.current === index) {
            const value = customProblemsRef.current[index];
            if (!value || !value.trim()) return;
            // Recompute suggestions from stable refs (no stale closure)
            const trimmed = value.trim().toLowerCase();
            const selectedSet = new Set(selectedValuesRef.current.map(v => v.trim().toLowerCase()));
            const previous = customHistorySnapshot
                .filter(p => p.toLowerCase().includes(trimmed) && !selectedSet.has(p.toLowerCase()))
                .slice(0, 5);
            const similar = predefinedProblems
                .filter(p => p.toLowerCase().includes(trimmed) && !selectedSet.has(p.toLowerCase()))
                .slice(0, 5);
            const allSuggestions = [...similar, ...previous];
            const idx = highlightedSuggestionIdxRef.current;
            if (allSuggestions.length > 0 && idx < allSuggestions.length) {
                e.preventDefault();
                // Inline the select logic
                const oldCustomValue = customProblemsRef.current[index];
                const newCustomProblems = [...customProblemsRef.current];
                newCustomProblems[index] = allSuggestions[idx];
                setCustomProblems(newCustomProblems);
                const currentSelected = selectedValuesRef.current || [];
                const newSelected = currentSelected.filter(v => v !== oldCustomValue);
                newSelected.push(allSuggestions[idx].trim());
                skipSyncRef.current = true;
                onChange(newSelected);
                setActiveSuggestionIndex(null);
                setHighlightedSuggestionIdx(0);
                const input = inputRefs.current.get(index);
                input?.focus();
            }
        }
    }, []); // Stable — reads latest values from refs

    // Show suggestions when typing
    const handleCustomInputChange = useCallback((index: number, value: string) => {
        handleCustomProblemChange(index, value);
        if (value.trim().length > 0) {
            setActiveSuggestionIndex(index);
            setHighlightedSuggestionIdx(0);
        } else {
            setActiveSuggestionIndex(null);
            setHighlightedSuggestionIdx(0);
        }
    }, [customProblems, selectedValues, onChange]);

    // Quick-add a recent custom problem
    const handleUseAgain = useCallback((problem: string) => {
        const currentSelected = selectedValues || [];
        if (!currentSelected.includes(problem)) {
            skipSyncRef.current = true;
            onChange([...currentSelected, problem]);
        }
        setCustomProblems(prev => {
            if (!prev.includes(problem)) {
                return [...prev, problem];
            }
            return prev;
        });
    }, [selectedValues, onChange]);

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

    // NEW: Common / frequently selected options (audit issue #9)
    const commonOptions = useMemo(() => {
        return categories.flatMap(c => c.options).slice(0, COMMON_COUNT);
    }, [categories]);

    const toggleCategory = (title: string) => {
        setExpandedCategories(prev => {
            const next = new Set(prev);
            if (next.has(title)) next.delete(title);
            else next.add(title);
            return next;
        });
    };

    const selectAllInCategory = (category: CheckboxCategory) => {
        const currentSelected = new Set(selectedValues || []);
        category.options.forEach(option => currentSelected.add(option.value));
        onChange(Array.from(currentSelected));
    };

    const deselectAllInCategory = (category: CheckboxCategory) => {
        const categoryValues = new Set(category.options.map(o => o.value));
        const newSelected = (selectedValues || []).filter(v => !categoryValues.has(v));
        onChange(newSelected);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Search */}
            <div className="relative" ref={searchInputRef}>
                <TechInput 
                    placeholder={ar.selectors.searchProblems}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<MagnifyingGlassIcon className="w-5 h-5 text-latte" />}
                />
            </div>
            
            {/* Common / Selected Summary */}
            {!searchTerm && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">
                        Common
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {commonOptions.map(option => {
                            const isSelected = (selectedValues || []).includes(option.value);
                            return (
                                <button
                                    key={`common-${option.value}`}
                                    type="button"
                                    onClick={() => handleCheckboxChange(option.value)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                                        isSelected
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-cream text-text border-hairline hover:border-primary/50'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Categories */}
            {filteredCategories.length > 0 ? (
                <div className="space-y-4">
                    {filteredCategories.map((category) => {
                        const isExpanded = searchTerm ? true : expandedCategories.has(category.title);
                        const selectedInCategory = category.options.filter(o => (selectedValues || []).includes(o.value)).length;
                        const allSelected = selectedInCategory === category.options.length && category.options.length > 0;
                        return (
                            <div key={category.title} className="bg-cream-2 border border-hairline rounded-xl overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleCategory(category.title)}
                                    className="w-full flex items-center justify-between p-4 text-left hover:bg-cream-3 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-text uppercase tracking-wider">
                                            {category.title}
                                        </span>
                                        {selectedInCategory > 0 && (
                                            <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                                                {selectedInCategory}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-latte hidden sm:inline">
                                            {searchTerm ? `${category.options.length} results` : `${category.options.length} options`}
                                        </span>
                                        {!searchTerm && (
                                            isExpanded ? <ChevronUpIcon className="w-4 h-4 text-latte" /> : <ChevronDownIcon className="w-4 h-4 text-latte" />
                                        )}
                                    </div>
                                </button>

                                {(searchTerm || isExpanded) && (
                                    <div className="p-4 pt-0">
                                        {/* Select All / None */}
                                        <div className="flex items-center gap-3 mb-3">
                                            <button
                                                type="button"
                                                onClick={() => selectAllInCategory(category)}
                                                className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
                                                disabled={allSelected}
                                            >
                                                Select All
                                            </button>
                                            {selectedInCategory > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => deselectAllInCategory(category)}
                                                    className="text-xs font-medium text-latte hover:text-ember-500 hover:underline"
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>
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
                                                            data-value={option.value}
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
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                 <div className="text-center py-12 bg-cream-2 rounded-xl border border-dashed border-hairline">
                    <p className="text-latte">{ar.selectors.noProblemsMatch} &quot;{searchTerm}&quot;.</p>
                </div>
            )}

            {/* Use Again — Recent Custom Problems (audit issue #14) */}
            {!searchTerm && recentCustomProblems.length > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
                        <ClockIcon className="w-4 h-4" />
                        {ar.selectors.useAgain}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                        {recentCustomProblems.map(problem => (
                            <button
                                key={`recent-${problem}`}
                                type="button"
                                onClick={() => handleUseAgain(problem)}
                                className="px-3 py-1.5 text-xs font-medium rounded-full border border-primary/30 bg-cream text-text hover:bg-primary hover:text-white hover:border-primary transition-colors"
                            >
                                {problem}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Problems */}
            <div className="bg-cream-2 border border-hairline rounded-xl p-4">
                <h4 className="text-sm font-bold text-text uppercase tracking-wider mb-4">
                    {ar.selectors.customProblems}
                </h4>

                <div className="space-y-3">
                    {customProblems.map((problem, index) => {
                        const hasSuggestions = activeSuggestionIndex === index && problem.trim().length > 0;
                        const suggestions = hasSuggestions ? computeSuggestions(problem) : { previous: [], similar: [] };
                        const allSuggestions = [...suggestions.similar, ...suggestions.previous];
                        const hasAnySuggestions = allSuggestions.length > 0;

                        return (
                            <div key={index} className="flex items-center gap-2 animate-in slide-in-from-left-2">
                                <div className="relative flex-1">
                                    <input
                                        ref={(el) => { if (el) inputRefs.current.set(index, el); else inputRefs.current.delete(index); }}
                                        type="text"
                                        value={problem}
                                        onChange={(e) => handleCustomInputChange(index, e.target.value)}
                                        onFocus={() => handleCustomInputFocus(index)}
                                        onKeyDown={(e) => handleCustomInputKeyDown(index, e, allSuggestions.length)}
                                        className="block w-full px-4 py-3 bg-cream text-text rounded-lg border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/50 placeholder-latte outline-none transition-all"
                                        placeholder={ar.selectors.problemPlaceholder}
                                        role="combobox"
                                        aria-expanded={hasSuggestions && hasAnySuggestions}
                                        aria-controls={hasSuggestions && hasAnySuggestions ? suggestionListId.current : undefined}
                                        aria-autocomplete="list"
                                        aria-activedescendant={hasSuggestions && hasAnySuggestions && highlightedSuggestionIdx < allSuggestions.length
                                            ? `${suggestionListId.current}-option-${highlightedSuggestionIdx}`
                                            : undefined}
                                    />

                                    {/* Autocomplete Dropdown */}
                                    {hasSuggestions && hasAnySuggestions && (
                                        <div
                                            ref={activeSuggestionIndex === index ? suggestionDropdownRef : undefined}
                                            id={suggestionListId.current}
                                            role="listbox"
                                            className="absolute z-50 w-full mt-1 bg-paper border border-hairline rounded-lg shadow-lg max-h-60 overflow-auto"
                                        >
                                            {/* Similar predefined problems */}
                                            {suggestions.similar.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 text-[10px] font-bold text-latte uppercase tracking-wider bg-cream-2/50 border-b border-hairline">
                                                        {ar.selectors.similarPredefinedProblems}
                                                    </div>
                                                    {suggestions.similar.map((s, sIdx) => (
                                                        <button
                                                            key={`similar-${s}`}
                                                            id={`${suggestionListId.current}-option-${sIdx}`}
                                                            role="option"
                                                            aria-selected={highlightedSuggestionIdx === sIdx}
                                                            type="button"
                                                            onMouseEnter={() => setHighlightedSuggestionIdx(sIdx)}
                                                            onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(index, s); }}
                                                            className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                                                                highlightedSuggestionIdx === sIdx
                                                                    ? 'bg-primary/10 text-primary'
                                                                    : 'text-text hover:bg-cream'
                                                            }`}
                                                        >
                                                            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-latte flex-shrink-0" />
                                                            {s}
                                                        </button>
                                                    ))}
                                                </>
                                            )}

                                            {/* Previous custom problems */}
                                            {suggestions.previous.length > 0 && (
                                                <>
                                                    <div className="px-3 py-2 text-[10px] font-bold text-latte uppercase tracking-wider bg-cream-2/50 border-b border-hairline">
                                                        {ar.selectors.previousCustomProblems}
                                                    </div>
                                                    {suggestions.previous.map((s, sIdx) => {
                                                        const globalIdx = suggestions.similar.length + sIdx;
                                                        return (
                                                            <button
                                                                key={`prev-${s}`}
                                                                id={`${suggestionListId.current}-option-${globalIdx}`}
                                                                role="option"
                                                                aria-selected={highlightedSuggestionIdx === globalIdx}
                                                                type="button"
                                                                onMouseEnter={() => setHighlightedSuggestionIdx(globalIdx)}
                                                                onMouseDown={(e) => { e.preventDefault(); handleSuggestionSelect(index, s); }}
                                                                className={`w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${
                                                                    highlightedSuggestionIdx === globalIdx
                                                                        ? 'bg-primary/10 text-primary'
                                                                        : 'text-text hover:bg-cream'
                                                                }`}
                                                            >
                                                                <ClockIcon className="w-3.5 h-3.5 text-latte flex-shrink-0" />
                                                                {s}
                                                            </button>
                                                        );
                                                    })}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleRemoveCustomProblem(index)}
                                    className="p-3 text-latte hover:text-primary hover:bg-primary/10 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            </div>
                        );
                    })}

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
