import React, { useState, useMemo } from 'react';
import {
  TruckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { useLogisticsOperations, useCompanyMachines, calculateRentalDuration, calculateDailyRentalPrice, calculateBillableDays } from '../hooks/useLogisticsOperations';
import { useToast } from './ToastContext';
import EmptyState from './EmptyState';
import type { LogisticsOperation, CompanyMachine } from '../types';

interface MachineLogisticsSectionProps {
  customerId: number | null;
  recordId: number;
  maintenanceDate: string;
}

const LOGISTICS_ACTIONS = [
  {
    type: 'pickup_and_deliver' as const,
    icon: TruckIcon,
    title: 'استلام ماكينة + تسليم بديلة',
    subtitle: 'Pickup customer machine and deliver replacement',
    arabicDescription: 'استلام ماكينة العميل وإرسالها لمركز الصيانة مع تسليم ماكينة بديلة',
  },
  {
    type: 'deliver_only' as const,
    icon: ArrowRightIcon,
    title: 'تسليم ماكينة بديلة فقط',
    subtitle: 'Deliver replacement machine only',
    arabicDescription: 'تسليم ماكينة بديلة للعميل فقط بدون استلام ماكينته',
  },
  {
    type: 'pickup_only' as const,
    icon: ArrowLeftIcon,
    title: 'استلام ماكينة العميل فقط',
    subtitle: 'Pickup customer machine only',
    arabicDescription: 'استلام ماكينة العميل فقط بدون تسليم ماكينة بديلة',
  },
];

const MACHINE_CATEGORIES = [
  { value: 'coffee', label: 'ماكينة قهوة' },
  { value: 'grinder', label: 'مطحنة' },
  { value: 'other', label: 'أخرى' },
];

const MACHINE_OWNERSHIP = [
  { value: 'customer', label: 'ماكينة عميل' },
  { value: 'company', label: 'ماكينة شركة' },
];

const MACHINE_TYPES = [
  { value: 'manual', label: 'يدوي' },
  { value: 'automatic', label: 'أوتوماتيك' },
  { value: 'semi_automatic', label: 'نصف أوتوماتيك' },
];

const SUBTITLE_CLASS = 'text-xs text-latte';

const MachineLogisticsSection: React.FC<MachineLogisticsSectionProps> = ({
  customerId,
  recordId,
  maintenanceDate,
}) => {
  const { showToast } = useToast();
  const { operations, isLoading, createOperation, closeOperation, refresh } = useLogisticsOperations(customerId);
  const { machines: companyMachines } = useCompanyMachines();

  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for new operation
  const [formData, setFormData] = useState({
    machine_category: 'coffee',
    machine_ownership: 'customer',
    machine_type: 'manual',
    replacement_machine_id: null as number | null,
    monthly_rental_price: '',
    pickup_cost: '',
    return_cost: '',
    internal_notes: '',
  });

  const openOps = useMemo(() => operations.filter((o) => o.status === 'open'), [operations]);
  const closedOps = useMemo(() => operations.filter((o) => o.status === 'closed'), [operations]);
  const needsRentalPrice = selectedAction === 'pickup_and_deliver' || selectedAction === 'deliver_only';
  const needsReplacementMachine = needsRentalPrice;

  const resetForm = () => {
    setSelectedAction(null);
    setShowCloseConfirm(null);
    setFormData({
      machine_category: 'coffee',
      machine_ownership: 'customer',
      machine_type: 'manual',
      replacement_machine_id: null,
      monthly_rental_price: '',
      pickup_cost: '',
      return_cost: '',
      internal_notes: '',
    });
  };

  const handleSave = async () => {
    if (!customerId) return;
    setIsSaving(true);
    try {
      await createOperation(
        {
          operation_type: selectedAction as any,
          open_date: maintenanceDate,
          machine_category: formData.machine_category,
          machine_ownership: formData.machine_ownership,
          machine_type: formData.machine_type,
          replacement_machine_id: formData.replacement_machine_id,
          monthly_rental_price: needsRentalPrice && formData.monthly_rental_price
            ? Number(formData.monthly_rental_price)
            : undefined,
          pickup_cost: formData.pickup_cost ? Number(formData.pickup_cost) : 0,
          return_cost: formData.return_cost ? Number(formData.return_cost) : 0,
          internal_notes: formData.internal_notes || undefined,
        },
        recordId,
      );
      showToast('تم إنشاء العملية اللوجستية بنجاح', 'success');
      resetForm();
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'فشل إنشاء العملية', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = async (operationId: number) => {
    setIsSaving(true);
    try {
      await closeOperation(operationId, {
        closed_by_record_id: recordId,
        close_date: maintenanceDate,
      });
      showToast('تم إغلاق العملية اللوجستية بنجاح', 'success');
      setShowCloseConfirm(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'فشل إغلاق العملية', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getOperationTypeLabel = (type: string) => {
    const action = LOGISTICS_ACTIONS.find((a) => a.type === type);
    return action ? action.title : type;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'open') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <ExclamationCircleIcon className="w-3 h-3 me-1" />
          مفتوحة
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300">
        <CheckCircleIcon className="w-3 h-3 me-1" />
        مغلقة
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="ms-2 text-sm text-latte">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Open Operations */}
      {openOps.length > 0 && (
        <div className="space-y-3">
          <h5 className="text-sm font-semibold text-primary dark:text-latte/70">
            عمليات لوجستية مفتوحة ({openOps.length})
          </h5>
          {openOps.map((op) => (
            <div
              key={op.id}
              className="p-4 bg-cream dark:bg-espresso-light/50 rounded-lg border border-amber-500/30 dark:border-amber-500/20"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-primary dark:text-white">
                  {getOperationTypeLabel(op.operation_type)}
                </span>
                {getStatusBadge(op.status)}
              </div>
              {op.machine_category && (
                <div className="text-xs text-latte space-y-0.5">
                  <div>الفئة: {MACHINE_CATEGORIES.find((c) => c.value === op.machine_category)?.label || op.machine_category}</div>
                  {op.machine_type && <div>النوع: {MACHINE_TYPES.find((t) => t.value === op.machine_type)?.label || op.machine_type}</div>}
                  {op.company_machines && <div>الماكينة البديلة: {op.company_machines.name}</div>}
                  {op.monthly_rental_price != null && (
                    <div>الإيجار الشهري: {op.monthly_rental_price.toLocaleString()} ج.م</div>
                  )}
                </div>
              )}
              {showCloseConfirm === op.id ? (
                <div className="mt-3 p-3 bg-white dark:bg-espresso rounded-lg border border-hairline">
                  <p className="text-sm text-primary dark:text-latte/70 mb-2">
                    سيتم إغلاق هذه العملية باستخدام تاريخ الزيارة الحالي ({maintenanceDate}).
                    {op.monthly_rental_price != null && (
                      <span className="block mt-1 text-xs">
                        الإيجار اليومي: {calculateDailyRentalPrice(op.monthly_rental_price).toLocaleString()} ج.م
                      </span>
                    )}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleClose(op.id)}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-leaf-600 hover:bg-leaf-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'جاري...' : 'تأكيد الإغلاق'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCloseConfirm(null)}
                      disabled={isSaving}
                      className="px-3 py-1.5 text-xs font-medium text-latte hover:text-primary rounded-lg transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowCloseConfirm(op.id)}
                  className="mt-2 text-xs font-medium text-leaf-600 dark:text-leaf-400 hover:text-leaf-700 dark:hover:text-leaf-300 transition-colors"
                >
                  إغلاق هذه العملية
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Closed Operations (collapsed summary) */}
      {closedOps.length > 0 && (
        <details className="group">
          <summary className="text-sm font-medium text-latte hover:text-primary cursor-pointer transition-colors">
            عمليات مغلقة ({closedOps.length})
          </summary>
          <div className="mt-2 space-y-2">
            {closedOps.slice(0, 5).map((op) => (
              <div
                key={op.id}
                className="p-3 bg-cream dark:bg-espresso-light/30 rounded-lg border border-hairline"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary dark:text-latte/70">
                    {getOperationTypeLabel(op.operation_type)}
                  </span>
                  {getStatusBadge(op.status)}
                </div>
                {op.total_logistics_cost != null && (
                  <div className="text-xs text-latte mt-1">
                    التكلفة الإجمالية: {op.total_logistics_cost.toLocaleString()} ج.م
                  </div>
                )}
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Three Visual Cards */}
      {!selectedAction && (
        <div>
          <h5 className="text-sm font-semibold text-primary dark:text-latte/70 mb-3">
            إضافة عملية لوجستية جديدة
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {LOGISTICS_ACTIONS.map((action) => (
              <button
                key={action.type}
                type="button"
                onClick={() => setSelectedAction(action.type)}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedAction === action.type
                    ? 'border-primary bg-cream-2 dark:bg-primary/10 text-primary-900 dark:text-primary-300'
                    : 'border-hairline dark:border-hairline bg-cream dark:bg-espresso text-primary dark:text-latte/70 hover:border-primary/30'
                }`}
              >
                <action.icon className="w-8 h-8" />
                <div className="text-center">
                  <div className="font-semibold text-sm">{action.title}</div>
                  <div className={SUBTITLE_CLASS}>{action.subtitle}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* New Operation Form */}
      {selectedAction && (
        <div className="p-4 bg-cream dark:bg-espresso-light/50 rounded-lg border border-hairline space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-primary dark:text-white">
              {LOGISTICS_ACTIONS.find((a) => a.type === selectedAction)?.title}
            </h5>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-latte hover:text-primary transition-colors"
            >
              إلغاء
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                فئة الماكينة
              </label>
              <select
                value={formData.machine_category}
                onChange={(e) => setFormData((f) => ({ ...f, machine_category: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {MACHINE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                نوع الماكينة
              </label>
              <select
                value={formData.machine_type}
                onChange={(e) => setFormData((f) => ({ ...f, machine_type: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {MACHINE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                ملكية الماكينة
              </label>
              <select
                value={formData.machine_ownership}
                onChange={(e) => setFormData((f) => ({ ...f, machine_ownership: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {MACHINE_OWNERSHIP.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {needsReplacementMachine && companyMachines.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  الماكينة البديلة
                </label>
                <select
                  value={formData.replacement_machine_id ?? ''}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      replacement_machine_id: e.target.value ? Number(e.target.value) : null,
                      monthly_rental_price: e.target.value
                        ? String(companyMachines.find((m) => m.id === Number(e.target.value))?.monthly_rental_price ?? '')
                        : f.monthly_rental_price,
                    }))
                  }
                  className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
                >
                  <option value="">اختر ماكينة...</option>
                  {companyMachines
                    .filter((m) => m.status === 'available')
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} {m.monthly_rental_price ? `(${m.monthly_rental_price} ج.م/شهر)` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {needsRentalPrice && (
              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  الإيجار الشهري (ج.م)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthly_rental_price}
                  onChange={(e) => setFormData((f) => ({ ...f, monthly_rental_price: e.target.value }))}
                  className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
                  placeholder="0.00"
                />
                {formData.monthly_rental_price && (
                  <p className={SUBTITLE_CLASS + ' mt-1'}>
                    الإيجار اليومي: {calculateDailyRentalPrice(Number(formData.monthly_rental_price)).toLocaleString()} ج.م
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                تكلفة الاستلام (ج.م)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.pickup_cost}
                onChange={(e) => setFormData((f) => ({ ...f, pickup_cost: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                تكلفة الإرجاع (ج.م)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.return_cost}
                onChange={(e) => setFormData((f) => ({ ...f, return_cost: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
              ملاحظات داخلية
            </label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData((f) => ({ ...f, internal_notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm resize-none"
              placeholder="ملاحظات داخلية (غير مرئية للعميل)..."
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {isSaving ? 'جاري الحفظ...' : 'حفظ العملية اللوجستية'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!selectedAction && openOps.length === 0 && closedOps.length === 0 && !isLoading && (
        <EmptyState
          variant="inline"
          icon={<TruckIcon />}
          title="لا توجد عمليات لوجستية"
          message="أضف عملية لوجستية جديدة لتتبع حركة الماكينات بين العميل والشركة"
        />
      )}
    </div>
  );
};

export default MachineLogisticsSection;
