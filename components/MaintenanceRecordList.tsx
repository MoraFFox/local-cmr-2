import React, { useState, useMemo } from 'react';
import { MaintenanceRecord } from '../types';
import { 
  PencilIcon, 
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  CalendarIcon,
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationCircleIcon,
  WrenchIcon,
  WrenchScrewdriverIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import QuickActionsMenu from './QuickActionsMenu';
import EmptyState from './EmptyState';

interface MaintenanceRecordListProps {
  records: MaintenanceRecord[];
  branchName: string;
  onEdit: (record: MaintenanceRecord, index: number) => void;
  onQuickUpdate: (recordId: number, updates: Partial<MaintenanceRecord>) => void;
  onDelete?: (recordId: number) => void;
}

const ITEMS_PER_PAGE = 10;

// Fix 4.8: Create a memoized date formatter with caching
const createDateFormatter = () => {
  const cache = new Map<string, string>();
  return (dateString: string) => {
    if (cache.has(dateString)) {
      return cache.get(dateString)!;
    }
    const date = new Date(dateString);
    const formatted = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
    cache.set(dateString, formatted);
    return formatted;
  };
};

// Fix 4.8: Use the memoized date formatter
const formatDate = createDateFormatter();

// Hoisted so both the desktop table row and the mobile card reuse them.
const getStatusBadge = (rec: MaintenanceRecord) => {
  if (rec.problemSolved) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300">
        <CheckCircleIcon className="w-3 h-3" />
        Solved
      </span>
    );
  } else if (rec.hadProblem) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-ember-50 text-ember-700 dark:bg-ember-500/10 dark:text-ember-300">
        <ExclamationCircleIcon className="w-3 h-3" />
        Problem
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-primary dark:bg-chrome-light dark:text-secondary/70">
      <WrenchIcon className="w-3 h-3" />
      Routine
    </span>
  );
};

const renderStars = (rating: number | undefined) => {
  if (!rating) return <span className="text-secondary dark:text-secondary text-sm">-</span>;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        star <= rating ? (
          <StarIconSolid key={star} className="w-4 h-4 text-yellow-400" />
        ) : (
          <StarIcon key={star} className="w-4 h-4 text-secondary/70 dark:text-primary" />
        )
      ))}
    </div>
  );
};

// Fix 4.5: Extract and memoize the row component
interface MaintenanceRecordRowProps {
  record: MaintenanceRecord;
  actualIndex: number;
  onEdit: (record: MaintenanceRecord, index: number) => void;
  onQuickUpdate: (recordId: number, updates: Partial<MaintenanceRecord>) => void;
  onDelete?: (recordId: number) => void;
}

const MaintenanceRecordRow = React.memo(({
  record,
  actualIndex,
  onEdit,
  onQuickUpdate,
  onDelete
}: MaintenanceRecordRowProps) => {
  return (
    <tr className="hover:bg-surface dark:hover:bg-chrome-light/50/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-secondary" />
          <span className="text-sm text-primary dark:text-white">
            {formatDate(record.maintenanceDate)}
          </span>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-secondary" />
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
        {getStatusBadge(record)}
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        {renderStars(record.visitRating)}
      </td>
      
      <td className="px-6 py-4">
        <div className="text-sm text-primary dark:text-secondary">
          {record.servicesPerformed.length > 0 ? (
            <span>{record.servicesPerformed.length} service(s)</span>
          ) : (
            <span className="text-secondary">No services</span>
          )}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-2">
          <QuickActionsMenu
            record={record}
            onQuickUpdate={onQuickUpdate}
            onDelete={onDelete}
          />
          <button
            onClick={() => onEdit(record, actualIndex)}
            className="p-2 text-secondary hover:text-brand-red dark:hover:text-brand-red-400 hover:bg-surface-elevated dark:hover:bg-brand-red/10 rounded-lg transition-colors"
            title="تعديل السجل"
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
  onEdit,
  onQuickUpdate,
  onDelete
}) => (
  <div className="bg-surface dark:bg-chrome-light rounded-xl border border-default dark:border-default p-4 shadow-sm">
    {/* Top row: date + status */}
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <CalendarIcon className="w-4 h-4 text-secondary shrink-0" />
        <span className="text-sm font-medium text-primary dark:text-white truncate">
          {formatDate(record.maintenanceDate)}
        </span>
      </div>
      {getStatusBadge(record)}
    </div>

    {/* Middle: technician → client */}
    <div className="mt-3 flex items-center gap-2 text-sm">
      <div className="flex items-center gap-1.5 min-w-0">
        <UserIcon className="w-4 h-4 text-secondary shrink-0" />
        <span className="text-primary dark:text-white truncate">
          {record.baristaName || '-'}
        </span>
      </div>
      <span className="text-secondary shrink-0">→</span>
      <span className="text-primary dark:text-white truncate min-w-0">
        {record.clientBaristaName || '-'}
      </span>
    </div>

    {/* Bottom: rating + services + actions */}
    <div className="mt-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {renderStars(record.visitRating)}
        <span className="text-xs text-secondary dark:text-secondary truncate">
          {record.servicesPerformed.length > 0
            ? `${record.servicesPerformed.length} service(s)`
            : 'No services'}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <QuickActionsMenu
          record={record}
          onQuickUpdate={onQuickUpdate}
          onDelete={onDelete}
        />
        <button
          onClick={() => onEdit(record, actualIndex)}
          className="p-2 text-secondary hover:text-brand-red dark:hover:text-brand-red-400 hover:bg-surface-elevated dark:hover:bg-brand-red/10 rounded-lg transition-colors"
          title="تعديل السجل"
          aria-label="Edit record"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  </div>
);

const MaintenanceRecordList: React.FC<MaintenanceRecordListProps> = ({
  records,
  branchName,
  onEdit,
  onQuickUpdate,
  onDelete
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'status' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const sortedRecords = React.useMemo(() => {
    const sorted = [...records];
    sorted.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.maintenanceDate).getTime() - new Date(b.maintenanceDate).getTime();
          break;
        case 'status':
          comparison = Number(a.problemSolved) - Number(b.problemSolved);
          break;
        case 'rating':
          comparison = (a.visitRating || 0) - (b.visitRating || 0);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [records, sortBy, sortOrder]);

  const totalPages = Math.ceil(sortedRecords.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedRecords = sortedRecords.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSort = (field: 'date' | 'status' | 'rating') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="bg-surface dark:bg-chrome rounded-xl border border-default dark:border-default">
      <div className="px-6 py-4 border-b border-default dark:border-default bg-surface dark:bg-chrome/50 rounded-t-[0.75rem]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-primary dark:text-white">
            {branchName}
          </h3>

          <div className="flex items-center gap-2">
            <span className="text-sm text-secondary dark:text-secondary">Sort by:</span>
            <div className="flex items-center gap-1">
              {(['date', 'status', 'rating'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    sortBy === field
                      ? 'bg-brand-red/10 text-brand-red-800 dark:bg-brand-red/10 dark:text-brand-red-400'
                      : 'text-primary dark:text-secondary hover:bg-surface dark:hover:bg-chrome-light/50'
                  }`}
                >
                  {field.charAt(0).toUpperCase() + field.slice(1)}
                  {sortBy === field && (
                    <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: vertical card list per record. Reuses paginatedRecords so the
          existing pagination below controls both layouts. */}
      <div className="sm:hidden space-y-3">
        {paginatedRecords.length === 0 ? (
          <EmptyState
            icon={<WrenchScrewdriverIcon className="w-8 h-8" />}
            title="لا يوجد سجل صيانة"
            message="لم يتم العثور على سجلات صيانة."
          />
        ) : (
          paginatedRecords.map((record, index) => {
            const actualIndex = startIndex + index;
            return (
              <MaintenanceRecordCardMobile
                key={record.id}
                record={record}
                actualIndex={actualIndex}
                onEdit={onEdit}
                onQuickUpdate={onQuickUpdate}
                onDelete={onDelete}
              />
            );
          })
        )}
      </div>

      {/* Desktop: 7-column table (hidden on phones). */}
      <div className="hidden sm:block overflow-x-auto invisible-scrollbar">
        <table className="w-full">
          <thead className="bg-surface dark:bg-chrome/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary dark:text-secondary uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary dark:text-secondary uppercase tracking-wider">
                My Technician
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary dark:text-secondary uppercase tracking-wider">
                Client Barista
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary dark:text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary dark:text-secondary uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-secondary dark:text-secondary uppercase tracking-wider">
                Services
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-secondary dark:text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr className="border-b border-default dark:border-default/50">
                <td colSpan={7} className="py-8">
                  <EmptyState 
                    icon={<WrenchScrewdriverIcon className="w-8 h-8" />} 
                    title="لا يوجد سجل صيانة" 
                    message="لم يتم العثور على سجلات صيانة." 
                  />
                </td>
              </tr>
            ) : (
              /* Fix 4.5: Use memoized MaintenanceRecordRow component */
              paginatedRecords.map((record, index) => {
                const actualIndex = startIndex + index;
                return (
                  <MaintenanceRecordRow
                    key={record.id}
                    record={record}
                    actualIndex={actualIndex}
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
        <div className="px-6 py-4 border-t border-default dark:border-default bg-surface dark:bg-chrome/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-secondary dark:text-secondary">
              Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, sortedRecords.length)} of {sortedRecords.length} records
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-surface dark:bg-chrome-light border border-default dark:border-default text-primary dark:text-secondary hover:bg-surface-elevated dark:hover:bg-chrome-light/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        ? 'bg-brand-red-light text-white'
                        : 'bg-surface dark:bg-chrome-light border border-default dark:border-default text-primary dark:text-secondary hover:bg-surface-elevated dark:hover:bg-chrome-light/50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-surface dark:bg-chrome-light border border-default dark:border-default text-primary dark:text-secondary hover:bg-surface-elevated dark:hover:bg-chrome-light/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
