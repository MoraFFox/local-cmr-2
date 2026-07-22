/**
 * useAutoSave Hook
 *
 * Automatically saves form state to localStorage with configurable debounce.
 */

import { useEffect, useState, useRef, useCallback } from 'react';

interface AutoSaveOptions<T> {
  debounceMs?: number;
  onSave?: (data: T) => void;
  onSaveError?: (error: Error) => void;
  enabled?: boolean;
  maxVersions?: number;
}

interface AutoSaveState {
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
  versionCount: number;
}

interface AutoSaveReturn<T> extends AutoSaveState {
  saveNow: () => Promise<void>;
  clearSaved: () => void;
  restore: () => T | null;
  getVersions: () => Array<{ version: number; timestamp: string }>;
  restoreVersion: (version: number) => T | null;
}

const STORAGE_KEY_PREFIX = 'cmr-autosave-';
const VERSION_KEY_SUFFIX = '-versions';
const CURRENT_KEY_SUFFIX = '-current';

function getStorageKeys(formId: string) {
  return {
    current: `${STORAGE_KEY_PREFIX}${formId}${CURRENT_KEY_SUFFIX}`,
    versions: `${STORAGE_KEY_PREFIX}${formId}${VERSION_KEY_SUFFIX}`
  };
}

function saveToStorage<T>(formId: string, data: T, maxVersions: number = 5): void {
  const keys = getStorageKeys(formId);
  try {
    const versionsJson = localStorage.getItem(keys.versions);
    const versions: Array<{ version: number; timestamp: number; data: T }> =
      versionsJson ? JSON.parse(versionsJson) : [];

    const currentJson = localStorage.getItem(keys.current);
    const currentData: T | null = currentJson ? JSON.parse(currentJson) : null;

    if (currentData && JSON.stringify(currentData) === JSON.stringify(data)) {
      return;
    }

    const newVersion = {
      version: versions.length + 1,
      timestamp: Date.now(),
      data
    };
    versions.push(newVersion);
    const trimmedVersions = versions.slice(-maxVersions);

    localStorage.setItem(keys.versions, JSON.stringify(trimmedVersions));
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

function getVersions(formId: string): Array<{ version: number; timestamp: string }> {
  const keys = getStorageKeys(formId);
  try {
    const versionsJson = localStorage.getItem(keys.versions);
    if (!versionsJson) return [];
    const versions: Array<{ version: number; timestamp: number; data: unknown }> = JSON.parse(versionsJson);
    return versions.map(v => ({
      version: v.version,
      timestamp: new Date(v.timestamp).toISOString()
    }));
  } catch {
    return [];
  }
}

function restoreVersion<T>(formId: string, versionNumber: number): T | null {
  const keys = getStorageKeys(formId);
  try {
    const versionsJson = localStorage.getItem(keys.versions);
    if (!versionsJson) return null;
    const versions: Array<{ version: number; timestamp: number; data: T }> = JSON.parse(versionsJson);
    const version = versions.find(v => v.version === versionNumber);
    if (!version) return null;
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

function clearStorage(formId: string): void {
  const keys = getStorageKeys(formId);
  localStorage.removeItem(keys.current);
  localStorage.removeItem(keys.versions);
}

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
  const lastScheduledDataRef = useRef<T | null>(null);
  const initialLoadRef = useRef(true);
  const shouldClearTimeoutRef = useRef(true);

  // Latest formData / callbacks are kept in refs so the debounced timeout
  // callback and cleanup do not depend on object identity changes.
  const latestFormDataRef = useRef(formData);
  latestFormDataRef.current = formData;

  const onSaveRef = useRef(onSave);
  const onSaveErrorRef = useRef(onSaveError);

  useEffect(() => {
    onSaveRef.current = onSave;
    onSaveErrorRef.current = onSaveError;
  }, [onSave, onSaveError]);

  const saveNow = useCallback(async () => {
    if (!enabled) return;

    const data = latestFormDataRef.current;

    if (
      lastSavedDataRef.current &&
      JSON.stringify(lastSavedDataRef.current) === JSON.stringify(data)
    ) {
      return;
    }

    setState(prev => ({ ...prev, isSaving: true }));

    try {
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            saveToStorage(formId, data, maxVersions);
            resolve();
          } catch (err) {
            reject(err);
          }
        }, 100);
      });

      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
        hasUnsavedChanges: false,
        versionCount: getVersions(formId).length
      }));

      lastSavedDataRef.current = { ...data };
      lastScheduledDataRef.current = { ...data };
      onSaveRef.current?.(data);
    } catch (error) {
      setState(prev => ({ ...prev, isSaving: false }));
      onSaveErrorRef.current?.(error as Error);
    }
  }, [formId, maxVersions, enabled]);

  const clearSaved = useCallback(() => {
    clearStorage(formId);
    setState({
      isSaving: false,
      lastSaved: null,
      hasUnsavedChanges: false,
      versionCount: 0
    });
    lastSavedDataRef.current = null;
    lastScheduledDataRef.current = null;
  }, [formId]);

  const restore = useCallback(() => {
    return loadFromStorage<T>(formId);
  }, [formId]);

  const getVersionsList = useCallback(() => {
    return getVersions(formId);
  }, [formId]);

  const restoreSpecificVersion = useCallback((versionNumber: number) => {
    return restoreVersion<T>(formId, versionNumber);
  }, [formId]);

  /**
   * Effect: Auto-save with debounce. Compares JSON snapshots so parents that
   * pass new object literals with identical data don't cancel the pending save.
   */
  useEffect(() => {
    if (!enabled) return;

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    const data = latestFormDataRef.current;

    if (
      lastScheduledDataRef.current &&
      JSON.stringify(lastScheduledDataRef.current) === JSON.stringify(data)
    ) {
      // Data has not changed; don't clear the pending timeout.
      shouldClearTimeoutRef.current = false;
      return;
    }

    shouldClearTimeoutRef.current = true;
    setState(prev => ({ ...prev, hasUnsavedChanges: true }));
    lastScheduledDataRef.current = { ...data };

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    const id = setTimeout(() => {
      saveNow();
    }, debounceMs);
    timeoutRef.current = id;

    return () => {
      if (shouldClearTimeoutRef.current && timeoutRef.current === id) {
        clearTimeout(id);
      }
    };
  }, [formData, debounceMs, enabled, saveNow]);

  // Update version count on mount / when formId changes.
  useEffect(() => {
    setState(prev => ({
      ...prev,
      versionCount: getVersions(formId).length
    }));
  }, [formId]);

  // Save any unsaved changes on unmount.
  const latestUnsavedRef = useRef(state.hasUnsavedChanges);
  latestUnsavedRef.current = state.hasUnsavedChanges;

  useEffect(() => {
    return () => {
      if (latestUnsavedRef.current && enabled) {
        try {
          saveToStorage(formId, latestFormDataRef.current, maxVersions);
        } catch (error) {
          // Best-effort save on unmount; surface via callback is not possible here.
          onSaveErrorRef.current?.(error as Error);
        }
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

export function useHasSavedData(formId: string): boolean {
  const [hasData, setHasData] = useState(false);
  useEffect(() => {
    const keys = getStorageKeys(formId);
    setHasData(!!localStorage.getItem(keys.current));
  }, [formId]);
  return hasData;
}

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
