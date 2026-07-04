import React, { useState, useEffect } from 'react';
import { historyManager, HistoryEntry, VersionSnapshot } from '../utils/historyManager';
import { 
    ClockIcon, 
    ArrowUturnLeftIcon, 
    TrashIcon,
    BuildingOfficeIcon,
    MapPinIcon,
    WrenchIcon,
    UserIcon,
    XMarkIcon,
    CheckIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface HistoryViewerProps {
    isOpen: boolean;
    onClose: () => void;
    onRestoreSnapshot?: (snapshot: VersionSnapshot) => void;
    companyId?: number;
}

const HistoryViewer: React.FC<HistoryViewerProps> = ({
    isOpen,
    onClose,
    onRestoreSnapshot,
    companyId
}) => {
    const [activeTab, setActiveTab] = useState<'history' | 'snapshots'>('history');
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
    const [selectedSnapshot, setSelectedSnapshot] = useState<VersionSnapshot | null>(null);
    const [showConfirmRestore, setShowConfirmRestore] = useState(false);

    useEffect(() => {
        if (isOpen) {
            refreshData();
        }
    }, [isOpen]);

    const refreshData = () => {
        if (companyId) {
            setHistory(historyManager.getCompanyHistory(companyId));
        } else {
            setHistory(historyManager.getHistory());
        }
        setSnapshots(historyManager.getSnapshots());
    };

    const handleClearHistory = () => {
        if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
            historyManager.clearHistory();
            refreshData();
        }
    };

    const handleClearSnapshots = () => {
        if (confirm('Are you sure you want to clear all snapshots? This cannot be undone.')) {
            historyManager.clearSnapshots();
            refreshData();
        }
    };

    const handleRestoreSnapshot = () => {
        if (selectedSnapshot && onRestoreSnapshot) {
            onRestoreSnapshot(selectedSnapshot);
            setShowConfirmRestore(false);
            setSelectedSnapshot(null);
            onClose();
        }
    };

    const getActionIcon = (entry: HistoryEntry) => {
        switch (entry.type) {
            case 'company':
                return <BuildingOfficeIcon className="w-4 h-4" />;
            case 'branch':
                return <MapPinIcon className="w-4 h-4" />;
            case 'maintenance':
                return <WrenchIcon className="w-4 h-4" />;
            case 'barista':
                return <UserIcon className="w-4 h-4" />;
            default:
                return <ClockIcon className="w-4 h-4" />;
        }
    };

    const getActionColor = (entry: HistoryEntry) => {
        switch (entry.action) {
            case 'create':
                return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400';
            case 'update':
                return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
            case 'delete':
                return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            default:
                return 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
        }
    };

    const formatTimestamp = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const formatRelativeTime = (timestamp: number) => {
        const now = Date.now();
        const diff = now - timestamp;
        
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return formatTimestamp(timestamp);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm w-full max-w-3xl max-h-[85vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                History & Versions
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Track changes and restore previous versions
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'history'
                                ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Activity History ({history.length})
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('snapshots')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'snapshots'
                                ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50 dark:bg-teal-900/20'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        Saved Versions ({snapshots.length})
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'history' ? (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {history.length === 0 ? (
                                <div className="p-8 text-center">
                                    <ClockIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400">No activity history yet</p>
                                </div>
                            ) : (
                                history.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-start gap-3 p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                                    >
                                        <div className={`flex-shrink-0 p-2 rounded-lg ${getActionColor(entry)}`}>
                                            {getActionIcon(entry)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {entry.description}
                                            </p>
                                            
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getActionColor(entry)}`}>
                                                    {entry.action}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {formatRelativeTime(entry.timestamp)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                            {snapshots.length === 0 ? (
                                <div className="p-8 text-center">
                                    <ArrowUturnLeftIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                                    <p className="text-slate-500 dark:text-slate-400">No saved versions yet</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        Snapshots are created automatically before major changes
                                    </p>
                                </div>
                            ) : (
                                snapshots.map((snapshot) => (
                                    <div
                                        key={snapshot.id}
                                        onClick={() => setSelectedSnapshot(snapshot)}
                                        className={`flex items-center gap-3 p-4 cursor-pointer transition-colors ${
                                            selectedSnapshot?.id === snapshot.id
                                                ? 'bg-teal-50 dark:bg-teal-900/20'
                                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                                        }`}
                                    >
                                        <div className="flex-shrink-0">
                                            {selectedSnapshot?.id === snapshot.id ? (
                                                <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                                                    <CheckIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                                                    <ArrowUturnLeftIcon className="w-5 h-5 text-slate-500" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {snapshot.description}
                                            </p>
                                            
                                            <p className="text-xs text-slate-400 mt-1">
                                                {formatTimestamp(snapshot.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <button
                        onClick={activeTab === 'history' ? handleClearHistory : handleClearSnapshots}
                        className="flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm font-medium"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Clear {activeTab === 'history' ? 'History' : 'Snapshots'}
                    </button>

                    {activeTab === 'snapshots' && selectedSnapshot && (
                        <button
                            onClick={() => setShowConfirmRestore(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium"
                        >
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                            Restore Version
                        </button>
                    )}
                </div>
            </div>

            {/* Confirm Restore Modal */}
            {showConfirmRestore && selectedSnapshot && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm w-full max-w-md p-6 animate-scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                Restore Version?
                            </h3>
                        </div>

                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            This will replace your current data with the version from{' '}
                            <strong>{formatTimestamp(selectedSnapshot.timestamp)}</strong>.{' '}
                            This action cannot be undone.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmRestore(false)}
                                className="px-4 py-2 text-slate-700 dark:text-slate-300 font-medium rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                            
                            <button
                                onClick={handleRestoreSnapshot}
                                className="px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                            >
                                Restore
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryViewer;
