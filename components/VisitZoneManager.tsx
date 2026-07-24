/** @format */

import React, { useState, useEffect } from 'react';
import { useVisitZones, VisitZone } from '../utils/visitZones';
import { SafeModal } from './form-ui/SafeModal';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { PlusCircleIcon, TrashIcon, MapPinIcon } from '@heroicons/react/24/outline';

interface VisitZoneManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

const VisitZoneManager: React.FC<VisitZoneManagerProps> = ({ isOpen, onClose }) => {
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
      title="إدارة مناطق الزيارة"
      size="md"
      ariaLabel="Manage visit zones"
    >
      <div className="space-y-6">
        <p className="text-sm text-latte">
          أضف أو أزل مناطق الزيارة ورسومها. المناطق الافتراضية لا يمكن حذفها.
        </p>

        {/* Existing zones */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-primary">المناطق الحالية</h4>
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
                      {zone.key} · {zone.fee.toLocaleString()} جم
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
            إضافة منطقة جديدة
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-latte mb-1">المفتاح (key)</label>
              <input
                type="text"
                value={newZoneKey}
                onChange={(e) => setNewZoneKey(e.target.value)}
                placeholder="مثال: luxor"
                className="w-full px-3 py-2 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-latte mb-1">الاسم العربي</label>
              <input
                type="text"
                value={newZoneLabel}
                onChange={(e) => setNewZoneLabel(e.target.value)}
                placeholder="مثال: الأقصر"
                className="w-full px-3 py-2 bg-cream text-primary rounded-lg border border-hairline focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-latte mb-1">الرسوم (جم)</label>
              <input
                type="number"
                value={newZoneFee}
                onChange={(e) => setNewZoneFee(e.target.value)}
                placeholder="مثال: 2000"
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
            إضافة
          </button>
        </div>

        {/* Reset to defaults */}
        <div className="pt-4 border-t border-hairline flex justify-between items-center">
          <span className="text-xs text-latte">
            {zones.filter(z => z.isCustom).length} مناطق مخصصة
          </span>
          <button
            type="button"
            onClick={reset}
            className="text-sm text-ember-500 hover:text-ember-600 underline"
          >
            إعادة تعيين للإعدادات الافتراضية
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm !== null}
        title="حذف المنطقة"
        message={`هل أنت متأكد من حذف منطقة "${zones.find(z => z.key === deleteConfirm)?.label || deleteConfirm}"؟`}
        variant="danger"
        confirmLabel="نعم، حذف"
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
