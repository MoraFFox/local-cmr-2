/** @format */

import React, { useState, useEffect } from 'react';
import { useVisitZones, VisitZone } from '../utils/visitZones';
import { SafeModal } from './form-ui/SafeModal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { PlusCircleIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { useT } from '../utils/i18n';

interface VisitZoneManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const VisitZoneManager: React.FC<VisitZoneManagerProps> = ({ isOpen, onClose }) => {
  const t = useT();
  const { zones, add, remove, reset } = useVisitZones();

  const [newZoneKey, setNewZoneKey] = useState('');
  const [newZoneLabel, setNewZoneLabel] = useState('');
  const [newZoneFee, setNewZoneFee] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const handleAdd = () => {
    const key = newZoneKey.trim().toLowerCase().replace(/\s+/g, '_');
    const label = newZoneLabel.trim();
    const fee = Number(newZoneFee);

    if (!key || !label || isNaN(fee) || fee < 0) return;

    add({ key, label, fee });
    setNewZoneKey('');
    setNewZoneLabel('');
    setNewZoneFee('');
  };

  const canAdd = newZoneKey.trim() && newZoneLabel.trim() && newZoneFee && Number(newZoneFee) >= 0;

  return (
    <SafeModal
      isOpen={isOpen}
      onClose={onClose}
      title={t.ui.visitZones.title}
      size="md"
      ariaLabel="Manage visit zones"
    >
      <div className="space-y-6">
        <p className="text-sm text-latte">
          {t.ui.visitZones.hint}
        </p>

        {/* Existing zones */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-primary">{t.ui.visitZones.currentZones}</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {zones.map((zone) => (
              <div
                key={zone.key}
                className="flex items-center justify-between p-3 bg-cream rounded-lg border border-hairline"
              >
                <div className="flex items-center gap-3">
                  <MapPinIcon className="w-5 h-5 text-primary" />
                  <div>
                    <div className="font-medium text-primary">{zone.label}</div>
                    <div className="text-xs text-latte">
                      {zone.key} · {zone.fee.toLocaleString()} {t.ui.maintenanceEditor.zoneFeeSuffix}
                    </div>
                  </div>
                </div>
                {zone.isCustom && (
                  <button
                    onClick={() => setDeleteConfirm(zone.key)}
                    className="p-2 text-ember-500 hover:bg-ember-50 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                    aria-label={`Remove ${zone.label}`}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Add new zone */}
        <div className="p-4 bg-cream-2 rounded-xl border border-hairline space-y-4">
          <h4 className="text-sm font-semibold text-primary flex items-center gap-2">
            <PlusCircleIcon className="w-5 h-5 text-primary" />
            {t.ui.visitZones.addNewZone}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-latte mb-1">{t.ui.visitZones.keyLabel}</label>
              <input
                type="text"
                value={newZoneKey}
                onChange={(e) => setNewZoneKey(e.target.value)}
                placeholder={t.ui.visitZones.keyPlaceholder}
                className="w-full px-3 py-2 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-latte mb-1">{t.ui.visitZones.nameAr}</label>
              <input
                type="text"
                value={newZoneLabel}
                onChange={(e) => setNewZoneLabel(e.target.value)}
                placeholder={t.ui.visitZones.namePlaceholder}
                className="w-full px-3 py-2 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-latte mb-1">{t.ui.visitZones.fee}</label>
              <input
                type="number"
                value={newZoneFee}
                onChange={(e) => setNewZoneFee(e.target.value)}
                placeholder={t.ui.visitZones.feePlaceholder}
                min="0"
                className="w-full px-3 py-2 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-primary text-sm"
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
            {t.ui.visitZones.customZonesCount.replace('{{count}}', String(zones.filter(z => z.isCustom).length))}
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-ember-500 hover:text-ember-600 underline"
          >
            {t.ui.visitZones.resetDefaults}
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title={t.ui.visitZones.deleteZoneTitle}
        message={t.ui.visitZones.deleteZoneMessage.replace('{{name}}', zones.find(z => z.key === deleteConfirm)?.label || deleteConfirm)}
        variant="danger"
        confirmLabel={t.ui.visitZones.deleteConfirmLabel}
        onConfirm={() => {
          if (deleteConfirm) remove(deleteConfirm);
          setDeleteConfirm(null);
        }}
        onCancel={() => setDeleteConfirm(null)}
      />
    </SafeModal>
  );
};

export default VisitZoneManager;
