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
                return 'text-leaf-600 bg-leaf-50 dark:bg-leaf-500/10 dark:text-leaf-300';
            case 'update':
                return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
            case 'delete':
                return 'text-ember-700 bg-ember-50 dark:bg-ember-500/10 dark:text-ember-300';
            default:
                return 'text-primary bg-surface dark:bg-chrome-light dark:text-secondary';
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
            <div className="bg-surface dark:bg-chrome rounded-2xl shadow-sm w-full max-w-3xl max-h-[85vh] flex flex-col animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-default dark:border-default">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-copper-500/10 dark:bg-copper-500/10 rounded-lg">
                            <ClockIcon className="w-5 h-5 text-brand-red dark:text-brand-red-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-primary dark:text-white">
                                History & Versions
                            </h2>
                            <p className="text-sm text-secondary dark:text-secondary">
                                Track changes and restore previous versions
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={onClose}
                        className="p-2 text-secondary hover:text-primary dark:hover:text-secondary/70 rounded-full hover:bg-surface dark:hover:bg-chrome-light/50 transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-default dark:border-default">
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'history'
                                ? 'text-brand-red border-b-2 border-copper-600 bg-surface-elevated dark:bg-copper-500/10'
                                : 'text-primary dark:text-secondary hover:text-primary dark:hover:text-cream'
                        }`}
                    >
                        Activity History ({history.length})
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('snapshots')}
                        className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                            activeTab === 'snapshots'
                                ? 'text-brand-red border-b-2 border-copper-600 bg-surface-elevated dark:bg-copper-500/10'
                                : 'text-primary dark:text-secondary hover:text-primary dark:hover:text-cream'
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
                                    <ClockIcon className="w-12 h-12 text-secondary/70 mx-auto mb-3" />
                                    <p className="text-secondary dark:text-secondary">No activity history yet</p>
                                </div>
                            ) : (
                                history.map((entry) => (
                                    <div
                                        key={entry.id}
                                        className="flex items-start gap-3 p-4 hover:bg-surface dark:hover:bg-chrome-light/50/50 transition-colors"
                                    >
                                        <div className={`flex-shrink-0 p-2 rounded-lg ${getActionColor(entry)}`}>
                                            {getActionIcon(entry)}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-primary dark:text-cream">
                                                {entry.description}
                                            </p>
                                            
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${getActionColor(entry)}`}>
                                                    {entry.action}
                                                </span>
                                                <span className="text-xs text-secondary">
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
                                    <ArrowUturnLeftIcon className="w-12 h-12 text-secondary/70 mx-auto mb-3" />
                                    <p className="text-secondary dark:text-secondary">No saved versions yet</p>
                                    <p className="text-sm text-secondary mt-1">
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
                                                ? 'bg-surface-elevated dark:bg-copper-500/10'
                                                : 'hover:bg-surface dark:hover:bg-chrome-light/50/50'
                                        }`}
                                    >
                                        <div className="flex-shrink-0">
                                            {selectedSnapshot?.id === snapshot.id ? (
                                                <div className="w-10 h-10 bg-copper-500/10 dark:bg-copper-500/10 rounded-lg flex items-center justify-center">
                                                    <CheckIcon className="w-5 h-5 text-brand-red dark:text-brand-red-400" />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 bg-surface dark:bg-chrome-light rounded-lg flex items-center justify-center">
                                                    <ArrowUturnLeftIcon className="w-5 h-5 text-secondary" />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-primary dark:text-cream">
                                                {snapshot.description}
                                            </p>
                                            
                                            <p className="text-xs text-secondary mt-1">
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
                <div className="flex items-center justify-between px-6 py-4 border-t border-default dark:border-default bg-surface dark:bg-chrome/50">
                    <button
                        onClick={activeTab === 'history' ? handleClearHistory : handleClearSnapshots}
                        className="flex items-center gap-2 px-3 py-2 text-ember-700 dark:text-ember-300 hover:bg-ember-50 dark:hover:bg-ember-500/10 rounded-lg transition-colors text-sm font-medium"
                    >
                        <TrashIcon className="w-4 h-4" />
                        Clear {activeTab === 'history' ? 'History' : 'Snapshots'}
                    </button>

                    {activeTab === 'snapshots' && selectedSnapshot && (
                        <button
                            onClick={() => setShowConfirmRestore(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-copper-600 text-white rounded-lg hover:bg-copper-700 transition-colors font-medium"
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
                    <div className="bg-surface dark:bg-chrome rounded-2xl shadow-sm w-full max-w-md p-6 animate-scale-in">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                                <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <h3 className="text-lg font-bold text-primary dark:text-white">
                                Restore Version?
                            </h3>
                        </div>

                        <p className="text-primary dark:text-secondary mb-6">
                            This will replace your current data with the version from{' '}
                            <strong>{formatTimestamp(selectedSnapshot.timestamp)}</strong>.{' '}
                            This action cannot be undone.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowConfirmRestore(false)}
                                className="px-4 py-2 text-primary dark:text-secondary/70 font-medium rounded-lg hover:bg-surface-elevated dark:hover:bg-chrome-light/50 transition-colors"
                            >
                                Cancel
                            </button>
                            
                            <button
                                onClick={handleRestoreSnapshot}
                                className="px-4 py-2 bg-copper-600 text-white font-medium rounded-lg hover:bg-copper-700 transition-colors"
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
