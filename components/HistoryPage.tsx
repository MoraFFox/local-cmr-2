import React, { useState, useMemo } from 'react';
import { FormData, MaintenanceRecord } from '../types';
import { PencilIcon, TrashIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, PrinterIcon, CloudIcon, EyeIcon, FunnelIcon, XMarkIcon, CalendarIcon, ExclamationTriangleIcon, BuildingOfficeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';
import CompanyEditModal from './CompanyEditModal';

interface HistoryPageProps {
    submissions: (FormData & { created_at: string })[];
    onEdit: (submission: FormData) => void;
    onDelete: (id: number) => void;
    onAddNew: () => void;
    onPrint: () => void;
    onViewDetails: (submission: FormData & { created_at: string }) => void;
    onUpdateCompany?: (updatedCompany: FormData) => void;
    onEditMaintenance?: (submission: FormData & { created_at: string }) => void;
    getTechnicianDisplayName?: (record: MaintenanceRecord) => string;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ submissions, onEdit, onDelete, onAddNew, onPrint, onViewDetails, onUpdateCompany, onEditMaintenance, getTechnicianDisplayName }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showOnlyProblems, setShowOnlyProblems] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [editingCompany, setEditingCompany] = useState<FormData | null>(null);
    const [isCompanyEditModalOpen, setIsCompanyEditModalOpen] = useState(false);

    const downloadJSON = (data: any, filename: string) => {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(data, null, 2)
        )}`;
        const link = document.createElement('a');
        link.href = jsonString;
        link.download = filename;
        link.click();
    };

    const handleDownloadAll = () => {
        downloadJSON(submissions, 'all_company_submissions.json');
    };
    
    const handleDownloadSingle = (submission: FormData) => {
        const filename = `${submission.companyName.replace(/\s+/g, '_') || 'submission'}_${submission.id}.json`;
        downloadJSON(submission, filename);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setShowOnlyProblems(false);
    };

    const handleQuickEditCompany = (submission: FormData) => {
        setEditingCompany(submission);
        setIsCompanyEditModalOpen(true);
    };

    const handleSaveCompanyEdit = (updatedCompany: FormData) => {
        if (onUpdateCompany) {
            onUpdateCompany(updatedCompany);
        }
    };

    // Helper function to get display name for a maintenance record
    const getDisplayName = (record: MaintenanceRecord): string => {
        if (getTechnicianDisplayName) {
            return getTechnicianDisplayName(record);
        }
        return record.baristaName || '';
    };

    // Advanced Deep Search Logic
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            // 1. Date Range & Problem Check (Deep Recursive)
            let matchesMaintenanceCriteria = true;
            
            // Helper to check a list of records for date range and/or problems
            const checkRecords = (records: MaintenanceRecord[]) => {
                if (!records || records.length === 0) return false;
                
                // If neither filter is active, we don't strictly need to check records unless we want to filter OUT empty ones? 
                // No, default behavior is match all.
                if (!startDate && !endDate && !showOnlyProblems) return true;

                return records.some(r => {
                    let match = true;
                    // Date Check
                    if (startDate || endDate) {
                        const rDate = new Date(r.maintenanceDate);
                        if (startDate && rDate < new Date(startDate)) match = false;
                        if (endDate && rDate > new Date(endDate)) match = false;
                    }
                    // Problem Check
                    if (showOnlyProblems && !r.hadProblem) {
                        match = false;
                    }
                    
                    // Recursive check for follow-ups
                    if (!match && r.followUpVisits && r.followUpVisits.length > 0) {
                        return checkRecords(r.followUpVisits); // If parent fails, maybe child matches? 
                        // Actually, if parent date is out of range, child date likely is too, but conceptually we check all.
                        // Logic: If I select "Jan 1 - Jan 31", and a visit was Jan 15, it matches.
                    }
                    
                    return match;
                });
            };

            const hasMainOfficeMatch = checkRecords(sub.maintenanceHistory);
            const hasBranchMatch = sub.branches.some(b => checkRecords(b.maintenanceHistory));

            // If any filter is active, we require at least one maintenance record to match
            if (startDate || endDate || showOnlyProblems) {
                if (!hasMainOfficeMatch && !hasBranchMatch) {
                    matchesMaintenanceCriteria = false;
                }
            }

            if (!matchesMaintenanceCriteria) return false;

            // 2. Text Search Check (Existing logic)
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();

            const companyMatch = 
                (sub.companyName || '').toLowerCase().includes(term) ||
                (sub.location || '').toLowerCase().includes(term) ||
                (sub.created_at && new Date(sub.created_at).toLocaleDateString().includes(term));

            if (companyMatch) return true;

            const branchMatch = sub.branches.some(b => (b.branchName || '').toLowerCase().includes(term));
            if (branchMatch) return true;

            const mainMaintMatch = sub.maintenanceHistory.some(m => 
                m.maintenanceDate.includes(term) || 
                (getDisplayName(m) || '').toLowerCase().includes(term) ||
                (m.notes || '').toLowerCase().includes(term) ||
                (m.problems || []).join(' ').toLowerCase().includes(term)
            );
            if (mainMaintMatch) return true;

            const branchMaintMatch = sub.branches.some(b => 
                b.maintenanceHistory.some(m => 
                    m.maintenanceDate.includes(term) || 
                    (getDisplayName(m) || '').toLowerCase().includes(term) ||
                    (m.notes || '').toLowerCase().includes(term)
                )
            );
            if (branchMaintMatch) return true;

            const baristaMatch = sub.baristas.some(b => b.name.toLowerCase().includes(term)) ||
                                 sub.branches.some(br => br.baristas.some(b => b.name.toLowerCase().includes(term)));
            
            return baristaMatch;
        });
    }, [submissions, searchTerm, startDate, endDate, showOnlyProblems]);

    const activeFiltersCount = [startDate, endDate, showOnlyProblems].filter(Boolean).length;

    return (
        <div className="w-full max-w-6xl mx-auto">
             <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                 <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50">سجل الإرسالات</h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1 sm:mt-2">عرض أو تعديل أو حذف الإرسالات السابقة.</p>
                 </div>
                 <div className="flex items-center gap-x-2 sm:gap-x-4">
                    <button 
                        onClick={onPrint}
                        className="bg-white text-slate-700 font-bold py-2 px-4 sm:px-6 rounded-lg hover:bg-slate-50 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 transition-colors text-sm sm:text-base transform active:scale-95 flex items-center gap-2"
                    >
                        <PrinterIcon className="w-5 h-5" />
                        طباعة النموذج
                    </button>
                     <button 
                        onClick={handleDownloadAll}
                        disabled={submissions.length === 0}
                        className="bg-slate-600 text-white font-bold py-2 px-4 sm:px-6 rounded-lg hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base transform active:scale-95"
                    >
                        تنزيل الكل
                    </button>
                    <button 
                        onClick={onAddNew}
                        className="bg-teal-600 text-white font-bold py-2 px-4 sm:px-6 rounded-lg hover:bg-teal-700 transition-colors text-sm sm:text-base transform active:scale-95"
                    >
                        إضافة جديدة
                    </button>
                 </div>
            </header>

            {/* Advanced Search Panel */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-6 transition-all">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Text Search */}
                    <div className="flex-1">
                        <label htmlFor="submission-search" className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">بحث نصي</label>
                        <div className="relative rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" aria-hidden="true" />
                            </div>
                            <input
                                type="search"
                                id="submission-search"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 py-2.5 pl-10 pr-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                                placeholder="شركة، فرع، باريستا..."
                            />
                        </div>
                    </div>

                    {/* Filter Toggle Button (Mobile/Tablet) */}
                    <div className="lg:hidden">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold w-full justify-center transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-900/30 dark:border-teal-700 dark:text-teal-300' : 'bg-white border-slate-300 text-slate-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300'}`}
                        >
                            <FunnelIcon className="w-5 h-5" />
                            {showFilters ? 'إخفاء الفلاتر' : 'فلاتر متقدمة'}
                            {activeFiltersCount > 0 && <span className="bg-teal-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">{activeFiltersCount}</span>}
                        </button>
                    </div>

                    {/* Filters Section (Always visible on large screens, collapsible on small) */}
                    <div className={`flex-col lg:flex-row gap-4 lg:flex ${showFilters ? 'flex' : 'hidden'}`}>
                        {/* Date Range */}
                        <div className="flex gap-2">
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">من تاريخ</label>
                                <div className="relative">
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="block w-full sm:w-40 rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 py-2.5 px-3 text-slate-900 dark:text-white focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">إلى تاريخ</label>
                                <div className="relative">
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="block w-full sm:w-40 rounded-lg border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 py-2.5 px-3 text-slate-900 dark:text-white focus:border-teal-500 focus:ring-teal-500 sm:text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Toggles */}
                        <div className="flex items-end pb-1">
                            <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors select-none ${showOnlyProblems ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300' : 'bg-white border-slate-300 text-slate-600 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-400'}`}>
                                <input 
                                    type="checkbox" 
                                    checked={showOnlyProblems}
                                    onChange={(e) => setShowOnlyProblems(e.target.checked)}
                                    className="hidden"
                                />
                                <ExclamationTriangleIcon className="w-5 h-5" />
                                <span className="text-sm font-medium">به مشاكل</span>
                            </label>
                        </div>

                        {/* Clear Button */}
                        {(activeFiltersCount > 0 || searchTerm) && (
                            <div className="flex items-end pb-1">
                                <button 
                                    onClick={clearFilters}
                                    className="flex items-center gap-1 px-3 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors text-sm font-medium"
                                >
                                    <XMarkIcon className="w-4 h-4" /> مسح
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            {submissions.length === 0 ? (
                <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-black/5 dark:border-white/5">
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">لا توجد إرسالات حتى الآن.</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">اضغط "إضافة جديدة" للبدء.</p>
                </div>
            ) : filteredSubmissions.length === 0 ? (
                <div className="text-center bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-12 rounded-2xl shadow-xl border border-black/5 dark:border-white/5">
                    <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">لا توجد نتائج مطابقة</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-2">لا توجد إرسالات تطابق الفلاتر الحالية.</p>
                    <button onClick={clearFilters} className="mt-4 text-teal-600 dark:text-teal-400 font-semibold hover:underline">مسح جميع الفلاتر</button>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSubmissions.map(sub => (
                        <div key={sub.id} className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg rounded-lg p-4 sm:p-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between transition-all hover:shadow-xl dark:hover:bg-slate-700/80 border ${sub.pendingSync ? 'border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10' : 'border-black/5 dark:border-white/5'}`}>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{sub.companyName || 'شركة بدون اسم'}</h3>
                                    {sub.pendingSync && (
                                        <span className="inline-flex items-center rounded-md bg-amber-100 dark:bg-amber-900/50 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
                                            <CloudIcon className="w-3.5 h-3.5 mr-1" />
                                            بانتظار المزامنة
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
                                    <span>أُرسلت: {new Date(sub.created_at).toLocaleDateString()}</span>
                                    <span>•</span>
                                    <span>{sub.hasBranches ? `${sub.branches.length} فروع` : 'لا فروع'}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-4 self-end sm:self-center">
                                 <button 
                                    onClick={() => onViewDetails(sub)} 
                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full hover:bg-teal-50 dark:hover:bg-teal-500/10 transition-colors transform active:scale-95" 
                                    aria-label={`عرض التفاصيل لـ ${sub.companyName}`}
                                    title="عرض وتصدير التفاصيل"
                                >
                                    <EyeIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => handleDownloadSingle(sub)} 
                                    disabled={!!sub.pendingSync}
                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-full hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors transform active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed" 
                                    aria-label={`تنزيل ${sub.companyName}`}
                                    title={sub.pendingSync ? "لا يمكن التنزيل أثناء انتظار المزامنة" : "تنزيل JSON"}
                                >
                                    <ArrowDownTrayIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => handleQuickEditCompany(sub)} 
                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors transform active:scale-95" 
                                    aria-label={`تعديل سريع ${sub.companyName}`}
                                    title="تعديل سريع لمعلومات الشركة"
                                >
                                    <BuildingOfficeIcon className="h-5 w-5" />
                                </button>
                                <button 
                                    onClick={() => onEdit(sub)} 
                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600/50 transition-colors transform active:scale-95" 
                                    aria-label={`تعديل كامل ${sub.companyName}`}
                                    title="تعديل كامل (المعالج)"
                                >
                                    <PencilIcon className="h-5 w-5" />
                                </button>
                                {onEditMaintenance && (
                                    <button 
                                        onClick={() => onEditMaintenance(sub)} 
                                        className="p-2 text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-full hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors transform active:scale-95" 
                                        aria-label={`تعديل سجلات الصيانة لـ ${sub.companyName}`}
                                        title="تعديل سجلات الصيانة"
                                    >
                                        <WrenchScrewdriverIcon className="h-5 w-5" />
                                    </button>
                                )}
                                <button onClick={() => onDelete(sub.id!)} className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors transform active:scale-95" aria-label={`حذف ${sub.companyName}`}>
                                    <TrashIcon className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Company Edit Modal */}
            <CompanyEditModal
                isOpen={isCompanyEditModalOpen}
                onClose={() => {
                    setIsCompanyEditModalOpen(false);
                    setEditingCompany(null);
                }}
                company={editingCompany}
                onSave={handleSaveCompanyEdit}
            />
        </div>
    );
};

export default HistoryPage;