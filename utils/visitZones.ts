/** @format */

import { useState, useEffect, useCallback, useMemo } from "react";

// ── Types ──

export interface VisitZone {
  key: string;
  label: string;
  fee: number;
  /** Whether this zone was user-created (enables removal) */
  isCustom?: boolean;
}

// ── Default Zones ──

const DEFAULT_ZONES: VisitZone[] = [
  { key: "cairo", label: "القاهرة الكبرى", fee: 500 },
  { key: "outside_cairo", label: "خارج القاهرة", fee: 1500 },
  { key: "el_sahel", label: "الساحل الشمالي", fee: 4000 },
  { key: "hurghada", label: "الغردقة", fee: 4000 },
  { key: "sharm_el_sheikh", label: "شرم الشيخ", fee: 4000 },
  { key: "delta", label: "الدلتا", fee: 2000 },
  { key: "alexandria", label: "الإسكندرية", fee: 2000 },
];

// ── Storage Key ──

const STORAGE_KEY = "cmr_visit_zones";

// ── Helpers ──

const loadCustomZones = (): VisitZone[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (z: any) =>
          typeof z.key === "string" &&
          typeof z.label === "string" &&
          typeof z.fee === "number",
      )
      .map((z: any) => ({ ...z, isCustom: true }));
  } catch {
    return [];
  }
};

const saveCustomZones = (zones: VisitZone[]): void => {
  try {
    const toSave = zones.map(({ key, label, fee }) => ({ key, label, fee }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // localStorage unavailable — silently ignore
  }
};

// ── In-memory cache ──

let cachedZones: VisitZone[] | null = null;

/**
 * Returns all zones (defaults + user-created custom zones).
 * Custom zone keys override default ones of the same key.
 */
export const getAllVisitZones = (): VisitZone[] => {
  if (cachedZones) return cachedZones;
  return refreshZoneCache();
};

export const refreshZoneCache = (): VisitZone[] => {
  const custom = loadCustomZones();
  const customKeys = new Set(custom.map((z) => z.key));
  // Default zones not overridden by custom zones
  const filteredDefaults = DEFAULT_ZONES.filter(
    (z) => !customKeys.has(z.key),
  );
  cachedZones = [...filteredDefaults, ...custom];
  return cachedZones;
};

/**
 * Look up the fee for a given zone key. Returns 0 if not found.
 */
export const getVisitZoneFee = (key: string | null | undefined): number => {
  if (!key) return 0;
  const zones = getAllVisitZones();
  return zones.find((z) => z.key === key)?.fee ?? 0;
};

/**
 * Look up the display label for a given zone key. Returns the key itself if not found.
 */
export const getVisitZoneLabel = (key: string | null | undefined): string => {
  if (!key) return "غير محدد";
  const zones = getAllVisitZones();
  return zones.find((z) => z.key === key)?.label ?? key;
};

/**
 * Look up a fee record by key, so UI code has both label and fee together.
 */
export type VisitZoneFees = Record<string, number>;

export const getVisitZoneFeesMap = (): VisitZoneFees => {
  const zones = getAllVisitZones();
  const map: VisitZoneFees = {};
  zones.forEach((z) => {
    map[z.key] = z.fee;
  });
  return map;
};

export type VisitZoneLabels = Record<string, string>;

export const getVisitZoneLabelsMap = (): VisitZoneLabels => {
  const zones = getAllVisitZones();
  const map: VisitZoneLabels = {};
  zones.forEach((z) => {
    map[z.key] = z.label;
  });
  return map;
};

/**
 * Add a new custom zone. Overrides an existing zone with the same key.
 */
export const addVisitZone = (zone: VisitZone): void => {
  const custom = loadCustomZones();
  const existing = custom.findIndex((z) => z.key === zone.key);
  if (existing >= 0) {
    custom[existing] = { ...zone, isCustom: true };
  } else {
    custom.push({ ...zone, isCustom: true });
  }
  saveCustomZones(custom);
  cachedZones = null; // invalidate cache
  window.dispatchEvent(new CustomEvent("visit-zones-changed"));
};

/**
 * Remove a custom zone by key. Cannot remove default zones.
 */
export const removeVisitZone = (key: string): boolean => {
  const custom = loadCustomZones();
  const idx = custom.findIndex((z) => z.key === key);
  if (idx < 0) return false;
  custom.splice(idx, 1);
  saveCustomZones(custom);
  cachedZones = null;
  window.dispatchEvent(new CustomEvent("visit-zones-changed"));
  return true;
};

/**
 * Reset all custom zones (restore defaults only).
 */
export const resetVisitZones = (): void => {
  localStorage.removeItem(STORAGE_KEY);
  cachedZones = null;
  window.dispatchEvent(new CustomEvent("visit-zones-changed"));
};

// ── React Hook ──

export const useVisitZones = () => {
  const [zones, setZones] = useState<VisitZone[]>(() => getAllVisitZones());

  useEffect(() => {
    const handler = () => setZones(getAllVisitZones());
    window.addEventListener("visit-zones-changed", handler);
    return () => window.removeEventListener("visit-zones-changed", handler);
  }, []);

  const add = useCallback((zone: VisitZone) => {
    addVisitZone(zone);
    setZones(getAllVisitZones());
  }, []);

  const remove = useCallback((key: string) => {
    const ok = removeVisitZone(key);
    if (ok) setZones(getAllVisitZones());
    return ok;
  }, []);

  const reset = useCallback(() => {
    resetVisitZones();
    setZones(getAllVisitZones());
  }, []);

  const feeMap = useMemo(() => getVisitZoneFeesMap(), [zones]);
  const labelMap = useMemo(() => getVisitZoneLabelsMap(), [zones]);

  return { zones, add, remove, reset, feeMap, labelMap };
};
