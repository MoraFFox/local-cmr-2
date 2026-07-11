import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ar } from '../utils/arabicTranslations';
import { Service, ServiceRecord } from '../types';
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

interface ServiceSelectorProps {
  options: Service[];
  selectedValues: ServiceRecord[];
  onChange: (selected: ServiceRecord[]) => void;
}

const ServiceSelector: React.FC<ServiceSelectorProps> = ({
  options,
  selectedValues,
  onChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSelectedSectionExpanded, setIsSelectedSectionExpanded] = useState(true);
  const [customServices, setCustomServices] = useState<ServiceRecord[]>([]);

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

  const filteredOptions = useMemo(() => {
    return availableOptions.filter(
      (option) =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [availableOptions, searchTerm]);

  const categories = useMemo(() => {
    const grouped: { [key: string]: Service[] } = {};
    filteredOptions.forEach((service) => {
      if (!grouped[service.category]) grouped[service.category] = [];
      grouped[service.category].push(service);
    });
    return grouped;
  }, [filteredOptions]);

  const handleAddService = useCallback((serviceValue: string) => {
    onChange([...selectedValues, { name: serviceValue, count: 1, paidByClient: false }]);
  }, [selectedValues, onChange]);

  const handleRemoveService = useCallback((serviceName: string) => {
    onChange(selectedValues.filter((s) => s.name !== serviceName));
  }, [selectedValues, onChange]);

  const handleCountChange = useCallback((serviceName: string, newCount: number) => {
    if (newCount <= 0) handleRemoveService(serviceName);
    else onChange(selectedValues.map((s) => s.name === serviceName ? { ...s, count: newCount } : s));
  }, [selectedValues, onChange, handleRemoveService]);

  const handlePayerChange = useCallback((serviceName: string, paidByClient: boolean) => {
    onChange(selectedValues.map((s) => s.name === serviceName ? { ...s, paidByClient } : s));
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

  const renderAvailableService = (option: Service) => {
    const gridClasses = 'flex-col justify-between';
    const listClasses = 'flex-row justify-between items-center';
    
    return (
      <button
        key={option.value}
        onClick={() => handleAddService(option.value)}
        className={`group border border-espresso-light/50 bg-chrome-light/50 hover:bg-chrome-light hover:border-copper-500/50 rounded-xl p-4 flex transition-all duration-200 text-left ${viewMode === 'grid' ? gridClasses : listClasses}`}
      >
        <div>
          <p className="font-semibold text-cream group-hover:text-white transition-colors">
            {option.label}
          </p>
          {option.description && (
            <p className="text-xs text-secondary mt-1 line-clamp-2">
              {option.description}
            </p>
          )}
        </div>
        <div className={`mt-3 ${viewMode === 'list' && 'mt-0 ml-4'}`}>
            <div className="w-8 h-8 rounded-full bg-chrome-light flex items-center justify-center text-brand-red-400 group-hover:bg-copper-500 group-hover:text-white transition-all">
                <PlusIcon className="w-5 h-5" />
            </div>
        </div>
      </button>
    );
  };

  const renderPayerGroup = (payer: 'midos' | 'client', items: ServiceRecord[]) => {
    const isMidos = payer === 'client' ? false : true;
    const summary = isMidos ? payerGroupSummary.midos : payerGroupSummary.client;
    
    const headerBorderColor = isMidos ? 'border-copper-500/30' : 'border-amber-500/30';
    const headerBgColor = isMidos ? 'bg-copper-500/10' : 'bg-amber-500/10';
    const textColor = isMidos ? 'text-brand-red-400' : 'text-amber-400';

    return (
      <div className={`rounded-xl border ${headerBorderColor} overflow-hidden bg-chrome/30 backdrop-blur-sm`}>
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
            <div className="text-center py-6 text-secondary text-sm italic">
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
                 placeholder={ar.selectors.searchServices}
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 icon={<MagnifyingGlassIcon className="w-5 h-5 text-secondary" />}
             />
        </div>
        <div className="flex bg-chrome rounded-xl p-1 border border-espresso-light/50">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-chrome-light text-white shadow-sm' : 'text-secondary hover:text-cream'}`}
          >
            <Squares2X2Icon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-chrome-light text-white shadow-sm' : 'text-secondary hover:text-cream'}`}
          >
            <ListBulletIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Selected Section */}
      <div className="space-y-4">
        <button
            onClick={() => setIsSelectedSectionExpanded(!isSelectedSectionExpanded)}
            className="w-full flex items-center justify-between text-secondary hover:text-cream transition-colors py-2 group"
        >
            <span className="text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                SELECTED OPS
                {totalSelectedCount > 0 && <span className="bg-copper-500 text-espresso px-1.5 py-0.5 rounded text-[10px]">{totalSelectedCount}</span>}
            </span>
            {isSelectedSectionExpanded ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
        </button>

        {isSelectedSectionExpanded && (
            <div className="grid grid-cols-1 gap-4 animate-in fade-in slide-in-from-top-2">
                {renderPayerGroup('midos', selectedByPayer.midos)}
                {renderPayerGroup('client', selectedByPayer.client)}
                
                <button
                    onClick={handleAddCustomService}
                    className="w-full py-3 border border-dashed border-espresso-lighter rounded-xl text-secondary hover:text-brand-red-400 hover:border-copper-500/50 hover:bg-chrome transition-all flex items-center justify-center gap-2 font-medium"
                >
                    <PlusCircleIcon className="w-5 h-5" />
                    {ar.selectors.addCustomService}
                </button>
            </div>
        )}
      </div>

      {/* Available Section */}
      <div className="bg-chrome/50 border border-espresso-light rounded-2xl p-4 md:p-6">
        <h3 className="text-xs font-bold uppercase tracking-widest text-secondary mb-4">Available Protocols</h3>
        
        {Object.keys(categories).length > 0 ? (
          <div className="space-y-8">
            {Object.keys(categories).map((category) => (
              <section key={category}>
                <h4 className="text-sm font-semibold text-brand-red-400/80 mb-3 border-b border-copper-500/10 pb-2">
                  {category}
                </h4>
                <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 gap-3' : 'flex flex-col gap-2'}`}>
                  {categories[category].map(renderAvailableService)}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-secondary">
             <p>{searchTerm ? ar.selectors.noServicesMatch : ar.payerFirstUI.noAvailableItems}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceSelector;
