/**
 * Offline Support Utilities
 *
 * Provides offline detection, queue management, and sync functionality
 * for form submissions when network is unavailable
 *
 * @example
 * ```tsx
 * const { isOnline, queue, addToQueue, processQueue } = useOfflineQueue();
 *
 * // Queue form for later submission
 * if (!isOnline) {
 *   await addToQueue('maintenance-form', formData);
 * }
 * ```
 */

import React from 'react';
import { logger } from './logger';

// ============== Types ==============

interface QueuedItem<T = unknown> {
  id: string;
  type: string;
  data: T;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

interface OfflineState {
  isOnline: boolean;
  lastOnline: number | null;
  queueSize: number;
  syncInProgress: boolean;
}

interface OfflineQueueOptions {
  /** Maximum items in queue */
  maxQueueSize?: number;
  /** Maximum retry attempts */
  maxRetries?: number;
  /** Retry delay in ms */
  retryDelay?: number;
  /** Storage key prefix */
  storagePrefix?: string;
}

// ============== Storage Management ==============

const DEFAULT_STORAGE_PREFIX = 'cmr-offline-';

class OfflineStorage {
  private prefix: string;

  constructor(prefix: string = DEFAULT_STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  /**
   * Get queue from localStorage
   */
  getQueue<T>(): QueuedItem<T>[] {
    try {
      const data = localStorage.getItem(this.prefix + 'queue');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      logger.error('Failed to read offline queue', error, 'offline');
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  saveQueue<T>(queue: QueuedItem<T>[]): void {
    try {
      localStorage.setItem(this.prefix + 'queue', JSON.stringify(queue));
    } catch (error) {
      logger.error('Failed to save offline queue', error, 'offline');
      throw new Error('Storage quota exceeded');
    }
  }

  /**
   * Get sync state
   */
  getState(): OfflineState {
    try {
      const data = localStorage.getItem(this.prefix + 'state');
      const defaultState: OfflineState = {
        isOnline: navigator.onLine,
        lastOnline: null,
        queueSize: 0,
        syncInProgress: false
      };
      return data ? { ...defaultState, ...JSON.parse(data) } : defaultState;
    } catch {
      return {
        isOnline: navigator.onLine,
        lastOnline: null,
        queueSize: 0,
        syncInProgress: false
      };
    }
  }

  /**
   * Save sync state
   */
  setState(state: OfflineState): void {
    try {
      localStorage.setItem(this.prefix + 'state', JSON.stringify(state));
    } catch (error) {
      logger.error('Failed to save offline state', error, 'offline');
    }
  }

  /**
   * Clear all offline data
   */
  clear(): void {
    try {
      localStorage.removeItem(this.prefix + 'queue');
      localStorage.removeItem(this.prefix + 'state');
    } catch (error) {
      logger.error('Failed to clear offline data', error, 'offline');
    }
  }
}

// ============== Queue Manager ==============

export class OfflineQueue<T = unknown> {
  private storage: OfflineStorage;
  private options: Required<OfflineQueueOptions>;
  private syncCallback: ((item: QueuedItem<T>) => Promise<boolean>) | null = null;
  private stateChangeListener: ((state: OfflineState) => void) | null = null;

  constructor(options: OfflineQueueOptions = {}) {
    this.storage = new OfflineStorage(options.storagePrefix);
    this.options = {
      maxQueueSize: options.maxQueueSize ?? 100,
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 5000,
      storagePrefix: options.storagePrefix ?? DEFAULT_STORAGE_PREFIX
    };

    // Initialize state
    this.updateState();

    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  /**
   * Update sync state
   */
  private updateState(): void {
    const queue = this.storage.getQueue<T>();
    const currentState = this.storage.getState();

    const newState: OfflineState = {
      ...currentState,
      isOnline: navigator.onLine,
      lastOnline: navigator.onLine ? Date.now() : currentState.lastOnline,
      queueSize: queue.length,
      syncInProgress: currentState.syncInProgress
    };

    this.storage.setState(newState);
    this.stateChangeListener?.(newState);
  }

  /**
   * Handle online event
   */
  private handleOnline = () => {
    logger.info('Device came online', {}, 'offline');
    this.updateState();

    // Auto-process queue when coming online
    if (!this.options.storagePrefix.includes('sync-in-progress')) {
      this.processQueue().catch(error => {
        logger.error('Auto-sync failed', error, 'offline');
      });
    }
  };

  /**
   * Handle offline event
   */
  private handleOffline = () => {
    logger.info('Device went offline', {}, 'offline');
    this.updateState();
  };

  /**
   * Add item to queue
   */
  async addToQueue(type: string, data: T): Promise<string> {
    const queue = this.storage.getQueue<T>();

    // Check queue size limit
    if (queue.length >= this.options.maxQueueSize) {
      throw new Error(`Queue is full (${this.options.maxQueueSize} items)`);
    }

    const item: QueuedItem<T> = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.options.maxRetries
    };

    queue.push(item);
    this.storage.saveQueue(queue);
    this.updateState();

    logger.info('Item queued for offline sync', { id: item.id, type }, 'offline');
    return item.id;
  }

  /**
   * Remove item from queue
   */
  removeFromQueue(itemId: string): void {
    const queue = this.storage.getQueue<T>();
    const filtered = queue.filter(item => item.id !== itemId);
    this.storage.saveQueue(filtered);
    this.updateState();
  }

  /**
   * Get current state
   */
  getState(): OfflineState {
    return this.storage.getState();
  }

  /**
   * Get all queued items
   */
  getQueue(): QueuedItem<T>[] {
    return this.storage.getQueue<T>();
  }

  /**
   * Get queued items by type
   */
  getQueueByType(type: string): QueuedItem<T>[] {
    return this.storage.getQueue<T>().filter(item => item.type === type);
  }

  /**
   * Process queue (sync with server)
   */
  async processQueue(
    syncFn?: (item: QueuedItem<T>) => Promise<boolean>
  ): Promise<{ success: number; failed: number; remaining: number }> {
    const queue = this.storage.getQueue<T>();

    if (queue.length === 0) {
      return { success: 0, failed: 0, remaining: 0 };
    }

    // Update state to show sync in progress
    const currentState = this.storage.getState();
    this.storage.setState({ ...currentState, syncInProgress: true });

    const syncFunction = syncFn || this.syncCallback;
    if (!syncFunction) {
      throw new Error('No sync function provided');
    }

    let success = 0;
    let failed = 0;
    const remainingQueue: QueuedItem<T>[] = [];

    for (const item of queue) {
      try {
        const result = await syncFunction(item);

        if (result) {
          success++;
          logger.info('Item synced successfully', { id: item.id }, 'offline');
        } else {
          // Sync returned false - retry later
          item.retries++;
          if (item.retries < item.maxRetries) {
            remainingQueue.push(item);
            logger.warn('Item sync failed, will retry', { id: item.id, retries: item.retries }, 'offline');
          } else {
            failed++;
            logger.error('Item sync failed, max retries exceeded', { id: item.id }, 'offline');
          }
        }
      } catch (error) {
        item.retries++;
        if (item.retries < item.maxRetries) {
          remainingQueue.push(item);
          logger.error('Item sync error, will retry', { id: item.id, error }, 'offline');
        } else {
          failed++;
          logger.error('Item sync error, max retries exceeded', { id: item.id, error }, 'offline');
        }
      }
    }

    // Save remaining queue
    this.storage.saveQueue(remainingQueue);
    this.updateState();

    // Clear sync in progress
    const finalState = this.storage.getState();
    this.storage.setState({ ...finalState, syncInProgress: false });

    return { success, failed, remaining: remainingQueue.length };
  }

  /**
   * Set sync callback
   */
  setSyncCallback(callback: (item: QueuedItem<T>) => Promise<boolean>): void {
    this.syncCallback = callback;
  }

  /**
   * Set state change listener
   */
  setStateChangeListener(listener: (state: OfflineState) => void): void {
    this.stateChangeListener = listener;
  }

  /**
   * Clear all queue data
   */
  clear(): void {
    this.storage.clear();
    this.updateState();
  }

  /**
   * Cleanup event listeners
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }
}

// ============== React Hook ==============

interface UseOfflineQueueReturn<T> {
  isOnline: boolean;
  queueSize: number;
  syncInProgress: boolean;
  addToQueue: (type: string, data: T) => Promise<string>;
  processQueue: (syncFn: (item: QueuedItem<T>) => Promise<boolean>) => Promise<{ success: number; failed: number; remaining: number }>;
  clearQueue: () => void;
  getQueue: () => QueuedItem<T>[];
}

export function useOfflineQueue<T = unknown>(
  options: OfflineQueueOptions = {}
): UseOfflineQueueReturn<T> {
  const [state, setState] = React.useState<OfflineState>({
    isOnline: navigator.onLine,
    lastOnline: null,
    queueSize: 0,
    syncInProgress: false
  });

  const queueRef = React.useRef<OfflineQueue<T>>();

  React.useEffect(() => {
    const queue = new OfflineQueue<T>(options);

    queue.setStateChangeListener((newState) => {
      setState(newState);
    });

    // Set initial state
    setState(queue.getState());

    queueRef.current = queue;

    return () => {
      queue.destroy();
    };
  }, [options.maxQueueSize, options.maxRetries, options.retryDelay, options.storagePrefix]);

  const addToQueue = React.useCallback(
    async (type: string, data: T) => {
      if (!queueRef.current) {
        throw new Error('Queue not initialized');
      }
      return queueRef.current.addToQueue(type, data);
    },
    []
  );

  const processQueue = React.useCallback(
    async (syncFn: (item: QueuedItem<T>) => Promise<boolean>) => {
      if (!queueRef.current) {
        throw new Error('Queue not initialized');
      }
      return queueRef.current.processQueue(syncFn);
    },
    []
  );

  const clearQueue = React.useCallback(() => {
    if (!queueRef.current) {
      throw new Error('Queue not initialized');
    }
    queueRef.current.clear();
  }, []);

  const getQueue = React.useCallback(() => {
    if (!queueRef.current) {
      return [];
    }
    return queueRef.current.getQueue();
  }, []);

  return {
    isOnline: state.isOnline,
    queueSize: state.queueSize,
    syncInProgress: state.syncInProgress,
    addToQueue,
    processQueue,
    clearQueue,
    getQueue
  };
}

// ============== Utilities ==============

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

/**
 * Wait for network to come online
 */
export function waitForOnline(timeout = 30000): Promise<boolean> {
  return new Promise((resolve) => {
    if (isOnline()) {
      resolve(true);
      return;
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeout);

    const handleOnline = () => {
      cleanup();
      resolve(true);
    };

    const cleanup = () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
    };

    window.addEventListener('online', handleOnline);
  });
}

/**
 * Get network information (if available)
 */
export function getNetworkInfo(): {
  online: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
} {
  if (typeof navigator === 'undefined' || !('connection' in navigator)) {
    return { online: isOnline() };
  }

  const conn = (navigator as unknown as { connection: {
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } }).connection;

  return {
    online: isOnline(),
    effectiveType: conn?.effectiveType,
    downlink: conn?.downlink,
    rtt: conn?.rtt,
    saveData: conn?.saveData
  };
}

export default OfflineQueue;