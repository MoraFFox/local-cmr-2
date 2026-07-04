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
  const getStatusBadge = (rec: MaintenanceRecord) => {
    if (rec.problemSolved) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircleIcon className="w-3 h-3" />
          Solved
        </span>
      );
    } else if (rec.hadProblem) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <ExclamationCircleIcon className="w-3 h-3" />
          Problem
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300">
        <WrenchIcon className="w-3 h-3" />
        Routine
      </span>
    );
  };

  const renderStars = (rating: number | undefined) => {
    if (!rating) return <span className="text-slate-400 dark:text-slate-500 text-sm">-</span>;
    
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          star <= rating ? (
            <StarIconSolid key={star} className="w-4 h-4 text-yellow-400" />
          ) : (
            <StarIcon key={star} className="w-4 h-4 text-slate-300 dark:text-slate-600" />
          )
        ))}
      </div>
    );
  };

  return (
    <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-900 dark:text-white">
            {formatDate(record.maintenanceDate)}
          </span>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <UserIcon className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-900 dark:text-white">
            {record.baristaName || '-'}
          </span>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-slate-900 dark:text-white">
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
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {record.servicesPerformed.length > 0 ? (
            <span>{record.servicesPerformed.length} service(s)</span>
          ) : (
            <span className="text-slate-400">No services</span>
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
            className="p-2 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
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
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            {branchName}
          </h3>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Sort by:</span>
            <div className="flex items-center gap-1">
              {(['date', 'status', 'rating'] as const).map((field) => (
                <button
                  key={field}
                  onClick={() => handleSort(field)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    sortBy === field
                      ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
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

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 dark:bg-slate-800/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                My Technician
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Client Barista
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Rating
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Services
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {paginatedRecords.length === 0 ? (
              <tr className="border-b border-slate-100 dark:border-slate-700/50">
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
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500 dark:text-slate-400">
              Showing {startIndex + 1} to {Math.min(startIndex + ITEMS_PER_PAGE, sortedRecords.length)} of {sortedRecords.length} records
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                        ? 'bg-teal-600 text-white'
                        : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
