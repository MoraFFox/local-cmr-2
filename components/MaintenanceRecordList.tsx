import React, { useState } from 'react';
import { MaintenanceRecord } from '../types';
import type { Translations } from '../utils/i18n';
import { useT } from '../utils/i18n';
import {
  PencilIcon, 
  CheckCircleIcon,
  CalendarIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  WrenchIcon,
  WrenchScrewdriverIcon,
  TruckIcon
} from '@heroicons/react/24/outline';
import { StarRatingDisplay } from './form-ui/StarRating';
import QuickActionsMenu from './QuickActionsMenu';
import EmptyState from './EmptyState';

interface MaintenanceRecordListProps {
  records: MaintenanceRecord[];
  branchName: string;
  onEdit: (record: MaintenanceRecord, index: number) => void;
  onQuickUpdate: (recordId: MaintenanceRecord['id'], updates: Partial<MaintenanceRecord>) => void;
  onDelete?: (recordId: MaintenanceRecord['id'], recordIndex: number) => void;
}

const ITEMS_PER_PAGE = 10;

// Sort fields available for column-header click sorting.
type SortField = 'date' | 'lastModified' | 'baristaName' | 'status' | 'rating' | 'serviceCount';

// Memoized date formatter with caching. Handles both 'YYYY-MM-DD' and
// ISO-8601 timestamp strings so maintenanceDate and lastModified share
// one display helper.
const createDateFormatter = () => {
  const cache = new Map<string, string>();
  return (dateString: string | undefined) => {
    if (!dateString) return '-';
    if (cache.has(dateString)) {
      return cache.get(dateString)!;
    }
    // ISO strings include 'T' or end with 'Z' — parse directly.
    const date = dateString.includes('T')
      ? new Date(dateString)
      : new Date(`${dateString}T12:00:00`);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleDateString('en-GB', { month: 'short' });
    const year = date.getFullYear();
    const formatted = `${day} ${month} ${year}`;
    cache.set(dateString, formatted);
    return formatted;
  };
};

const formatDate = createDateFormatter();

// Hoisted so both the desktop table row and the mobile card reuse them.
const getStatusBadge = (rec: MaintenanceRecord, t: Translations) => {
  if (rec.isLogisticsVisit) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300/60 dark:border-amber-500/40">
        <TruckIcon className="w-3 h-3" />
        {t.ui.records.logisticsBadge}
      </span>
    );
  }
  if (rec.problemSolved) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300">
        <CheckCircleIcon className="w-3 h-3" />
        {t.ui.records.solvedBadge}
      </span>
    );
  } else if (rec.hadProblem) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-ember-50 text-ember-700 dark:bg-ember-500/10 dark:text-ember-300">
        <ExclamationCircleIcon className="w-3 h-3" />
        {t.ui.records.problemBadge}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream text-primary dark:bg-espresso-light dark:text-latte/70">
      <WrenchIcon className="w-3 h-3" />
      {t.ui.records.routineBadge}
    </span>
  );
};

const renderStars = (rating: number | undefined) => {
  if (!rating) return <span className="text-latte dark:text-latte text-sm">-</span>;
  return <StarRatingDisplay value={rating} size="xs" />;
};

// Reusable clickable column header with sort indicator.
const SortableHeader: React.FC<{
  field: SortField;
  label: string;
  sortBy: SortField;
  sortOrder: 'asc' | 'desc';
  sortArrow: (f: SortField) => React.ReactNode;
  handleSort: (f: SortField) => void;
}> = ({ field, label, sortBy, sortOrder, sortArrow, handleSort }) => (
  <th className="px-6 py-3 text-start text-xs font-medium uppercase tracking-wider">
    <button
      onClick={() => handleSort(field)}
      className={`inline-flex items-center gap-1 transition-colors rounded hover:text-primary dark:hover:text-primary-400 ${
        sortBy === field
          ? 'text-primary dark:text-primary-400 font-bold'
          : 'text-latte dark:text-latte'
      }`}
    >
      {label}
      {sortArrow(field)}
    </button>
  </th>
);

// Fix 4.5: Extract and memoize the row component
interface MaintenanceRecordRowProps {
  record: MaintenanceRecord;
  actualIndex: number;
  t: Translations;
  onEdit: (record: MaintenanceRecord, index: number) => void;
  onQuickUpdate: (recordId: MaintenanceRecord['id'], updates: Partial<MaintenanceRecord>) => void;
  onDelete?: (recordId: MaintenanceRecord['id'], recordIndex: number) => void;
}

const MaintenanceRecordRow = React.memo(({
  record,
  actualIndex,
  t,
  onEdit,
  onQuickUpdate,
  onDelete
}: MaintenanceRecordRowProps) => {
  const handleDelete = () => onDelete?.(record.id, actualIndex);
  return (
    <tr className={`hover:bg-cream dark:hover:bg-espresso-light/50/50 transition-colors ${record.isLogisticsVisit ? 'bg-amber-50/70 dark:bg-amber-500/5' : ''}`}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-latte" />
          <span className="text-sm text-primary dark:text-white">
            {formatDate(record.maintenanceDate)}
          </span>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-latte" />
          <span className="text-sm text-primary dark:text-white">
            {record.baristaName || '-'}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-primary dark:text-white">
          {record.clientBaristaName || '-'}
        </span>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        {getStatusBadge(record, t)}
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        {renderStars(record.visitRating)}
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-primary dark:text-latte">
          {record.servicesPerformed.length > 0 ? (
            <span>{t.ui.records.servicesCount.replace('{{count}}', String(record.servicesPerformed.length))}</span>
          ) : (
            <span className="text-latte">{t.ui.records.noServices}</span>
          )}
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-xs text-latte dark:text-latte">
          {formatDate(record.lastModified)}
        </span>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-end">
        <div className="flex items-center ltr:justify-end rtl:justify-start gap-2">
          <QuickActionsMenu
            record={record}
            onQuickUpdate={onQuickUpdate}
            onDelete={handleDelete}
          />
          <button
            onClick={() => onEdit(record, actualIndex)}
            className="p-2 text-latte hover:text-primary dark:hover:text-primary-400 hover:bg-cream-2 dark:hover:bg-primary/10 rounded-lg transition-colors"
            title={t.ui.records.editRecord}
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
});

MaintenanceRecordRow.displayName = 'MaintenanceRecordRow';

// Mobile layout: one card per record instead of the 7-column table, which
// squeezes to unreadable slivers and forces horizontal scroll on phones.
const MaintenanceRecordCardMobile: React.FC<MaintenanceRecordRowProps> = ({
  record,
  actualIndex,
  t,
  onEdit,
  onQuickUpdate,
  onDelete
}) => {
  const handleDelete = () => onDelete?.(record.id, actualIndex);
  return (
  <div className={`bg-cream dark:bg-espresso-light rounded-xl border p-4 shadow-sm ${record.isLogisticsVisit ? 'border-amber-500/60 dark:border-amber-500/40 bg-amber-50/70 dark:bg-amber-500/5' : 'border-hairline dark:border-hairline'}`}>
    {/* Top row: date + status */}
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <CalendarIcon className="w-4 h-4 text-latte shrink-0" />
        <span className="text-sm font-medium text-primary dark:text-white truncate">
          {formatDate(record.maintenanceDate)}
        </span>
      </div>
      {getStatusBadge(record, t)}
    </div>

    {/* Middle: technician → client */}
    <div className="mt-3 flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5 min-w-0">
        <UserIcon className="w-4 h-4 text-latte shrink-0" />
        <span className="text-primary dark:text-white truncate">
          {record.baristaName || '-'}
        </span>
      </div>
      <span className="text-latte shrink-0">→</span>
      <span className="text-primary dark:text-white truncate min-w-0">
        {record.clientBaristaName || '-'}
      </span>
    </div>

    {/* Bottom: rating + services + modified + actions */}
    <div className="mt-3 flex items-center justify-between gap-3">
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex items-center gap-3">
          {renderStars(record.visitRating)}
          <span className="text-xs text-latte dark:text-latte">
            {record.servicesPerformed.length > 0
              ? t.ui.records.servicesCount.replace('{{count}}', String(record.servicesPerformed.length))
              : t.ui.records.noServices}
          </span>
        </div>
        {record.lastModified && (
          <span className="text-[10px] text-latte/70 dark:text-latte/70">
            {t.ui.records.editedPrefix.replace('{{date}}', formatDate(record.lastModified))}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <QuickActionsMenu
          record={record}
          onQuickUpdate={onQuickUpdate}
          onDelete={handleDelete}
        />
        <button
          onClick={() => onEdit(record, actualIndex)}
          className="p-2 text-latte hover:text-primary dark:hover:text-primary-400 hover:bg-cream-2 dark:hover:bg-primary/10 rounded-lg transition-colors"
          title={t.ui.records.editRecord}
          aria-label={t.ui.records.editRecord}
        >
          <PencilIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
  );
};

const MaintenanceRecordList: React.FC<MaintenanceRecordListProps> = ({
  records,
  branchName,
  onEdit,
  onQuickUpdate,
  onDelete
}) => {
  const t = useT();
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedRecords = React.useMemo(() => {
    const sorted = [...records];
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.maintenanceDate).getTime() - new Date(b.maintenanceDate).getTime();
          break;
        case 'lastModified':
          comparison = (new Date(a.lastModified || a.maintenanceDate).getTime()) - (new Date(b.lastModified || b.maintenanceDate).getTime());
          break;
        case 'baristaName':
          comparison = (a.baristaName || '').localeCompare(b.baristaName || '');
          break;
        case 'status':
          comparison = Number(a.problemSolved) - Number(b.problemSolved);
          break;
        case 'rating':
          comparison = (a.visitRating || 0) - (b.visitRating || 0);
          break;
        case 'serviceCount':
          comparison = a.servicesPerformed.length - b.servicesPerformed.length;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [records, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedRecords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      // Sensible defaults per field: newest-first for dates, A-Z for names, high-low for counts.
      setSortOrder(field === 'baristaName' ? 'asc' : 'desc');
    }
    setCurrentPage(1);
  };

  // Shared sort indicator for column headers.
  const sortArrow = (field: SortField) => {
    if (sortBy !== field) return null;
    return <span className="ms-1 text-xs">{sortOrder === 'asc' ? '▲' : '▼'}</span>;
  };

  return (
    <div className="bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline">
      <div className="px-6 py-4 border-b border-hairline dark:border-hairline bg-cream dark:bg-espresso/50 rounded-t-[0.75rem]">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary dark:text-white">
            {branchName}
          </h3>
          <span className="text-xs text-latte dark:text-latte">
            {t.ui.records.sortHint} • {t.ui.records.recordCount.replace('{{count}}', String(records.length))}
          </span>
        </div>
      </div>

      {/* Mobile: vertical card list per record. Reuses paginatedRecords so the
          existing pagination below controls both layouts. */}
      <div className="sm:hidden space-y-3">
        {paginatedRecords.length === 0 ? (
          <EmptyState
            icon={<WrenchScrewdriverIcon className="w-8 h-8" />}
            title={t.ui.records.noRecordsTitle}
            message={t.ui.records.noRecordsMsg}
          />
        ) : (
          paginatedRecords.map((record) => {
            const actualIndex = records.findIndex((r) => r.id === record.id);
            return (
              <MaintenanceRecordCardMobile
                key={record.id}
                record={record}
                actualIndex={actualIndex}
                t={t}
                onEdit={onEdit}
                onQuickUpdate={onQuickUpdate}
                onDelete={onDelete}
              />
            );
          })
        )}
      </div>

      {/* Desktop: 8-column table (hidden on phones). */}
      <div className="hidden sm:block overflow-x-auto invisible-scrollbar">
        <table className="w-full">
          <thead className="bg-cream dark:bg-espresso/50">
            <tr>
              <SortableHeader field="date" label={t.ui.records.colDate} {...{ sortBy, sortOrder, sortArrow, handleSort }} />
              <SortableHeader field="baristaName" label={t.ui.records.colTechnician} {...{ sortBy, sortOrder, sortArrow, handleSort }} />
              <th className="px-6 py-3 text-start text-xs font-medium text-latte dark:text-latte uppercase tracking-wider">
                {t.ui.records.colClient}
              </th>
              <SortableHeader field="status" label={t.ui.records.colStatus} {...{ sortBy, sortOrder, sortArrow, handleSort }} />
              <SortableHeader field="rating" label={t.ui.records.colRating} {...{ sortBy, sortOrder, sortArrow, handleSort }} />
              <SortableHeader field="serviceCount" label={t.ui.records.colServices} {...{ sortBy, sortOrder, sortArrow, handleSort }} />
              <SortableHeader field="lastModified" label={t.ui.records.colModified} {...{ sortBy, sortOrder, sortArrow, handleSort }} />
              <th className="px-6 py-3 text-end text-xs font-medium text-latte dark:text-latte uppercase tracking-wider">
                {t.ui.records.colActions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr className="border-b border-hairline dark:border-hairline/50">
                <td colSpan={8} className="py-8">
                  <EmptyState 
                    icon={<WrenchScrewdriverIcon className="w-8 h-8" />} 
                    title={t.ui.records.noRecordsTitle} 
                    message={t.ui.records.noRecordsMsg} 
                  />
                </td>
              </tr>
            ) : (
              /* Fix 4.5: Use memoized MaintenanceRecordRow component */
              paginatedRecords.map((record) => {
                const actualIndex = records.findIndex((r) => r.id === record.id);
                return (
                  <MaintenanceRecordRow
                    key={record.id}
                    record={record}
                    actualIndex={actualIndex}
                    t={t}
                    onEdit={onEdit}
                    onQuickUpdate={onQuickUpdate}
                    onDelete={onDelete}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-hairline dark:border-hairline bg-cream dark:bg-espresso/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-latte dark:text-latte">
              {t.ui.records.showingRange
                .replace('{{from}}', String(startIndex + 1))
                .replace('{{to}}', String(Math.min(startIndex + ITEMS_PER_PAGE, sortedRecords.length)))
                .replace('{{total}}', String(sortedRecords.length))}
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-cream dark:bg-espresso-light border border-hairline dark:border-hairline text-primary dark:text-latte hover:bg-cream-2 dark:hover:bg-espresso-light/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`min-w-[40px] px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-hover text-white'
                        : 'bg-cream dark:bg-espresso-light border border-hairline dark:border-hairline text-primary dark:text-latte hover:bg-cream-2 dark:hover:bg-espresso-light/50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-cream dark:bg-espresso-light border border-hairline dark:border-hairline text-primary dark:text-latte hover:bg-cream-2 dark:hover:bg-espresso-light/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceRecordList;
