import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, Barista } from '../types';
import Button from './ui/Button';
import { ConfirmDialog } from './ui/ConfirmDialog';

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
    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = 'unset';
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [operation, setOperation] = useState<BatchEditOperation | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);

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

    const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm: () => void; message: string } | null>(null);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 pt-safe bg-black/50 backdrop-blur-sm animate-fade-in overflow-y-auto">
            <div 
                role="dialog"
                aria-modal="true"
                className="bg-surface border border-default rounded-2xl shadow-sm w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-default bg-surface-elevated/50">
                    <div>
                        <h2 className="text-xl font-bold text-primary">
                            Batch Edit Maintenance Records
                        </h2>
                        <p className="text-sm text-secondary mt-1">
                            Select records and choose an operation to apply to all selected
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 text-secondary hover:text-primary rounded-full hover:bg-surface-elevated transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Record Selection */}
                    <div className="w-1/2 border-r border-default flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-default bg-surface-elevated">
                            <button
                                onClick={toggleAll}
                                className="flex items-center gap-2 text-sm font-medium text-primary"
                            >
                                {selectedIds.size === records.length ? (
                                    <><CheckCircleIcon className="w-5 h-5 text-brand-red" /> Deselect All</>
                                ) : (
                                    <><StopIcon className="w-5 h-5" /> Select All</>
                                )}
                            </button>

                            <span className="text-sm text-secondary">
                                {selectedIds.size} of {records.length} selected
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {records.map((record) => (
                                <div
                                    key={record.id}
                                    onClick={() => toggleSelection(record.id)}
                                    className={`flex items-center gap-3 p-4 border-b border-default/50 cursor-pointer transition-colors ${
                                        selectedIds.has(record.id)
                                            ? 'bg-brand-red/10'
                                            : 'hover:bg-surface-elevated'
                                    }`}
                                >
                                    <div className="flex-shrink-0">
                                        {selectedIds.has(record.id) ? (
                                            <CheckCircleIcon className="w-5 h-5 text-brand-red" />
                                        ) : (
                                            <StopIcon className="w-5 h-5 text-secondary" />
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
                                            <p className="text-sm text-secondary truncate">
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
                        <div className="p-4 border-b border-default">
                            <h3 className="font-semibold text-primary mb-4">
                                Choose Operation
                            </h3>

                            <div className="space-y-3">
                                {/* Date Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'maintenanceDate' ? 'border-brand-red bg-brand-red/10' : 'border-default'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'maintenanceDate'}
                                            onChange={() => setOperation({ field: 'maintenanceDate', value: new Date().toISOString().split('T')[0] })}
                                            className="w-4 h-4"
                                        />
                                        <CalendarIcon className="w-4 h-4 text-secondary" />
                                        <span className="font-medium text-primary">Change Date</span>
                                    </label>
                                    {operation?.field === 'maintenanceDate' && (
                                        <input
                                            type="date"
                                            value={operation.value}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                            className="w-full px-3 py-2 bg-surface text-primary border border-default rounded-lg focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                                        />
                                    )}
                                </div>

                                {/* Staff Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'baristaName' ? 'border-brand-red bg-brand-red/10' : 'border-default'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'baristaName'}
                                            onChange={() => setOperation({ field: 'baristaName', value: '' })}
                                            className="w-4 h-4"
                                        />
                                        <UserIcon className="w-4 h-4 text-secondary" />
                                        <span className="font-medium text-primary">Assign Staff</span>
                                    </label>
                                    {operation?.field === 'baristaName' && (
                                        <select
                                            value={operation.value}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                            className="w-full px-3 py-2 bg-surface text-primary border border-default rounded-lg focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                                        >
                                            <option value="">Select Staff</option>
                                            {baristas.map(b => (
                                                <option key={b.id} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Type Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'type' ? 'border-brand-red bg-brand-red/10' : 'border-default'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'type'}
                                            onChange={() => setOperation({ field: 'type', value: 'scheduled' })}
                                            className="w-4 h-4"
                                        />
                                        <WrenchIcon className="w-4 h-4 text-secondary" />
                                        <span className="font-medium text-primary">Change Type</span>
                                    </label>
                                    {operation?.field === 'type' && (
                                        <select
                                            value={operation.value}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                            className="w-full px-3 py-2 bg-surface text-primary border border-default rounded-lg focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                                        >
                                            <option value="scheduled">Scheduled</option>
                                            <option value="requested">Requested</option>
                                        </select>
                                    )}
                                </div>

                                {/* Mark Solved Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'problemSolved' ? 'border-brand-red bg-brand-red/10' : 'border-default'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'problemSolved'}
                                            onChange={() => setOperation({ field: 'problemSolved', value: true })}
                                            className="w-4 h-4"
                                        />
                                        <ArrowPathIcon className="w-4 h-4 text-secondary" />
                                        <span className="font-medium text-primary">Mark Status</span>
                                    </label>
                                    {operation?.field === 'problemSolved' && (
                                        <select
                                            value={operation.value.toString()}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value === 'true' })}
                                            className="w-full px-3 py-2 bg-surface text-primary border border-default rounded-lg focus:border-brand-red focus:ring-1 focus:ring-brand-red"
                                        >
                                            <option value="true">تم الحل</option>
                                            <option value="false">Not Solved</option>
                                        </select>
                                    )}
                                </div>

                                {/* Delete Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'delete' ? 'border-ember-500 bg-ember-500/20' : 'border-default'}`}>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'delete'}
                                            onChange={() => setOperation({ field: 'delete', value: null })}
                                            className="w-4 h-4"
                                        />
                                        <TrashIcon className="w-4 h-4 text-brand-red" />
                                        <span className="font-medium text-brand-red-400">Delete Records</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 pb-safe border-t border-default bg-surface-muted/30 gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {operation && selectedIds.size > 0 && (
                            <>
                                <ExclamationTriangleIcon className={`w-5 h-5 ${operation.field === 'delete' ? 'text-brand-red' : 'text-brand-red'}`} />
                                <span className={`text-sm ${operation.field === 'delete' ? 'text-brand-red-400' : 'text-brand-red'}`}>
                                    {getOperationDescription()}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <Button variant="secondary" onClick={onClose} className="w-full sm:w-auto">
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
            </div>
            
            <ConfirmDialog
                isOpen={confirmState?.open ?? false}
                title="تأكيد العملية"
                message={confirmState?.message ?? ''}
                variant="danger"
                onConfirm={() => confirmState?.onConfirm()}
                onCancel={() => setConfirmState(null)}
            />
        </div>
    );
};

export default BatchEditModal;
