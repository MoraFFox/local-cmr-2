import React, { useState } from 'react';
import { MaintenanceRecord, Barista } from '../types';

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

    const handleApplyOperation = () => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            Batch Edit Maintenance Records
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Select records and choose an operation to apply to all selected
                        </p>
                    </div>
                    
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Left Panel - Record Selection */}
                    <div className="w-1/2 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                            <button
                                onClick={toggleAll}
                                className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300"
                            >
                                {selectedIds.size === records.length ? (
                                    <><CheckCircleIcon className="w-5 h-5 text-teal-600" /> Deselect All</>
                                ) : (
                                    <><StopIcon className="w-5 h-5" /> Select All</>
                                )}
                            </button>
                            
                            <span className="text-sm text-slate-500">
                                {selectedIds.size} of {records.length} selected
                            </span>
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {records.map((record) => (
                                <div
                                    key={record.id}
                                    onClick={() => toggleSelection(record.id)}
                                    className={`flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-colors ${
                                        selectedIds.has(record.id)
                                            ? 'bg-teal-50 dark:bg-teal-900/20'
                                            : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                    }`}
                                >
                                    <div className="flex-shrink-0">
                                        {selectedIds.has(record.id) ? (
                                            <CheckCircleIcon className="w-5 h-5 text-teal-600" />
                                        ) : (
                                            <StopIcon className="w-5 h-5 text-slate-400" />
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-slate-800 dark:text-slate-200">
                                                {record.maintenanceDate || 'No Date'}
                                            </span>
                                            {record.problemSolved && (
                                                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">Solved</span>
                                            )}
                                        </div>
                                        {record.baristaName && (
                                            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
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
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-4">
                                Choose Operation
                            </h3>

                            <div className="space-y-3">
                                {/* Date Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'maintenanceDate' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'maintenanceDate'}
                                            onChange={() => setOperation({ field: 'maintenanceDate', value: new Date().toISOString().split('T')[0] })}
                                            className="w-4 h-4"
                                        />
                                        <CalendarIcon className="w-4 h-4 text-slate-500" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Change Date</span>
                                    </label>
                                    {operation?.field === 'maintenanceDate' && (
                                        <input
                                            type="date"
                                            value={operation.value}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                                        />
                                    )}
                                </div>

                                {/* Staff Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'baristaName' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'baristaName'}
                                            onChange={() => setOperation({ field: 'baristaName', value: '' })}
                                            className="w-4 h-4"
                                        />
                                        <UserIcon className="w-4 h-4 text-slate-500" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Assign Staff</span>
                                    </label>
                                    {operation?.field === 'baristaName' && (
                                        <select
                                            value={operation.value}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                                        >
                                            <option value="">Select Staff</option>
                                            {baristas.map(b => (
                                                <option key={b.id} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Type Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'type' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'type'}
                                            onChange={() => setOperation({ field: 'type', value: 'scheduled' })}
                                            className="w-4 h-4"
                                        />
                                        <WrenchIcon className="w-4 h-4 text-slate-500" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Change Type</span>
                                    </label>
                                    {operation?.field === 'type' && (
                                        <select
                                            value={operation.value}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value })}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                                        >
                                            <option value="scheduled">Scheduled</option>
                                            <option value="requested">Requested</option>
                                        </select>
                                    )}
                                </div>

                                {/* Mark Solved Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'problemSolved' ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <label className="flex items-center gap-2 mb-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'problemSolved'}
                                            onChange={() => setOperation({ field: 'problemSolved', value: true })}
                                            className="w-4 h-4"
                                        />
                                        <ArrowPathIcon className="w-4 h-4 text-slate-500" />
                                        <span className="font-medium text-slate-700 dark:text-slate-300">Mark Status</span>
                                    </label>
                                    {operation?.field === 'problemSolved' && (
                                        <select
                                            value={operation.value.toString()}
                                            onChange={(e) => setOperation({ ...operation, value: e.target.value === 'true' })}
                                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                                        >
                                            <option value="true">Solved</option>
                                            <option value="false">Not Solved</option>
                                        </select>
                                    )}
                                </div>

                                {/* Delete Operation */}
                                <div className={`p-3 rounded-lg border ${operation?.field === 'delete' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'}`}>
                                    <label className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="operation"
                                            checked={operation?.field === 'delete'}
                                            onChange={() => setOperation({ field: 'delete', value: null })}
                                            className="w-4 h-4"
                                        />
                                        <TrashIcon className="w-4 h-4 text-red-500" />
                                        <span className="font-medium text-red-600 dark:text-red-400">Delete Records</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                        {operation && selectedIds.size > 0 && (
                            <>
                                <ExclamationTriangleIcon className={`w-5 h-5 ${operation.field === 'delete' ? 'text-red-500' : 'text-amber-500'}`} />
                                <span className={`text-sm ${operation.field === 'delete' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                    {getOperationDescription()}
                                </span>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        >
                            Cancel
                        </button>
                        
                        <button
                            onClick={handleApplyOperation}
                            disabled={!operation || selectedIds.size === 0}
                            className={`px-6 py-2 font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                                operation?.field === 'delete'
                                    ? 'bg-red-600 text-white hover:bg-red-700'
                                    : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                        >
                            Apply Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BatchEditModal;
