import type { MaintenanceRecord } from "../types";

// ── Types ──

export interface DateRange {
  startDate?: string; // "YYYY-MM-DD" inclusive
  endDate?: string;   // "YYYY-MM-DD" inclusive
  preset?: string;    // "allTime" | "today" | "thisWeek" | "thisMonth" | "thisQuarter" | "thisYear" | "custom"
}

// ── Arabic Labels ──

export const ARABIC_PRESET_LABELS: Record<string, string> = {
  allTime: "كل الفترات",
  today: "اليوم",
  thisWeek: "هذا الأسبوع",
  thisMonth: "هذا الشهر",
  thisQuarter: "هذا الربع",
  thisYear: "هذه السنة",
  custom: "فترة مخصصة",
};

// ── Presets ──

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function startOfWeekISO(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun, 6=Sat
  const diffToMon = day === 0 ? 6 : day - 1; // Monday-based week
  d.setDate(d.getDate() - diffToMon);
  return d.toISOString().split("T")[0];
}

function startOfMonthISO(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().split("T")[0];
}

function startOfQuarterISO(): string {
  const d = new Date();
  const month = d.getMonth();
  const quarterStartMonth = Math.floor(month / 3) * 3; // 0,3,6,9
  d.setMonth(quarterStartMonth, 1);
  return d.toISOString().split("T")[0];
}

function startOfYearISO(): string {
  const d = new Date();
  d.setMonth(0, 1);
  return d.toISOString().split("T")[0];
}

export function getDateRangePresets(): Record<string, DateRange> {
  return {
    allTime: { preset: "allTime" },
    today: {
      startDate: todayISO(),
      endDate: todayISO(),
      preset: "today",
    },
    thisWeek: {
      startDate: startOfWeekISO(),
      endDate: todayISO(),
      preset: "thisWeek",
    },
    thisMonth: {
      startDate: startOfMonthISO(),
      endDate: todayISO(),
      preset: "thisMonth",
    },
    thisQuarter: {
      startDate: startOfQuarterISO(),
      endDate: todayISO(),
      preset: "thisQuarter",
    },
    thisYear: {
      startDate: startOfYearISO(),
      endDate: todayISO(),
      preset: "thisYear",
    },
  };
}

// ── Filter ──

/**
 * Filters maintenance records by date range (inclusive).
 * Recursively filters followUpVisits — if a follow-up is out of range,
 * it is excluded from the parent's followUpVisits array.
 * Returns a new array (no mutation).
 */
export function filterMaintenanceByDateRange(
  records: MaintenanceRecord[],
  range: DateRange,
): MaintenanceRecord[] {
  if (!range || (!range.startDate && !range.endDate)) return records;

  const startMs = range.startDate ? new Date(range.startDate).getTime() : -Infinity;
  // End date is inclusive — set to end of day
  const endMs = range.endDate
    ? new Date(range.endDate + "T23:59:59.999").getTime()
    : Infinity;

  return records
    .filter((r) => {
      const d = new Date(r.maintenanceDate).getTime();
      return d >= startMs && d <= endMs;
    })
    .map((r) => {
      if (!r.followUpVisits || r.followUpVisits.length === 0) return r;
      return {
        ...r,
        followUpVisits: filterMaintenanceByDateRange(r.followUpVisits, range),
      };
    });
}

// ── Period Label ──

const AR_EG_MONTHS = [
  "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

function formatArabicDate(isoStr: string): string {
  const d = new Date(isoStr);
  // Guard against Invalid Date — returns NaN timestamp for malformed strings
  if (isNaN(d.getTime()) || d.getMonth() < 0 || d.getMonth() > 11) {
    return isoStr; // fallback: return the raw string rather than "undefined"
  }
  return `${d.getDate()} ${AR_EG_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Returns a human-readable Arabic label for a date range.
 * - "كل الفترات" for allTime/empty
 * - "١ يوليو ٢٠٢٦" for a single day
 * - "١ يوليو — ١٥ يوليو ٢٠٢٦" for a range
 */
export function formatDateRangeLabel(range: DateRange): string {
  if (!range || range.preset === "allTime" || (!range.startDate && !range.endDate)) {
    return "";
  }

  if (range.startDate && range.endDate && range.startDate === range.endDate) {
    return formatArabicDate(range.startDate);
  }

  if (range.startDate && range.endDate) {
    return `${formatArabicDate(range.startDate)} — ${formatArabicDate(range.endDate)}`;
  }

  if (range.startDate) {
    return `من ${formatArabicDate(range.startDate)}`;
  }

  if (range.endDate) {
    return `حتى ${formatArabicDate(range.endDate)}`;
  }

  return "";
}
