/**
 * useAutoSave Hook
 *
 * Automatically saves form state to localStorage with configurable debounce
 * Prevents data loss when users close browser/tab unexpectedly
 *
 * @example
 * ```tsx
 * const autoSave = useAutoSave('maintenance-form', formData, {
 *   debounceMs: 30000, // Save every 30 seconds
 *   onSave: (data) => console.log('Saved:', data)
 * });
 *
 * return (
 *   <div>
 *     {autoSave.isSaving && <Spinner />}
 *     {autoSave.lastSaved && <span>Last saved: {autoSave.lastSaved}</span>}
 *   </div>
 * );
 * ```
 */

import { useEffect, useState, useRef, useCallback } from 'react';

interface AutoSaveOptions<T> {
  /** Debounce time in milliseconds (default: 1000 = 1 second) */
  debounceMs?: number;
  /** Callback when save occurs */
  onSave?: (data: T) => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
  /** Maximum number of versions to keep in history (default: 5) */
  maxVersions?: number;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  versionCount: number;
}

interface AutoSaveReturn<T> extends AutoSaveState {
  /** Manually trigger save */
  saveNow: () => Promise<void>;
  /** Clear all saved data */
  clearSaved: () => void;
  /** Restore from saved data */
  restore: () => T | null;
  /** Get list of available versions */
  getVersions: () => Array<{ version: number; timestamp: string }>;
  /** Restore specific version */
  restoreVersion: (version: number) => T | null;
}

const STORAGE_KEY_PREFIX = 'cmr-autosave-';
const VERSION_KEY_SUFFIX = '-versions';
const CURRENT_KEY_SUFFIX = '-current';

/**
 * Generate storage keys for different data types
 */
function getStorageKeys(formId: string) {
  return {
    current: `${STORAGE_KEY_PREFIX}${formId}${CURRENT_KEY_SUFFIX}`,
    versions: `${STORAGE_KEY_PREFIX}${formId}${VERSION_KEY_SUFFIX}`
  };
}

/**
 * Save data to localStorage with version tracking
 */
function saveToStorage<T>(
  formId: string,
  data: T,
  maxVersions: number = 5
): void {
  const keys = getStorageKeys(formId);

  try {
    // Get existing versions
    const versionsJson = localStorage.getItem(keys.versions);
    const versions: Array<{ version: number; timestamp: number; data: T }> =
      versionsJson ? JSON.parse(versionsJson) : [];

    // Get current data to check if actually changed
    const currentJson = localStorage.getItem(keys.current);
    const currentData: T | null = currentJson ? JSON.parse(currentJson) : null;

    // Only save if data actually changed
    if (currentData && JSON.stringify(currentData) === JSON.stringify(data)) {
      return; // No change needed
    }

    // Create new version
    const newVersion = {
      version: versions.length + 1,
      timestamp: Date.now(),
      data
    };

    // Add to versions array
    versions.push(newVersion);

    // Keep only maxVersions
    const trimmedVersions = versions.slice(-maxVersions);

    // Save versions
    localStorage.setItem(keys.versions, JSON.stringify(trimmedVersions));

    // Save as current
    localStorage.setItem(keys.current, JSON.stringify({
      data,
      timestamp: Date.now(),
      version: newVersion.version
    }));

  } catch (error) {
    console.error('Failed to save to localStorage:', error);
    throw new Error('Auto-save failed: Storage quota exceeded or unavailable');
  }
}

/**
 * Load current data from localStorage
 */
function loadFromStorage<T>(formId: string): T | null {
  const keys = getStorageKeys(formId);

  try {
    const currentJson = localStorage.getItem(keys.current);
    if (!currentJson) return null;

    const saved = JSON.parse(currentJson);
    return saved.data as T;
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Get all versions from localStorage
 */
function getVersions(formId: string): Array<{ version: number; timestamp: string }> {
  const keys = getStorageKeys(formId);

  try {
    const versionsJson = localStorage.getItem(keys.versions);
    if (!versionsJson) return [];

    const versions: Array<{ version: number; timestamp: number; data: unknown }> =
      JSON.parse(versionsJson);

    return versions.map(v => ({
      version: v.version,
      timestamp: new Date(v.timestamp).toISOString()
    }));
  } catch {
    return [];
  }
}

/**
 * Restore specific version
 */
function restoreVersion<T>(formId: string, versionNumber: number): T | null {
  const keys = getStorageKeys(formId);

  try {
    const versionsJson = localStorage.getItem(keys.versions);
    if (!versionsJson) return null;

    const versions: Array<{ version: number; timestamp: number; data: T }> =
      JSON.parse(versionsJson);

    const version = versions.find(v => v.version === versionNumber);
    if (!version) return null;

    // Update current to this version
    localStorage.setItem(keys.current, JSON.stringify({
      data: version.data,
      timestamp: Date.now(),
      version: version.version
    }));

    return version.data;
  } catch {
    return null;
  }
}

/**
 * Clear all saved data for a form
 */
function clearStorage(formId: string): void {
  const keys = getStorageKeys(formId);
  localStorage.removeItem(keys.current);
  localStorage.removeItem(keys.versions);
}

/**
 * Main auto-save hook
 */
export function useAutoSave<T extends Record<string, unknown>>(
  formId: string,
  formData: T,
  options: AutoSaveOptions<T> = {}
): AutoSaveReturn<T> {
  const {
    debounceMs = 1000,
    onSave,
    onSaveError,
    enabled = true,
    maxVersions = 5
  } = options;

  const [state, setState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    versionCount: 0
  });

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedDataRef = useRef<T | null>(null);
  const initialLoadRef = useRef(true);

  /**
   * Manual save function
   */
  const saveNow = useCallback(async () => {
    if (!enabled) return;

    // Check if data actually changed
    if (lastSavedDataRef.current &&
        JSON.stringify(lastSavedDataRef.current) === JSON.stringify(formData)) {
      return; // No change
    }

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          saveToStorage(formId, formData, maxVersions);
          resolve();
        }, 100); // Small delay to show loading state
      });

      const now = new Date();
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: now,
        hasUnsavedChanges: false,
        versionCount: getVersions(formId).length
      }));

      lastSavedDataRef.current = { ...formData };
      onSave?.(formData);

    } catch (error) {
      setState(prev => ({ ...prev, isSaving: false }));
      onSaveError?.(error as Error);
    }
  }, [formId, formData, maxVersions, enabled, onSave, onSaveError]);

  /**
   * Clear saved data
   */
  const clearSaved = useCallback(() => {
    clearStorage(formId);
    setState({
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      versionCount: 0
    });
    lastSavedDataRef.current = null;
  }, [formId]);

  /**
   * Restore from saved data
   */
  const restore = useCallback(() => {
    return loadFromStorage<T>(formId);
  }, [formId]);

  /**
   * Get available versions
   */
  const getVersionsList = useCallback(() => {
    return getVersions(formId);
  }, [formId]);

  /**
   * Restore specific version
   */
  const restoreSpecificVersion = useCallback((versionNumber: number) => {
    return restoreVersion<T>(formId, versionNumber);
  }, [formId]);

  /**
   * Effect: Auto-save with debounce
   */
  useEffect(() => {
    if (!enabled) return;

    // Skip initial load (don't save empty form)
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Check if data changed
    if (lastSavedDataRef.current &&
        JSON.stringify(lastSavedDataRef.current) === JSON.stringify(formData)) {
      return;
    }

    // Mark as having unsaved changes
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      saveNow();
    }, debounceMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [formData, debounceMs, enabled, saveNow]);

  /**
   * Effect: Update version count when saved
   */
  useEffect(() => {
    setState(prev => ({
      ...prev,
      versionCount: getVersions(formId).length
    }));
  }, [formId]);

  // Refs to hold latest values for unmount save. Using refs + minimal deps
  // ensures the cleanup only runs on actual unmount, not on every formData /
  // hasUnsavedChanges change (which would repeatedly save stale data).
  const latestDataRef = useRef(formData);
  const latestUnsavedRef = useRef(state.hasUnsavedChanges);
  latestDataRef.current = formData;
  latestUnsavedRef.current = state.hasUnsavedChanges;

  /**
   * Effect: Save on unmount if there are unsaved changes.
   * Cleanup runs only when enabled/formId/maxVersions change or on unmount.
   */
  useEffect(() => {
    return () => {
      if (latestUnsavedRef.current && enabled) {
        saveToStorage(formId, latestDataRef.current, maxVersions);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, formId, maxVersions]);

  return {
    isSaving: state.isSaving,
    lastSaved: state.lastSaved,
    hasUnsavedChanges: state.hasUnsavedChanges,
    versionCount: state.versionCount,
    saveNow,
    clearSaved,
    restore,
    getVersions: getVersionsList,
    restoreVersion: restoreSpecificVersion
  };
}

/**
 * Hook to detect if there's saved data available for restoration
 */
export function useHasSavedData(formId: string): boolean {
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    const keys = getStorageKeys(formId);
    const hasCurrent = !!localStorage.getItem(keys.current);
    setHasData(hasCurrent);
  }, [formId]);

  return hasData;
}

/**
 * Hook to get all forms with saved data
 */
export function useAllSavedForms(): string[] {
  const [formIds, setFormIds] = useState<string[]>([]);

  useEffect(() => {
    const allKeys = Object.keys(localStorage);
    const savedForms = allKeys
      .filter(key => key.startsWith(STORAGE_KEY_PREFIX) && key.endsWith(CURRENT_KEY_SUFFIX))
      .map(key => key.replace(STORAGE_KEY_PREFIX, '').replace(CURRENT_KEY_SUFFIX, ''));

    setFormIds(savedForms);
  }, []);

  return formIds;
}

export default useAutoSave;