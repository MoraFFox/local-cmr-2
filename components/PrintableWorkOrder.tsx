import React from 'react';
import { PrinterIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';
import { Part, Service } from '../types';

interface PrintableWorkOrderProps {
    onBack: () => void;
    partsList: Part[];
    servicesList: Service[];
}

const LinedField: React.FC<{ label: string, className?: string }> = ({ label, className = '' }) => (
    <div className={`grid grid-cols-4 gap-x-2 items-end text-sm ${className}`}>
        <label className="text-primary font-semibold text-right col-span-1 whitespace-nowrap">{label}:</label>
        <div className="border-b border-default border-dotted col-span-3 h-5"></div>
    </div>
);

const WorkItem: React.FC<{ label: string }> = ({ label }) => (
    <div className="p-1.5 border border-default rounded-md text-sm break-inside-avoid flex flex-col h-full">
        <p className="font-medium text-primary flex-grow text-[13px]">{label}</p>
        <div className="flex justify-end items-center gap-x-2 mt-1.5 pt-1.5 border-t border-dotted border-default">
            <div className="flex items-baseline gap-1">
                <label className="text-[11px] text-secondary">Qty:</label>
                <div className="w-6 h-5 border-b border-default"></div>
            </div>
            <div className="flex items-center gap-1">
                <label className="text-[11px] text-secondary">Client Paid:</label>
                <div className="w-3.5 h-3.5 border border-default flex-shrink-0"></div>
            </div>
        </div>
    </div>
);

const CustomItemsTable: React.FC = () => (
    <div className="mt-4 break-inside-avoid">
        <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-1.5">Custom Parts / Additional Services</h4>
        <table className="w-full text-sm">
            <thead>
                <tr className="border-b-2 border-default">
                    <th className="p-1 text-left font-semibold text-xs">Item Name / Service</th>
                    <th className="p-1 w-16 text-center font-semibold text-xs">Quantity</th>
                    <th className="p-1 w-24 text-center font-semibold text-xs">Paid by Client</th>
                </tr>
            </thead>
            <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-dotted border-default">
                        <td className="p-1 h-7"></td>
                        <td className="p-1 text-center"></td>
                        <td className="p-1 flex justify-center items-center h-7">
                            <div className="w-4 h-4 border border-default"></div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const LinedTextArea: React.FC<{ lines: number }> = ({ lines }) => {
    return (
        <div className="space-y-2.5 p-1">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="h-3 border-b border-default border-dotted"></div>
            ))}
        </div>
    );
};

interface ItemGroup {
    [category: string]: { label: string; value: string }[];
}


const PrintableWorkOrder: React.FC<PrintableWorkOrderProps> = ({ onBack, partsList, servicesList }) => {
    
    const serviceGroups = servicesList.reduce((acc, service) => {
        const category = service.category || 'General';
        if (!acc[category]) acc[category] = [];
        acc[category].push(service);
        return acc;
    }, {} as ItemGroup);

    const partGroups = partsList.reduce((acc, part) => {
        const category = part.isFrequentlyReplaced ? 'الأكثر استبدالاً' : 'قطع غيار أخرى';
        if (!acc[category]) acc[category] = [];
        acc[category].push(part);
        return acc;
    }, {} as ItemGroup);


    return (
        <div className="bg-surface-elevated dark:bg-chrome p-4 sm:p-8 print:p-0 print:bg-white">
            <div className="fixed bottom-4 left-4 z-30 flex flex-col gap-3 print:hidden">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-brand-red-light text-white font-bold py-3 px-5 rounded-full hover:bg-copper-700 transition-colors shadow-lg transform active:scale-95"
                >
                    <PrinterIcon className="w-6 h-6"/>
                    <span>Print</span>
                </button>
                 <button
                    onClick={onBack}
                    className="flex items-center gap-2 bg-chrome-light text-white font-bold py-3 px-5 rounded-full hover:bg-chrome-light/50 transition-colors shadow-lg transform active:scale-95"
                >
                    <ArrowUturnLeftIcon className="w-6 h-6"/>
                     <span>Back</span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto force-daylight bg-white p-4 sm:p-8 shadow-sm rounded-lg font-sans text-primary print:shadow-none print:rounded-none">
                {/* Header */}
                <header className="flex justify-between items-center pb-3 border-b-2 border-default">
                    <div>
                        <h1 className="text-2xl font-bold text-primary">Maintenance Visit Report</h1>
                        <p className="text-xs text-secondary">Internal Use Document</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <img src="/logo.svg" alt="Mido for distribution" className="h-12 w-auto object-contain mb-1" />
                        <div className="text-sm font-bold text-brand-red">
                            Mido for distribution
                        </div>
                    </div>
                </header>

                {/* Client & Visit Info */}
                <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <LinedField label="اسم الشركة" />
                    <LinedField label="Visit Date" />
                    <LinedField label="Technician" />
                    <LinedField label="Contact Name" />
                    <LinedField label="Contact Phone" />
                </section>

                {/* Main Content Sections */}
                <main className="mt-6 space-y-4">
                    <div className="p-2 border border-default rounded-md">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-surface-elevated -m-2 mb-2 p-2 rounded-t-md border-b-2 border-default">Work Performed</h3>
                        
                        <div className="mb-3 break-inside-avoid">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">الخدمات المنفذة</h4>
                            {Object.keys(serviceGroups).map(category => (
                                <div key={category} className="mb-2 pl-2">
                                    <p className="text-xs font-semibold text-secondary">{category}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                                        {serviceGroups[category].map(item => <WorkItem key={item.value} label={item.label} />)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mb-3 break-inside-avoid">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">Parts Used</h4>
                            {Object.keys(partGroups).map(category => (
                                <div key={category} className="mb-2 pl-2">
                                    <p className="text-xs font-semibold text-secondary">{category}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                                        {partGroups[category].map(item => <WorkItem key={item.value} label={item.label} />)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <CustomItemsTable />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-surface-elevated p-2 rounded-t-md border-b-2 border-default">Identified Issues, Recommendations & Notes</h3>
                        <div className="p-1 border border-t-0 border-default rounded-b-md">
                            <LinedTextArea lines={6} />
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-12 pt-6 border-t-2 border-default text-center">
                    <p className="text-xs text-secondary">End of Work Order</p>
                </footer>
            </div>
            <style>{`
                @media print {
                    @page {
                        size: A4;
                        margin: 0.5in;
                    }
                    .break-inside-avoid {
                        break-inside: avoid;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrintableWorkOrder;