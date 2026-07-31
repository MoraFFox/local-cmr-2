/** @format */

import { ServiceRecord, PartRecord } from '../types';
import { formatEnNumber, formatPdfCurrency } from './costAggregation';

/**
 * Shared logistics operation type labels — single source of truth
 * for both React HTML reports and jsPDF generators.
 */

/** Format a single service/part line: "الاسم ×2" (count omitted when 1). */
const formatWorkItem = (name: string, count: number): string =>
  count > 1 ? `${name} ×${count}` : name;

/**
 * Format a single service/part line with its cost breakdown, e.g.:
 *   count 1 → "جوان — 100 ج.م"
 *   count 2 → "جوان ×2 — 100 ج.م × 2 = 200 ج.م"
 * Falls back to the plain name (with ×count) when the cost is unknown.
 *
 * @param currencySuffix Currency label to append, e.g. "ج.م" (default) or "EGP" for English reports.
 */
export const formatWorkItemWithCost = (
  name: string,
  count: number,
  cost?: number | null,
  currencySuffix: string = 'ج.م',
): string => {
  const qty = count > 1 ? ` ×${formatEnNumber(count)}` : '';
  if (cost == null || isNaN(Number(cost))) return `${name}${qty}`;
  const unit = Number(cost);
  const total = unit * count;
  const fmt = (v: number) => `${formatEnNumber(v)} ${currencySuffix}`;
  return count > 1
    ? `${name}${qty} — ${fmt(unit)} × ${formatEnNumber(count)} = ${fmt(total)}`
    : `${name} — ${fmt(unit)}`;
};

/** The three possible maintenance-work sections. */
export type MaintenanceSectionKey = 'issues' | 'services' | 'parts';

/** One structured section of the maintenance performed on a machine. */
export interface MaintenanceWorkSection {
  key: MaintenanceSectionKey;
  /** Pre-formatted items: "الاسم" or "الاسم ×2". */
  items: string[];
}

/** Arabic section labels (internal reports / HTML). */
export const MAINTENANCE_SECTION_LABELS_AR: Record<MaintenanceSectionKey, string> = {
  issues: 'المشاكل',
  services: 'الخدمات',
  parts: 'القطع',
};

/** English section labels (client-facing PDFs). */
export const MAINTENANCE_SECTION_LABELS_EN: Record<MaintenanceSectionKey, string> = {
  issues: 'Issues',
  services: 'Services',
  parts: 'Parts',
};

/**
 * Split the maintenance performed into structured, labeled sections
 * (issues / services / parts) with pre-formatted items. Empty sections
 * are omitted so reports only show what actually happened.
 */
export function getMaintenanceWorkSections(
  issues: string[] = [],
  services: ServiceRecord[] = [],
  parts: PartRecord[] = [],
): MaintenanceWorkSection[] {
  const sections: MaintenanceWorkSection[] = [];
  if (issues.length > 0) {
    sections.push({ key: 'issues', items: issues });
  }
  if (services.length > 0) {
    sections.push({ key: 'services', items: services.map((s) => formatWorkItem(s.name, s.count)) });
  }
  if (parts.length > 0) {
    sections.push({ key: 'parts', items: parts.map((p) => formatWorkItem(p.name, p.count)) });
  }
  return sections;
}

/**
 * Compose a human-readable Arabic summary of the maintenance performed
 * (issues + services + parts). Used to populate the legacy `work_done`
 * column so older report surfaces keep displaying something meaningful.
 */
export function composeMaintenanceWork(
  issues: string[] = [],
  services: ServiceRecord[] = [],
  parts: PartRecord[] = [],
): string {
  return getMaintenanceWorkSections(issues, services, parts)
    .map((s) => `${MAINTENANCE_SECTION_LABELS_AR[s.key]}: ${s.items.join('، ')}`)
    .join(' | ');
}

/**
 * Compose a structured, multi-line summary with English section labels
 * (used in client-facing PDF tables). Each section is a labeled line
 * followed by bulleted items, e.g.:
 *
 *   Issues:\n  • هاندات غير نظيفة\n  • تسريب مياة\n\nServices:\n  • تغيير جوانات
 */
export function composeMaintenanceWorkEn(
  issues: string[] = [],
  services: ServiceRecord[] = [],
  parts: PartRecord[] = [],
): string {
  return getMaintenanceWorkSections(issues, services, parts)
    .map((s) => `${MAINTENANCE_SECTION_LABELS_EN[s.key]}:\n${s.items.map((i) => `  • ${i}`).join('\n')}`)
    .join('\n\n');
}

/** Full Arabic labels used in internal HTML reports and the logistics timeline. */
export const LOGISTICS_TYPE_LABELS_AR: Record<string, string> = {
  pickup_and_deliver: 'استلام ماكينة + تسليم بديلة',
  deliver_only: 'تسليم ماكينة بديلة فقط',
  pickup_only: 'استلام ماكينة العميل فقط',
};

/** Compact Arabic labels used in the jsPDF internal report table (narrower columns). */
export const LOGISTICS_TYPE_LABELS_AR_COMPACT: Record<string, string> = {
  pickup_and_deliver: 'استلام + تسليم',
  deliver_only: 'تسليم فقط',
  pickup_only: 'استلام فقط',
};

/** English labels used in client-facing PDFs. */
export const LOGISTICS_TYPE_LABELS_EN: Record<string, string> = {
  pickup_and_deliver: 'Pickup + Deliver',
  deliver_only: 'Deliver Only',
  pickup_only: 'Pickup Only',
};

/** Status labels (Arabic). */
export const LOGISTICS_STATUS_LABELS: Record<string, { label: string }> = {
  open: { label: 'مفتوحة' },
  closed: { label: 'مغلقة' },
};

/** English labels for machine categories (client-facing PDFs). */
export const MACHINE_CATEGORY_LABELS_EN: Record<string, string> = {
  coffee: 'Coffee Machine',
  grinder: 'Grinder',
  other: 'Other',
};

/** English labels for machine systems (client-facing PDFs). */
export const MACHINE_SYSTEM_LABELS_EN: Record<string, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
  semi_automatic: 'Semi-Auto',
};

/**
 * Format a machine description (category + system) for client-facing PDFs.
 * Falls back to the raw stored value when the value is unknown/custom.
 */
export const formatMachineDescription = (
  category?: string | null,
  system?: string | null,
): string => {
  const parts = [
    category ? MACHINE_CATEGORY_LABELS_EN[category] || category : '',
    system ? MACHINE_SYSTEM_LABELS_EN[system] || system : '',
  ].filter(Boolean);
  return parts.join(' · ');
};

/** Arabic labels for machine categories (internal reports). */
export const MACHINE_CATEGORY_LABELS_AR: Record<string, string> = {
  coffee: 'ماكينة قهوة',
  grinder: 'مطحنة',
  other: 'أخرى',
};

/** Arabic labels for machine systems (internal reports). */
export const MACHINE_SYSTEM_LABELS_AR: Record<string, string> = {
  manual: 'يدوي',
  automatic: 'أوتوماتيك',
  semi_automatic: 'نصف أوتوماتيك',
};

/**
 * Format a machine description (category + system) for Arabic internal reports.
 * Falls back to the raw stored value when the value is unknown/custom.
 */
export const formatMachineDescriptionAr = (
  category?: string | null,
  system?: string | null,
): string => {
  const parts = [
    category ? MACHINE_CATEGORY_LABELS_AR[category] || category : '',
    system ? MACHINE_SYSTEM_LABELS_AR[system] || system : '',
  ].filter(Boolean);
  return parts.join(' · ');
};
