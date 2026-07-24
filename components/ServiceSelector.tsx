import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { ar } from '../utils/arabicTranslations';
import { Service, ServiceRecord } from '../types';
import { announce } from '../utils/ariaAnnouncer';
import {
  MagnifyingGlassIcon,
  PlusCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SquaresPlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import SelectedItemCard from './SelectedItemCard';
import TechInput from './technician-portal/ui/TechInput';
// NEW: Phase 2 UX improvements (audit issues #10, #11, #21)
import { SelectorAvailableItem } from './form-ui/SelectorAvailableItem';
import { SelectorSelectedChips } from './form-ui/SelectorSelectedChips';

interface ServiceSelectorProps {
  options: Service[];
  selectedValues: ServiceRecord[];
  onChange: (selected: ServiceRecord[]) => void;
  /** Services suggested based on the problems/issues the technician
   *  reported. Rendered in a dedicated "Suggested" section at the top
   *  with a badge, so the most relevant options are surfaced first. */
  suggestedValues?: Service[];
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  options,
  selectedValues,
  onChange,
  suggestedValues = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSelectedSectionExpanded, setIsSelectedSectionExpanded] = useState(true);
  const [customServices, setCustomServices] = useState<ServiceRecord[]>([]);
  // NEW: compact chips view toggle (audit issue #11) and bulk payer edit (audit issue #21)
  const [selectedViewMode, setSelectedViewMode] = useState<'cards' | 'chips'>('cards');

  const predefinedServiceValues = useMemo(
    () => new Set(options.map((o) => o.value)),
    [options]
  );

  useEffect(() => {
    const customs = selectedValues.filter(
      (sv) => !predefinedServiceValues.has(sv.name)
    );
    setCustomServices(customs);
  }, [selectedValues, predefinedServiceValues]);

  // Announce selection count to screen readers (accessibility #42)
  useEffect(() => {
    const count = selectedValues.length;
    if (count > 0) {
      announce(`تم تحديد ${count} ${count === 1 ? 'خدمة' : 'خدمات'}`);
    }
    // Only announce on count changes, skip initial render (count === 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues.length]);

  const selectedByPayer = useMemo(() => {
    const midosItems: ServiceRecord[] = [];
    const clientItems: ServiceRecord[] = [];
    selectedValues.forEach((item) => {
      if (item.paidByClient === true) clientItems.push(item);
      else midosItems.push(item);
    });
    return { midos: midosItems, client: clientItems };
  }, [selectedValues]);

  const payerGroupSummary = useMemo(() => {
    const midosCount = selectedByPayer.midos.length;
    const midosQuantity = selectedByPayer.midos.reduce((sum, item) => sum + item.count, 0);
    const clientCount = selectedByPayer.client.length;
    const clientQuantity = selectedByPayer.client.reduce((sum, item) => sum + item.count, 0);
    return {
      midos: { count: midosCount, quantity: midosQuantity },
      client: { count: clientCount, quantity: clientQuantity },
    };
  }, [selectedByPayer]);

  const availableOptions = useMemo(() => {
    const selectedNames = new Set(selectedValues.map((s) => s.name));
    return options.filter((o) => !selectedNames.has(o.value));
  }, [options, selectedValues]);

  // NEW: Suggested values as a Set for O(1) badge lookup and dedup filtering.
  // Declared before filteredOptions/availableSuggestions so it's in scope.
  const suggestedValueSet = useMemo(
    () => new Set(suggestedValues.map((s) => s.value)),
    [suggestedValues]
  );

  // NEW: Suggested options that haven't been selected yet. Surfaced in a
  // dedicated section at the top so the most relevant options (based on the
  // reported problems) are one click away.
  const availableSuggestions = useMemo(() => {
    if (suggestedValues.length === 0) return [];
    const selectedNames = new Set(selectedValues.map((s) => s.name));
    return suggestedValues.filter((s) => !selectedNames.has(s.value));
  }, [suggestedValues, selectedValues]);

  const filteredOptions = useMemo(() => {
    // Exclude items already shown in the "Suggested" section so they
    // aren't double-rendered in the regular available section too.
    return availableOptions.filter(
      (option) =>
        (option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.category.toLowerCase().includes(searchTerm.toLowerCase())) &&
        !suggestedValueSet.has(option.value)
    );
  }, [availableOptions, searchTerm, suggestedValueSet]);

  const categories = useMemo(() => {
    const grouped: { [key: string]: Service[] } = {};
    filteredOptions.forEach((service) => {
      if (!grouped[service.category]) grouped[service.category] = [];
      grouped[service.category].push(service);
    });
    return grouped;
  }, [filteredOptions]);

  // Refocus search input after adding an item so the user can keep
  // finding more without re-clicking (audit issue #19).
  // useEffect guarantees focus after React commits the re-render.
  // The first-render guard prevents focus from stealing on mount
  // when editing an existing record with pre-selected items.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (selectedValues.length > 0) {
      searchInputRef.current?.querySelector('input')?.focus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues.length]);

  // NEW: handleAddService now accepts an optional quantity (audit issue #10 —
  // inline quantity selector on the add button means a single action per item
  // instead of add → find → adjust).
  const handleAddService = useCallback((serviceValue: string, quantity: number = 1) => {
    onChange([...selectedValues, { name: serviceValue, count: quantity, paidByClient: false }]);
  }, [selectedValues, onChange]);

  // NEW: Bulk payer change — set all selected items' payer at once (audit issue #21).
  const handleBulkPayerChange = useCallback((paidByClient: boolean) => {
    onChange(selectedValues.map((s) => ({ ...s, paidByClient })));
  }, [selectedValues, onChange]);

  // NEW: Bulk quantity multiply — multiply all selected items' counts (audit issue #20)
  const handleBulkQuantityMultiply = useCallback((multiplier: number) => {
    onChange(selectedValues.map((s) => ({ ...s, count: Math.max(1, Math.floor(s.count * multiplier)) })));
  }, [selectedValues, onChange]);

  const handleRemoveService = useCallback((name: string) => {
    onChange(selectedValues.filter((s) => s.name !== name));
  }, [selectedValues, onChange]);

  const handleCountChange = useCallback((name: string, newCount: number) => {
    if (newCount <= 0) handleRemoveService(name);
    else onChange(selectedValues.map((s) => s.name === name ? { ...s, count: newCount } : s));
  }, [selectedValues, onChange, handleRemoveService]);

  const handlePayerChange = useCallback((name: string, paidByClient: boolean) => {
    onChange(selectedValues.map((s) => s.name === name ? { ...s, paidByClient } : s));
  }, [selectedValues, onChange]);

  const handleAddCustomService = useCallback(() => {
    onChange([...selectedValues, { name: '', count: 1, cost: 0, paidByClient: false }]);
  }, [selectedValues, onChange]);

  const handleCustomNameChange = useCallback((index: number, newName: string) => {
    const customService = customServices[index];
    if (customService) {
      onChange(selectedValues.map((s) => s === customService ? { ...s, name: newName } : s));
    }
  }, [customServices, selectedValues, onChange]);

  // NEW: renderAvailableService now uses SelectorAvailableItem with inline
  // quantity stepper (audit issue #10). Pass `isSuggested` when the option
  // is in the suggested set (context-aware badge).
  const renderAvailableService = (option: Service, isSuggested = false) => {
    return (
      <SelectorAvailableItem
        key={option.value}
        label={option.label}
        description={option.description}
        viewMode={viewMode}
        isSuggested={isSuggested || suggestedValueSet.has(option.value)}
        onAdd={(quantity) => handleAddService(option.value, quantity)}
      />
    );
  };

  const renderPayerGroup = (payer: 'midos' | 'client', items: ServiceRecord[]) => {
    const isMidos = payer === 'client' ? false : true;
    const summary = isMidos ? payerGroupSummary.midos : payerGroupSummary.client;
    
    const headerBorderColor = isMidos ? 'border-primary/30' : 'border-amber-500/30';
    const headerBgColor = isMidos ? 'bg-primary/10' : 'bg-amber-500/10';
    const textColor = isMidos ? 'text-primary dark:text-copper-300' : 'text-amber-700 dark:text-amber-400';

    return (
      <div className={`rounded-xl border ${headerBorderColor} overflow-hidden bg-cream-2`}>
        <div className={`px-4 py-3 ${headerBgColor} flex items-center justify-between border-b ${headerBorderColor}`}>
          <div className="flex items-center gap-2">
            <span className={`font-bold uppercase tracking-wider text-xs ${textColor}`}>
              {isMidos ? ar.payerFirstUI.midosPays : ar.payerFirstUI.clientPays}
            </span>
          </div>
          <div className={`text-xs font-mono font-medium ${textColor}`}>
            {summary.count} items / Qty: {summary.quantity}
          </div>
        </div>

        <div className="p-3 space-y-3">
          {items.length > 0 ? (
            items.map((service, index) => {
                const isCustom = !predefinedServiceValues.has(service.name);
                const customIndex = isCustom ? customServices.findIndex((cs) => cs === service) : -1;
                return (
                    <SelectedItemCard
                        key={`${service.name}-${index}`}
                        name={service.name}
                        quantity={service.count}
                        paidByClient={service.paidByClient === true}
                        isCustom={isCustom}
                        viewMode={viewMode}
                        onPayerChange={(paidByClient) => handlePayerChange(service.name, paidByClient)}
                        onQuantityChange={(quantity) => handleCountChange(service.name, quantity)}
                        onRemove={() => handleRemoveService(service.name)}
                        onNameChange={isCustom && customIndex >= 0 ? (name) => handleCustomNameChange(customIndex, name) : undefined}
                    />
                );
            })
          ) : (
            <div className="text-center py-6 text-latte text-sm italic">
              {ar.payerFirstUI.noSelectedItems}
            </div>
          )}
        </div>
      </div>
    );
  };

  const totalSelectedCount = selectedValues.length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Controls */}
      <div className="flex gap-2">
        <div className="flex-grow" ref={searchInputRef}>
             <TechInput 
                 placeholder={ar.selectors.searchServices}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 icon={<MagnifyingGlassIcon className="w-5 h-5 text-latte" />}
             />
        </div>
        <div className="flex bg-cream-2 rounded-xl p-1 border border-hairline">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cream-3 text-text shadow-sm' : 'text-latte hover:text-text'}`}
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cream-3 text-text shadow-sm' : 'text-latte hover:text-text'}`}
          >
            <ListBulletIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* NEW: Suggested Section (context-aware, based on reported problems) */}
      {availableSuggestions.length > 0 && (
        <div data-testid="suggested-services" className="bg-primary/5 border border-primary/30 rounded-2xl p-4 md:p-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2 mb-4">
            <SparklesIcon className="w-4 h-4 text-primary dark:text-copper-300" />
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary dark:text-copper-300">
              Suggested for your issues
            </h3>
            <span className="text-[10px] bg-primary/20 text-primary dark:text-copper-300 px-1.5 py-0.5 rounded-full font-bold">
              {availableSuggestions.length}
            </span>
          </div>
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex flex-col gap-2'}`}>
            {availableSuggestions.map((option) => renderAvailableService(option, true))}
          </div>
        </div>
      )}

      {/* Available Section */}
      <div className="bg-cream-2 border border-hairline rounded-2xl p-4 md:p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-latte mb-4">Available Protocols</h3>

        {Object.keys(categories).length > 0 ? (
          <div className="space-y-8">
            {Object.keys(categories).map((category) => (
              <section key={category}>
                <h4 className="text-sm font-semibold text-primary dark:text-copper-300 mb-3 border-b border-primary/10 pb-2">
                  {category}
                </h4>
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex flex-col gap-2'}`}>
                  {categories[category].map(renderAvailableService)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-latte">
             <p>{searchTerm ? ar.selectors.noServicesMatch : ar.payerFirstUI.noAvailableItems}</p>
          </div>
        )}
      </div>        {/* Selected Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <button
              onClick={() => setIsSelectedSectionExpanded(!isSelectedSectionExpanded)}
              className="flex items-center gap-2 text-latte hover:text-text transition-colors py-2 group"
          >
              <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  SELECTED OPS
                  {totalSelectedCount > 0 && <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[10px]">{totalSelectedCount}</span>}
              </span>
              {isSelectedSectionExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
          </button>

          {/* NEW: Cards/Chips view toggle (audit issue #11) + bulk payer edit (audit issue #21) */}
          {totalSelectedCount > 0 && isSelectedSectionExpanded && (
            <div className="flex items-center gap-2">
              {/* Bulk quantity edit (audit issue #20) */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-latte">Multiply all:</span>
                <button
                  type="button"
                  onClick={() => handleBulkQuantityMultiply(2)}
                  className="px-2 py-1 rounded-md font-bold bg-leaf-500/15 text-leaf-700 dark:text-leaf-400 border border-leaf-500/40 hover:bg-leaf-500/25 transition-colors"
                  title="Double all quantities"
                >
                  ×2
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkQuantityMultiply(0.5)}
                  className="px-2 py-1 rounded-md font-bold bg-ember-500/15 text-ember-700 dark:text-ember-400 border border-ember-500/40 hover:bg-ember-500/25 transition-colors"
                  title="Halve all quantities (min 1)"
                >
                  ÷2
                </button>
              </div>

              {/* Bulk payer edit */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-latte">Set all:</span>
                <button
                  type="button"
                  onClick={() => handleBulkPayerChange(false)}
                  className="px-2 py-1 rounded-md font-bold bg-primary/15 text-primary dark:text-copper-300 border border-primary/40 hover:bg-primary/25 transition-colors"
                >
                  {ar.payerFirstUI.midosPays}
                </button>
                <button
                  type="button"
                  onClick={() => handleBulkPayerChange(true)}
                  className="px-2 py-1 rounded-md font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40 hover:bg-amber-500/25 transition-colors"
                >
                  {ar.payerFirstUI.clientPays}
                </button>
              </div>

              {/* Cards/Chips toggle */}
              <div className="flex bg-cream-2 rounded-lg p-0.5 border border-hairline">
                <button
                  onClick={() => setSelectedViewMode('cards')}
                  className={`p-1.5 rounded-md transition-all ${selectedViewMode === 'cards' ? 'bg-cream-3 text-text shadow-sm' : 'text-latte hover:text-text'}`}
                  title="Card view (detailed)"
                  aria-label="Switch to card view"
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setSelectedViewMode('chips')}
                  className={`p-1.5 rounded-md transition-all ${selectedViewMode === 'chips' ? 'bg-cream-3 text-text shadow-sm' : 'text-latte hover:text-text'}`}
                  title="Chips view (compact)"
                  aria-label="Switch to compact chips view"
                >
                  <SquaresPlusIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {isSelectedSectionExpanded && (
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2">
                {/* NEW: Compact chips view (audit issue #11) */}
                {selectedViewMode === 'chips' && totalSelectedCount > 0 && (
                  <SelectorSelectedChips
                    items={selectedValues.map(s => ({
                      name: s.name,
                      count: s.count,
                      paidByClient: s.paidByClient,
                      isCustom: !predefinedServiceValues.has(s.name),
                    }))}
                    onRemove={handleRemoveService}
                    onQuantityChange={handleCountChange}
                    onPayerChange={handlePayerChange}
                    onNameChange={(idx, newName) => {
                      // idx is the index in the chips items array, which is a
                      // 1:1 .map() of selectedValues (order preserved), so it
                      // equals the index in selectedValues. Look up and update
                      // by selectedValues index directly — NOT customServices,
                      // which is a filtered subset with different indices.
                      const item = selectedValues[idx];
                      if (item && !predefinedServiceValues.has(item.name)) {
                        onChange(selectedValues.map((s, i) => i === idx ? { ...s, name: newName } : s));
                      }
                    }}
                    midosLabel={ar.payerFirstUI.midosPays}
                    clientLabel={ar.payerFirstUI.clientPays}
                  />
                )}

                {/* Detailed card view (default) */}
                {selectedViewMode === 'cards' && (
                  <>
                    {renderPayerGroup('midos', selectedByPayer.midos)}
                    {renderPayerGroup('client', selectedByPayer.client)}
                  </>
                )}

                <button
                    onClick={handleAddCustomService}
                    className="w-full py-3 border border-dashed border-hairline rounded-xl text-latte hover:text-primary hover:border-primary/50 hover:bg-cream-2 transition-all flex items-center justify-center gap-2 font-medium"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    {ar.selectors.addCustomService}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ServiceSelector;
