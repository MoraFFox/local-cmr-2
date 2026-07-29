import React from 'react';
import { FormData, Part, Service } from '../types';
import { XMarkIcon } from '@heroicons/react/24/outline';
import CollapsibleSection from './CollapsibleSection';
import { SafeModal } from './form-ui/SafeModal';
import { aggregateCosts, formatCurrency } from '../utils/costAggregation';

interface CostBreakdownModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: FormData;
    partsList: Part[];
    servicesList: Service[];
}


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
                <div className="mt-6 pt-4 pb-safe border-t border-hairline dark:border-hairline flex flex-col gap-1 px-6 sm:px-8">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-latte dark:text-latte">صافي تكلفة الشركة:</span>
                        <span className="text-xl font-bold text-primary-800 dark:text-primary-400">{formatCurrency(aggregatedData.grandTotalCompanyCost)}</span>
                    </div>
                    {(aggregatedData.totalClientPartsCost > 0 || aggregatedData.totalClientServicesCost > 0) && (
                        <div className="flex justify-between items-center text-xs text-latte">
                            <span>+ فواتير العميل (قطع غيار + خدمات)</span>
                            <span>{formatCurrency(aggregatedData.totalClientPartsCost + aggregatedData.totalClientServicesCost)}</span>
                        </div>
                    )}
                </div>
            )}
        >
            <div className="overflow-y-auto pr-2 -mr-2 space-y-4 flex-grow px-6 sm:px-8 pb-4">
                {aggregatedData.grandTotal > 0 ? (
                    <>
                        {aggregatedData.totalVisitFees > 0 && (
                            <CollapsibleSection title={`رسوم الزيارات: ${formatCurrency(aggregatedData.totalVisitFees)}`}>
                                <CostDetail label="إجمالي رسوم الزيارات" value={aggregatedData.totalVisitFees} />
                            </CollapsibleSection>
                        )}

                        {aggregatedData.totalLeaseRevenue > 0 && (
                            <CollapsibleSection title={`إيرادات تأجير الماكينات: ${formatCurrency(aggregatedData.totalLeaseRevenue)}`}>
                                <CostDetail label="إجمالي إيرادات التأجير" value={aggregatedData.totalLeaseRevenue} />
                            </CollapsibleSection>
                        )}

                        {aggregatedData.totalPartsCost > 0 && (
                            <CollapsibleSection title={`قطع الغيار (علينا): ${formatCurrency(aggregatedData.totalPartsCost)}`}>
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

                        {aggregatedData.totalClientPartsCost > 0 && (
                            <CollapsibleSection title={`قطع الغيار (فاتورة العميل): ${formatCurrency(aggregatedData.totalClientPartsCost)}`}>
                                <div className="space-y-1">
                                    {Array.from(aggregatedData.clientParts.values()).map((data) => (
                                        <CostDetail
                                            key={`client-${data.name}#${data.unitCost}`}
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
                            <CollapsibleSection title={`الخدمات (علينا): ${formatCurrency(aggregatedData.totalServicesCost)}`}>
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

                        {aggregatedData.totalClientServicesCost > 0 && (
                            <CollapsibleSection title={`الخدمات (فاتورة العميل): ${formatCurrency(aggregatedData.totalClientServicesCost)}`}>
                                <div className="space-y-1">
                                    {Array.from(aggregatedData.clientServices.values()).map((data) => (
                                        <CostDetail
                                            key={`client-${data.name}#${data.unitCost}`}
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
