import React, { useState, useMemo } from 'react';
import { FormData, MaintenanceRecord } from '../types';
import { PencilIcon, TrashIcon, ArrowDownTrayIcon, MagnifyingGlassIcon, PrinterIcon, CloudIcon, EyeIcon, FunnelIcon, XMarkIcon, CalendarIcon, ExclamationTriangleIcon, BuildingOfficeIcon, WrenchScrewdriverIcon, DocumentIcon, EllipsisVerticalIcon } from '@heroicons/react/24/outline';
import CompanyEditModal from './CompanyEditModal';
import EmptyState from './EmptyState';
import { SkeletonCard } from './ui/Skeleton';
import Button from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';

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
    isLoading?: boolean;
}

const HistoryPage: React.FC<HistoryPageProps> = ({ submissions, onEdit, onDelete, onAddNew, onPrint, onViewDetails, onUpdateCompany, onEditMaintenance, getTechnicianDisplayName, isLoading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [showOnlyProblems, setShowOnlyProblems] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [editingCompany, setEditingCompany] = useState<FormData | null>(null);
    const [isCompanyEditModalOpen, setIsCompanyEditModalOpen] = useState(false);
    const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm: () => void; message: string } | null>(null);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const handleDelete = (id: number) => {
        setConfirmState({
            open: true,
            message: "هل أنت متأكد من حذف هذه الشركة وسجلات صيانتها؟",
            onConfirm: () => {
                onDelete(id);
                setConfirmState(null);
            }
        });
    };

    const getTotalVisits = (sub: FormData): number => {
        const countRecords = (records: MaintenanceRecord[]): number =>
            records.reduce((acc, r) => acc + 1 + (r.followUpVisits ? countRecords(r.followUpVisits) : 0), 0);
        return countRecords(sub.maintenanceHistory || []) + sub.branches.reduce((acc, b) => acc + countRecords(b.maintenanceHistory || []), 0);
    };

    const getLastMaintenanceDate = (sub: FormData): string | null => {
        const dates: string[] = [];
        const collect = (records: MaintenanceRecord[]) => {
            records.forEach((r) => {
                if (r.maintenanceDate) dates.push(r.maintenanceDate);
                if (r.followUpVisits) collect(r.followUpVisits);
            });
        };
        collect(sub.maintenanceHistory || []);
        sub.branches.forEach((b) => collect(b.maintenanceHistory || []));
        if (dates.length === 0) return null;
        return dates.sort().reverse()[0];
    };

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
                    <h1 className="text-2xl sm:text-3xl font-bold text-ink">سجل الإرسالات</h1>
                    <p className="text-latte mt-1 sm:mt-2">عرض أو تعديل أو حذف الإرسالات السابقة.</p>
                 </div>
                 <div className="flex items-center gap-x-2 sm:gap-x-3">
                    <Button variant="secondary" onClick={onPrint}>
                        <PrinterIcon className="w-5 h-5" />
                        طباعة
                    </Button>
                     <Button variant="secondary" onClick={handleDownloadAll} disabled={submissions.length === 0}>
                        <ArrowDownTrayIcon className="w-5 h-5" />
                        تنزيل
                    </Button>
                    <Button onClick={onAddNew}>
                        إضافة شركة
                    </Button>
                 </div>
            </header>

            {/* Active filter chips */}
            {(activeFiltersCount > 0 || searchTerm) && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {searchTerm && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cream-2 text-ink">
                            <MagnifyingGlassIcon className="w-3 h-3" />
                            {searchTerm}
                        </span>
                    )}
                    {startDate && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cream-2 text-ink">
                            <CalendarIcon className="w-3 h-3" />
                            من {startDate}
                        </span>
                    )}
                    {endDate && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cream-2 text-ink">
                            <CalendarIcon className="w-3 h-3" />
                            إلى {endDate}
                        </span>
                    )}
                    {showOnlyProblems && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-ember-500/20 text-ember-700">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            به مشاكل
                        </span>
                    )}
                    <button
                        onClick={clearFilters}
                        className="text-xs font-medium text-latte hover:text-ink underline transition-colors"
                    >
                        مسح جميع الفلاتر
                    </button>
                </div>
            )}

            {/* Advanced Search Panel */}
            <div className="bg-cream rounded-xl shadow-sm border border-hairline p-4 mb-6">
                <div className="flex flex-col gap-4 w-full">
                    {/* Top Row: Search & Toggle */}
                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-4 items-end w-full">
                        <div className="w-full">
                            <label htmlFor="submission-search" className="block text-xs font-bold uppercase text-latte mb-1">بحث نصي</label>
                            <div className="relative rounded-md shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                    <MagnifyingGlassIcon className="h-5 w-5 text-latte" aria-hidden="true" />
                                </div>
                                <input
                                    type="search"
                                    id="submission-search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-base pl-10"
                                    placeholder="شركة، فرع، باريستا..."
                                />
                            </div>
                        </div>

                        {/* Filter Toggle Button */}
                        <div className="w-full shrink-0">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 h-[50px] rounded-lg border text-sm font-semibold w-full justify-center transition-colors ${showFilters || activeFiltersCount > 0 ? 'bg-copper-500/10 border-copper-500 text-copper-700' : 'bg-cream border-hairline text-latte hover:bg-cream-2'}`}
                            >
                                <FunnelIcon className="w-5 h-5" />
                                {showFilters ? 'إخفاء الفلاتر' : 'فلاتر متقدمة'}
                                {activeFiltersCount > 0 && <span className="bg-copper-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-1">{activeFiltersCount}</span>}
                            </button>
                        </div>
                    </div>

                    {/* Filters Section (Collapsible) */}
                    {showFilters && (
                        <div className="flex flex-wrap items-end gap-4 pt-4 mt-2 border-t border-hairline animate-fade-in w-full">
                            {/* Date Range */}
                            <div className="w-full sm:w-auto flex-1 sm:flex-none">
                                <label className="block text-xs font-bold uppercase text-latte mb-1">من تاريخ</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="input-base w-full sm:w-[180px]"
                                />
                            </div>
                            <div className="w-full sm:w-auto flex-1 sm:flex-none">
                                <label className="block text-xs font-bold uppercase text-latte mb-1">إلى تاريخ</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="input-base w-full sm:w-[180px]"
                                />
                            </div>

                            {/* Toggles */}
                            <div className="w-full sm:w-auto shrink-0">
                                <label className={`flex items-center justify-center gap-2 h-[50px] px-6 rounded-lg cursor-pointer border transition-colors select-none ${showOnlyProblems ? 'bg-copper-500/10 border-copper-500 text-copper-700' : 'bg-cream border-hairline text-latte hover:bg-cream-2'}`}>
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

                            {/* Spacer to push clear button to the end if needed */}
                            <div className="hidden sm:block flex-1"></div>

                            {/* Clear Button */}
                            {(activeFiltersCount > 0 || searchTerm) && (
                                <div className="w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
                                    <button
                                        onClick={clearFilters}
                                        disabled={activeFiltersCount === 0 && !searchTerm}
                                        className="flex items-center justify-center gap-2 h-[50px] px-6 text-latte hover:text-copper-500 transition-colors text-sm font-medium rounded-lg hover:bg-copper-500/10 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed border border-transparent hover:border-copper-500/30"
                                    >
                                        <XMarkIcon className="w-5 h-5" /> مسح الفلاتر
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            {isLoading && submissions.length === 0 ? (
                <div className="space-y-4">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            ) : submissions.length === 0 ? (
                <div className="mt-8">
                    <EmptyState
                        variant="primary"
                        icon={<DocumentIcon />}
                        title="لا توجد سجلات بعد"
                        message="نظام إدارة الصيانة فارغ حالياً. قم بإضافة أول شركة أو فرع للبدء بتسجيل بيانات وتقارير الصيانة."
                    >
                        <Button onClick={onAddNew}>
                            <BuildingOfficeIcon className="w-5 h-5" />
                            إضافة شركة جديدة
                        </Button>
                    </EmptyState>
                </div>
            ) : filteredSubmissions.length === 0 ? (
                <div className="mt-8">
                    <EmptyState
                        variant="search"
                        icon={<MagnifyingGlassIcon />}
                        title="لم يتم العثور على نتائج"
                        message="لا توجد شركات أو إرسالات تطابق الفلاتر وعمليات البحث الحالية. حاول تغيير كلمات البحث أو تواريخ الفلتر."
                    >
                        <Button variant="secondary" onClick={clearFilters}>
                            <XMarkIcon className="w-4 h-4" />
                            مسح جميع الفلاتر
                        </Button>
                    </EmptyState>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSubmissions.map(sub => (
                        <div
                            key={sub.id}
                            className={`bg-cream rounded-xl p-4 sm:p-5 flex flex-col gap-4 transition-all hover:shadow-md border ${sub.pendingSync ? 'border-amber-500/30 bg-amber-500/10' : 'border-hairline'}`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center flex-wrap gap-2">
                                        <h3 className="font-bold text-lg text-ink truncate">{sub.companyName || 'شركة بدون اسم'}</h3>
                                        {sub.pendingSync && (
                                            <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-500 border border-amber-500/20">
                                                <CloudIcon className="w-3.5 h-3.5 mr-1" />
                                                بانتظار المزامنة
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-latte">
                                        <span>أُرسلت: {new Date(sub.created_at).toLocaleDateString()}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span>{sub.hasBranches ? `${sub.branches.length} فروع` : 'لا فروع'}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span>{getTotalVisits(sub)} زيارة</span>
                                        {getLastMaintenanceDate(sub) && (
                                            <>
                                                <span className="hidden sm:inline">•</span>
                                                <span>آخر صيانة: {getLastMaintenanceDate(sub)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Desktop actions */}
                                <div className="hidden sm:flex items-center gap-1 self-center">
                                    <Button variant="secondary" onClick={() => onViewDetails(sub)} className="text-sm py-2 px-3">
                                        <EyeIcon className="h-4 w-4" />
                                        عرض
                                    </Button>
                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === sub.id ? null : sub.id!)}
                                            className="p-2 rounded-lg text-latte hover:text-ink hover:bg-cream-2 transition-colors"
                                            aria-label="المزيد من الإجراءات"
                                            aria-expanded={openMenuId === sub.id}
                                        >
                                            <EllipsisVerticalIcon className="h-5 w-5" />
                                        </button>
                                        {openMenuId === sub.id && (
                                            <div className="absolute left-0 top-full mt-1 w-48 bg-cream rounded-lg shadow-lg border border-hairline py-1 z-20 animate-scale-in">
                                                <button
                                                    onClick={() => { handleDownloadSingle(sub); setOpenMenuId(null); }}
                                                    disabled={!!sub.pendingSync}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-cream-2 disabled:opacity-50"
                                                >
                                                    <ArrowDownTrayIcon className="h-4 w-4" />
                                                    تنزيل JSON
                                                </button>
                                                <button
                                                    onClick={() => { handleQuickEditCompany(sub); setOpenMenuId(null); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-cream-2"
                                                >
                                                    <BuildingOfficeIcon className="h-4 w-4" />
                                                    تعديل سريع
                                                </button>
                                                <button
                                                    onClick={() => { onEdit(sub); setOpenMenuId(null); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-cream-2"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                    تعديل كامل
                                                </button>
                                                {onEditMaintenance && (
                                                    <button
                                                        onClick={() => { onEditMaintenance(sub); setOpenMenuId(null); }}
                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-cream-2"
                                                    >
                                                        <WrenchScrewdriverIcon className="h-4 w-4" />
                                                        تعديل الصيانة
                                                    </button>
                                                )}
                                                <div className="border-t border-hairline my-1" />
                                                <button
                                                    onClick={() => { handleDelete(sub.id!); setOpenMenuId(null); }}
                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ember-500 hover:bg-ember-500/10"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                    حذف
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Mobile actions */}
                                <div className="flex sm:hidden items-center gap-2 self-stretch">
                                    <Button variant="secondary" onClick={() => onViewDetails(sub)} className="flex-1 justify-center">
                                        <EyeIcon className="h-4 w-4" />
                                        عرض
                                    </Button>
                                    <Button variant="secondary" onClick={() => onEdit(sub)} className="flex-1 justify-center">
                                        <PencilIcon className="h-4 w-4" />
                                        تعديل
                                    </Button>
                                    {onEditMaintenance && (
                                        <Button variant="secondary" onClick={() => onEditMaintenance(sub)} className="flex-1 justify-center">
                                            <WrenchScrewdriverIcon className="h-4 w-4" />
                                            صيانة
                                        </Button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(sub.id!)}
                                        className="p-2 rounded-lg border border-ember-500/30 text-ember-500 hover:bg-ember-500/10"
                                        aria-label="حذف"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
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

            <ConfirmDialog
                isOpen={confirmState?.open ?? false}
                title="تأكيد الحذف"
                message={confirmState?.message ?? ''}
                variant="danger"
                onConfirm={() => confirmState?.onConfirm()}
                onCancel={() => setConfirmState(null)}
            />
        </div>
    );
};

export default HistoryPage;