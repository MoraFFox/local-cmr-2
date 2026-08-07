import React, { useState } from 'react';
import { PrinterIcon, ArrowUturnLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { Part, Service } from '../types';
import { useT } from '../utils/i18n';

interface PrintableWorkOrderProps {
    onBack: () => void;
    partsList: Part[];
    servicesList: Service[];
}

const LinedField: React.FC<{ label: string, className?: string }> = ({ label, className = '' }) => (
    <div className={`grid grid-cols-4 gap-x-2 ltr:items-end rtl:items-start text-sm ${className}`}>
        <label className="text-primary font-semibold text-end col-span-1 whitespace-nowrap">{label}:</label>
        <div className="border-b border-hairline border-dotted col-span-3 h-5"></div>
    </div>
);

const WorkItem: React.FC<{ label: string }> = ({ label }) => {
    const t = useT();
    return (
        <div className="p-1.5 border border-hairline rounded-md text-sm break-inside-avoid flex flex-col h-full">
            <p className="font-medium text-primary flex-grow text-[13px]">{label}</p>
            <div className="flex ltr:justify-end rtl:justify-start items-center gap-x-2 mt-1.5 pt-1.5 border-t border-dotted border-hairline">
                <div className="flex items-baseline gap-1">
                    <label className="text-[11px] text-latte">{t.ui.print.workOrderQty}</label>
                    <div className="w-6 h-5 border-b border-hairline"></div>
                </div>
                <div className="flex items-center gap-1">
                    <label className="text-[11px] text-latte">{t.ui.print.clientPaid}</label>
                    <div className="w-3.5 h-3.5 border border-hairline flex-shrink-0"></div>
                </div>
            </div>
        </div>
    );
};

const CustomItemsTable: React.FC = () => {
    const t = useT();
    return (
        <div className="mt-4 break-inside-avoid">
            <h4 className="text-sm font-bold uppercase tracking-wider text-primary mb-1.5">{t.ui.print.customPartsServices}</h4>
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b-2 border-hairline">
                        <th className="p-1 text-start font-semibold text-xs">{t.ui.print.itemNameService}</th>
                        <th className="p-1 w-16 text-center font-semibold text-xs">{t.ui.print.quantity}</th>
                        <th className="p-1 w-24 text-center font-semibold text-xs">{t.ui.print.paidByClient}</th>
                    </tr>
                </thead>
            <tbody>
                {Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-dotted border-hairline">
                        <td className="p-1 h-7"></td>
                        <td className="p-1 text-center"></td>
                        <td className="p-1 flex justify-center items-center h-7">
                            <div className="w-4 h-4 border border-hairline"></div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
    );
};

const LinedTextArea: React.FC<{ lines: number }> = ({ lines }) => {
    return (
        <div className="space-y-2.5 p-1">
            {Array.from({ length: lines }).map((_, i) => (
                <div key={i} className="h-3 border-b border-hairline border-dotted"></div>
            ))}
        </div>
    );
};

interface ItemGroup {
    [category: string]: { label: string; value: string }[];
}


const PrintableWorkOrder: React.FC<PrintableWorkOrderProps> = ({ onBack, partsList, servicesList }) => {
    const t = useT();
    const [exportingWord, setExportingWord] = useState(false);

    const handleExportWord = async () => {
        if (exportingWord) return;
        setExportingWord(true);
        try {
            const { generateWorkOrderWordReport, downloadWordDoc } = await import('../utils/wordExport');
            const doc = await generateWorkOrderWordReport(partsList, servicesList);
            await downloadWordDoc(doc, `Maintenance_Work_Order_${new Date().toISOString().slice(0, 10)}.docx`);
        } catch (error) {
            console.error('Error generating Word work order', error);
        } finally {
            setExportingWord(false);
        }
    };

    const serviceGroups = servicesList.reduce((acc, service) => {
        const category = service.category || t.ui.print.generalCategory;
        if (!acc[category]) acc[category] = [];
        acc[category].push(service);
        return acc;
    }, {} as ItemGroup);

    const partGroups = partsList.reduce((acc, part) => {
        const category = part.isFrequentlyReplaced ? t.ui.print.mostReplaced : t.ui.print.otherParts;
        if (!acc[category]) acc[category] = [];
        acc[category].push(part);
        return acc;
    }, {} as ItemGroup);


    return (
        <div className="bg-cream-2 dark:bg-espresso p-4 sm:p-8 print:p-0 print:bg-white">
            <div className="fixed bottom-4 start-4 z-30 flex flex-col gap-3 print:hidden">
                <button
                    onClick={handleExportWord}
                    disabled={exportingWord}
                    className="flex items-center gap-2 bg-primary text-white font-bold py-3 px-5 rounded-full hover:bg-copper-700 transition-colors shadow-lg transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <DocumentArrowDownIcon className="w-6 h-6"/>
                    <span>{t.ui.print.exportWord}</span>
                </button>
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-hover text-white font-bold py-3 px-5 rounded-full hover:bg-copper-700 transition-colors shadow-lg transform active:scale-95"
                >
                    <PrinterIcon className="w-6 h-6"/>
                    <span>{t.ui.print.print}</span>
                </button>
                 <button
                    onClick={onBack}
                    className="flex items-center gap-2 bg-espresso-light text-white font-bold py-3 px-5 rounded-full hover:bg-espresso-light/50 transition-colors shadow-lg transform active:scale-95"
                >
                    <ArrowUturnLeftIcon className="w-6 h-6"/>
                     <span>{t.ui.print.back}</span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto force-daylight bg-white p-4 sm:p-8 shadow-sm rounded-lg font-sans text-primary print:shadow-none print:rounded-none">
                {/* Header */}
                <header className="flex justify-between items-center pb-3 border-b-2 border-hairline">
                    <div>
                        <h1 className="text-2xl font-bold text-primary">{t.ui.print.visitReportTitle}</h1>
                        <p className="text-xs text-latte">{t.ui.print.internalUseDoc}</p>
                    </div>
                    <div className="flex flex-col ltr:items-end rtl:items-start">
                        <img src="/logo.svg" alt="Mido for distribution" className="h-12 w-auto object-contain mb-1" />
                        <div className="text-sm font-bold text-primary">
                            Mido for distribution
                        </div>
                    </div>
                </header>

                {/* Client & Visit Info */}
                <section className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
                    <LinedField label={t.ui.print.companyName} />
                    <LinedField label={t.ui.print.visitDate} />
                    <LinedField label={t.ui.print.technician} />
                    <LinedField label={t.ui.print.contactName} />
                    <LinedField label={t.ui.print.contactPhone} />
                </section>

                {/* Main Content Sections */}
                <main className="mt-6 space-y-4">
                    <div className="p-2 border border-hairline rounded-md">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-cream-2 -m-2 mb-2 p-2 rounded-t-md border-b-2 border-hairline">{t.ui.print.workPerformed}</h3>
                        
                        <div className="mb-3 break-inside-avoid">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">{t.ui.print.servicesPerformed}</h4>
                            {Object.keys(serviceGroups).map(category => (
                                <div key={category} className="mb-2 ps-2">
                                    <p className="text-xs font-semibold text-latte">{category}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                                        {serviceGroups[category].map(item => <WorkItem key={item.value} label={item.label} />)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mb-3 break-inside-avoid">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">{t.ui.print.partsUsedShort}</h4>
                            {Object.keys(partGroups).map(category => (
                                <div key={category} className="mb-2 ps-2">
                                    <p className="text-xs font-semibold text-latte">{category}</p>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                                        {partGroups[category].map(item => <WorkItem key={item.value} label={item.label} />)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <CustomItemsTable />
                    </div>

                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-primary bg-cream-2 p-2 rounded-t-md border-b-2 border-hairline">{t.ui.print.issuesRecsNotes}</h3>
                        <div className="p-1 border border-t-0 border-hairline rounded-b-md">
                            <LinedTextArea lines={6} />
                        </div>
                    </div>
                </main>

                {/* Footer */}
                <footer className="mt-12 pt-6 border-t-2 border-hairline text-center">
                    <p className="text-xs text-latte">{t.ui.print.endOfWorkOrder}</p>
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