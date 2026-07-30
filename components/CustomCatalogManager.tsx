import React, { useState, useMemo } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useCustomCatalog, CustomCatalogItem } from '../hooks/useCustomCatalog';
import AddCustomCatalogItemDialog from './AddCustomCatalogItemDialog';

const typeLabels: Record<CustomCatalogItem['type'], string> = {
  part: 'قطع الغيار',
  service: 'الخدمات',
  problem: 'المشاكل',
};

const typeBadgeClasses: Record<CustomCatalogItem['type'], string> = {
  part: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  service: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  problem: 'bg-ember-100 text-ember-700 dark:bg-ember-900/30 dark:text-ember-300',
};

const CustomCatalogManager: React.FC = () => {
  const {
    customParts,
    customServices,
    customProblems,
    isLoading,
    error,
    addItem,
    updateItem,
    deleteItem,
  } = useCustomCatalog();

  const [activeType, setActiveType] = useState<CustomCatalogItem['type']>('service');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomCatalogItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const allItems = useMemo(() => {
    return [...customParts, ...customServices, ...customProblems].sort(
      (a, b) => a.label.localeCompare(b.label, 'ar')
    );
  }, [customParts, customServices, customProblems]);

  const filteredItems = useMemo(() => {
    switch (activeType) {
      case 'part':
        return customParts;
      case 'service':
        return customServices;
      case 'problem':
        return customProblems;
      default:
        return [];
    }
  }, [activeType, customParts, customServices, customProblems]);

  const existingCategories = useMemo(() => {
    const cats = new Set<string>();
    allItems.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats);
  }, [allItems]);

  const handleEdit = (item: CustomCatalogItem) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingItem(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (item: Omit<CustomCatalogItem, 'id'>) => {
    if (editingItem) {
      await updateItem(editingItem.id, item);
    } else {
      await addItem(item);
    }
    setIsDialogOpen(false);
    setEditingItem(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteItem(deleteId);
    setDeleteId(null);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center text-latte animate-pulse">
        جاري تحميل العناصر المخصصة...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-ember-700 bg-ember-50 rounded-xl border border-ember-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-primary dark:text-white">إدارة الكتالوج المخصص</h2>
        <button
          onClick={handleAdd}
          className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          إضافة عنصر
        </button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-hairline pb-4">
        {(['service', 'part', 'problem'] as CustomCatalogItem['type'][]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeType === type
                ? 'bg-primary text-white'
                : 'bg-cream-2 text-text hover:bg-cream-3'
            }`}
          >
            {typeLabels[type]}
          </button>
        ))}
      </div>

      <div className="bg-cream dark:bg-espresso rounded-xl border border-hairline overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-latte">
            لا توجد عناصر مخصصة من نوع {typeLabels[activeType]} بعد.
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 flex items-start sm:items-center justify-between gap-4 hover:bg-cream-2/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${typeBadgeClasses[item.type]}`}>
                      {typeLabels[item.type]}
                    </span>
                    {item.category && (
                      <span className="text-xs text-latte bg-cream-2 px-2 py-0.5 rounded-full">
                        {item.category}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 font-medium text-text truncate">{item.label}</p>
                  {item.cost !== undefined && item.cost !== null && (
                    <p className="text-sm text-latte">{item.cost.toLocaleString()} جم</p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-latte hover:text-primary hover:bg-cream-2 rounded-lg transition-colors"
                    aria-label="تعديل"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(item.id)}
                    className="p-2 text-latte hover:text-ember-500 hover:bg-ember-50 rounded-lg transition-colors"
                    aria-label="حذف"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddCustomCatalogItemDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingItem(null);
        }}
        onSubmit={handleSubmit}
        mode={editingItem ? 'edit' : 'add'}
        initialValues={
          editingItem
            ? {
                type: editingItem.type,
                label: editingItem.label,
                value: editingItem.value,
                category: editingItem.category,
                cost: editingItem.cost,
                isFrequentlyReplaced: (editingItem as any).isFrequentlyReplaced,
                description: (editingItem as any).description,
              }
            : { type: activeType }
        }
        existingCategories={existingCategories}
        lockType
      />

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-cream dark:bg-espresso rounded-2xl shadow-2xl border border-hairline p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-primary dark:text-white">تأكيد الحذف</h3>
              <button
                onClick={() => setDeleteId(null)}
                className="p-1 rounded-full text-latte hover:text-text hover:bg-cream-2"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-text mb-6">
              هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-latte hover:text-text rounded-lg transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-ember-500 hover:bg-ember-600 rounded-lg transition-colors"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomCatalogManager;
