/**
 * Shared constants for the CMR application.
 * Deduplicates code previously copied between App.tsx and FormWizardView.tsx.
 */

import { FormData, MaintenanceRecord } from "../types";
import { problemCategories } from "../constants";

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
  { id: 4, name: "الفريق" },
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
  supervisors: [{ id: Date.now(), name: "", phone: "" }],
  dailyLeaseCost: undefined,
  nextVisitDate: "",
  photos: [],
});

// ── Shared CSS Class Strings ───────────────────────────────────
export const CLASSES = {
  textArea:
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-surface dark:bg-chrome-light text-primary dark:text-cream rounded-lg placeholder-latte dark:placeholder-latte focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 border border-default dark:border-default shadow-sm",
  select:
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-surface dark:bg-chrome-light text-primary dark:text-cream rounded-lg placeholder-latte dark:placeholder-latte focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/20 border border-default dark:border-default shadow-sm",
} as const;

// ── View-to-Title Mapping ──────────────────────────────────────
export const VIEW_TITLES: Record<string, string> = {
  form: "",
  print: "طباعة أمر العمل",
  details: "تفاصيل السجل",
  baristas: "أداء الباريستا",
  "barista-details": "أداء الباريستا",
  technicians: "إدارة الفنيين",
  history: "سجل عمليات الإرسال",
};
