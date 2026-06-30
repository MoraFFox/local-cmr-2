import React, { useState, useRef, useEffect } from 'react';
import { MaintenanceRecord } from '../types';
import { 
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  CalendarIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';

interface QuickActionsMenuProps {
  record: MaintenanceRecord;
  onQuickUpdate: (recordId: number, updates: Partial<MaintenanceRecord>) => void;
  onDelete?: (recordId: number) => void;
}

const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  record,
  onQuickUpdate,
  onDelete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowRatingPicker(false);
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleSolved = () => {
    onQuickUpdate(record.id, { problemSolved: !record.problemSolved });
    setIsOpen(false);
  };

  const handleRatingChange = (rating: number) => {
    onQuickUpdate(record.id, { visitRating: rating });
    setShowRatingPicker(false);
    setIsOpen(false);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onQuickUpdate(record.id, { maintenanceDate: e.target.value });
    setShowDatePicker(false);
    setIsOpen(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(record.id);
    }
    setShowDeleteConfirm(false);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
        title="Quick Actions"
      >
        <BoltIcon className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
          <div className="py-1">
            <button
              onClick={handleToggleSolved}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              {record.problemSolved ? (
                <>
                  <XCircleIcon className="w-5 h-5 text-red-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Mark as Unsolved</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Mark as Solved</span>
                </>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setShowRatingPicker(!showRatingPicker);
                  setShowDatePicker(false);
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <StarIcon className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Change Rating</span>
              </button>

              {showRatingPicker && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
                  <div className="flex items-center justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingChange(star)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        {star <= (record.visitRating || 0) ? (
                          <StarIconSolid className="w-6 h-6 text-yellow-400" />
                        ) : (
                          <StarIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowRatingPicker(false);
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                <span className="text-sm text-slate-700 dark:text-slate-300">Change Date</span>
              </button>

              {showDatePicker && (
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-100 dark:border-slate-700">
                  <input
                    type="date"
                    value={record.maintenanceDate}
                    onChange={handleDateChange}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              )}
            </div>

            {onDelete && (
              <>
                <div className="border-t border-slate-200 dark:border-slate-700" />
                
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(!showDeleteConfirm);
                      setShowRatingPicker(false);
                      setShowDatePicker(false);
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                  >
                    <TrashIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">Delete Record</span>
                  </button>

                  {showDeleteConfirm && (
                    <div className="px-4 py-3 bg-red-50 dark:bg-red-900/30 border-t border-red-100 dark:border-red-800">
                      <div className="flex items-start gap-2 mb-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-800 dark:text-red-200">
                          Are you sure? This action cannot be undone.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          Yes, Delete
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickActionsMenu;
