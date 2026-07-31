/** @format */

/**
 * Shared logistics operation type labels — single source of truth
 * for both React HTML reports and jsPDF generators.
 */

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
