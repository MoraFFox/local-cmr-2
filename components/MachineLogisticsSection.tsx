import React, { useState, useMemo } from 'react';
import {
  TruckIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useLogisticsOperations, useCompanyMachines, calculateDailyRentalPrice } from '../hooks/useLogisticsOperations';
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

/** Resolve a stored category value to its Arabic label (or raw custom text). */
const getCategoryLabel = (value?: string | null): string =>
  MACHINE_CATEGORIES.find((c) => c.value === value)?.label || value || '—';

const getTypeLabel = (value?: string | null): string =>
  MACHINE_TYPES.find((t) => t.value === value)?.label || value || '—';

const INPUT_CLASS =
  'w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm';

const MachineLogisticsSection: React.FC<MachineLogisticsSectionProps> = ({
  customerId,
  recordId,
  maintenanceDate,
}) => {
  const { showToast } = useToast();
  const { operations, isLoading, createOperation, closeOperation, updateOperation, deleteOperation, refresh } =
    useLogisticsOperations(customerId);
  const { machines: companyMachines } = useCompanyMachines();

  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [editingOpId, setEditingOpId] = useState<number | null>(null);
  const [showCloseForm, setShowCloseForm] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state for new/edit operation
  const [formData, setFormData] = useState({
    machine_category: 'coffee',
    machine_category_other: '',
    machine_ownership: 'customer',
    machine_type: 'manual',
    given_machine_category: 'coffee',
    given_machine_category_other: '',
    given_machine_type: 'manual',
    replacement_machine_id: null as number | null,
    monthly_rental_price: '',
    pickup_cost: '',
    return_cost: '',
    internal_notes: '',
    // Close-time data — only editable when editing a closed operation
    maintenance_cost: '',
    work_done: '',
  });

  // Close form state (maintenance cost + work done — required)
  const [closeForm, setCloseForm] = useState({ maintenance_cost: '', work_done: '' });

  const openOps = useMemo(() => operations.filter((o) => o.status === 'open'), [operations]);
  const closedOps = useMemo(() => operations.filter((o) => o.status === 'closed'), [operations]);

  const editingOp = editingOpId != null ? operations.find((o) => o.id === editingOpId) : undefined;
  const activeType = (editingOp?.operation_type ?? selectedAction) as
    | 'pickup_and_deliver'
    | 'deliver_only'
    | 'pickup_only'
    | null;
  const needsRentalPrice = activeType === 'pickup_and_deliver' || activeType === 'deliver_only';
  const needsReplacementMachine = needsRentalPrice;

  const resetForm = () => {
    setSelectedAction(null);
    setEditingOpId(null);
    setShowCloseForm(null);
    setDeleteConfirmId(null);
    setFormData({
      machine_category: 'coffee',
      machine_category_other: '',
      machine_ownership: 'customer',
      machine_type: 'manual',
      given_machine_category: 'coffee',
      given_machine_category_other: '',
      given_machine_type: 'manual',
      replacement_machine_id: null,
      monthly_rental_price: '',
      pickup_cost: '',
      return_cost: '',
      internal_notes: '',
      maintenance_cost: '',
      work_done: '',
    });
    setCloseForm({ maintenance_cost: '', work_done: '' });
  };

  /** Resolve the stored category: 'other' → the typed custom text. */
  const resolveCategory = (cat: string, otherText: string): string =>
    cat === 'other' ? (otherText.trim() || 'other') : cat;

  const fillFormFromOperation = (op: LogisticsOperation) => {
    const cat = op.machine_category && !MACHINE_CATEGORIES.some((c) => c.value === op.machine_category)
      ? 'other'
      : (op.machine_category || 'coffee');
    const givenCat = op.given_machine_category && !MACHINE_CATEGORIES.some((c) => c.value === op.given_machine_category)
      ? 'other'
      : (op.given_machine_category || 'coffee');
    setSelectedAction(op.operation_type);
    setEditingOpId(op.id);
    setFormData({
      machine_category: cat,
      machine_category_other: cat === 'other' ? op.machine_category || '' : '',
      machine_ownership: op.machine_ownership || 'customer',
      machine_type: op.machine_type || 'manual',
      given_machine_category: givenCat,
      given_machine_category_other: givenCat === 'other' ? op.given_machine_category || '' : '',
      given_machine_type: op.given_machine_type || 'manual',
      replacement_machine_id: op.replacement_machine_id ?? null,
      monthly_rental_price: op.monthly_rental_price != null ? String(op.monthly_rental_price) : '',
      pickup_cost: op.pickup_cost != null && op.pickup_cost > 0 ? String(op.pickup_cost) : '',
      return_cost: op.return_cost != null && op.return_cost > 0 ? String(op.return_cost) : '',
      internal_notes: op.internal_notes || '',
      maintenance_cost: op.maintenance_cost != null ? String(op.maintenance_cost) : '',
      work_done: op.work_done || '',
    });
    setShowCloseForm(null);
    setDeleteConfirmId(null);
  };

  const handleSave = async () => {
    if (!customerId || !activeType) return;
    setIsSaving(true);
    try {
      const base = {
        operation_type: activeType,
        open_date: maintenanceDate,
        machine_category: resolveCategory(formData.machine_category, formData.machine_category_other),
        machine_ownership: formData.machine_ownership,
        machine_type: formData.machine_type,
        // No machine is given for pickup_only — don't store a default description
        given_machine_category:
          activeType !== 'pickup_only'
            ? resolveCategory(formData.given_machine_category, formData.given_machine_category_other)
            : undefined,
        given_machine_type: activeType !== 'pickup_only' ? formData.given_machine_type : undefined,
        replacement_machine_id: formData.replacement_machine_id,
        monthly_rental_price: needsRentalPrice && formData.monthly_rental_price
          ? Number(formData.monthly_rental_price)
          : undefined,
        pickup_cost: formData.pickup_cost ? Number(formData.pickup_cost) : 0,
        return_cost: formData.return_cost ? Number(formData.return_cost) : 0,
        internal_notes: formData.internal_notes || undefined,
      };

      if (editingOp) {
        // Validate close-time data on closed-op edits (matches the close form)
        if (editingOp.status === 'closed' && formData.maintenance_cost !== '' && isNaN(Number(formData.maintenance_cost))) {
          showToast('تكلفة الصيانة يجب أن تكون رقماً صحيحاً', 'error');
          setIsSaving(false);
          return;
        }
        await updateOperation(editingOp.id, {
          ...base,
          // Close-time data — editable only for closed operations.
          // Use !== '' so explicit zeroing (cost 0) or clearing (empty text) saves correctly.
          maintenance_cost:
            editingOp.status === 'closed' && formData.maintenance_cost !== ''
              ? Number(formData.maintenance_cost)
              : undefined,
          work_done:
            editingOp.status === 'closed'
              ? formData.work_done.trim()
              : undefined,
        });
        showToast('تم تحديث العملية اللوجستية بنجاح', 'success');
      } else {
        await createOperation(base, recordId);
        showToast('تم إنشاء العملية اللوجستية بنجاح', 'success');
      }
      resetForm();
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'فشل حفظ العملية', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const openCloseForm = (operationId: number) => {
    setShowCloseForm(operationId);
    setCloseForm({ maintenance_cost: '', work_done: '' });
    setDeleteConfirmId(null);
  };

  const handleClose = async (operationId: number) => {
    const cost = Number(closeForm.maintenance_cost);
    const workDone = closeForm.work_done.trim();
    if (!closeForm.maintenance_cost || isNaN(cost) || cost < 0) {
      showToast('يجب إدخال تكلفة الصيانة (رقم موجب)', 'error');
      return;
    }
    if (!workDone) {
      showToast('يجب توضيح الأعمال المنفذة على الماكينة', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await closeOperation(operationId, {
        closed_by_record_id: recordId,
        close_date: maintenanceDate,
        maintenance_cost: cost,
        work_done: workDone,
      });
      showToast('تم إغلاق العملية اللوجستية بنجاح', 'success');
      setShowCloseForm(null);
      setCloseForm({ maintenance_cost: '', work_done: '' });
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'فشل إغلاق العملية', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (operationId: number) => {
    setIsSaving(true);
    try {
      await deleteOperation(operationId);
      showToast('تم حذف العملية اللوجستية', 'success');
      setDeleteConfirmId(null);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'فشل حذف العملية', 'error');
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

  const renderMachineDetails = (op: LogisticsOperation) => (
    <div className="text-xs text-latte space-y-0.5">
      <div className="flex items-center gap-1.5">
        <span className="font-medium text-primary dark:text-latte/70">ماكينة العميل:</span>
        <span>{getCategoryLabel(op.machine_category)}</span>
        {op.machine_type && <span>· {getTypeLabel(op.machine_type)}</span>}
      </div>
      {(op.given_machine_category || op.given_machine_type) && (
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-primary dark:text-latte/70">الماكينة المقدمة:</span>
          <span>{getCategoryLabel(op.given_machine_category)}</span>
          {op.given_machine_type && <span>· {getTypeLabel(op.given_machine_type)}</span>}
        </div>
      )}
      {op.company_machines && <div>البديلة (المخزن): {op.company_machines.name}</div>}
      {op.monthly_rental_price != null && (
        <div>الإيجار الشهري: {op.monthly_rental_price.toLocaleString()} ج.م</div>
      )}
    </div>
  );

  const renderCloseForm = (op: LogisticsOperation) => (
    <div className="mt-3 p-3 bg-white dark:bg-espresso rounded-lg border border-hairline space-y-3">
      <p className="text-sm text-primary dark:text-latte/70">
        سيتم إغلاق هذه العملية باستخدام تاريخ الزيارة الحالي ({maintenanceDate}).
        {op.monthly_rental_price != null && (
          <span className="block mt-1 text-xs">
            الإيجار اليومي: {calculateDailyRentalPrice(op.monthly_rental_price).toLocaleString()} ج.م
          </span>
        )}
      </p>

      <div>
        <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
          تكلفة الصيانة المنفذة على ماكينة العميل (ج.م) <span className="text-red-500">*</span>
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={closeForm.maintenance_cost}
          onChange={(e) => setCloseForm((f) => ({ ...f, maintenance_cost: e.target.value }))}
          className={INPUT_CLASS}
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
          الأعمال المنفذة على الماكينة <span className="text-red-500">*</span>
        </label>
        <textarea
          value={closeForm.work_done}
          onChange={(e) => setCloseForm((f) => ({ ...f, work_done: e.target.value }))}
          rows={2}
          className={INPUT_CLASS + ' resize-none'}
          placeholder="مثال: تغيير قطع غيار، صيانة، تنظيف عام..."
        />
      </div>

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
          onClick={() => setShowCloseForm(null)}
          disabled={isSaving}
          className="px-3 py-1.5 text-xs font-medium text-latte hover:text-primary rounded-lg transition-colors"
        >
          إلغاء
        </button>
      </div>
    </div>
  );

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
              {renderMachineDetails(op)}
              {showCloseForm === op.id ? (
                renderCloseForm(op)
              ) : (
                <div className="mt-3 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => openCloseForm(op.id)}
                    className="text-xs font-medium text-leaf-600 dark:text-leaf-400 hover:text-leaf-700 dark:hover:text-leaf-300 transition-colors"
                  >
                    إغلاق هذه العملية
                  </button>
                  <button
                    type="button"
                    onClick={() => fillFormFromOperation(op)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <PencilSquareIcon className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                  {deleteConfirmId === op.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-latte">حذف هذه العملية؟</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(op.id)}
                        disabled={isSaving}
                        className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        تأكيد
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-latte hover:text-primary transition-colors"
                      >
                        إلغاء
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(op.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      حذف
                    </button>
                  )}
                </div>
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
            {closedOps.slice(0, 10).map((op) => (
              <div
                key={op.id}
                className="p-3 bg-cream dark:bg-espresso-light/30 rounded-lg border border-hairline"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm text-primary dark:text-latte/70">
                    {getOperationTypeLabel(op.operation_type)}
                  </span>
                  {getStatusBadge(op.status)}
                </div>
                {renderMachineDetails(op)}
                {op.maintenance_cost != null && (
                  <div className="text-xs text-latte mt-1">
                    تكلفة الصيانة: {op.maintenance_cost.toLocaleString()} ج.م
                    {op.work_done && <span className="block mt-0.5">الأعمال: {op.work_done}</span>}
                  </div>
                )}
                {op.total_logistics_cost != null && (
                  <div className="text-xs text-latte mt-1">
                    التكلفة الإجمالية: {op.total_logistics_cost.toLocaleString()} ج.م
                  </div>
                )}
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => fillFormFromOperation(op)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <PencilSquareIcon className="w-3.5 h-3.5" />
                    تعديل
                  </button>
                  {deleteConfirmId === op.id ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-xs text-latte">حذف هذه العملية؟</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(op.id)}
                        disabled={isSaving}
                        className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        تأكيد
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs text-latte hover:text-primary transition-colors"
                      >
                        إلغاء
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(op.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
                    >
                      <TrashIcon className="w-3.5 h-3.5" />
                      حذف
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Three Visual Cards */}
      {!selectedAction && editingOpId == null && (
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

      {/* New / Edit Operation Form */}
      {(selectedAction || editingOpId != null) && (
        <div className="p-4 bg-cream dark:bg-espresso-light/50 rounded-lg border border-hairline space-y-4">
          <div className="flex items-center justify-between">
            <h5 className="font-semibold text-primary dark:text-white">
              {editingOp
                ? `تعديل العملية — ${getOperationTypeLabel(editingOp.operation_type)}`
                : LOGISTICS_ACTIONS.find((a) => a.type === selectedAction)?.title}
            </h5>
            <button
              type="button"
              onClick={resetForm}
              className="text-xs text-latte hover:text-primary transition-colors"
            >
              إلغاء
            </button>
          </div>

          {/* Client machine (taken from client) */}
          <div className="p-3 rounded-lg border border-hairline dark:border-hairline space-y-3">
            <h6 className="text-xs font-semibold text-primary dark:text-latte/70">
              ماكينة العميل (المستلمة)
            </h6>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  فئة الماكينة
                </label>
                <select
                  value={formData.machine_category}
                  onChange={(e) => setFormData((f) => ({ ...f, machine_category: e.target.value }))}
                  className={INPUT_CLASS}
                >
                  {MACHINE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {formData.machine_category === 'other' && (
                  <input
                    type="text"
                    value={formData.machine_category_other}
                    onChange={(e) => setFormData((f) => ({ ...f, machine_category_other: e.target.value }))}
                    className={INPUT_CLASS + ' mt-2'}
                    placeholder="اكتب الفئة الجديدة..."
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  نظام الماكينة
                </label>
                <select
                  value={formData.machine_type}
                  onChange={(e) => setFormData((f) => ({ ...f, machine_type: e.target.value }))}
                  className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
                >
                  {MACHINE_OWNERSHIP.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Given machine (delivered to client) — not applicable for pickup_only */}
          {activeType !== 'pickup_only' && (
          <div className="p-3 rounded-lg border border-hairline dark:border-hairline space-y-3">
            <h6 className="text-xs font-semibold text-primary dark:text-latte/70">
              الماكينة المقدمة للعميل
            </h6>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  فئة الماكينة
                </label>
                <select
                  value={formData.given_machine_category}
                  onChange={(e) => setFormData((f) => ({ ...f, given_machine_category: e.target.value }))}
                  className={INPUT_CLASS}
                >
                  {MACHINE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
                {formData.given_machine_category === 'other' && (
                  <input
                    type="text"
                    value={formData.given_machine_category_other}
                    onChange={(e) => setFormData((f) => ({ ...f, given_machine_category_other: e.target.value }))}
                    className={INPUT_CLASS + ' mt-2'}
                    placeholder="اكتب الفئة الجديدة..."
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  نظام الماكينة
                </label>
                <select
                  value={formData.given_machine_type}
                  onChange={(e) => setFormData((f) => ({ ...f, given_machine_type: e.target.value }))}
                  className={INPUT_CLASS}
                >
                  {MACHINE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {needsReplacementMachine && companyMachines.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                  الماكينة البديلة (من المخزن)
                </label>
                <select
                  value={formData.replacement_machine_id ?? ''}
                  onChange={(e) => {
                    const selected: CompanyMachine | undefined = companyMachines.find(
                      (m) => m.id === Number(e.target.value),
                    );
                    setFormData((f) => ({
                      ...f,
                      replacement_machine_id: e.target.value ? Number(e.target.value) : null,
                      monthly_rental_price: e.target.value
                        ? String(selected?.monthly_rental_price ?? f.monthly_rental_price)
                        : f.monthly_rental_price,
                      // Auto-fill given-machine description from the inventory machine
                      given_machine_category: selected?.category
                        ? MACHINE_CATEGORIES.some((c) => c.value === selected.category)
                          ? selected.category
                          : 'other'
                        : f.given_machine_category,
                      given_machine_category_other: selected && !MACHINE_CATEGORIES.some((c) => c.value === selected.category)
                        ? selected.category
                        : f.given_machine_category_other,
                      given_machine_type: selected?.machine_type || f.given_machine_type,
                    }));
                  }}
                  className={INPUT_CLASS}
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
                  className={INPUT_CLASS}
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
                className={INPUT_CLASS}
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
                className={INPUT_CLASS}
                placeholder="0.00"
              />
            </div>
          </div>

          {editingOp && editingOp.status === 'closed' && (
            <div className="p-3 rounded-lg border border-hairline dark:border-hairline space-y-3">
              <h6 className="text-xs font-semibold text-primary dark:text-latte/70">بيانات الإغلاق</h6>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                    تكلفة الصيانة (ج.م)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.maintenance_cost}
                    onChange={(e) => setFormData((f) => ({ ...f, maintenance_cost: e.target.value }))}
                    className={INPUT_CLASS}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                    الأعمال المنفذة على الماكينة
                  </label>
                  <textarea
                    value={formData.work_done}
                    onChange={(e) => setFormData((f) => ({ ...f, work_done: e.target.value }))}
                    rows={2}
                    className={INPUT_CLASS + ' resize-none'}
                    placeholder="مثال: تغيير قطع غيار، صيانة..."
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
              ملاحظات داخلية
            </label>
            <textarea
              value={formData.internal_notes}
              onChange={(e) => setFormData((f) => ({ ...f, internal_notes: e.target.value }))}
              rows={2}
              className={INPUT_CLASS + ' resize-none'}
              placeholder="ملاحظات داخلية (غير مرئية للعميل)..."
            />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
          >
            {isSaving
              ? 'جاري الحفظ...'
              : editingOp
              ? 'حفظ التعديلات'
              : 'حفظ العملية اللوجستية'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!selectedAction && editingOpId == null && openOps.length === 0 && closedOps.length === 0 && !isLoading && (
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
