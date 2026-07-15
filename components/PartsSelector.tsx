import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ar } from '../utils/arabicTranslations';
import { Part, PartRecord } from '../types';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  PlusCircleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import SelectedItemCard from './SelectedItemCard';
import TechInput from './technician-portal/ui/TechInput';

interface PartsSelectorProps {
  options: Part[];
  selectedValues: PartRecord[];
  onChange: (selected: PartRecord[]) => void;
}

const PartsSelector: React.FC<PartsSelectorProps> = ({
  options,
  selectedValues,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSelectedSectionExpanded, setIsSelectedSectionExpanded] = useState(true);
  const [customParts, setCustomParts] = useState<PartRecord[]>([]);

  const predefinedPartValues = useMemo(
    () => new Set(options.map((o) => o.value)),
    [options]
  );

  useEffect(() => {
    const customs = selectedValues.filter(
      (sv) => !predefinedPartValues.has(sv.name)
    );
    setCustomParts(customs);
  }, [selectedValues, predefinedPartValues]);

  const selectedByPayer = useMemo(() => {
    const midosItems: PartRecord[] = [];
    const clientItems: PartRecord[] = [];
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
    const selectedNames = new Set(selectedValues.map((p) => p.name));
    return options.filter((o) => !selectedNames.has(o.value));
  }, [options, selectedValues]);

  const filteredOptions = useMemo(() => {
    return availableOptions.filter((option) =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableOptions, searchTerm]);

  const frequentlyReplaced = useMemo(
    () => filteredOptions.filter((p) => p.isFrequentlyReplaced),
    [filteredOptions]
  );
  
  const regularParts = useMemo(
    () => filteredOptions.filter((p) => !p.isFrequentlyReplaced),
    [filteredOptions]
  );

  const handleAddPart = useCallback((partValue: string) => {
    onChange([...selectedValues, { name: partValue, count: 1, paidByClient: false }]);
  }, [selectedValues, onChange]);

  const handleRemovePart = useCallback((partName: string) => {
    onChange(selectedValues.filter((p) => p.name !== partName));
  }, [selectedValues, onChange]);

  const handleCountChange = useCallback((partName: string, newCount: number) => {
    if (newCount <= 0) handleRemovePart(partName);
    else onChange(selectedValues.map((p) => p.name === partName ? { ...p, count: newCount } : p));
  }, [selectedValues, onChange, handleRemovePart]);

  const handlePayerChange = useCallback((partName: string, paidByClient: boolean) => {
    onChange(selectedValues.map((p) => p.name === partName ? { ...p, paidByClient } : p));
  }, [selectedValues, onChange]);

  const handleAddCustomPart = useCallback(() => {
    onChange([...selectedValues, { name: '', count: 1, cost: 0, paidByClient: false }]);
  }, [selectedValues, onChange]);

  const handleCustomNameChange = useCallback((index: number, newName: string) => {
    const customPart = customParts[index];
    if (customPart) {
      onChange(selectedValues.map((p) => p === customPart ? { ...p, name: newName } : p));
    }
  }, [customParts, selectedValues, onChange]);

  const renderAvailablePart = (option: Part) => {
    const gridClasses = 'flex-col justify-between';
    const listClasses = 'flex-row justify-between items-center';
    
    return (
      <button
        key={option.value}
        onClick={() => handleAddPart(option.value)}
        className={`group border border-hairline bg-cream hover:bg-cream-2 hover:border-primary/50 rounded-xl p-4 flex transition-all duration-200 text-left ${viewMode === 'grid' ? gridClasses : listClasses}`}
      >
        <div>
          <p className="font-semibold text-text group-hover:text-primary transition-colors">
            {option.label}
          </p>
        </div>
        <div className={`mt-3 ${viewMode === 'list' && 'mt-0 ml-4'}`}>
            <div className="w-8 h-8 rounded-full bg-cream-2 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <PlusIcon className="w-5 h-5" />
            </div>
        </div>
      </button>
    );
  };

  const renderPayerGroup = (payer: 'midos' | 'client', items: PartRecord[]) => {
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
            items.map((part, index) => {
                const isCustom = !predefinedPartValues.has(part.name);
                const customIndex = isCustom ? customParts.findIndex((cp) => cp === part) : -1;
                return (
                    <SelectedItemCard
                        key={`${part.name}-${index}`}
                        name={part.name}
                        quantity={part.count}
                        paidByClient={part.paidByClient === true}
                        isCustom={isCustom}
                        viewMode={viewMode}
                        onPayerChange={(paidByClient) => handlePayerChange(part.name, paidByClient)}
                        onQuantityChange={(quantity) => handleCountChange(part.name, quantity)}
                        onRemove={() => handleRemovePart(part.name)}
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
        <div className="flex-grow">
             <TechInput 
                 placeholder={ar.selectors.searchParts}
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

      {/* Available Section */}
      <div className="bg-cream-2 border border-hairline rounded-2xl p-4 md:p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-latte mb-4">Replacements Inventory</h3>

        {filteredOptions.length > 0 ? (
          <div className="space-y-8">
            {/* Frequent */}
            {frequentlyReplaced.length > 0 && (
                <section>
                    <h4 className="text-sm font-semibold text-primary dark:text-copper-300 mb-3 border-b border-primary/10 pb-2">
                        Common
                    </h4>
                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex flex-col gap-2'}`}>
                        {frequentlyReplaced.map(renderAvailablePart)}
                    </div>
                </section>
            )}

            {/* Regular */}
            {regularParts.length > 0 && (
                <section>
                    <h4 className="text-sm font-semibold text-latte mb-3 border-b border-hairline pb-2">
                        All Parts
                    </h4>
                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex flex-col gap-2'}`}>
                         {regularParts.map(renderAvailablePart)}
                    </div>
                </section>
            )}

          </div>
        ) : (
          <div className="text-center py-12 text-latte">
             <p>{searchTerm ? ar.selectors.noPartsMatch : ar.payerFirstUI.noAvailableItems}</p>
          </div>
        )}
      </div>

      {/* Selected Section */}
      <div className="space-y-4">
        <button
            onClick={() => setIsSelectedSectionExpanded(!isSelectedSectionExpanded)}
            className="w-full flex items-center justify-between text-latte hover:text-text transition-colors py-2 group"
        >
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                SELECTED PARTS
                {totalSelectedCount > 0 && <span className="bg-primary text-white px-1.5 py-0.5 rounded text-[10px]">{totalSelectedCount}</span>}
            </span>
            {isSelectedSectionExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
        </button>

        {isSelectedSectionExpanded && (
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2">
                {renderPayerGroup('midos', selectedByPayer.midos)}
                {renderPayerGroup('client', selectedByPayer.client)}

                <button
                    onClick={handleAddCustomPart}
                    className="w-full py-3 border border-dashed border-hairline rounded-xl text-latte hover:text-primary hover:border-primary/50 hover:bg-cream-2 transition-all flex items-center justify-center gap-2 font-medium"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    {ar.selectors.addCustomPart}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default PartsSelector;
