/** @format */

import React, { useState } from 'react';
import { useContactPositions } from '../utils/contactPositions';
import { SafeModal } from './form-ui/SafeModal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { PlusCircleIcon, TrashIcon, BriefcaseIcon } from '@heroicons/react/24/outline';
import { useT } from '../utils/i18n';

interface ContactPositionManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const ContactPositionManager: React.FC<ContactPositionManagerProps> = ({ isOpen, onClose }) => {
  const t = useT();
  const { positions, add, remove, reset } = useContactPositions();

  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    const label = newLabel.trim();
    const value = newValue.trim().toLowerCase().replace(/\s+/g, '_');

    if (!label || !value) return;

    add({ label, value });
    setNewLabel('');
    setNewValue('');
  };

  const canAdd = newLabel.trim() && newValue.trim();

  return (
    <SafeModal
      isOpen={isOpen}
      onClose={onClose}
      title={t.ui.contactPositions.title}
      size="md"
      ariaLabel="Manage contact positions"
    >
      <div className="space-y-6">
        <p className="text-sm text-latte">
          {t.ui.contactPositions.hint}
        </p>

        {/* Existing positions */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-primary">{t.ui.contactPositions.currentPositions}</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {positions.map((pos) => (
              <div
                key={pos.value}
                className="flex items-center justify-between p-3 bg-cream rounded-lg border border-hairline"
              >
                <div className="flex items-center gap-3">
                  <BriefcaseIcon className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-primary">{pos.label}</div>
                    <div className="text-xs text-latte">{pos.value}</div>
                  </div>
                </div>
                {pos.isCustom && (
                  <button
                    onClick={() => setDeleteConfirm(pos.value)}
                    className="p-2 text-ember-500 hover:bg-ember-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Remove ${pos.label}`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add new position */}
        <div className="p-4 bg-cream-2 rounded-xl border border-hairline space-y-4">
          <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
            <PlusCircleIcon className="w-5 h-5 text-primary" />
            {t.ui.contactPositions.addNewPosition}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-latte mb-1">
                {t.ui.contactPositions.nameAr}
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={t.ui.contactPositions.namePlaceholder}
                className="w-full px-3 py-2 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-primary text-base"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-latte mb-1">
                {t.ui.contactPositions.techValue}
              </label>
              <input
                type="text"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder={t.ui.contactPositions.valuePlaceholder}
                className="w-full px-3 py-2 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-primary text-base"
                onKeyDown={(e) => e.key === 'Enter' && canAdd && handleAdd()}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={!canAdd}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            <PlusCircleIcon className="w-5 h-5" />
            {t.common.add}
          </button>
        </div>

        {/* Reset to defaults */}
        <div className="pt-4 border-t border-hairline flex justify-between items-center">
          <span className="text-xs text-latte">
            {t.ui.contactPositions.customCount.replace('{{count}}', String(positions.filter((p) => p.isCustom).length))}
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-ember-500 hover:text-ember-600 underline"
          >
            {t.ui.contactPositions.resetDefaults}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title={t.ui.contactPositions.deleteTitle}
        message={t.ui.contactPositions.deleteMessage.replace('{{name}}', positions.find((p) => p.value === deleteConfirm)?.label || deleteConfirm)}
        variant="danger"
        confirmLabel={t.ui.contactPositions.deleteConfirmLabel}
        onConfirm={() => {
          if (deleteConfirm) remove(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </SafeModal>
  );
};

export default ContactPositionManager;
