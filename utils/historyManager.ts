import { FormData, MaintenanceRecord, Branch, Barista } from '../types';
import { logger } from './logger';

// Types for history tracking
export interface HistoryEntry {
    id: string;
    timestamp: number;
    type: 'company' | 'branch' | 'maintenance' | 'barista';
    action: 'create' | 'update' | 'delete';
    description: string;
    data: any;
    previousData?: any;
}

export interface VersionSnapshot {
    id: string;
    timestamp: number;
    description: string;
    data: FormData;
}

// History manager class
export class HistoryManager {
    private history: HistoryEntry[] = [];
    private snapshots: VersionSnapshot[] = [];
    private maxHistorySize: number = 100;
    private maxSnapshots: number = 10;

    constructor() {
        this.loadFromStorage();
    }

    // Add an entry to history
    addEntry(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): void {
        const newEntry: HistoryEntry = {
            ...entry,
            id: this.generateId(),
            timestamp: Date.now(),
            // Deep clone data to prevent mutation issues
            data: JSON.parse(JSON.stringify(entry.data)),
            previousData: entry.previousData ? JSON.parse(JSON.stringify(entry.previousData)) : undefined
        };

        this.history.unshift(newEntry);

        // Keep only the last N entries
        if (this.history.length > this.maxHistorySize) {
            this.history = this.history.slice(0, this.maxHistorySize);
        }

        this.saveToStorage();
    }

    // Create a snapshot
    createSnapshot(data: FormData, description: string): void {
        const snapshot: VersionSnapshot = {
            id: this.generateId(),
            timestamp: Date.now(),
            description,
            data: JSON.parse(JSON.stringify(data)) // Deep clone
        };

        this.snapshots.unshift(snapshot);

        // Keep only the last N snapshots
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots = this.snapshots.slice(0, this.maxSnapshots);
        }

        this.saveToStorage();
    }

    // Get all history entries
    getHistory(): HistoryEntry[] {
        return [...this.history];
    }

    // Get history for a specific company
    getCompanyHistory(companyId: number): HistoryEntry[] {
        return this.history.filter(entry => {
            if (entry.type === 'company' && entry.data?.id === companyId) return true;
            if (entry.type === 'branch' && entry.data?.companyId === companyId) return true;
            if (entry.type === 'maintenance' && entry.data?.companyId === companyId) return true;
            if (entry.type === 'barista' && entry.data?.companyId === companyId) return true;
            return false;
        });
    }

    // Get all snapshots
    getSnapshots(): VersionSnapshot[] {
        return [...this.snapshots];
    }

    // Get a specific snapshot
    getSnapshot(snapshotId: string): VersionSnapshot | undefined {
        return this.snapshots.find(s => s.id === snapshotId);
    }

    // Restore from a snapshot
    restoreSnapshot(snapshotId: string): FormData | null {
        try {
            const snapshot = this.getSnapshot(snapshotId);
            if (!snapshot) return null;
            
            return JSON.parse(JSON.stringify(snapshot.data));
        } catch (error) {
            logger.error('Failed to restore snapshot', error, 'history');
            return null;
        }
    }

    // Delete a snapshot
    deleteSnapshot(snapshotId: string): void {
        this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
        this.saveToStorage();
    }

    // Clear all history
    clearHistory(): void {
        this.history = [];
        this.saveToStorage();
    }

    // Clear all snapshots
    clearSnapshots(): void {
        this.snapshots = [];
        this.saveToStorage();
    }

    // Generate unique ID
    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }

    // Save to localStorage
    private saveToStorage(): void {
        try {
            localStorage.setItem('cmr_history', JSON.stringify(this.history));
            localStorage.setItem('cmr_snapshots', JSON.stringify(this.snapshots));
        } catch (e) {
            logger.error('Failed to save history', e, 'history');
        }
    }

    // Load from localStorage
    private loadFromStorage(): void {
        try {
            const historyData = localStorage.getItem('cmr_history');
            const snapshotsData = localStorage.getItem('cmr_snapshots');

            if (historyData) {
                this.history = JSON.parse(historyData);
            }

            if (snapshotsData) {
                this.snapshots = JSON.parse(snapshotsData);
            }
        } catch (e) {
            logger.error('Failed to load history', e, 'history');
        }
    }
}

// Create singleton instance
export const historyManager = new HistoryManager();

// Helper functions for common operations
export const logCompanyUpdate = (
    companyId: number,
    companyName: string,
    previousData?: Partial<FormData>,
    newData?: Partial<FormData>
): void => {
    historyManager.addEntry({
        type: 'company',
        action: previousData ? 'update' : 'create',
        description: previousData 
            ? `Updated company "${companyName}"`
            : `Created company "${companyName}"`,
        data: { id: companyId, name: companyName, ...newData },
        previousData
    });
};

export const logBranchUpdate = (
    companyId: number,
    branchId: number,
    branchName: string,
    action: 'create' | 'update' | 'delete'
): void => {
    historyManager.addEntry({
        type: 'branch',
        action,
        description: `${action === 'create' ? 'Created' : action === 'update' ? 'Updated' : 'Deleted'} branch "${branchName}"`,
        data: { companyId, branchId, branchName }
    });
};

export const logMaintenanceUpdate = (
    companyId: number,
    recordId: number,
    date: string,
    action: 'create' | 'update' | 'delete'
): void => {
    historyManager.addEntry({
        type: 'maintenance',
        action,
        description: `${action === 'create' ? 'Created' : action === 'update' ? 'Updated' : 'Deleted'} maintenance record for ${date}`,
        data: { companyId, recordId, date }
    });
};

export const logBaristaUpdate = (
    companyId: number,
    baristaId: number,
    baristaName: string,
    action: 'create' | 'update' | 'delete'
): void => {
    historyManager.addEntry({
        type: 'barista',
        action,
        description: `${action === 'create' ? 'Created' : action === 'update' ? 'Updated' : 'Deleted'} staff member "${baristaName}"`,
        data: { companyId, baristaId, baristaName }
    });
};

// Create automatic snapshot before major changes
export const createAutoSnapshot = (data: FormData, action: string): void => {
    const timestamp = new Date().toLocaleString();
    historyManager.createSnapshot(data, `${action} - ${timestamp}`);
};

// Undo function (restore previous state)
export const undoLastChange = (): HistoryEntry | null => {
    const history = historyManager.getHistory();
    if (history.length === 0) return null;

    const lastEntry = history[0];
    
    // Note: Actual undo implementation would depend on your state management
    // This is a placeholder that returns the entry for the UI to handle
    return lastEntry;
};
