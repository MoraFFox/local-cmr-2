import React, { useState, useRef } from 'react';
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Import / Export
                    </h2>
                    
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('export')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'export'
                                ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
                                ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <ArrowUpTrayIcon className="w-4 h-4" />
                            Import
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {activeTab === 'export' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={handleExportJSON}
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 transition-colors group"
                                >
                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                                        <CodeBracketIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Export as JSON</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            Complete data with all details
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleExportCSV}
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 transition-colors group"
                                >
                                    <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                                        <TableCellsIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Export as CSV</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            Maintenance records only
                                        </p>
                                    </div>
                                </button>

                                <button
                                    onClick={handleExportSummary}
                                    className="flex flex-col items-center gap-3 p-6 bg-slate-50 dark:bg-slate-700/50 rounded-xl border-2 border-slate-200 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 transition-colors group sm:col-span-2"
                                >
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                                        <DocumentTextIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="text-center">
                                        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Export Summary Report</h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
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
                                        ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20'
                                        : importStatus === 'success'
                                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20'
                                        : importStatus === 'error'
                                        ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                                        : 'border-slate-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-400'
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
                                        importStatus === 'success' ? 'text-green-500' :
                                        importStatus === 'error' ? 'text-red-500' :
                                        'text-slate-400'
                                    }`} />
                                    
                                    <p className="font-medium text-slate-700 dark:text-slate-300">
                                        {importStatus === 'loading' ? 'جاري المعالجة...' : 'اضغط لرفع الملف'}
                                    </p>
                                    
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                        JSON or CSV format
                                    </p>
                                </button>
                            </div>

                            {/* Status Message */}
                            {importMessage && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg ${
                                    importStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                    importStatus === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
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
                                    <h4 className="font-medium text-slate-700 dark:text-slate-300">
                                        Validation Results
                                    </h4>
                                    
                                    {importedData.map((item: any, index: number) => (
                                        <div
                                            key={index}
                                            className={`p-3 rounded-lg border ${
                                                item.validation.isValid
                                                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                                                    : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {item.validation.isValid ? (
                                                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                                ) : (
                                                    <ExclamationCircleIcon className="w-5 h-5 text-red-600" />
                                                )}
                                                
                                                <span className="font-medium">
                                                    {item.original.companyName || `Company ${index + 1}`}
                                                </span>
                                            </div>
                                            
                                            {!item.validation.isValid && (
                                                <ul className="mt-2 ml-7 text-sm text-red-600 dark:text-red-400">
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
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                        <button
                            onClick={() => {
                                setImportedData([]);
                                setImportStatus('idle');
                                setImportMessage('');
                            }}
                            className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Clear
                        </button>
                        
                        <button
                            onClick={handleImport}
                            className="px-6 py-2 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-colors"
                        >
                            Import {importedData.filter((item: any) => item.validation.isValid).length} Companies
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImportExportDialog;
