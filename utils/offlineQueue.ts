import { FormData } from '../types';
import { logger } from './logger';

export type QueueActionType = 'CREATE' | 'UPDATE' | 'DELETE';

export interface QueueItem {
    id: string; // Unique ID for the queue item itself
    action: QueueActionType;
    payload: FormData | number; // FormData for Create/Update, ID (number) for Delete
    timestamp: number;
    tempId?: number; // For locally created items that don't have a DB ID yet
    version?: number; // Optimistic locking version for updates
}

const STORAGE_KEY = 'offline_mutation_queue';
const ENCRYPTION_KEY_NAME = 'cmr_queue_key';

// Simple encryption/decryption using Web Crypto API
async function getEncryptionKey(): Promise<CryptoKey> {
  const stored = localStorage.getItem(ENCRYPTION_KEY_NAME);
  if (stored) {
    const keyData = Uint8Array.from(atob(stored), c => c.charCodeAt(0));
    return crypto.subtle.importKey('raw', keyData, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  // Generate new key
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const exported = await crypto.subtle.exportKey('raw', key);
  localStorage.setItem(ENCRYPTION_KEY_NAME, btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(exported)))));
  return key;
}

async function encryptData(data: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode.apply(null, Array.from(combined)));
}

async function decryptData(encrypted: string): Promise<string> {
  const key = await getEncryptionKey();
  const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(decrypted);
}

export const getQueue = async (): Promise<QueueItem[]> => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        
        // Check if data is encrypted (try to decrypt first)
        try {
            const decrypted = await decryptData(stored);
            return JSON.parse(decrypted);
        } catch {
            // If decryption fails, data might be unencrypted (legacy format)
            // Try parsing directly and then re-encrypt
            try {
                const parsed = JSON.parse(stored);
                // Re-encrypt the data for future use
                await saveQueue(parsed);
                return parsed;
            } catch {
                logger.error("Error parsing offline queue", stored, 'offline');
                return [];
            }
        }
    } catch (e) {
        logger.error("Error reading offline queue", e, 'offline');
        return [];
    }
};

export const saveQueue = async (queue: QueueItem[]): Promise<void> => {
    try {
        const encrypted = await encryptData(JSON.stringify(queue));
        localStorage.setItem(STORAGE_KEY, encrypted);
    } catch (e) {
        logger.error("Failed to encrypt queue", e, 'offline');
        // Fallback to unencrypted (better than losing data)
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
        } catch (saveError) {
            logger.error("Error saving offline queue", saveError, 'offline');
        }
    }
};

export const addToQueue = async (action: QueueActionType, payload: FormData | number): Promise<QueueItem> => {
    const queue = await getQueue();
    const timestamp = Date.now();
    const id = `${timestamp}-${crypto.getRandomValues(new Uint8Array(4)).reduce((acc, b) => acc + b.toString(16).padStart(2, '0'), '')}`;
    
    let tempId: number | undefined;

    // Optimization: If we are updating an item that is currently pending creation in the queue,
    // just update the payload of the CREATE action instead of adding an UPDATE action.
    if (action === 'UPDATE' && typeof payload !== 'number') {
        const formDataPayload = payload as FormData;
        const createItemIndex = queue.findIndex(item => 
            item.action === 'CREATE' && item.tempId === formDataPayload.id
        );

        if (createItemIndex !== -1) {
            queue[createItemIndex].payload = payload;
            queue[createItemIndex].timestamp = timestamp; // Bump timestamp? Or keep original? Keeping original creation order is usually safer.
            await saveQueue(queue);
            return queue[createItemIndex];
        }
    }
    
    // Optimization: If we delete an item that is pending creation, just remove the CREATE action.
    if (action === 'DELETE' && typeof payload === 'number' && payload < 0) {
        const createItemIndex = queue.findIndex(item => 
            item.action === 'CREATE' && item.tempId === payload
        );
        if (createItemIndex !== -1) {
            const removed = queue.splice(createItemIndex, 1);
            await saveQueue(queue);
            return removed[0];
        }
    }

    if (action === 'CREATE') {
        // Generate a temporary negative ID for local UI usage
        tempId = -Date.now(); 
        if (typeof payload !== 'number' && payload !== null && typeof payload === 'object') {
            // Create a copy before mutating to avoid direct parameter mutation
            payload = {
                ...payload,
                id: tempId,
                pendingSync: true
            } as FormData;
        }
    } else if (action === 'UPDATE' && typeof payload !== 'number' && payload !== null && typeof payload === 'object') {
         // Create a copy before mutating
         payload = {
             ...payload,
             pendingSync: true
         } as FormData;
         // Add optimistic locking version
         (payload as FormData & { _version?: number })._version = Date.now();
    }

    const MAX_QUEUE_SIZE = 300;
    if (queue.length >= MAX_QUEUE_SIZE) {
        // Remove oldest items (FIFO) to make room
        queue.splice(0, queue.length - MAX_QUEUE_SIZE + 1);
    }

    // Add version for UPDATE actions
    const version = action === 'UPDATE' && typeof payload !== 'number' ? Date.now() : undefined;
    
    const newItem: QueueItem = { id, action, payload, timestamp, tempId, version };
    queue.push(newItem);
    await saveQueue(queue);
    return newItem;
};

export const removeFromQueue = async (queueId: string): Promise<void> => {
    const queue = await getQueue();
    const newQueue = queue.filter(item => item.id !== queueId);
    await saveQueue(newQueue);
};

export const clearQueue = (): void => {
    localStorage.removeItem(STORAGE_KEY);
};

export const getPendingCreations = async (): Promise<(FormData & { created_at: string })[]> => {
    const queue = await getQueue();
    return queue
        .filter(item => item.action === 'CREATE')
        .map(item => {
            const data = item.payload as FormData;
            return {
                ...data,
                created_at: new Date(item.timestamp).toISOString(),
                pendingSync: true
            };
        });
};
