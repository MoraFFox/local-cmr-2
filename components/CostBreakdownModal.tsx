import React, { useEffect } from 'react';
import { FormData, MaintenanceRecord, Part, Service, PartRecord, ServiceRecord } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CollapsibleSection from './CollapsibleSection';

interface CostBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: FormData;
    partsList: Part[];
    servicesList: Service[];
}

const visitZoneFees: Record<'cairo' | 'outside_cairo' | 'el_sahel', number> = {
    cairo: 500,
    outside_cairo: 1500,
    el_sahel: 4000
};

const formatCurrency = (value: number) => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', minimumFractionDigits: 0 }).format(value);

const aggregateCosts = (formData: FormData, partsList: Part[], servicesList: Service[]) => {
    type AggregatedItem = { name: string, count: number, totalCost: number, unitCost: number };

    const aggregated = {
        parts: new Map<string, AggregatedItem>(),
        services: new Map<string, AggregatedItem>(),
        totalVisitFees: 0,
        totalPartsCost: 0,
        totalServicesCost: 0,
        grandTotal: 0,
    };

    const getKey = (name: string, cost: number) => `${name}#${cost}`;

    const processRecord = (record: MaintenanceRecord) => {
        // Add visit fee
        if (record.visitZone) {
            aggregated.totalVisitFees += visitZoneFees[record.visitZone];
        }

        // Aggregate parts
        (record.partsReplaced || []).filter(p => !p.paidByClient).forEach(partRecord => {
            const unitCost = partRecord.cost ?? partsList.find(p => p.value === partRecord.name)?.cost ?? 0;
            const key = getKey(partRecord.name, unitCost);

            const existing = aggregated.parts.get(key) || { name: partRecord.name, count: 0, totalCost: 0, unitCost };
            existing.count += partRecord.count;
            existing.totalCost += partRecord.count * unitCost;
            aggregated.parts.set(key, existing);
        });

        // Aggregate services
        (record.servicesPerformed || []).filter(s => !s.paidByClient).forEach(serviceRecord => {
            const unitCost = serviceRecord.cost ?? servicesList.find(s => s.value === serviceRecord.name)?.cost ?? 0;
            const key = getKey(serviceRecord.name, unitCost);

            const existing = aggregated.services.get(key) || { name: serviceRecord.name, count: 0, totalCost: 0, unitCost };
            existing.count += serviceRecord.count;
            existing.totalCost += serviceRecord.count * unitCost;
            aggregated.services.set(key, existing);
        });

        // Recursively process follow-up visits
        (record.followUpVisits || []).forEach(processRecord);
    };

    // Process main office records
    formData.maintenanceHistory.forEach(processRecord);

    // Process branch records
    formData.branches.forEach(branch => {
        branch.maintenanceHistory.forEach(processRecord);
    });

    // Calculate totals
    aggregated.totalPartsCost = Array.from(aggregated.parts.values()).reduce((sum, p) => sum + p.totalCost, 0);
    aggregated.totalServicesCost = Array.from(aggregated.services.values()).reduce((sum, s) => sum + s.totalCost, 0);
    aggregated.grandTotal = aggregated.totalVisitFees + aggregated.totalPartsCost + aggregated.totalServicesCost;
    
    return aggregated;
};


const CostDetail: React.FC<{ label: React.ReactNode; value: string | number; isSubItem?: boolean }> = ({ label, value, isSubItem = false }) => (
    <div className={`flex justify-between items-center py-1 ${isSubItem ? 'pl-4 text-xs' : 'text-sm'}`}>
        <span className={isSubItem ? "text-secondary dark:text-secondary" : "text-primary dark:text-secondary/70"}>{label}</span>
        <span className="font-medium text-primary dark:text-cream">{typeof value === 'number' ? formatCurrency(value) : value}</span>
    </div>
);

const CostBreakdownModal: React.FC<CostBreakdownModalProps> = ({ isOpen, onClose, formData, partsList, servicesList }) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const aggregatedData = aggregateCosts(formData, partsList, servicesList);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 z-50 flex justify-center items-center transition-opacity duration-300 p-2 sm:p-4 pt-safe"
            onClick={onClose}
        >
            <div 
                role="dialog"
                aria-modal="true"
                className="bg-surface dark:bg-chrome rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-2xl m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-default dark:border-default">
                    <h2 id="modal-title" className="text-xl font-bold text-primary dark:text-white">Aggregated Cost Summary</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-secondary dark:text-secondary hover:bg-surface dark:hover:bg-chrome-light/50">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                <div className="overflow-y-auto pr-2 -mr-2 space-y-4 flex-grow">
                    {aggregatedData.grandTotal > 0 ? (
                        <>
                            {aggregatedData.totalVisitFees > 0 && (
                                <CollapsibleSection title={`Visit Fees Total: ${formatCurrency(aggregatedData.totalVisitFees)}`}>
                                    <CostDetail label="إجمالي رسوم الزيارات" value={aggregatedData.totalVisitFees} />
                                </CollapsibleSection>
                            )}

                            {aggregatedData.totalPartsCost > 0 && (
                                <CollapsibleSection title={`Parts Cost Total: ${formatCurrency(aggregatedData.totalPartsCost)}`}>
                                    <div className="space-y-1">
                                        {Array.from(aggregatedData.parts.values()).map((data) => (
                                            <CostDetail
                                                key={`${data.name}#${data.unitCost}`}
                                                label={
                                                    <span>
                                                        {data.count}x {data.name} <span className="text-secondary">@ {formatCurrency(data.unitCost)}</span>
                                                    </span>
                                                }
                                                value={data.totalCost}
                                                isSubItem
                                            />
                                        ))}
                                    </div>
                                </CollapsibleSection>
                            )}

                             {aggregatedData.totalServicesCost > 0 && (
                                <CollapsibleSection title={`Services Cost Total: ${formatCurrency(aggregatedData.totalServicesCost)}`}>
                                    <div className="space-y-1">
                                        {Array.from(aggregatedData.services.values()).map((data) => (
                                            <CostDetail
                                                key={`${data.name}#${data.unitCost}`}
                                                label={
                                                    <span>
                                                        {data.count}x {data.name} <span className="text-secondary">@ {formatCurrency(data.unitCost)}</span>
                                                    </span>
                                                }
                                                value={data.totalCost}
                                                isSubItem
                                            />
                                        ))}
                                    </div>
                                </CollapsibleSection>
                             )}
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                           <p className="text-secondary dark:text-secondary text-center py-8">No maintenance costs to display.</p>
                        </div>
                    )}
                </div>
                <div className="mt-6 pt-4 pb-safe border-t border-default dark:border-default flex justify-between items-center">
                    <span className="text-sm font-medium text-secondary dark:text-secondary">Grand Total:</span>
                    <span className="text-xl font-bold text-brand-red-800 dark:text-brand-red-400">{formatCurrency(aggregatedData.grandTotal)}</span>
                </div>
                <style>{`
                    @keyframes fade-in-scale {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                    .animate-fade-in-scale {
                        animation: fade-in-scale 0.2s ease-out forwards;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default CostBreakdownModal;