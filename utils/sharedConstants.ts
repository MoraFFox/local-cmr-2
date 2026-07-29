/**
 * Shared constants for the CMR application.
 * Deduplicates code previously copied between App.tsx and FormWizardView.tsx.
 */

import { FormData, MaintenanceRecord } from "../types";
import { problemCategories } from "../constants";
import { generateUniqueId } from "./idGenerator";

// ── Storage Keys ───────────────────────────────────────────────
export const STORAGE_KEYS = {
  DRAFTS: "cmr_drafts",
  THEME: "theme",
  OFFLINE_QUEUE: "offline_mutation_queue",
  QUEUE_ENCRYPTION_KEY: "cmr_queue_key",
  LOGS: "cmr_logs",
} as const;

// ── Route Patterns ─────────────────────────────────────────────
export const ROUTE_PATTERNS = {
  COMPANIES_ID: /^\/companies\/(?!new)([^/]+)(\/maintenance)?$/,
  COMPANIES_NEW: "/companies/new",
  BARISTAS_BASE: "/baristas",
  BARISTA_DETAILS: "/baristas/",
  USERS: "/users",
  PRINT: "/print",
} as const;

// ── Initial Form Data ──────────────────────────────────────────
export const initialFormData: FormData = {
  companyName: "",
  email: "",
  taxNumber: "",
  location: "",
  hasBranches: false,
  usesOurMachines: null,
  branchCount: 0,
  branches: [],
  warehouse: {
    location: "",
    contacts: [],
  },
  machines: [],
  baristas: [],
  clientBaristas: [],
  maintenanceHistory: [],
  contacts: [],
};

// ── Wizard Steps ───────────────────────────────────────────────
export const steps = [
  { id: 1, name: "معلومات الشركة" },
  { id: 2, name: "الفروع" },
  { id: 3, name: "المخزن" },
  { id: 4, name: "فريق Midoe's" },
  { id: 4.5, name: "باريستا العميل" },
  { id: 5, name: "الصيانة" },
  { id: 6, name: "المراجعة" },
];

// ── Precomputed Problem Values ─────────────────────────────────
export const allPredefinedProblems = problemCategories.flatMap((cat) =>
  cat.options.map((opt) => opt.value),
);

// ── Factory Functions ──────────────────────────────────────────
export const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getNewMaintenanceRecord = (id: number): MaintenanceRecord => ({
  id,
  maintenanceDate: getTodayDateString(),
  notes: "",
  type: "scheduled",
  hadProblem: false,
  partsWereReplaced: false,
  problemSolved: false,
  partsReplaced: [],
  paidBy: "company",
  baristaName: "",
  clientBaristaName: "",
  recommendations: "",
  problems: [],
  visitZone: null,
  servicesPerformed: [],
  followUpVisits: [],
  machines: [],
  supervisors: [{ id: generateUniqueId(), name: "", phone: "" }],
  dailyLeaseCost: undefined,
  nextVisitDate: "",
  photos: [],
});

// ── Shared CSS Class Strings ───────────────────────────────────
export const SIDEBAR_TOGGLE_SHORTCUT = {
  label: "Ctrl+Shift+S",
  ctrl: true,
  shift: true,
  alt: false,
  meta: false,
  key: "s",
} as const;

export const CLASSES = {
  textArea:
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-cream text-primary rounded-lg placeholder-latte focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 border border-hairline shadow-sm",
  select:
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-cream text-primary rounded-lg placeholder-latte focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 border border-hairline shadow-sm",
} as const;

// ── View-to-Title Mapping ──────────────────────────────────────
export const VIEW_TITLES: Record<string, string> = {
  form: "نموذج الإرسال — ميدوز",
  print: "طباعة أمر العمل — ميدوز",
  details: "تفاصيل السجل — ميدوز",
  baristas: "أداء فريق Midoe's — ميدوز",
  "barista-details": "أداء فريق Midoe's — ميدوز",
  technicians: "إدارة الفنيين — ميدوز",
  history: "سجل عمليات الإرسال — ميدوز",
  "maintenance-edit": "تحرير الصيانة — ميدوز",
};
