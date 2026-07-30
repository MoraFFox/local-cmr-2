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
