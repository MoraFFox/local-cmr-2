import React, { useEffect, useMemo, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CatalogItemType, CustomCatalogItem } from '../hooks/useCustomCatalog';
import { useT } from '../utils/i18n';

interface AddCustomCatalogItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (item: Omit<CustomCatalogItem, 'id'>) => void | Promise<void>;
  mode?: 'add' | 'edit';
  initialValues?: Partial<CustomCatalogItem>;
  existingCategories?: string[];
  /** When true, the type (problem/service/part) is fixed and the type selector is hidden. */
  lockType?: boolean;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return '';
}

const AddCustomCatalogItemDialog: React.FC<AddCustomCatalogItemDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
  mode = 'add',
  initialValues,
  existingCategories = [],
  lockType = false,
}) => {
  const t = useT();
  const typeLabels: Record<CatalogItemType, string> = {
    part: t.ui.customCatalog.typePart,
    service: t.ui.customCatalog.typeService,
    problem: t.ui.customCatalog.typeProblem,
  };
  const [type, setType] = useState<CatalogItemType>(initialValues?.type ?? 'service');
  const [label, setLabel] = useState(initialValues?.label ?? '');
  const [value, setValue] = useState(initialValues?.value ?? '');
  const [category, setCategory] = useState(initialValues?.category ?? '');
  const [newCategory, setNewCategory] = useState('');
  const [cost, setCost] = useState<string>(
    initialValues?.cost !== undefined ? String(initialValues.cost) : ''
  );
  const [isFrequentlyReplaced, setIsFrequentlyReplaced] = useState(
    initialValues?.isFrequentlyReplaced ?? false
  );
  const [description, setDescription] = useState(initialValues?.description ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setType(initialValues?.type ?? 'service');
      setLabel(initialValues?.label ?? '');
      setValue(initialValues?.value ?? '');
      setCategory(initialValues?.category ?? '');
      setNewCategory('');
      setCost(initialValues?.cost !== undefined ? String(initialValues.cost) : '');
      setIsFrequentlyReplaced(initialValues?.isFrequentlyReplaced ?? false);
      setDescription(initialValues?.description ?? '');
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const isNewCategory = category === '__new__';
  const finalCategory = isNewCategory ? newCategory.trim() : category;

  const needsCost = type === 'part' || type === 'service';

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    if (!label.trim()) {
      nextErrors.label = t.ui.customCatalog.nameRequired;
    }
    if (needsCost) {
      const costNum = parseFloat(cost);
      if (Number.isNaN(costNum) || costNum < 0) {
        nextErrors.cost = t.ui.customCatalog.costRequired;
      }
    }
    if (type === 'service' && !finalCategory) {
      nextErrors.category = t.ui.customCatalog.categoryRequired;
    }
    if (type === 'problem' && !finalCategory) {
      nextErrors.category = t.ui.customCatalog.categoryRequired;
    }
    if (isNewCategory && !newCategory.trim()) {
      nextErrors.newCategory = t.ui.customCatalog.newCategoryRequired;
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const item: Omit<CustomCatalogItem, 'id'> = {
      type,
      label: label.trim(),
      value: value.trim() || label.trim(),
      category: finalCategory || null,
      cost: needsCost ? parseFloat(cost) : null,
      isFrequentlyReplaced: type === 'part' ? isFrequentlyReplaced : false,
      description: description.trim() || null,
    };

    try {
      await onSubmit(item);
      onClose();
    } catch (err) {
      const message = getErrorMessage(err) || t.ui.customCatalog.saveError;
      setSubmitError(t.ui.customCatalog.saveFailedWithMessage.replace('{{message}}', message));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-item-dialog-title"
    >
      <div className="w-full max-w-md bg-cream dark:bg-espresso rounded-2xl shadow-2xl border border-hairline dark:border-hairline overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-hairline dark:border-hairline">
          <h2 id="custom-item-dialog-title" className="text-lg font-bold text-primary dark:text-white">
            {mode === 'edit' ? t.ui.customCatalog.editItemTitle : t.ui.customCatalog.addItemTitle}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-full text-latte hover:text-text hover:bg-cream-2 transition-colors"
            aria-label={t.common.close}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type selector — hidden when the type is locked to a phase */}
          {!lockType && (
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">{t.ui.customCatalog.typeLabel}</label>
              <div className="grid grid-cols-3 gap-2">
                {(['service', 'part', 'problem'] as CatalogItemType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                      type === t
                        ? 'bg-primary text-white border-primary'
                        : 'bg-cream-2 text-text border-hairline hover:border-primary/50'
                    }`}
                  >
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="custom-item-label" className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
              {t.ui.customCatalog.nameLabel} <span className="text-ember-500">*</span>
            </label>
            <input
              id="custom-item-label"
              type="text"
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!value || value === label) {
                  setValue(e.target.value);
                }
              }}
              className="w-full px-3 py-2 bg-cream dark:bg-espresso-light text-text rounded-lg border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none"
              placeholder={t.ui.customCatalog.namePlaceholder}
            />
            {errors.label && <p className="mt-1 text-xs text-ember-700">{errors.label}</p>}
          </div>

          {/* Cost for parts/services */}
          {needsCost && (
            <div>
              <label htmlFor="custom-item-cost" className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                {t.ui.customCatalog.costLabel} <span className="text-ember-500">*</span>
              </label>
              <input
                id="custom-item-cost"
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full px-3 py-2 bg-cream dark:bg-espresso-light text-text rounded-lg border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none"
                placeholder="0.00"
              />
              {errors.cost && <p className="mt-1 text-xs text-ember-700">{errors.cost}</p>}
            </div>
          )}

          {/* Category */}
          {(type === 'service' || type === 'problem') && (
            <div>
              <label htmlFor="custom-item-category" className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                {t.ui.customCatalog.categoryLabel} <span className="text-ember-500">*</span>
              </label>
              <select
                id="custom-item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-cream dark:bg-espresso-light text-text rounded-lg border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none mb-2"
              >
                <option value="">{t.ui.customCatalog.chooseCategory}</option>
                {existingCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__new__">{t.ui.customCatalog.newCategoryOption}</option>
              </select>
              {isNewCategory && (
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-cream dark:bg-espresso-light text-text rounded-lg border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none"
                  placeholder={t.ui.customCatalog.newCategoryPlaceholder}
                />
              )}
              {(errors.category || errors.newCategory) && (
                <p className="mt-1 text-xs text-ember-700">{errors.category || errors.newCategory}</p>
              )}
            </div>
          )}

          {/* Frequently replaced toggle for parts */}
          {type === 'part' && (
            <div className="flex items-center gap-2">
              <input
                id="custom-item-frequent"
                type="checkbox"
                checked={isFrequentlyReplaced}
                onChange={(e) => setIsFrequentlyReplaced(e.target.checked)}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="custom-item-frequent" className="text-sm text-primary dark:text-latte/70">
                {t.ui.customCatalog.frequentlyReplaced}
              </label>
            </div>
          )}

          {/* Description for services */}
          {type === 'service' && (
            <div>
              <label htmlFor="custom-item-description" className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">
                {t.ui.customCatalog.descriptionLabel}
              </label>
              <input
                id="custom-item-description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-cream dark:bg-espresso-light text-text rounded-lg border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none"
                placeholder={t.ui.customCatalog.descriptionPlaceholder}
              />
            </div>
          )}

          {/* Actions */}
          {submitError && (
            <div className="rounded-lg bg-ember-50 dark:bg-ember-900/20 border border-ember-200 dark:border-ember-800 p-3 text-sm text-ember-700 dark:text-ember-200">
              {submitError}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-latte hover:text-text rounded-lg transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {isSubmitting && (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {mode === 'edit' ? t.ui.customCatalog.saveEdit : t.common.add}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCustomCatalogItemDialog;
