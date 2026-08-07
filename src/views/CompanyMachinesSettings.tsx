import React, { useState, useMemo } from 'react';
import { useCompanyMachines, useMachineNames, findDuplicateNameGroups, normalizeMachineName } from '../../hooks/useLogisticsOperations';
import { useToast } from '../../components/ToastContext';
import { CompanyMachine, MachineNameEntry } from '../../types';
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
import { useT } from '../../utils/i18n';

const MACHINE_CATEGORIES = [
  { value: 'coffee' },
  { value: 'grinder' },
  { value: 'other' },
];

const MACHINE_TYPES = [
  { value: 'manual' },
  { value: 'automatic' },
  { value: 'semi_automatic' },
];

const STATUS_OPTIONS = [
  { value: 'available', color: 'bg-leaf-100 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300' },
  { value: 'in_use', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'damaged', color: 'bg-ember-100 text-ember-700 dark:bg-ember-500/10 dark:text-ember-300' },
  { value: 'lost', color: 'bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400' },
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
  const t = useT();
  const { showToast } = useToast();
  const { machines, isLoading, addMachine, updateMachine, deleteMachine, refresh } = useCompanyMachines();
  // Saved machine names/brands shown as suggestions in the logistics form.
  const { names: savedMachineNames, addMachineName, deleteMachineName, mergeMachineNames } = useMachineNames();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyMachineForm);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [newName, setNewName] = useState('');
  const [isAddingName, setIsAddingName] = useState(false);
  const [deleteNameId, setDeleteNameId] = useState<number | null>(null);
  // Per duplicate group: the id of the name to keep (keyed by normalized name).
  const [mergeChoices, setMergeChoices] = useState<Record<string, number>>({});
  const [isMerging, setIsMerging] = useState(false);

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
      showToast(t.ui.companyMachines.machineNameRequired, 'error');
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
        showToast(t.ui.companyMachines.machineUpdated, 'success');
      } else {
        await addMachine(data as any);
        showToast(t.ui.companyMachines.machineAdded, 'success');
      }
      setModalOpen(false);
      refresh();
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.ui.companyMachines.saveMachineFailed, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteMachine(deleteId);
      showToast(t.ui.companyMachines.machineDeleted, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.ui.companyMachines.deleteMachineFailed, 'error');
    }
    setDeleteId(null);
  };

  const handleAddName = async () => {
    if (!newName.trim()) {
      showToast(t.ui.companyMachines.typeNameFirst, 'error');
      return;
    }
    setIsAddingName(true);
    try {
      await addMachineName(newName.trim());
      setNewName('');
      showToast(t.ui.companyMachines.nameSaved, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.ui.companyMachines.saveNameFailed, 'error');
    } finally {
      setIsAddingName(false);
    }
  };

  const handleDeleteName = async () => {
    if (deleteNameId === null) return;
    try {
      await deleteMachineName(deleteNameId);
      showToast(t.ui.companyMachines.nameDeleted, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.ui.companyMachines.deleteNameFailed, 'error');
    }
    setDeleteNameId(null);
  };

  // Case/whitespace-insensitive duplicate groups among saved names.
  const duplicateGroups = useMemo(
    () => findDuplicateNameGroups(savedMachineNames),
    [savedMachineNames],
  );

  // All members of a group share the same normalized key.
  const getGroupKey = (group: MachineNameEntry[]) => normalizeMachineName(group[0].name);

  // Default: keep the first member of each group unless the user picked another.
  const getKeepId = (group: MachineNameEntry[]) => mergeChoices[getGroupKey(group)] ?? group[0].id;

  const handleMergeGroup = async (group: MachineNameEntry[]) => {
    const keepId = getKeepId(group);
    const duplicateIds = group.filter((n) => n.id !== keepId).map((n) => n.id);
    if (duplicateIds.length === 0) return;
    setIsMerging(true);
    try {
      await mergeMachineNames(keepId, duplicateIds);
      showToast(t.ui.companyMachines.mergedNames, 'success');
      // Drop the resolved group's choice — the keeper remains, duplicates are gone.
      setMergeChoices((prev) => {
        const next = { ...prev };
        delete next[getGroupKey(group)];
        return next;
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.ui.companyMachines.mergeFailed, 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const getCategoryLabel = (value: string) => {
    switch (value) {
      case 'coffee': return t.ui.companyMachines.catCoffee;
      case 'grinder': return t.ui.companyMachines.catGrinder;
      default: return t.ui.companyMachines.catOther;
    }
  };
  const getTypeLabel = (value: string) => {
    switch (value) {
      case 'manual': return t.ui.companyMachines.typeManual;
      case 'automatic': return t.ui.companyMachines.typeAutomatic;
      default: return t.ui.companyMachines.typeSemiAutomatic;
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return t.ui.companyMachines.statusAvailable;
      case 'in_use': return t.ui.companyMachines.statusInUse;
      case 'damaged': return t.ui.companyMachines.statusDamaged;
      case 'lost': return t.ui.companyMachines.statusLost;
      default: return status;
    }
  };
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
          <h1 className="text-2xl font-bold text-primary dark:text-white">{t.ui.companyMachines.title}</h1>
          <p className="text-sm text-latte mt-1">{t.ui.companyMachines.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
        >
          <PlusCircleIcon className="w-5 h-5" />
          {t.ui.companyMachines.addMachine}
        </button>
      </div>

      {machines.length === 0 ? (
        <EmptyState
          variant="page"
          icon={<TruckIcon />}
          title={t.ui.companyMachines.noMachines}
          message={t.ui.companyMachines.noMachinesMessage}
          actionLabel={t.ui.companyMachines.addMachine}
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
                    {getCategoryLabel(machine.category)}
                    {machine.machine_type && ` · ${getTypeLabel(machine.machine_type)}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(machine)}
                    className="p-1.5 text-latte hover:text-primary rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light transition-colors"
                    title={t.common.edit}
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(machine.id)}
                    className="p-1.5 text-latte hover:text-ember-500 rounded-lg hover:bg-ember-50 dark:hover:bg-ember-500/10 transition-colors"
                    title={t.ui.companyMachines.delete}
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
                    {machine.monthly_rental_price.toLocaleString()} {t.ui.companyMachines.monthlyRentalSuffix}
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

      {/* Saved Machine Names — suggested in the logistics form's Machine Name fields */}
      <div className="mt-10 bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-primary dark:text-white">{t.ui.companyMachines.savedNames}</h2>
            <p className="text-sm text-latte mt-1">{t.ui.companyMachines.savedNamesHint}</p>
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddName();
              }
            }}
            className="flex-1 px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
            placeholder={t.ui.companyMachines.newNamePlaceholder}
            disabled={isAddingName}
          />
          <button
            type="button"
            onClick={handleAddName}
            disabled={isAddingName}
            className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <PlusCircleIcon className="w-4 h-4" />
            {isAddingName ? t.common.saving : t.common.add}
          </button>
        </div>
        {savedMachineNames.length === 0 ? (
          <EmptyState
            variant="inline"
            icon={<TruckIcon className="w-5 h-5" />}
            title={t.ui.companyMachines.noSavedNames}
            message={t.ui.companyMachines.noSavedNamesMessage}
          />
        ) : (
          <ul className="space-y-2">
            {savedMachineNames.map((n) => (
              <li
                key={n.id}
                className="flex items-center justify-between gap-2 bg-white dark:bg-espresso border border-hairline dark:border-hairline rounded-lg px-3 py-2"
              >
                <span className="text-sm text-primary dark:text-white">{n.name}</span>
                <button
                  type="button"
                  onClick={() => setDeleteNameId(n.id)}
                  className="p-1.5 text-latte hover:text-ember-500 rounded-lg hover:bg-ember-50 dark:hover:bg-ember-500/10 transition-colors"
                  title={t.ui.companyMachines.delete}
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Merge near-duplicates — case/whitespace-insensitive groups found in the saved names */}
        {duplicateGroups.length > 0 && (
          <div className="mt-5 pt-5 border-t border-hairline dark:border-hairline">
            <div className="flex items-center gap-2 mb-1">
              <ExclamationCircleIcon className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-primary dark:text-white">{t.ui.companyMachines.duplicateNames}</h3>
            </div>
            <p className="text-xs text-latte mb-4">
              {t.ui.companyMachines.duplicateNamesHint}
            </p>
            <div className="space-y-3">
              {duplicateGroups.map((group) => {
                const keepId = getKeepId(group);
                const groupKey = getGroupKey(group);
                return (
                  <div
                    key={groupKey}
                    className="bg-white dark:bg-espresso border border-hairline dark:border-hairline rounded-lg p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={keepId}
                        onChange={(e) =>
                          setMergeChoices((prev) => ({ ...prev, [groupKey]: Number(e.target.value) }))
                        }
                        disabled={isMerging}
                        aria-label={t.ui.companyMachines.keepNameLabel}
                        className="flex-1 min-w-[180px] px-3 py-2 bg-cream dark:bg-espresso-light text-sm text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        {group.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleMergeGroup(group)}
                        disabled={isMerging}
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
                      >
                        {isMerging ? t.ui.companyMachines.merging : t.ui.companyMachines.merge}
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-latte">
                      {t.ui.companyMachines.willDelete}{' '}
                      {group
                        .filter((n) => n.id !== keepId)
                        .map((n) => n.name)
                        .join('، ') || '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <SafeModal
        isOpen={modalOpen}
        onClose={() => !isSaving && setModalOpen(false)}
        title={editId ? t.ui.companyMachines.editMachine : t.ui.companyMachines.addMachineTitle}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">{t.ui.companyMachines.machineNameLabel}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              placeholder={t.ui.companyMachines.machineNamePlaceholder}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">{t.ui.companyMachines.category}</label>
              <select
                value={form.category}
                onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {MACHINE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{getCategoryLabel(c.value)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">{t.ui.companyMachines.machineType}</label>
              <select
                value={form.machine_type}
                onChange={(e) => setForm(f => ({ ...f, machine_type: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {MACHINE_TYPES.map(opt => <option key={opt.value} value={opt.value}>{getTypeLabel(opt.value)}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">{t.ui.companyMachines.status}</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm"
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{getStatusLabel(s.value)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">{t.ui.companyMachines.monthlyRental}</label>
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
            <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-1">{t.ui.companyMachines.notes}</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline text-sm resize-none"
              placeholder={t.ui.companyMachines.notesPlaceholder}
            />
          </div>
          <div className="flex ltr:justify-end rtl:justify-start gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {isSaving ? t.common.saving : editId ? t.ui.companyMachines.update : t.common.add}
            </button>
          </div>
        </div>
      </SafeModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t.ui.companyMachines.deleteConfirmTitle}
        message={t.ui.companyMachines.deleteMachineMessage}
        confirmLabel={t.ui.companyMachines.delete}
      />
      <ConfirmDialog
        isOpen={deleteNameId !== null}
        onClose={() => setDeleteNameId(null)}
        onConfirm={handleDeleteName}
        title={t.ui.companyMachines.deleteNameConfirmTitle}
        message={t.ui.companyMachines.deleteNameMessage}
        confirmLabel={t.ui.companyMachines.delete}
      />
    </div>
  );
};

export default CompanyMachinesSettings;
