import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { FormData, MaintenanceRecord } from '../types';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  CalendarIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  WrenchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { StarRatingDisplay } from './form-ui/StarRating';
import EmptyState from './EmptyState';
import BulkExportModal, { BulkExportMode } from './BulkExportModal';
import { generateBatchReport, BatchExportItem } from '../utils/internalReportPdf';
import {
  getRecordCostSummary,
  resolvePartCost,
  resolveServiceCost,
  formatEnNumber,
} from '../utils/costAggregation';
import { partsList, servicesList } from '../constants';
import { exportToCSV, CSVColumn } from '../utils/importExport';

// ── Types ──

interface FlattenedRecord {
  record: MaintenanceRecord;
  companyId: number | string;
  companyName: string;
  branchName: string;
  branchId: number;
  isMainOffice: boolean;
}

interface GlobalRecordsPageProps {
  submissions: (FormData & { created_at: string })[];
  getTechnicianDisplayName?: (record: MaintenanceRecord) => string;
  isLoading?: boolean;
}

type SortField = 'date' | 'lastModified' | 'baristaName' | 'status' | 'rating' | 'serviceCount' | 'company' | 'branch';
type StatusFilter = 'solved' | 'problem' | 'routine';

const ITEMS_PER_PAGE = 15;

// ── Helpers ──

const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '-';
  const date = dateString.includes('T')
    ? new Date(dateString)
    : new Date(`${dateString}T12:00:00`);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleDateString('en-GB', { month: 'short' });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
};

const getStatusBadge = (rec: MaintenanceRecord) => {
  if (rec.problemSolved) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300">
        <CheckCircleIcon className="w-3 h-3" />
        Solved
      </span>
    );
  }
  if (rec.hadProblem) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-ember-50 text-ember-700 dark:bg-ember-500/10 dark:text-ember-300">
        <ExclamationCircleIcon className="w-3 h-3" />
        Problem
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-cream text-primary dark:bg-espresso-light dark:text-latte/70">
      <WrenchIcon className="w-3 h-3" />
      Routine
    </span>
  );
};

// ── Sortable column header ──

const SortableHeader: React.FC<{
  field: SortField;
  label: string;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  handleSort: (f: SortField) => void;
  className?: string;
}> = ({ field, label, sortBy, sortOrder, handleSort, className = '' }) => (
  <th className={`px-4 py-3 text-start text-xs font-medium uppercase tracking-wider ${className}`}>
    <button
      onClick={() => handleSort(field)}
      className={`inline-flex items-center gap-1 transition-colors rounded hover:text-primary dark:hover:text-primary-400 ${
        sortBy === field
          ? 'text-primary dark:text-primary-400 font-bold'
          : 'text-latte dark:text-latte'
      }`}
    >
      {label}
      {sortBy === field && (
        <span className="text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>
      )}
    </button>
  </th>
);

// ── Main Component ──

const GlobalRecordsPage: React.FC<GlobalRecordsPageProps> = ({
  submissions,
  getTechnicianDisplayName,
  isLoading,
}) => {
  // ── Filter State ──
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilters, setStatusFilters] = useState<Set<StatusFilter>>(new Set());
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<number | string>>(new Set());
  const [technicianFilter, setTechnicianFilter] = useState('');
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // ── Sort State ──
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  // ── Selection State ──
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSmartSelect, setShowSmartSelect] = useState(false);
  const [costMin, setCostMin] = useState('');
  const [costMax, setCostMax] = useState('');
  const [costBasis, setCostBasis] = useState<'total' | 'company'>('total');
  const [presetTech, setPresetTech] = useState('');

  // ── Flatten all records ──
  const allRecords = useMemo<FlattenedRecord[]>(() => {
    const result: FlattenedRecord[] = [];
    submissions.forEach((sub) => {
      // Main office records
      (sub.maintenanceHistory || []).forEach((rec) => {
        result.push({
          record: rec,
          companyId: sub.id!,
          companyName: sub.companyName || 'Unnamed Company',
          branchName: 'Main Office',
          branchId: -1,
          isMainOffice: true,
        });
      });
      // Branch records
      (sub.branches || []).forEach((branch) => {
        (branch.maintenanceHistory || []).forEach((rec) => {
          result.push({
            record: rec,
            companyId: sub.id!,
            companyName: sub.companyName || 'Unnamed Company',
            branchName: branch.branchName || 'Unnamed Branch',
            branchId: branch.id,
            isMainOffice: false,
          });
        });
      });
    });
    return result;
  }, [submissions]);

  // ── Unique filter options ──
  const companyOptions = useMemo(() => {
    const seen = new Map<number | string, string>();
    submissions.forEach((s) => { if (s.id) seen.set(s.id, s.companyName || 'Unnamed'); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [submissions]);

  const technicianOptions = useMemo(() => {
    const set = new Set<string>();
    allRecords.forEach((fr) => { if (fr.record.baristaName) set.add(fr.record.baristaName); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allRecords]);

  // ── Filtered + sorted records ──
  const filteredRecords = useMemo(() => {
    let filtered = [...allRecords];

    // Text search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((fr) => {
        const r = fr.record;
        return (
          fr.companyName.toLowerCase().includes(term) ||
          fr.branchName.toLowerCase().includes(term) ||
          (r.baristaName || '').toLowerCase().includes(term) ||
          (r.clientBaristaName || '').toLowerCase().includes(term) ||
          (r.notes || '').toLowerCase().includes(term) ||
          (r.problems || []).some((p) => p.toLowerCase().includes(term))
        );
      });
    }

    // Date range
    if (startDate) {
      filtered = filtered.filter((fr) => fr.record.maintenanceDate >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter((fr) => fr.record.maintenanceDate <= endDate);
    }

    // Status filter
    if (statusFilters.size > 0) {
      filtered = filtered.filter((fr) => {
        const r = fr.record;
        if (statusFilters.has('solved') && r.problemSolved) return true;
        if (statusFilters.has('problem') && r.hadProblem && !r.problemSolved) return true;
        if (statusFilters.has('routine') && !r.hadProblem) return true;
        return false;
      });
    }

    // Company filter
    if (selectedCompanyIds.size > 0) {
      filtered = filtered.filter((fr) => selectedCompanyIds.has(fr.companyId));
    }

    // Technician filter
    if (technicianFilter.trim()) {
      const term = technicianFilter.toLowerCase();
      filtered = filtered.filter((fr) =>
        (fr.record.baristaName || '').toLowerCase().includes(term)
      );
    }

    // Type filter
    if (typeFilters.size > 0) {
      filtered = filtered.filter((fr) => typeFilters.has(fr.record.type));
    }

    // Sort
    filtered.sort((a, b) => {
      const ra = a.record;
      const rb = b.record;
      let comparison = 0;
      switch (sortBy) {
        case 'date':
          comparison = new Date(ra.maintenanceDate).getTime() - new Date(rb.maintenanceDate).getTime();
          break;
        case 'lastModified':
          comparison = (new Date(ra.lastModified || ra.maintenanceDate).getTime()) -
                        (new Date(rb.lastModified || rb.maintenanceDate).getTime());
          break;
        case 'baristaName':
          comparison = (ra.baristaName || '').localeCompare(rb.baristaName || '');
          break;
        case 'status':
          comparison = Number(ra.problemSolved) - Number(rb.problemSolved);
          break;
        case 'rating':
          comparison = (ra.visitRating || 0) - (rb.visitRating || 0);
          break;
        case 'serviceCount':
          comparison = ra.servicesPerformed.length - rb.servicesPerformed.length;
          break;
        case 'company':
          comparison = a.companyName.localeCompare(b.companyName);
          break;
        case 'branch':
          comparison = a.branchName.localeCompare(b.branchName);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [allRecords, searchTerm, startDate, endDate, statusFilters, selectedCompanyIds, technicianFilter, typeFilters, sortBy, sortOrder]);

  // ── Pagination ──
  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = filteredRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, startDate, endDate, statusFilters, selectedCompanyIds, technicianFilter, typeFilters, sortBy, sortOrder]);

  // ── Selection helpers ──
  const keyOf = useCallback((fr: FlattenedRecord) => `${fr.companyId}-${fr.branchId}-${fr.record.id}`, []);

  const toggleSelection = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedKeys(new Set()), []);

  const selectedItems = useMemo<BatchExportItem[]>(
    () =>
      allRecords
        .filter((fr) => selectedKeys.has(keyOf(fr)))
        .map((fr) => ({
          record: fr.record,
          companyId: fr.companyId,
          companyName: fr.companyName,
          branchId: fr.branchId,
          branchName: fr.branchName,
        })),
    [allRecords, selectedKeys, keyOf],
  );

  const selectedTotalCost = useMemo(
    () => selectedItems.reduce((s, it) => s + getRecordCostSummary(it.record, partsList, servicesList).total, 0),
    [selectedItems],
  );

  // Page-level selection (header checkbox)
  const pageKeys = paginatedRecords.map(keyOf);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((k) => selectedKeys.has(k));
  const somePageSelected = pageKeys.some((k) => selectedKeys.has(k));

  const togglePageSelection = useCallback(() => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageKeys.forEach((k) => next.delete(k));
      } else {
        pageKeys.forEach((k) => next.add(k));
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPageSelected, pageKeys]);

  // Select everything matching the current filters (not just the visible page)
  const selectAllMatching = useCallback(() => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      filteredRecords.forEach((fr) => next.add(keyOf(fr)));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRecords, keyOf]);

  // ── Smart presets ("Grab" buttons that ADD matching records) ──
  const grabRecords = useCallback((pred: (fr: FlattenedRecord) => boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      filteredRecords.filter(pred).forEach((fr) => next.add(keyOf(fr)));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRecords, keyOf]);

  const companyCostOf = useCallback((r: MaintenanceRecord): number => {
    const parts = (r.partsReplaced || [])
      .filter((p) => !p.paidByClient)
      .reduce((s, p) => s + (p.count || 0) * resolvePartCost(p, partsList), 0);
    const services = (r.servicesPerformed || [])
      .filter((sv) => !sv.paidByClient)
      .reduce((s, sv) => s + (sv.count || 0) * resolveServiceCost(sv, servicesList), 0);
    return parts + services;
  }, []);

  const grabByCostRange = useCallback(() => {
    const min = costMin.trim() ? Number(costMin) : -Infinity;
    const max = costMax.trim() ? Number(costMax) : Infinity;
    if (isNaN(min) || isNaN(max)) return;
    grabRecords((fr) => {
      const cost = costBasis === 'company'
        ? companyCostOf(fr.record)
        : getRecordCostSummary(fr.record, partsList, servicesList).total;
      return cost >= min && cost <= max;
    });
  }, [costMin, costMax, costBasis, grabRecords, companyCostOf]);

  const grabTechnician = useCallback(() => {
    if (!presetTech) return;
    grabRecords((fr) => fr.record.baristaName === presetTech);
  }, [presetTech, grabRecords]);

  // ── Export handlers ──
  const handleExportPDF = useCallback(async (mode: BulkExportMode, grouped: boolean, includeSummary: boolean) => {
    if (selectedItems.length === 0) return;
    setIsGenerating(true);
    try {
      const doc = await generateBatchReport(selectedItems, {
        mode,
        grouped,
        includeSummaryTable: includeSummary,
        filterDescription: 'Selected records from All Records',
        batchTitle: 'Bulk Export',
      });
      const date = new Date().toISOString().slice(0, 10);
      doc.save(`bulk-export-${mode}-${date}.pdf`);
      setIsBulkOpen(false);
    } catch (err) {
      console.error('Bulk PDF export failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedItems]);

  const handleExportWord = useCallback(async (mode: BulkExportMode, grouped: boolean, includeSummary: boolean) => {
    if (selectedItems.length === 0) return;
    setIsGenerating(true);
    try {
      const { generateBatchWordReport, downloadWordDoc } = await import('../utils/wordExport');
      const doc = await generateBatchWordReport(selectedItems, {
        mode,
        grouped,
        includeSummaryTable: includeSummary,
        filterDescription: 'Selected records from All Records',
        batchTitle: 'Bulk Export',
      });
      const date = new Date().toISOString().slice(0, 10);
      await downloadWordDoc(doc, `bulk-export-${mode}-${date}.docx`);
      setIsBulkOpen(false);
    } catch (err) {
      console.error('Bulk Word export failed:', err);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedItems]);

  const handleExportCSV = useCallback(() => {
    if (selectedItems.length === 0) return;
    const columns: CSVColumn[] = [
      { header: 'Date', accessor: (it) => it.record.maintenanceDate },
      { header: 'Company', accessor: (it) => it.companyName },
      { header: 'Branch', accessor: (it) => it.branchName },
      { header: 'Technician', accessor: (it) => it.record.baristaName },
      { header: 'Type', accessor: (it) => it.record.type },
      { header: 'Had Problem', accessor: (it) => it.record.hadProblem ? 'Yes' : 'No' },
      { header: 'Problems', accessor: (it) => (it.record.problems || []).join('; ') },
      { header: 'Parts', accessor: (it) => (it.record.partsReplaced || []).map((p) => p.name).join('; ') },
      { header: 'Services', accessor: (it) => (it.record.servicesPerformed || []).map((s) => s.name).join('; ') },
      { header: 'Problem Solved', accessor: (it) => it.record.problemSolved ? 'Yes' : 'No' },
      { header: 'Paid By', accessor: (it) => it.record.paidBy },
      { header: 'Visit Zone', accessor: (it) => it.record.visitZone },
      { header: 'Rating', accessor: (it) => it.record.visitRating },
      { header: 'Cost (EGP)', accessor: (it) => getRecordCostSummary(it.record, partsList, servicesList).total },
      { header: 'Notes', accessor: (it) => it.record.notes },
    ];
    exportToCSV(selectedItems, columns, `bulk-export-${new Date().toISOString().slice(0, 10)}.csv`);
  }, [selectedItems]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder(field === 'baristaName' || field === 'company' || field === 'branch' ? 'asc' : 'desc');
    }
  };

  const toggleStatus = (s: StatusFilter) => {
    setStatusFilters((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  };
  const toggleType = (t: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      next.has(t) ? next.delete(t) : next.add(t);
      return next;
    });
  };
  const toggleCompany = (id: number | string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeFilterCount = [
    startDate, endDate, technicianFilter,
    statusFilters.size > 0, typeFilters.size > 0,
    selectedCompanyIds.size > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearchTerm('');
    setStartDate('');
    setEndDate('');
    setStatusFilters(new Set());
    setSelectedCompanyIds(new Set());
    setTechnicianFilter('');
    setTypeFilters(new Set());
  };

  const renderCheckbox = (checked: boolean, onChange: () => void, indeterminate = false, label = 'Select record') => (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = indeterminate; }}
      onChange={(e) => { e.stopPropagation(); onChange(); }}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="w-4 h-4 rounded border-hairline text-primary focus:ring-primary/30 cursor-pointer shrink-0"
    />
  );

  return (
    <div className="w-full max-w-7xl mx-auto pb-28">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text">All Records</h1>
          <p className="text-latte mt-1">
            {filteredRecords.length === 0 ? 'No records' : `${filteredRecords.length} records across ${submissions.length} companies`}
          </p>
        </div>
        <button
          onClick={() => setShowSmartSelect((v) => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-semibold shrink-0 transition-colors self-start sm:self-auto ${
            showSmartSelect
              ? 'bg-primary/10 border-primary text-primary'
              : 'bg-cream dark:bg-espresso border-hairline text-latte hover:bg-surface-elevated'
          }`}
        >
          <SparklesIcon className="w-5 h-5" />
          Smart Select
        </button>
      </header>

      {/* Smart Select panel */}
      {showSmartSelect && (
        <div className="bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline p-4 mb-6 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-sm font-bold text-primary dark:text-white flex items-center gap-1.5">
              <SparklesIcon className="w-4 h-4" />
              Grab matching records
            </h2>
            {selectedKeys.size > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs font-medium text-latte hover:text-ember-600 underline transition-colors"
              >
                Clear selection ({selectedKeys.size})
              </button>
            )}
          </div>

          {/* Preset grab buttons */}
          <div className="flex flex-wrap gap-2 mb-4">
            <PresetButton onClick={() => grabRecords((fr) => fr.record.type === 'requested')} label="Requested" />
            <PresetButton onClick={() => grabRecords((fr) => fr.record.type === 'scheduled')} label="Scheduled" />
            <PresetButton onClick={() => grabRecords((fr) => fr.record.hadProblem && fr.record.problemSolved)} label="Resolved" />
            <PresetButton onClick={() => grabRecords((fr) => fr.record.hadProblem && !fr.record.problemSolved)} label="Unresolved" />
            <PresetButton onClick={() => grabRecords((fr) => fr.record.visitRating != null && fr.record.visitRating > 0 && fr.record.visitRating <= 2)} label="Rated ≤ 2★" />
            <PresetButton onClick={() => grabRecords((fr) => !fr.record.visitRating || fr.record.visitRating === 0)} label="Unrated" />
            <PresetButton onClick={selectAllMatching} label={`Select all ${filteredRecords.length} matching`} accent />
          </div>

          {/* Cost range */}
          <div className="flex flex-wrap items-center gap-3 border-t border-hairline dark:border-hairline pt-4">
            <span className="text-xs font-bold uppercase text-latte">Cost range</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={costMin}
                onChange={(e) => setCostMin(e.target.value)}
                placeholder="Min"
                className="input-base w-24 px-3 py-1.5 text-sm"
              />
              <span className="text-latte text-sm">to</span>
              <input
                type="number"
                min="0"
                value={costMax}
                onChange={(e) => setCostMax(e.target.value)}
                placeholder="Max"
                className="input-base w-24 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex rounded-lg border border-hairline dark:border-hairline overflow-hidden">
              {(['total', 'company'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setCostBasis(b)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    costBasis === b
                      ? 'bg-primary text-white'
                      : 'bg-cream dark:bg-espresso text-latte hover:bg-surface-elevated'
                  }`}
                >
                  {b === 'total' ? 'Total cost' : 'Company cost'}
                </button>
              ))}
            </div>
            <button
              onClick={grabByCostRange}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-hover transition-colors"
            >
              Grab by cost
            </button>
            <span className="text-[11px] text-latte">Company cost = company-paid parts + services</span>
          </div>

          {/* Technician batch */}
          <div className="flex flex-wrap items-center gap-3 border-t border-hairline dark:border-hairline pt-4 mt-4">
            <span className="text-xs font-bold uppercase text-latte">Technician</span>
            <select
              value={presetTech}
              onChange={(e) => setPresetTech(e.target.value)}
              className="input-base px-3 py-1.5 text-sm max-w-[220px]"
            >
              <option value="">Pick a technician…</option>
              {technicianOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <button
              onClick={grabTechnician}
              disabled={!presetTech}
              className="px-4 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Grab tech's visits
            </button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {(activeFilterCount > 0 || searchTerm) && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {searchTerm && (
            <Chip icon={<MagnifyingGlassIcon className="w-3 h-3" />} label={searchTerm} onRemove={() => setSearchTerm('')} />
          )}
          {startDate && <Chip icon={<CalendarIcon className="w-3 h-3" />} label={`From ${startDate}`} onRemove={() => setStartDate('')} />}
          {endDate && <Chip icon={<CalendarIcon className="w-3 h-3" />} label={`To ${endDate}`} onRemove={() => setEndDate('')} />}
          {technicianFilter && <Chip icon={<UserIcon className="w-3 h-3" />} label={technicianFilter} onRemove={() => setTechnicianFilter('')} />}
          {([...statusFilters] as StatusFilter[]).map((s) => (
            <Chip key={s} label={s.charAt(0).toUpperCase() + s.slice(1)} onRemove={() => toggleStatus(s)} kind="status" />
          ))}
          {[...typeFilters].map((t) => (
            <Chip key={t} label={t} onRemove={() => toggleType(t)} />
          ))}
          {[...selectedCompanyIds].map((id) => (
            <Chip key={String(id)} label={companyOptions.find((c) => c.id === id)?.name || String(id)} onRemove={() => toggleCompany(id)} kind="company" />
          ))}
          <button onClick={clearFilters} className="text-xs font-medium text-latte hover:text-primary underline transition-colors">
            Clear all
          </button>
        </div>
      )}

      {/* Search + Filter Panel */}
      <div className="bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 h-5 w-5 text-latte" />
              <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-base ps-10"
                placeholder="Search company, branch, technician, notes..."
              />
            </div>
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm font-semibold shrink-0 transition-colors h-[50px] ${
              showFilters || activeFilterCount > 0
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-cream dark:bg-espresso border-hairline text-latte hover:bg-surface-elevated'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="flex flex-wrap gap-4 pt-4 mt-4 border-t border-hairline dark:border-hairline animate-fade-in">
            {/* Date range */}
            <FilterGroup label="Date Range">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-base w-full sm:w-[160px]" />
              <span className="text-latte text-sm">to</span>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-base w-full sm:w-[160px]" />
            </FilterGroup>

            {/* Status */}
            <FilterGroup label="Status">
              <div className="flex gap-1 flex-wrap">
                {(['solved', 'problem', 'routine'] as StatusFilter[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => toggleStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      statusFilters.has(s)
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-cream dark:bg-espresso border border-hairline text-latte hover:bg-surface-elevated'
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </FilterGroup>

            {/* Type */}
            <FilterGroup label="Visit Type">
              <div className="flex gap-1">
                {['scheduled', 'requested'].map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      typeFilters.has(t)
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-cream dark:bg-espresso border border-hairline text-latte hover:bg-surface-elevated'
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </FilterGroup>

            {/* Technician */}
            <FilterGroup label="Technician">
              <input
                type="text"
                value={technicianFilter}
                onChange={(e) => setTechnicianFilter(e.target.value)}
                className="input-base w-full sm:w-[200px]"
                placeholder="Filter by name..."
              />
            </FilterGroup>

            {/* Company multi-select */}
            <FilterGroup label="Company">
              <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                {companyOptions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCompany(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      selectedCompanyIds.has(c.id)
                        ? 'bg-primary/10 text-primary border border-primary/30'
                        : 'bg-cream dark:bg-espresso border border-hairline text-latte hover:bg-surface-elevated'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </FilterGroup>
          </div>
        )}
      </div>

      {/* Records Table */}
      <div className="bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-latte">Loading records...</div>
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon={<WrenchScrewdriverIcon className="w-10 h-10" />}
            title="No records found"
            message="Try adjusting your search or filters."
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto invisible-scrollbar">
              <table className="w-full">
                <thead className="bg-cream dark:bg-espresso/50 border-b border-hairline dark:border-hairline">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      {renderCheckbox(allPageSelected, togglePageSelection, somePageSelected && !allPageSelected, 'Select all on page')}
                    </th>
                    <SortableHeader field="date" label="Date" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                    <SortableHeader field="company" label="Company" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                    <SortableHeader field="branch" label="Branch" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                    <SortableHeader field="baristaName" label="Technician" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                    <SortableHeader field="status" label="Status" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                    <SortableHeader field="rating" label="Rating" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                    <SortableHeader field="serviceCount" label="Services" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                    <SortableHeader field="lastModified" label="Modified" sortBy={sortBy} sortOrder={sortOrder} handleSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {paginatedRecords.map((fr) => {
                    const key = keyOf(fr);
                    const isSelected = selectedKeys.has(key);
                    return (
                      <tr
                        key={key}
                        onClick={() => toggleSelection(key)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-primary/5 dark:bg-primary/10'
                            : 'hover:bg-cream dark:hover:bg-espresso-light/50'
                        }`}
                      >
                        <td className="px-4 py-3 w-10">
                          {renderCheckbox(isSelected, () => toggleSelection(key), false, `Select record ${formatDate(fr.record.maintenanceDate)}`)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-latte shrink-0" />
                            <span className="text-sm text-primary dark:text-white">{formatDate(fr.record.maintenanceDate)}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <BuildingOfficeIcon className="w-4 h-4 text-latte shrink-0" />
                            <span className="text-sm text-primary dark:text-white truncate max-w-[140px]">{fr.companyName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <MapPinIcon className="w-4 h-4 text-latte shrink-0" />
                            <span className="text-sm text-primary dark:text-white truncate max-w-[120px]">{fr.branchName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <UserIcon className="w-4 h-4 text-latte shrink-0" />
                            <span className="text-sm text-primary dark:text-white truncate max-w-[120px]">
                              {getTechnicianDisplayName
                                ? getTechnicianDisplayName(fr.record)
                                : fr.record.baristaName || '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{getStatusBadge(fr.record)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {fr.record.visitRating ? <StarRatingDisplay value={fr.record.visitRating} size="xs" /> : <span className="text-latte text-sm">-</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-primary dark:text-latte">
                            {fr.record.servicesPerformed.length > 0 ? `${fr.record.servicesPerformed.length} svc` : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <ClockIcon className="w-3.5 h-3.5 text-latte shrink-0" />
                            <span className="text-xs text-latte dark:text-latte">{formatDate(fr.record.lastModified)}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3 p-3">
              {paginatedRecords.map((fr) => {
                const key = keyOf(fr);
                const isSelected = selectedKeys.has(key);
                return (
                  <div
                    key={key}
                    onClick={() => toggleSelection(key)}
                    className={`cursor-pointer bg-cream dark:bg-espresso-light rounded-xl border p-4 shadow-sm transition-colors ${
                      isSelected
                        ? 'border-primary ring-1 ring-primary/30'
                        : 'border-hairline dark:border-hairline'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {renderCheckbox(isSelected, () => toggleSelection(key), false, `Select record ${formatDate(fr.record.maintenanceDate)}`)}
                        <CalendarIcon className="w-4 h-4 text-latte shrink-0" />
                        <span className="text-sm font-medium text-primary dark:text-white">{formatDate(fr.record.maintenanceDate)}</span>
                      </div>
                      {getStatusBadge(fr.record)}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-latte">
                      <span className="flex items-center gap-1"><BuildingOfficeIcon className="w-3 h-3" />{fr.companyName}</span>
                      <span className="flex items-center gap-1"><MapPinIcon className="w-3 h-3" />{fr.branchName}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-latte">
                      <UserIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="text-primary dark:text-white truncate">
                        {getTechnicianDisplayName ? getTechnicianDisplayName(fr.record) : fr.record.baristaName || '-'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {fr.record.visitRating ? <StarRatingDisplay value={fr.record.visitRating} size="xs" /> : <span className="text-latte text-xs">-</span>}
                        <span className="text-xs text-latte">{fr.record.servicesPerformed.length} svc</span>
                      </div>
                      {fr.record.lastModified && (
                        <span className="text-[10px] text-latte/70">Edited {formatDate(fr.record.lastModified)}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-hairline dark:border-hairline bg-cream dark:bg-espresso/50 flex items-center justify-between">
                <span className="text-sm text-latte">
                  {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredRecords.length)} of {filteredRecords.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-hairline text-primary dark:text-latte hover:bg-cream-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    const start = Math.max(1, Math.min(currentPage - 3, totalPages - 6));
                    const page = start + i;
                    if (page > totalPages) return null;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[36px] px-2 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page ? 'bg-hover text-white' : 'border border-hairline text-primary dark:text-latte hover:bg-cream-2'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-hairline text-primary dark:text-latte hover:bg-cream-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Sticky selection bar */}
      {selectedKeys.size > 0 && (
        <div className="fixed bottom-5 inset-x-0 z-50 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-4 bg-primary text-white rounded-2xl shadow-2xl px-5 py-3 animate-fade-in max-w-full flex-wrap justify-center">
            <span className="text-sm font-bold whitespace-nowrap">{selectedKeys.size} selected</span>
            <span className="hidden sm:inline text-white/70">·</span>
            <span className="text-sm font-semibold whitespace-nowrap">
              Total cost: <span className="font-bold">EGP {formatEnNumber(selectedTotalCost)}</span>
            </span>
            <div className="flex items-center gap-2 ms-1">
              <button
                onClick={() => setIsBulkOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold text-primary bg-white hover:bg-cream transition-colors"
              >
                <DocumentArrowDownIcon className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={clearSelection}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white/90 hover:bg-white/15 transition-colors"
                aria-label="Clear selection"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk export modal */}
      <BulkExportModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        items={selectedItems}
        isGenerating={isGenerating}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onExportWord={handleExportWord}
      />
    </div>
  );
};

// ── Sub-components ──

const FilterGroup: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-bold uppercase text-latte">{label}</span>
    <div className="flex items-center gap-2">{children}</div>
  </div>
);

const Chip: React.FC<{
  icon?: React.ReactNode;
  label: string;
  onRemove: () => void;
  kind?: 'status' | 'company';
}> = ({ icon, label, onRemove, kind }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
    kind === 'status' ? 'bg-ember-500/20 text-ember-700 dark:text-ember-300' :
    kind === 'company' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
    'bg-cream-2 dark:bg-espresso-light text-primary dark:text-latte'
  }`}>
    {icon}
    {label}
    <button onClick={onRemove} className="ms-0.5 hover:text-ember-500 transition-colors">
      <XMarkIcon className="w-3 h-3" />
    </button>
  </span>
);

const PresetButton: React.FC<{ onClick: () => void; label: string; accent?: boolean }> = ({ onClick, label, accent }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-150 hover:-translate-y-0.5 ${
      accent
        ? 'bg-primary text-white hover:bg-hover shadow-md hover:shadow-lg'
        : 'bg-white dark:bg-espresso-light border border-hairline dark:border-hairline text-primary dark:text-latte hover:border-primary/40 hover:text-primary dark:hover:text-white'
    }`}
  >
    {label}
  </button>
);

export default GlobalRecordsPage;
