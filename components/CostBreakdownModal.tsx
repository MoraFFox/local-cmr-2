import React from 'react';
import { FormData, MaintenanceRecord, Part, Service, PartRecord, ServiceRecord } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CollapsibleSection from './CollapsibleSection';
import { SafeModal } from './form-ui/SafeModal';

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
        <span className={isSubItem ? "text-latte dark:text-latte" : "text-primary dark:text-latte/70"}>{label}</span>
        <span className="font-medium text-primary dark:text-cream">{typeof value === 'number' ? formatCurrency(value) : value}</span>
    </div>
);

const CostBreakdownModal: React.FC<CostBreakdownModalProps> = ({ isOpen, onClose, formData, partsList, servicesList }) => {
    // Guard the (potentially expensive) cost aggregation so it only runs when
    // the modal is actually open. SafeModal handles the closed state internally,
    // so returning null here is safe and avoids unnecessary work every render.
    if (!isOpen) return null;

    const aggregatedData = aggregateCosts(formData, partsList, servicesList);

    return (
        <SafeModal
            isOpen={isOpen}
            onClose={onClose}
            type="info"
            size="lg"
            ariaLabel="Aggregated Cost Summary"
            bodyClassName="!p-0 !px-0 !py-0"
            renderHeader={(handleClose) => (
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-hairline dark:border-hairline px-6 sm:px-8 pt-6 sm:pt-8">
                    <h2 id="modal-title" className="text-xl font-bold text-primary dark:text-white">Aggregated Cost Summary</h2>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full text-latte dark:text-latte hover:bg-cream dark:hover:bg-espresso-light/50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
            )}
            renderFooter={() => (
                <div className="mt-6 pt-4 pb-safe border-t border-hairline dark:border-hairline flex justify-between items-center px-6 sm:px-8">
                    <span className="text-sm font-medium text-latte dark:text-latte">Grand Total:</span>
                    <span className="text-xl font-bold text-primary-800 dark:text-primary-400">{formatCurrency(aggregatedData.grandTotal)}</span>
                </div>
            )}
        >
            <div className="overflow-y-auto pr-2 -mr-2 space-y-4 flex-grow px-6 sm:px-8 pb-4">
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
                                                    {data.count}x {data.name} <span className="text-latte">@ {formatCurrency(data.unitCost)}</span>
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
                                                    {data.count}x {data.name} <span className="text-latte">@ {formatCurrency(data.unitCost)}</span>
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
                       <p className="text-latte dark:text-latte text-center py-8">No maintenance costs to display.</p>
                    </div>
                )}
            </div>
        </SafeModal>
    );
};

export default CostBreakdownModal;
