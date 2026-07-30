import React, { useState } from 'react';
import { useCompanyMachines } from '../../hooks/useLogisticsOperations';
import { useToast } from '../../components/ToastContext';
import { CompanyMachine } from '../../types';
import {
  PlusCircleIcon,
  TrashIcon,
  PencilIcon,
  TruckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import EmptyState from '../../components/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { SafeModal } from '../../components/form-ui/SafeModal';

const MACHINE_CATEGORIES = [
  { value: 'coffee', label: 'ماكينة قهوة' },
  { value: 'grinder', label: 'مطحنة' },
  { value: 'other', label: 'أخرى' },
];

const MACHINE_TYPES = [
  { value: 'manual', label: 'يدوي' },
  { value: 'automatic', label: 'أوتوماتيك' },
  { value: 'semi_automatic', label: 'نصف أوتوماتيك' },
];

const STATUS_OPTIONS = [
  { value: 'available', label: 'متاحة', color: 'bg-leaf-100 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300' },
  { value: 'in_use', label: 'قيد الاستخدام', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'damaged', label: 'تالفة', color: 'bg-ember-100 text-ember-700 dark:bg-ember-500/10 dark:text-ember-300' },
  { value: 'lost', label: 'مفقودة', color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400' },
];

const emptyMachineForm = {
  name: '',
  category: 'coffee',
  machine_type: 'manual',
  status: 'available',
  monthly_rental_price: '',
  notes: '',
};

const CompanyMachinesSettings: React.FC = () => {
  const { showToast } = useToast();
  const { machines, isLoading, addMachine, updateMachine, deleteMachine, refresh } = useCompanyMachines();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyMachineForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const openAdd = () => {
    setEditId(null);
    setForm(emptyMachineForm);
    setModalOpen(true);
  };

  const openEdit = (machine: CompanyMachine) => {
    setEditId(machine.id);
    setForm({
      name: machine.name,
      category: machine.category,
      machine_type: machine.machine_type || 'manual',
      status: machine.status,
      monthly_rental_price: machine.monthly_rental_price?.toString() || '',
      notes: machine.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast('اسم الماكينة مطلوب', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        machine_type: form.machine_type,
        status: form.status,
        monthly_rental_price: form.monthly_rental_price ? Number(form.monthly_rental_price) : undefined,
        notes: form.notes || undefined,
      };
      if (editId) {
        await updateMachine(editId, data);
        showToast('تم تحديث الماكينة بنجاح', 'success');
      } else {
        await addMachine(data as any);
        showToast('تمت إضافة الماكينة بنجاح', 'success');
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'فشل حفظ الماكينة', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMachine(deleteId);
      showToast('تم حذف الماكينة بنجاح', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'فشل حذف الماكينة', 'error');
    }
    setDeleteId(null);
  };

  const getStatusLabel = (status: string) => STATUS_OPTIONS.find(s => s.value === status)?.label || status;
  const getStatusClass = (status: string) => STATUS_OPTIONS.find(s => s.value === status)?.color || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-primary dark:text-white">إدارة ماكينات الشركة</h1>
          <p className="text-sm text-latte mt-1">إدارة ماكينات الشركة البديلة المستخدمة في العمليات اللوجستية</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <PlusCircleIcon className="w-5 h-5" />
          إضافة ماكينة
        </button>
      </div>

      {machines.length === 0 ? (
        <EmptyState
          variant="page"
          icon={<TruckIcon />}
          title="لا توجد ماكينات"
          message="أضف ماكينات الشركة البديلة لتتمكن من استخدامها في العمليات اللوجستية"
          actionLabel="إضافة ماكينة"
          onAction={openAdd}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {machines.map((machine) => (
            <div
              key={machine.id}
              className="bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-primary dark:text-white">{machine.name}</h3>
                  <span className="text-xs text-latte">
                    {MACHINE_CATEGORIES.find(c => c.value === machine.category)?.label || machine.category}
                    {machine.machine_type && ` · ${MACHINE_TYPES.find(t => t.value === machine.machine_type)?.label || machine.machine_type}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(machine)}
                    className="p-1.5 text-latte hover:text-primary rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light transition-colors"
                    title="تعديل"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(machine.id)}
                    className="p-1.5 text-latte hover:text-ember-500 rounded-lg hover:bg-ember-50 dark:hover:bg-ember-500/10 transition-colors"
                    title="حذف"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClass(machine.status)}`}>
                  {machine.status === 'available' && <CheckCircleIcon className="w-3 h-3 inline me-1" />}
                  {machine.status === 'in_use' && <ExclamationCircleIcon className="w-3 h-3 inline me-1" />}
                  {getStatusLabel(machine.status)}
                </span>
                {machine.monthly_rental_price != null && (
                  <span className="text-sm font-medium text-primary dark:text-latte/70">
                    {machine.monthly_rental_price.toLocaleString()} ج.م / شهر
                  </span>
                )}
              </div>
              {machine.notes && (
                <p className="mt-2 text-xs text-latte line-clamp-2">{machine.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <SafeModal
        isOpen={modalOpen}
        onClose={() => !isSaving && setModalOpen(false)}
        title={editId ? 'تعديل الماكينة' : 'إضافة ماكينة جديدة'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">اسم الماكينة *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              placeholder="أدخل اسم الماكينة"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">الفئة</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {MACHINE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">النوع</label>
              <select
                value={form.machine_type}
                onChange={(e) => setForm(f => ({ ...f, machine_type: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {MACHINE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">الحالة</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">الإيجار الشهري (ج.م)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.monthly_rental_price}
                onChange={(e) => setForm(f => ({ ...f, monthly_rental_price: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm resize-none"
              placeholder="ملاحظات داخلية..."
            />
          </div>
          <div className="flex ltr:justify-end rtl:justify-start gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {isSaving ? 'جاري الحفظ...' : editId ? 'تحديث' : 'إضافة'}
            </button>
          </div>
        </div>
      </SafeModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذه الماكينة؟ لا يمكن التراجع عن هذا الإجراء."
        confirmLabel="حذف"
      />
    </div>
  );
};

export default CompanyMachinesSettings;
