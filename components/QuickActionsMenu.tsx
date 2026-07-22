import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFloatingMenu } from '../hooks/useFloatingMenu';
import { MaintenanceRecord } from '../types';
import { useT } from '../utils/i18n';
import {
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
  CalendarIcon,
  TrashIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarRating } from './form-ui/StarRating';

interface QuickActionsMenuProps {
  record: MaintenanceRecord;
  onQuickUpdate: (recordId: MaintenanceRecord['id'], updates: Partial<MaintenanceRecord>) => void;
  onDelete?: (recordId: MaintenanceRecord['id']) => void;
}

const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  record,
  onQuickUpdate,
  onDelete
}) => {
  const t = useT();
  const [showRatingPicker, setShowRatingPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { open: isOpen, setOpen: setIsOpen, triggerRef, contentRef, style, toggle } = useFloatingMenu();

  // Sub-state cleanup when the menu is closed via outside click / Escape.
  React.useEffect(() => {
    if (!isOpen) {
      setShowRatingPicker(false);
      setShowDatePicker(false);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

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
    <div className="relative">
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        onClick={toggle}
        className="p-2 text-latte hover:text-primary dark:hover:text-primary-400 hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors"
        title="إجراءات سريعة"
      >
        <BoltIcon className="w-5 h-5" />
      </button>

      {isOpen && createPortal(
        <div
          ref={contentRef}
          className="fixed w-56 bg-cream dark:bg-espresso-light rounded-xl shadow-xl border border-hairline dark:border-hairline z-[9999] overflow-hidden"
          style={style}
        >
          <div className="py-1">
            <button
              onClick={handleToggleSolved}
              className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors"
            >
              {record.problemSolved ? (
                <>
                  <XCircleIcon className="w-5 h-5 text-ember-500" />
                  <span className="text-sm text-text-primary">{t.common.markAsUnsolved}</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="w-5 h-5 text-leaf-500" />
                  <span className="text-sm text-text-primary">{t.common.markAsSolved}</span>
                </>
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setShowRatingPicker(!showRatingPicker);
                  setShowDatePicker(false);
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors"
              >
                <StarIcon className="w-5 h-5 text-yellow-500" />
                <span className="text-sm text-text-primary">{t.common.changeRating}</span>
              </button>

              {showRatingPicker && (
                <div className="px-4 py-3 bg-cream-2 dark:bg-espresso-light/50 border-t border-hairline dark:border-hairline">
                  <StarRating
                    value={record.visitRating || 0}
                    onChange={handleRatingChange}
                    size="sm"
                    showNA
                  />
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  setShowRatingPicker(false);
                }}
                className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors"
              >
                <CalendarIcon className="w-5 h-5 text-text-primary" />
                <span className="text-sm text-text-primary">{t.common.changeDate}</span>
              </button>

              {showDatePicker && (
                <div className="px-4 py-3 bg-cream-2 dark:bg-espresso-light/50 border-t border-hairline dark:border-hairline">
                  <input
                    type="date"
                    value={record.maintenanceDate}
                    onChange={handleDateChange}
                    className="w-full px-3 py-2 bg-cream dark:bg-espresso-light border border-hairline dark:border-hairline rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}
            </div>

            {onDelete && (
              <>
                <div className="border-t border-hairline dark:border-hairline" />

                <div className="relative">
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(!showDeleteConfirm);
                      setShowRatingPicker(false);
                      setShowDatePicker(false);
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-ember-500/10 dark:hover:bg-ember-500/20 transition-colors text-ember-700 dark:text-ember-300"
                  >
                    <TrashIcon className="w-5 h-5" />
                    <span className="text-sm font-medium">{t.common.deleteRecord}</span>
                  </button>

                  {showDeleteConfirm && (
                    <div className="px-4 py-3 bg-ember-500/10 dark:bg-ember-500/20 border-t border-ember-500/20 dark:border-ember-500/30">
                      <div className="flex items-start gap-2 mb-3">
                        <ExclamationTriangleIcon className="w-5 h-5 text-ember-700 dark:text-ember-300 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-ember-700 dark:text-ember-300">
                          {t.common.areYouSure}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleDelete}
                          className="flex-1 px-3 py-2 bg-ember-600 hover:bg-ember-700 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {t.common.yesDelete}
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          className="flex-1 px-3 py-2 bg-cream dark:bg-espresso-light border border-hairline dark:border-hairline text-text-primary text-sm font-medium rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors"
                        >
                          {t.common.cancel}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default QuickActionsMenu;
