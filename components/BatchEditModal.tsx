import React, { useState } from 'react';
import { MaintenanceRecord, Barista } from '../types';
import Button from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { SafeModal } from './form-ui/SafeModal';

import { 
    CheckCircleIcon, 
    StopIcon, 
    XMarkIcon,
    CalendarIcon,
    UserIcon,
    WrenchIcon,
    TrashIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface BatchEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    records: MaintenanceRecord[];
    onUpdateRecords: (updatedRecords: MaintenanceRecord[]) => void;
    baristas: Barista[];
}

type BatchField = 'maintenanceDate' | 'baristaName' | 'type' | 'paidBy' | 'visitZone' | 'problemSolved' | 'delete';

interface BatchEditOperation {
    field: BatchField;
    value: any;
}

const BatchEditModal: React.FC<BatchEditModalProps> = ({
    isOpen,
    onClose,
    records,
    onUpdateRecords,
    baristas
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [operation, setOperation] = useState<BatchEditOperation | null>(null);
    const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm: () => void; message: string } | null>(null);

    // Track whether the user has interacted with the modal (made selections or
    // chosen an operation) so SafeModal's unsaved-changes protection can guard
    // against accidental dismissal (audit issue #16).
    const hasUnsavedChanges = selectedIds.size > 0 || operation !== null;

    const toggleSelection = (id: number) => {
        setSelectedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleAll = () => {
        if (selectedIds.size === records.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map(r => r.id)));
        }
    };

    const handleApplyOperation = () => {
        if (!operation || selectedIds.size === 0) return;

        if (operation.field === 'delete') {
            setConfirmState({
                open: true,
                message: getOperationDescription(),
                onConfirm: () => {
                    executeOperation();
                    setConfirmState(null);
                }
            });
        } else {
            executeOperation();
        }
    };

    const executeOperation = () => {
        if (!operation || selectedIds.size === 0) return;

        const updatedRecords = records.map(record => {
            if (!selectedIds.has(record.id)) return record;

            switch (operation.field) {
                case 'delete':
                    return null;
                case 'maintenanceDate':
                    return { ...record, maintenanceDate: operation.value };
                case 'baristaName':
                    return { ...record, baristaName: operation.value };
                case 'type':
                    return { ...record, type: operation.value };
                case 'paidBy':
                    return { ...record, paidBy: operation.value };
                case 'visitZone':
                    return { ...record, visitZone: operation.value };
                case 'problemSolved':
                    return { ...record, problemSolved: operation.value };
                default:
                    return record;
            }
        }).filter((r): r is MaintenanceRecord => r !== null);

        onUpdateRecords(updatedRecords);
        // Reset interaction state since the operation has been applied.
        setSelectedIds(new Set());
        setOperation(null);
        onClose();
    };

    const getOperationDescription = () => {
        if (!operation) return '';
        
        const count = selectedIds.size;
        const recordText = count === 1 ? 'record' : 'records';
        
        switch (operation.field) {
            case 'delete':
                return `Delete ${count} ${recordText}`;
            case 'maintenanceDate':
                return `Set date to ${operation.value} for ${count} ${recordText}`;
            case 'baristaName':
                return `Assign ${operation.value} to ${count} ${recordText}`;
            case 'type':
                return `Set type to ${operation.value} for ${count} ${recordText}`;
            case 'paidBy':
                return `Set payment to ${operation.value} for ${count} ${recordText}`;
            case 'visitZone':
                return `Set zone to ${operation.value} for ${count} ${recordText}`;
            case 'problemSolved':
                return `Mark ${operation.value ? 'solved' : 'unsolved'} for ${count} ${recordText}`;
            default:
                return '';
        }
    };

    return (
        <SafeModal
            isOpen={isOpen}
            onClose={onClose}
            // type="form" => backdrop click does NOT close (SafeModal default).
            // This protects against accidental dismissal losing selections.
            type="form"
            hasUnsavedChanges={hasUnsavedChanges}
            unsavedMessage="You have selected records or chosen an operation. Are you sure you want to close?"
            size="xl"
            ariaLabel="Batch Edit Maintenance Records"
            className="!p-0"
            // rawContent so the two-panel layout manages its own scrolling.
            rawContent
            renderHeader={(handleClose) => (
                <div className="flex items-center justify-between px-6 py-4 border-b border-hairline bg-cream-2/50 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-primary">
                            Batch Edit Maintenance Records
                        </h2>
                        <p className="text-sm text-latte mt-1">
                            Select records and choose an operation to apply to all selected
                        </p>
                    </div>

                    {/* Close button — calls SafeModal's internal handleClose so
                        the unsaved-changes protection applies (shows the discard
                        confirm when there are pending selections/operations). */}
                    <button
                        onClick={handleClose}
                        className="p-2 text-latte hover:text-primary rounded-full hover:bg-cream-2 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Close modal"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
            renderFooter={(handleClose) => (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 pb-safe border-t border-hairline bg-cream-2/30 gap-4 flex-shrink-0">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {operation && selectedIds.size > 0 && (
                            <>
                                <ExclamationTriangleIcon className={`w-5 h-5 ${operation.field === 'delete' ? 'text-primary' : 'text-primary'}`} />
                                <span className={`text-sm ${operation.field === 'delete' ? 'text-primary-400' : 'text-primary'}`}>
                                    {getOperationDescription()}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto">
                        {/* Cancel goes through SafeModal's handleClose so the
                            unsaved-changes protection applies (shows the
                            discard confirm when there are pending selections). */}
                        <Button variant="secondary" onClick={handleClose} className="w-full sm:w-auto">
                            إلغاء
                        </Button>
                        
                        <Button
                            variant={operation?.field === 'delete' ? 'danger' : 'primary'}
                            onClick={handleApplyOperation}
                            disabled={!operation || selectedIds.size === 0}
                            className="w-full sm:w-auto"
                        >
                            تطبيق التغييرات
                        </Button>
                    </div>
                </div>
            )}
        >
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel - Record Selection */}
                <div className="w-1/2 border-r border-hairline flex flex-col">
                    <div className="flex items-center justify-between p-4 border-b border-hairline bg-cream-2">
                        <button
                            onClick={toggleAll}
                            className="flex items-center gap-2 text-sm font-medium text-primary"
                        >
                            {selectedIds.size === records.length ? (
                                <><CheckCircleIcon className="w-5 h-5 text-primary" /> Deselect All</>
                            ) : (
                                <><StopIcon className="w-5 h-5" /> Select All</>
                            )}
                        </button>

                        <span className="text-sm text-latte">
                            {selectedIds.size} of {records.length} selected
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {records.map((record) => (
                            <div
                                key={record.id}
                                onClick={() => toggleSelection(record.id)}
                                className={`flex items-center gap-3 p-4 border-b border-hairline/50 cursor-pointer transition-colors ${
                                    selectedIds.has(record.id)
                                        ? 'bg-primary/10'
                                        : 'hover:bg-cream-2'
                                }`}
                            >
                                <div className="flex-shrink-0">
                                    {selectedIds.has(record.id) ? (
                                        <CheckCircleIcon className="w-5 h-5 text-primary" />
                                    ) : (
                                        <StopIcon className="w-5 h-5 text-latte" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-primary">
                                            {record.maintenanceDate || 'No Date'}
                                        </span>
                                        {record.problemSolved && (
                                            <span className="text-xs px-2 py-0.5 bg-leaf-500/20 text-leaf-600 rounded-full">تم الحل</span>
                                        )}
                                    </div>
                                    {record.baristaName && (
                                        <p className="text-sm text-latte truncate">
                                            {record.baristaName}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Panel - Operations */}
                <div className="w-1/2 flex flex-col">
                    <div className="p-4 border-b border-hairline">
                        <h3 className="font-semibold text-primary mb-4">
                            Choose Operation
                        </h3>

                        <div className="space-y-3">
                            {/* Date Operation */}
                            <div className={`p-3 rounded-lg border ${operation?.field === 'maintenanceDate' ? 'border-primary bg-primary/10' : 'border-hairline'}`}>
                                <label className="flex items-center gap-2 mb-2">
                                    <input
                                        type="radio"
                                        name="operation"
                                        checked={operation?.field === 'maintenanceDate'}
                                        onChange={() => setOperation({ field: 'maintenanceDate', value: new Date().toISOString().split('T')[0] })}
                                        className="w-4 h-4"
                                    />
                                    <CalendarIcon className="w-4 h-4 text-latte" />
                                    <span className="font-medium text-primary">Change Date</span>
                                </label>
                                {operation?.field === 'maintenanceDate' && (
                                    <input
                                        type="date"
                                        value={operation.value}
                                        onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                        className="w-full px-3 py-2 bg-cream text-primary border border-hairline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                                    />
                                )}
                            </div>

                            {/* Staff Operation */}
                            <div className={`p-3 rounded-lg border ${operation?.field === 'baristaName' ? 'border-primary bg-primary/10' : 'border-hairline'}`}>
                                <label className="flex items-center gap-2 mb-2">
                                    <input
                                        type="radio"
                                        name="operation"
                                        checked={operation?.field === 'baristaName'}
                                        onChange={() => setOperation({ field: 'baristaName', value: '' })}
                                        className="w-4 h-4"
                                    />
                                    <UserIcon className="w-4 h-4 text-latte" />
                                    <span className="font-medium text-primary">Assign Staff</span>
                                </label>
                                {operation?.field === 'baristaName' && (
                                    <select
                                        value={operation.value}
                                        onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                        className="w-full px-3 py-2 bg-cream text-primary border border-hairline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="">Select Staff</option>
                                        {baristas.map(b => (
                                            <option key={b.id} value={b.name}>{b.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            {/* Type Operation */}
                            <div className={`p-3 rounded-lg border ${operation?.field === 'type' ? 'border-primary bg-primary/10' : 'border-hairline'}`}>
                                <label className="flex items-center gap-2 mb-2">
                                    <input
                                        type="radio"
                                        name="operation"
                                        checked={operation?.field === 'type'}
                                        onChange={() => setOperation({ field: 'type', value: 'scheduled' })}
                                        className="w-4 h-4"
                                    />
                                    <WrenchIcon className="w-4 h-4 text-latte" />
                                    <span className="font-medium text-primary">Change Type</span>
                                </label>
                                {operation?.field === 'type' && (
                                    <select
                                        value={operation.value}
                                        onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                        className="w-full px-3 py-2 bg-cream text-primary border border-hairline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="scheduled">Scheduled</option>
                                        <option value="requested">Requested</option>
                                    </select>
                                )}
                            </div>

                            {/* Mark Solved Operation */}
                            <div className={`p-3 rounded-lg border ${operation?.field === 'problemSolved' ? 'border-primary bg-primary/10' : 'border-hairline'}`}>
                                <label className="flex items-center gap-2 mb-2">
                                    <input
                                        type="radio"
                                        name="operation"
                                        checked={operation?.field === 'problemSolved'}
                                        onChange={() => setOperation({ field: 'problemSolved', value: true })}
                                        className="w-4 h-4"
                                    />
                                    <ArrowPathIcon className="w-4 h-4 text-latte" />
                                    <span className="font-medium text-primary">Mark Status</span>
                                </label>
                                {operation?.field === 'problemSolved' && (
                                    <select
                                        value={operation.value.toString()}
                                        onChange={(e) => setOperation({ ...operation, value: e.target.value === 'true' })}
                                        className="w-full px-3 py-2 bg-cream text-primary border border-hairline rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
                                    >
                                        <option value="true">تم الحل</option>
                                        <option value="false">Not Solved</option>
                                    </select>
                                )}
                            </div>

                            {/* Delete Operation */}
                            <div className={`p-3 rounded-lg border ${operation?.field === 'delete' ? 'border-ember-500 bg-ember-500/20' : 'border-hairline'}`}>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="operation"
                                        checked={operation?.field === 'delete'}
                                        onChange={() => setOperation({ field: 'delete', value: null })}
                                        className="w-4 h-4"
                                    />
                                    <TrashIcon className="w-4 h-4 text-ember-500" />
                                    <span className="font-medium text-ember-600">Delete Records</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete confirmation dialog — rendered inside the modal via portal,
                so it stacks on top correctly. SafeModal's own unsaved-changes
                confirm is separate and guards the close action. */}
            <ConfirmDialog
                isOpen={confirmState?.open ?? false}
                title="تأكيد العملية"
                message={confirmState?.message ?? ''}
                variant="danger"
                onConfirm={() => confirmState?.onConfirm()}
                onCancel={() => setConfirmState(null)}
            />
        </SafeModal>
    );
};

export default BatchEditModal;
