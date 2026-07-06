import React, { useState, useRef, useEffect } from 'react';
import { 
    ArrowUpTrayIcon, 
    ArrowDownTrayIcon, 
    DocumentTextIcon,
    TableCellsIcon,
    CodeBracketIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    DocumentArrowUpIcon
} from '@heroicons/react/24/outline';
import { 
    exportToJSON, 
    exportToCSV, 
    importFromJSON, 
    importFromCSV,
    validateImportedCompany,
    transformImportedCompany,
    exportSummaryReport
} from '../utils/importExport';
import { FormData } from '../types';
import Button from './ui/Button';

interface ImportExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    companies: FormData[];
    onImportCompany?: (company: Partial<FormData>) => void;
}

const ImportExportDialog: React.FC<ImportExportDialogProps> = ({
    isOpen,
    onClose,
    companies,
    onImportCompany
}) => {
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
    const [importStatus, setImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [importMessage, setImportMessage] = useState('');
    const [importedData, setImportedData] = useState<any[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExportJSON = () => {
        if (companies.length === 1) {
            exportToJSON(companies[0], `${companies[0].companyName || 'company'}_${Date.now()}.json`);
        } else {
            exportToJSON(companies, `companies_export_${new Date().toISOString().split('T')[0]}.json`);
        }
    };

    const handleExportCSV = () => {
        // Export maintenance records from all companies
        companies.forEach(company => {
            if (company.maintenanceHistory?.length > 0) {
                const columns = [
                    { header: 'Company', accessor: () => company.companyName },
                    { header: 'Date', accessor: 'maintenanceDate' },
                    { header: 'Staff', accessor: 'baristaName' },
                    { header: 'Type', accessor: 'type' },
                    { header: 'Had Problem', accessor: (r: any) => r.hadProblem ? 'Yes' : 'No' },
                    { header: 'Problems', accessor: (r: any) => (r.problems || []).join('; ') },
                    { header: 'Problem Solved', accessor: (r: any) => r.problemSolved ? 'Yes' : 'No' },
                    { header: 'Paid By', accessor: 'paidBy' },
                    { header: 'Before Photo URLs', accessor: (r: any) => (r.photos || []).filter((p: any) => p.type === 'before').map((p: any) => p.url).join(';') },
                    { header: 'After Photo URLs', accessor: (r: any) => (r.photos || []).filter((p: any) => p.type === 'after').map((p: any) => p.url).join(';') },
                    { header: 'Legacy Photo URLs', accessor: (r: any) => (r.photos || []).filter((p: any) => p.type === 'legacy').map((p: any) => p.url).join(';') },
                ];
                exportToCSV(company.maintenanceHistory, columns, `${company.companyName}_maintenance.csv`);
            }
        });
    };

    const handleExportSummary = () => {
        exportSummaryReport(companies);
    };

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportStatus('loading');
        setImportMessage('');

        try {
            let data: any;
            
            if (file.name.endsWith('.json')) {
                data = await importFromJSON(file);
            } else if (file.name.endsWith('.csv')) {
                data = await importFromCSV(file);
            } else {
                throw new Error('Unsupported file format. Please use JSON or CSV.');
            }

            // Handle both single company and array of companies
            const companiesArray = Array.isArray(data) ? data : [data];
            
            // Validate each company
            const validatedCompanies = companiesArray.map((company: any) => {
                const validation = validateImportedCompany(company);
                return {
                    original: company,
                    validation,
                    transformed: validation.isValid ? transformImportedCompany(company) : null
                };
            });

            setImportedData(validatedCompanies);
            
            const validCount = validatedCompanies.filter((c: any) => c.validation.isValid).length;
            const invalidCount = validatedCompanies.length - validCount;
            
            if (invalidCount === 0) {
                setImportStatus('success');
                setImportMessage(`Successfully validated ${validCount} compan${validCount === 1 ? 'y' : 'ies'}`);
            } else {
                setImportStatus('error');
                setImportMessage(`${validCount} valid, ${invalidCount} invalid`);
            }
        } catch (error: any) {
            setImportStatus('error');
            setImportMessage(error.message || 'فشل استيراد الملف');
        }
    };

    const handleImport = () => {
        if (!onImportCompany) return;

        const validCompanies = importedData
            .filter((item: any) => item.validation.isValid)
            .map((item: any) => item.transformed);

        validCompanies.forEach((company: Partial<FormData>) => {
            onImportCompany(company);
        });

        setImportStatus('success');
        setImportMessage(`Successfully imported ${validCompanies.length} compan${validCompanies.length === 1 ? 'y' : 'ies'}`);
        
        setTimeout(() => {
            setImportedData([]);
            setImportStatus('idle');
            onClose();
        }, 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pt-safe bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div 
                role="dialog"
                aria-modal="true"
                className="bg-cream border border-hairline rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-cream-2/50">
                    <h2 className="text-xl font-bold text-ink">
                        Import / Export
                    </h2>

                    <button
                        onClick={onClose}
                        className="p-2 text-latte hover:text-ink rounded-full hover:bg-cream-2 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-hairline bg-cream">
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'export'
                                ? 'text-copper-600 border-b-2 border-copper-500 bg-copper-500/10'
                                : 'text-latte hover:text-ink'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Export
                        </div>
                    </button>

                    <button
                        onClick={() => setActiveTab('import')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'import'
                                ? 'text-copper-600 border-b-2 border-copper-500 bg-copper-500/10'
                                : 'text-latte hover:text-ink'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Import
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-paper">
                    {activeTab === 'export' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={handleExportJSON}
                                    className="flex flex-col items-center gap-3 p-6 bg-cream rounded-xl border-2 border-hairline hover:border-copper-500 transition-colors group"
                                >
                                    <div className="p-3 bg-cream-2 rounded-xl group-hover:bg-copper-500/20 transition-colors">
                                        <CodeBracketIcon className="w-8 h-8 text-ink group-hover:text-copper-500" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold text-ink">Export as JSON</h3>
                                        <p className="text-sm text-latte mt-1">
                                            Complete data with all details
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleExportCSV}
                                    className="flex flex-col items-center gap-3 p-6 bg-cream rounded-xl border-2 border-hairline hover:border-copper-500 transition-colors group"
                                >
                                    <div className="p-3 bg-cream-2 rounded-xl group-hover:bg-copper-500/20 transition-colors">
                                        <TableCellsIcon className="w-8 h-8 text-ink group-hover:text-copper-500" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold text-ink">Export as CSV</h3>
                                        <p className="text-sm text-latte mt-1">
                                            Maintenance records only
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleExportSummary}
                                    className="flex flex-col items-center gap-3 p-6 bg-cream rounded-xl border-2 border-hairline hover:border-copper-500 transition-colors group sm:col-span-2"
                                >
                                    <div className="p-3 bg-cream-2 rounded-xl group-hover:bg-copper-500/20 transition-colors">
                                        <DocumentTextIcon className="w-8 h-8 text-ink group-hover:text-copper-500" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold text-ink">Export Summary Report</h3>
                                        <p className="text-sm text-latte mt-1">
                                            Overview of all companies with counts
                                        </p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* File Upload */}
                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                                    importStatus === 'loading'
                                        ? 'border-copper-500 bg-copper-500/10'
                                        : importStatus === 'success'
                                        ? 'border-leaf-500 bg-leaf-500/10'
                                        : importStatus === 'error'
                                        ? 'border-ember-500 bg-ember-500/10'
                                        : 'border-hairline hover:border-copper-500'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".json,.csv"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={importStatus === 'loading'}
                                    className="w-full"
                                >
                                    <DocumentArrowUpIcon className={`w-12 h-12 mx-auto mb-3 ${
                                        importStatus === 'success' ? 'text-leaf-500' :
                                        importStatus === 'error' ? 'text-ember-300' :
                                        'text-latte'
                                    }`} />

                                    <p className="font-medium text-ink">
                                        {importStatus === 'loading' ? 'جاري المعالجة...' : 'اضغط لرفع الملف'}
                                    </p>

                                    <p className="text-sm text-latte mt-1">
                                        JSON or CSV format
                                    </p>
                                </button>
                            </div>

                            {/* Status Message */}
                            {importMessage && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                                    importStatus === 'success' ? 'bg-leaf-500/10 text-leaf-600 border-leaf-500/20' :
                                    importStatus === 'error' ? 'bg-ember-500/10 text-ember-700 border-ember-500/20' :
                                    'bg-copper-500/10 text-copper-600 border-copper-500/20'
                                }`}>
                                    {importStatus === 'success' ? (
                                        <CheckCircleIcon className="w-5 h-5" />
                                    ) : importStatus === 'error' ? (
                                        <ExclamationCircleIcon className="w-5 h-5" />
                                    ) : null}
                                    <span>{importMessage}</span>
                                </div>
                            )}

                            {/* Validation Results */}
                            {importedData.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-ink">
                                        Validation Results
                                    </h4>
                                    
                                    {importedData.map((item: any, index: number) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border ${
                                                item.validation.isValid
                                                    ? 'border-leaf-500/30 bg-leaf-500/10'
                                                    : 'border-ember-500/30 bg-ember-500/10'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {item.validation.isValid ? (
                                                    <CheckCircleIcon className="w-5 h-5 text-leaf-500" />
                                                ) : (
                                                    <ExclamationCircleIcon className="w-5 h-5 text-ember-500" />
                                                )}
                                                
                                                <span className="font-medium text-ink">
                                                    {item.original.companyName || `Company ${index + 1}`}
                                                </span>
                                            </div>
                                            
                                            {!item.validation.isValid && (
                                                <ul className="mt-2 ml-7 text-sm text-ember-300">
                                                    {item.validation.errors.map((error: string, i: number) => (
                                                        <li key={i}>{error}</li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {activeTab === 'import' && importedData.some((item: any) => item.validation.isValid) && (
                    <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 px-6 py-4 pb-safe border-t border-hairline bg-surface-muted/30">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setImportedData([]);
                                setImportStatus('idle');
                                setImportMessage('');
                            }}
                            className="w-full sm:w-auto"
                        >
                            Clear
                        </Button>
                        
                        <Button
                            onClick={handleImport}
                            className="w-full sm:w-auto"
                        >
                            Import {importedData.filter((item: any) => item.validation.isValid).length} Companies
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportExportDialog;
