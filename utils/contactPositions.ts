/** @format */

import { useState, useEffect, useCallback, useMemo } from "react";
import { contactPositions as defaultContactPositions } from "../constants";

// ── Types ──

export interface ContactPosition {
  label: string;
  value: string;
  /** Whether this position was user-created (enables removal) */
  isCustom?: boolean;
}

// ── Storage Key ──

const STORAGE_KEY = "cmr_contact_positions";

// ── Helpers ──

const loadCustomPositions = (): ContactPosition[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p: any) =>
          typeof p.label === "string" &&
          typeof p.value === "string",
      )
      .map((p: any) => ({ ...p, isCustom: true }));
  } catch {
    return [];
  }
};

const saveCustomPositions = (positions: ContactPosition[]): void => {
  try {
    const toSave = positions.map(({ label, value }) => ({ label, value }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage unavailable — silently ignore
  }
};

// ── In-memory cache ──

let cachedPositions: ContactPosition[] | null = null;

/**
 * Returns all positions (defaults + user-created custom positions).
 * Custom position values override defaults with the same value.
 */
export const getAllContactPositions = (): ContactPosition[] => {
  if (cachedPositions) return cachedPositions;
  return refreshContactPositionCache();
};

export const refreshContactPositionCache = (): ContactPosition[] => {
  const custom = loadCustomPositions();
  const customValues = new Set(custom.map((p) => p.value));
  // Default positions not overridden by custom positions
  const filteredDefaults = defaultContactPositions.filter(
    (p) => !customValues.has(p.value),
  );
  cachedPositions = [...filteredDefaults, ...custom];
  return cachedPositions;
};

/**
 * Add a new custom position. Overrides an existing position with the same value.
 */
export const addContactPosition = (position: ContactPosition): void => {
  const custom = loadCustomPositions();
  const existing = custom.findIndex((p) => p.value === position.value);
  if (existing >= 0) {
    custom[existing] = { label: position.label, value: position.value, isCustom: true };
  } else {
    custom.push({ label: position.label, value: position.value, isCustom: true });
  }
  saveCustomPositions(custom);
  cachedPositions = null;
  window.dispatchEvent(new CustomEvent("contact-positions-changed"));
};

/**
 * Remove a custom position by value. Cannot remove default positions.
 */
export const removeContactPosition = (value: string): boolean => {
  // Don't allow removing defaults
  if (defaultContactPositions.some((p) => p.value === value)) return false;
  const custom = loadCustomPositions();
  const idx = custom.findIndex((p) => p.value === value);
  if (idx < 0) return false;
  custom.splice(idx, 1);
  saveCustomPositions(custom);
  cachedPositions = null;
  window.dispatchEvent(new CustomEvent("contact-positions-changed"));
  return true;
};

/**
 * Reset all custom positions (restore defaults only).
 */
export const resetContactPositions = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  cachedPositions = null;
  window.dispatchEvent(new CustomEvent("contact-positions-changed"));
};

// ── React Hook ──

export const useContactPositions = () => {
  const [positions, setPositions] = useState<ContactPosition[]>(() =>
    getAllContactPositions(),
  );

  useEffect(() => {
    const handler = () => setPositions(getAllContactPositions());
    window.addEventListener("contact-positions-changed", handler);
    return () =>
      window.removeEventListener("contact-positions-changed", handler);
  }, []);

  const add = useCallback((position: ContactPosition) => {
    addContactPosition(position);
    setPositions(getAllContactPositions());
  }, []);

  const remove = useCallback((value: string) => {
    const ok = removeContactPosition(value);
    if (ok) setPositions(getAllContactPositions());
    return ok;
  }, []);

  const reset = useCallback(() => {
    resetContactPositions();
    setPositions(getAllContactPositions());
  }, []);

  /** Map of value → label for quick lookup */
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {};
    positions.forEach((p) => {
      map[p.value] = p.label;
    });
    return map;
  }, [positions]);

  return { positions, add, remove, reset, labelMap };
};
