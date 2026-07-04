/** @format */

import React, { useState, useEffect, useCallback, useMemo } from "react";
// FIX: Use correct import for GoogleGenAI
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabaseClient";
import {
  FormData,
  Branch,
  Barista,
  ClientBarista,
  MaintenanceRecord,
  MaintenancePhoto,
  PartRecord,
  Contact,
  Part,
  Service,
  ServiceRecord,
  MachineMaintained,
  PortalSubmission,
} from "./types";

interface Draft {
  id: string;
  timestamp: number;
  formData: FormData;
  currentStep: number;
}

import StepIndicator from "./components/StepIndicator";
import NavigationButtons from "./components/NavigationButtons";
import Card from "./components/Card";
import TextInput from "./components/TextInput";
import RadioGroup from "./components/RadioGroup";
import ReviewStep from "./components/ReviewStep";
import HistoryPage from "./components/HistoryPage";
import BaristasPage from "./components/BaristasPage";
import ConfirmationModal from "./components/ConfirmationModal.tsx";
import ThemeToggle from "./components/ThemeToggle.tsx";
import CollapsibleCard from "./components/CollapsibleCard.tsx";
import EmptyState from "./components/EmptyState.tsx";
import {
  HomeIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  Bars3Icon,
  XMarkIcon,
  PhoneIcon,
  TrashIcon,
  UserGroupIcon,
  BuildingOffice2Icon,
  WrenchScrewdriverIcon,
  WrenchIcon,
  MapPinIcon,
  CloudArrowUpIcon,
  WifiIcon,
  SignalSlashIcon,
  EyeIcon,
  EyeSlashIcon,
  UsersIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import {
  partsList,
  servicesList,
  contactPositions,
  problemCategories,
} from "./constants";
import MaintenanceRecordCard from "./components/MaintenanceRecordCard.tsx";
import PrintableWorkOrder from "./components/PrintableWorkOrder.tsx";
import SubmissionDetails from "./components/SubmissionDetails.tsx";
import BaristaDetailsPage from "./components/BaristaDetailsPage.tsx";
import MaintenanceEditPage from "./components/MaintenanceEditPage.tsx";
import UserAccessManagement from "./components/UserAccessManagement.tsx";
import {
  addToQueue,
  getQueue,
  removeFromQueue,
  getPendingCreations,
  QueueItem,
} from "./utils/offlineQueue";
import { sanitizeString, sanitizeObject } from "./utils/sanitization";
import { validateSubmissionId, isValidDbId, isLocalId } from "./utils/validation";
import { useToast } from "./components/ToastContext.tsx";
import { logger } from "./utils/logger";
import { useT } from "./utils/i18n";

// FIX: Initialize Gemini API client according to guidelines.
// The API key MUST be provided via the `process.env.API_KEY` environment variable.
const ai = process.env.API_KEY
  ? new GoogleGenAI({ apiKey: process.env.API_KEY })
  : null;

const initialFormData: FormData = {
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

const steps = [
  { id: 1, name: "معلومات الشركة" },
  { id: 2, name: "الفروع" },
  { id: 3, name: "المخزن" },
  { id: 4, name: "الفريق" },
  { id: 4.5, name: "باريستا العميل" },
  { id: 5, name: "الصيانة" },
  { id: 6, name: "المراجعة" },
];

const allPredefinedProblems = problemCategories.flatMap((cat) =>
  cat.options.map((opt) => opt.value),
);

const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getNewMaintenanceRecord = (id: number): MaintenanceRecord => ({
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

// Fix 4.2: Extract SidebarContent to a memoized component outside App
interface SidebarContentProps {
  view: string;
  isSidebarExpanded: boolean;
  theme: "light" | "dark";
  drafts: Draft[];
  currentDraftId: string | null;
  handleViewChange: (newView: "history" | "form" | "baristas" | "technicians") => void;
  handleLoadDraft: (draft: Draft) => void;
  handleDeleteDraft: (e: React.MouseEvent, draftId: string) => void;
  toggleTheme: () => void;
  onAdminLogout?: () => Promise<void> | void;
  handleAddNew: () => void;
  setIsSidebarExpanded: (expanded: boolean) => void;
  setCurrentDraftId: (id: string | null) => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
}

const SidebarContent = React.memo(({ 
  view, 
  isSidebarExpanded, 
  theme, 
  drafts, 
  currentDraftId,
  handleViewChange,
  handleLoadDraft,
  handleDeleteDraft,
  toggleTheme,
  onAdminLogout,
  handleAddNew,
  setIsSidebarExpanded,
  setCurrentDraftId,
  setFormData,
  setCurrentStep,
  setView,
}: SidebarContentProps) => {
  return (
    <>
      <div
        className={`flex items-center h-16 border-b border-slate-200 dark:border-slate-700 shrink-0 transition-all duration-300 ${isSidebarExpanded ? "justify-start px-6 gap-3" : "justify-center"}`}
      >
        <img src="/logo.svg" alt="شعار ميدوز" className="h-8 w-auto object-contain" />
        <h1
          className={`text-xl font-bold transition-opacity duration-200 whitespace-nowrap text-slate-800 dark:text-white ${isSidebarExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"}`}
        >
          ميدوز
        </h1>
      </div>
      <nav className="flex-grow p-2 space-y-2">
        <button
          onClick={() => handleViewChange("history")}
          className={`flex items-center w-full space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${
            view === "history"
              ? "bg-teal-50 text-teal-700 dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          } ${!isSidebarExpanded && "justify-center"}`}
        >
          <HomeIcon className="h-6 w-6 shrink-0" />
          <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
            السجل
          </span>
        </button>
        <button
          onClick={() => handleViewChange("baristas")}
          className={`flex items-center w-full space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${
            view === "baristas"
              ? "bg-teal-50 text-teal-700 dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          } ${!isSidebarExpanded && "justify-center"}`}
        >
          
          <WrenchIcon className="h-6 w-6 shrink-0" />
          <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
            الفنيون
          </span>
        </button>
        <button
          onClick={() => handleViewChange("technicians")}
          className={`flex items-center w-full space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${
            view === "technicians"
              ? "bg-teal-50 text-teal-700 dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          } ${!isSidebarExpanded && "justify-center"}`}
        >
          <UsersIcon className="h-6 w-6 shrink-0" />
          <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
            إدارة المستخدمين
          </span>
        </button>
        <button
          onClick={() => handleViewChange("form")}
          className={`flex items-center w-full space-x-3 p-2 rounded-md text-sm font-medium transition-colors ${
            view === "form"
              ? "bg-teal-50 text-teal-700 dark:bg-slate-900 dark:text-white"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
          } ${!isSidebarExpanded && "justify-center"}`}
        >
          <DocumentTextIcon className="h-6 w-6 shrink-0" />
          <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
            بناء النموذج
          </span>
        </button>
      </nav>
      <div className="p-2 border-t border-slate-200 dark:border-slate-700 shrink-0 space-y-2">
        {/* Drafts Section */}
        {drafts.length > 0 && (
          <div className={`mb-4 ${!isSidebarExpanded && "hidden"}`}>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
              <span className="flex-shrink-0 mx-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                المسودات
              </span>
              <div className="flex-grow border-t border-slate-300 dark:border-slate-600"></div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => handleLoadDraft(draft)}
                  className={`group flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors ${currentDraftId === draft.id ? "bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800" : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
                >
                  <div className="flex flex-col truncate">
                    <span className="font-medium truncate">
                      {draft.formData.companyName || "شركة بدون اسم"}
                    </span>
                    <span className="text-xs opacity-70">
                      {new Date(draft.timestamp).toLocaleDateString()}{" "}
                      {new Date(draft.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDraft(e, draft.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                    title="حذف المسودة"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
        {onAdminLogout && (
          <button
            onClick={() => {
              void Promise.resolve(onAdminLogout()).catch((error) => {
                logger.error("Admin logout error", error, "auth");
              });
            }}
            className={`w-full flex items-center space-x-3 p-3 rounded-md text-sm font-semibold border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ${!isSidebarExpanded && "justify-center"}`}
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6 shrink-0" />
            <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
              تسجيل الخروج
            </span>
          </button>
        )}
        <button
          onClick={() => {
            if (currentDraftId && view === "form") {
              // If we are currently editing a draft, confirm starting fresh
              if (
                window.confirm(
                  "بدء نموذج جديد؟ سيتم حفظ عملك الحالي كمسودة.",
                )
              ) {
                setCurrentDraftId(null);
                setFormData(initialFormData);
                setCurrentStep(1);
                setView("form");
              }
            } else {
              handleAddNew();
            }
          }}
          className={`w-full flex items-center space-x-3 p-3 rounded-md text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors transform active:scale-95 ${!isSidebarExpanded && "justify-center"}`}
        >
          <PlusCircleIcon className="h-6 w-6 shrink-0" />
          <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
            إضافة شركة جديدة
          </span>
        </button>
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className={`w-full hidden lg:flex items-center p-2 rounded-md text-sm font-medium text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition-colors ${!isSidebarExpanded && "justify-center"}`}
          aria-label={isSidebarExpanded ? "طي الشريط الجانبي" : "فتح الشريط الجانبي"}
        >
          {isSidebarExpanded ? (
            <ChevronDoubleLeftIcon className="h-6 w-6 shrink-0" />
          ) : (
            <ChevronDoubleRightIcon className="h-6 w-6 shrink-0" />
          )}
          {isSidebarExpanded && <span className="ms-2 truncate">طي</span>}
        </button>
      </div>
    </>
  );
});

SidebarContent.displayName = 'SidebarContent';

// FIX: Implement the main App component to orchestrate the multi-step form.
interface AppProps {
  onAdminLogout?: () => Promise<void> | void;
}

const App: React.FC<AppProps> = ({ onAdminLogout }) => {
  const [view, setView] = useState<
    | "history"
    | "form"
    | "print"
    | "details"
    | "baristas"
    | "barista-details"
    | "maintenance-edit"
    | "technicians"
  >("history");
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [submissions, setSubmissions] = useState<
    (FormData & { created_at: string })[]
  >([]);
  const [selectedSubmission, setSelectedSubmission] = useState<
    (FormData & { created_at: string }) | null
  >(null);
  const [selectedBarista, setSelectedBarista] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(
    null,
  );
  const [newlyAddedId, setNewlyAddedId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();
  const [showPreview, setShowPreview] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      const saved = localStorage.getItem("cmr_drafts");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Array<{id: string, name: string}>>([]);

  // COLLECT ALL KNOWN BARISTAS FOR AUTO-SUGGEST
  const allKnownBaristaNames = useMemo(() => {
    const names = new Set<string>();
    formData.baristas.forEach((b) => names.add(b.name));
    formData.branches.forEach((br) =>
      br.baristas.forEach((b) => names.add(b.name)),
    );
    return Array.from(names);
  }, [formData.baristas, formData.branches]);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined" && window.localStorage) {
      if (
        localStorage.theme === "dark" ||
        (!("theme" in localStorage) &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      ) {
        return "dark";
      }
    }
    return "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [theme]);

  useEffect(() => {
    if (newlyAddedId) {
      const timer = setTimeout(() => setNewlyAddedId(null), 500);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedId]);

  // Fetch technicians for display name resolution
  useEffect(() => {
    const fetchTechnicians = async () => {
      if (!navigator.onLine) return;
      
      try {
        const { data, error } = await supabase
          .from('technicians')
          .select('id, name');
        
        if (error) {
          logger.error('Error fetching technicians', error, 'data');
          return;
        }
        
        setTechnicians((data || []).map(t => ({ id: t.id, name: t.name })));
      } catch (err) {
        logger.error('Error fetching technicians', err, 'data');
      }
    };
    
    fetchTechnicians();
  }, [isOnline]);

  // Create technicians map for quick lookup
  const techniciansMap = useMemo(() => {
    return new Map(technicians.map(t => [t.id, t]));
  }, [technicians]);

  // Helper function to get display name for a maintenance record
  const getTechnicianDisplayName = useCallback((record: MaintenanceRecord): string => {
    if (record.technicianId) {
      const technician = techniciansMap.get(record.technicianId);
      if (technician) {
        return technician.name;
      }
    }
    return record.baristaName || 'Unknown';
  }, [techniciansMap]);

  // Auto-save draft
  useEffect(() => {
    if (view !== "form") return;

    // Don't auto-save if form is empty (fresh state)
    const isFormEmpty =
      !formData.companyName &&
      !formData.email &&
      !formData.taxNumber &&
      !formData.location;
    if (isFormEmpty && !currentDraftId) return;

    const saveTimer = setTimeout(() => {
      const timestamp = Date.now();
      let draftId = currentDraftId;

      if (!draftId) {
        draftId = `draft_${timestamp}`;
        setCurrentDraftId(draftId);
      }

      setDrafts((prev) => {
        const otherDrafts = prev.filter((d) => d.id !== draftId);
        const updatedDraft = {
          id: draftId!,
          timestamp,
          formData,
          currentStep,
        };
        const newDrafts = [updatedDraft, ...otherDrafts].sort(
          (a, b) => b.timestamp - a.timestamp,
        );
        localStorage.setItem("cmr_drafts", JSON.stringify(newDrafts));
        return newDrafts;
      });
    }, 1000);

    return () => clearTimeout(saveTimer);
  }, [formData, currentStep, currentDraftId, view]);

  // Collapse sidebar when entering maintenance edit view
  useEffect(() => {
    if (view === "maintenance-edit") {
      setIsSidebarExpanded(false);
    }
  }, [view]);

  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // Ref to track mounted state for cleanup
  const isMountedRef = React.useRef(true);
  
  // Ref to prevent concurrent queue processing
  const isProcessingQueueRef = React.useRef(false);

  // Network Status Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check: If we start online, try to process the queue immediately
    if (navigator.onLine) {
      processOfflineQueue();
    }

    return () => {
      isMountedRef.current = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const processOfflineQueue = async () => {
    // Guard against concurrent execution
    if (isProcessingQueueRef.current) {
      logger.debug('Queue processing already in progress, skipping', undefined, 'sync');
      return;
    }
    
    const queue = await getQueue();
    if (queue.length === 0) return;

    isProcessingQueueRef.current = true;
    setIsSyncing(true);
    logger.info(`Starting sync of ${queue.length} items`, undefined, 'sync');

    try {
      // Process queue strictly in order
      for (const item of queue) {
        try {
          let error;
          if (item.action === "CREATE") {
            const { id, pendingSync, ...dataToSubmit } = item.payload as FormData;
            // Remove local ID and flag before sending to Supabase
            const submissionPayload = { form_data: dataToSubmit };
            const { error: insertError } = await supabase
              .from("companies")
              .insert([submissionPayload]);
            error = insertError;
          } else if (item.action === "UPDATE") {
            const { id, pendingSync, ...dataToSubmit } = item.payload as FormData;
            // Only update if it has a valid Supabase ID (positive number)
            if (id && id > 0) {
              const submissionPayload = { form_data: dataToSubmit };
              const { error: updateError } = await supabase
                .from("companies")
                .update(submissionPayload)
                .eq("id", id);
              error = updateError;
            } else {
              logger.warn("Skipping update for invalid ID", { id }, 'sync');
            }
          } else if (item.action === "DELETE") {
            const id = item.payload as number;
            if (id > 0) {
              const { error: deleteError } = await supabase
                .from("companies")
                .delete()
                .eq("id", id);
              error = deleteError;
            }
          }

          if (error) {
            logger.error(`Sync error for item`, { itemId: item.id, error }, 'sync');
            showToast(`خطأ في مزامنة العنصر: ${error.message || 'خطأ غير معروف'}`, "error");
            const isDataError =
              error.code &&
              (error.code.startsWith("PGRST") || error.code.startsWith("42"));
            if (isDataError) {
              logger.warn(`Removing item from queue due to data error`, { itemId: item.id, message: error.message }, 'sync');
              await removeFromQueue(item.id);
            } else {
              // Network errors - stop processing and retry later
              break;
            }
          } else {
            await removeFromQueue(item.id);
          }
        } catch (e) {
          logger.error(`Sync exception for item`, { itemId: item.id, error: e }, 'sync');
          showToast("خطأ في المزامنة - سيتم إعادة المحاولة لاحقاً", "warning");
          break;
        }
      }

      if (isMountedRef.current) {
        setIsSyncing(false);
        fetchSubmissions(); // Refresh list after sync attempt
        showToast("تمت المزامنة بنجاح", "success");
      }
    } finally {
      isProcessingQueueRef.current = false;
    }
  };

  const handleLoadDraft = (draft: Draft) => {
    if (
      window.confirm(
        "Load this draft? Current unsaved changes will be lost if not drafted.",
      )
    ) {
      setFormData(draft.formData);
      setCurrentStep(draft.currentStep);
      setCurrentDraftId(draft.id);
      setView("form");
      if (window.innerWidth < 1024) setIsSidebarExpanded(false);
    }
  };

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    if (window.confirm("Delete this draft?")) {
      setDrafts((prev) => {
        const newDrafts = prev.filter((d) => d.id !== draftId);
        localStorage.setItem("cmr_drafts", JSON.stringify(newDrafts));
        return newDrafts;
      });
      if (currentDraftId === draftId) {
        setCurrentDraftId(null);
        // Optional: Reset form or keep as is? keeping as is for now implies "detached from draft"
      }
    }
  };

  const handleDiscardCurrent = () => {
    if (currentDraftId) {
      setDrafts((prev) => {
        const newDrafts = prev.filter((d) => d.id !== currentDraftId);
        localStorage.setItem("cmr_drafts", JSON.stringify(newDrafts));
        return newDrafts;
      });
    }
    setCurrentDraftId(null);
    setFormData(initialFormData);
    setCurrentStep(1);
    setView("form");
  };

  // Fix 3.6: Conflict detection helper for sync resolution
  const detectConflict = (localItem: any, serverItem: any): boolean => {
    // If both have been modified, there's a potential conflict
    if (localItem.updatedAt && serverItem.updated_at) {
      const localTime = new Date(localItem.updatedAt).getTime();
      const serverTime = new Date(serverItem.updated_at).getTime();
      // If server is newer but local has changes, it's a conflict
      if (serverTime > localTime && localItem.pendingSync) {
        return true;
      }
    }
    return false;
  };

  const fetchSubmissions = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Companies (Legacy Storage)
      let serverData: (FormData & { created_at: string })[] = [];
      let portalSubmissions: PortalSubmission[] = [];

      if (navigator.onLine) {
        // Fetch companies
        const { data: companies, error: companiesError } = await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false });
        
        if (companiesError) {
          logger.error("Error fetching companies", companiesError, 'data');
          showToast("خطأ في جلب بيانات الشركات", "error");
        }
        else serverData = companies?.map(d => ({ ...d.form_data, id: d.id, created_at: d.created_at })) || [];

        // Fetch portal records (Unified Storage)
        const { data: submissions, error: subsError } = await supabase
          .from("maintenance_submissions")
          .select("*")
          .order("maintenance_date", { ascending: false });

        if (subsError) {
          logger.error("Error fetching submissions", subsError, 'data');
          showToast("خطأ في جلب بيانات الصيانة", "error");
        }
        else portalSubmissions = submissions || [];
      }

      // 2. Merge Portal Submissions into Company/Branch History
      const mergedData = serverData.map(company => {
        const enrichedCompany = { ...company };
        const companySubs = portalSubmissions.filter(s => String(s.company_id) === String(company.id));

        // Attach to main office if no branch_id
        // Deduplicate: prefer company-side records when IDs match
        const mainOfficeSubs = companySubs.filter(s => !s.branch_id).map(mapPortalToMaintenance);
        const mainOfficeRecordIds = new Set(
          (enrichedCompany.maintenanceHistory || []).map(r => r.id)
        );
        const mergedMainOffice = [
          ...(enrichedCompany.maintenanceHistory || []),
          ...mainOfficeSubs.filter(r => !mainOfficeRecordIds.has(r.id))
        ].sort((a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime());
        enrichedCompany.maintenanceHistory = mergedMainOffice;

        // Attach to branches with same deduplication logic
        if (enrichedCompany.branches) {
          enrichedCompany.branches = enrichedCompany.branches.map((branch: Branch) => {
            const branchSubs = companySubs.filter(s => String(s.branch_id) === String(branch.id)).map(mapPortalToMaintenance);
            const branchRecordIds = new Set(
              (branch.maintenanceHistory || []).map(r => r.id)
            );
            const mergedBranchHistory = [
              ...(branch.maintenanceHistory || []),
              ...branchSubs.filter(r => !branchRecordIds.has(r.id))
            ].sort((a, b) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime());
            return {
              ...branch,
              maintenanceHistory: mergedBranchHistory
            };
          });
        }

        return enrichedCompany;
      });

      // 3. Local Queue Handling
      const localPending = await getPendingCreations();
      const queue = await getQueue();
      const deletedIds = new Set(queue.filter(q => q.action === "DELETE").map(q => q.payload as number));

      // Fix 3.6: Check for conflicts between local pending items and server data
      const conflicts: { local: any; server: any }[] = [];
      const mergedWithConflictDetection = mergedData.map(serverRecord => {
        const localPending = queue.find(item => 
          item.action === "UPDATE" && 
          item.payload && 
          (item.payload as any).id === serverRecord.id
        );
        if (localPending && detectConflict(localPending.payload, serverRecord)) {
          conflicts.push({ local: localPending.payload, server: serverRecord });
        }
        return serverRecord;
      });

      // Log conflicts (in production, show UI for user to resolve)
      if (conflicts.length > 0) {
        logger.warn(`Found sync conflicts. Server version used.`, { count: conflicts.length }, 'sync');
      }

      const finalSubmissions = [
        ...localPending,
        ...mergedWithConflictDetection.filter(d => !deletedIds.has(d.id!))
      ];

      setSubmissions(finalSubmissions);
    } catch (e) {
      logger.error("Unexpected error fetching submissions", e, 'data');
      showToast("حدث خطأ غير متوقع أثناء جلب البيانات", "error");
      setSubmissions(await getPendingCreations());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Map portal snake_case to frontend CamelCase
  const mapPortalToMaintenance = (sub: PortalSubmission): MaintenanceRecord => {
    // Build photos array with deduplication
    // 1. Prefer photo_entries for typed photos (before/after)
    // 2. Merge in any leftover photo_urls as "legacy" entries
    // 3. Deduplicate by URL so same URL doesn't appear twice
    const photos: MaintenancePhoto[] = [];

    // Add typed photos from photo_entries
    if (sub.photo_entries && sub.photo_entries.length > 0) {
      photos.push(...sub.photo_entries.map(entry => ({
        url: entry.url,
        type: entry.type as "before" | "after"
      })));
    }

    // Add legacy photos that aren't already in the array
    if (sub.photo_urls && sub.photo_urls.length > 0) {
      const existingUrls = new Set(photos.map(p => p.url));
      for (const url of sub.photo_urls) {
        if (!existingUrls.has(url)) {
          photos.push({ url, type: "legacy" });
        }
      }
    }

    return {
      id: sub.id,
      maintenanceDate: sub.maintenance_date,
      notes: sub.notes || "",
      type: sub.type as "requested" | "scheduled",
      hadProblem: sub.had_problem || false,
      partsWereReplaced: sub.parts_were_replaced || false,
      problemSolved: sub.problem_solved || false,
      partsReplaced: sub.parts_replaced || [],
      paidBy: sub.paid_by as "company" | "client",
      baristaName: sub.barista_name || "",
      clientBaristaName: sub.client_barista_name || "",
      visitRating: sub.visit_rating || 0,
      problems: sub.problems || [],
      visitZone: sub.visit_zone as "cairo" | "outside_cairo" | "el_sahel" | null,
      servicesPerformed: sub.services_performed || [],
      machines: sub.machines || [],
      supervisors: [], // Supervisor data not yet captured by portal
      photos: photos.length > 0 ? photos : undefined,
      technicianId: sub.technician_id
    };
  };

  useEffect(() => {
    fetchSubmissions();
  }, [isOnline]); // Re-fetch when online status changes

  const visibleSteps = formData.hasBranches
    ? steps.filter((step) => step.id !== 4 && step.id !== 5)
    : steps.filter((step) => step.id !== 2);

  const handleNext = () => {
    const currentIndex = visibleSteps.findIndex(
      (step) => step.id === currentStep,
    );
    if (currentIndex < visibleSteps.length - 1) {
      setCurrentStep(visibleSteps[currentIndex + 1].id);
    }
  };

  const handlePrev = () => {
    const currentIndex = visibleSteps.findIndex(
      (step) => step.id === currentStep,
    );
    if (currentIndex > 0) {
      setCurrentStep(visibleSteps[currentIndex - 1].id);
    }
  };

  // Fix 4.1: Wrap event handlers in useCallback to prevent unnecessary re-renders
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;

      if (name.includes(".")) {
        const [parent, child] = name.split(".");
        setFormData((prev) => ({
          ...prev,
          [parent]: {
            ...(prev[parent as keyof FormData] as object),
            [child]: value,
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: type === "checkbox" ? checked : value,
        }));
      }
    },
    [],
  );

  const handleRadioChange = useCallback((name: string, value: any) => {
    setFormData((prev) => {
      const newState: FormData = { ...prev, [name]: value };
      if (name === "hasBranches") {
        if (value === true) {
          // When a company has branches, team and maintenance are managed per-branch.
          // Clear the main office records.
          newState.baristas = [];
          newState.maintenanceHistory = [];
          newState.usesOurMachines = null; // Clear main machine info
          delete newState.machineOwnershipType;
          delete newState.dailyLeaseCost;
        } else {
          // When a company does not have branches, clear the branches array.
          newState.branches = [];
          newState.branchCount = 0;
        }
      }

      if (name === "usesOurMachines" && value === false) {
        delete newState.machineOwnershipType;
        delete newState.dailyLeaseCost;
      }

      if (name === "machineOwnershipType" && value !== "leased") {
        delete newState.dailyLeaseCost;
      }

      return newState;
    });
  }, []);

  // START: Contact Handlers
  const addContact = (path: "main" | "warehouse" | `branch-${number}`) => {
    const newContact: Contact = {
      id: Date.now(),
      name: "",
      position: "manager",
      phoneNumbers: [{ id: Date.now(), number: "" }],
    };
    setNewlyAddedId(newContact.id);

    setFormData((prev) => {
      if (path === "main") {
        return { ...prev, contacts: [...prev.contacts, newContact] };
      }
      if (path === "warehouse") {
        return {
          ...prev,
          warehouse: {
            ...prev.warehouse,
            contacts: [...prev.warehouse.contacts, newContact],
          },
        };
      }
      if (path.startsWith("branch-")) {
        const branchIndex = parseInt(path.split("-")[1], 10);
        const newBranches = [...prev.branches];
        newBranches[branchIndex].contacts.push(newContact);
        return { ...prev, branches: newBranches };
      }
      return prev;
    });
  };

  const removeContact = (
    path: "main" | "warehouse" | `branch-${number}`,
    contactIndex: number,
  ) => {
    setFormData((prev) => {
      if (path === "main") {
        return {
          ...prev,
          contacts: prev.contacts.filter((_, i) => i !== contactIndex),
        };
      }
      if (path === "warehouse") {
        const newWarehouseContacts = prev.warehouse.contacts.filter(
          (_, i) => i !== contactIndex,
        );
        return {
          ...prev,
          warehouse: { ...prev.warehouse, contacts: newWarehouseContacts },
        };
      }
      if (path.startsWith("branch-")) {
        const branchIndex = parseInt(path.split("-")[1], 10);
        const newBranches = [...prev.branches];
        newBranches[branchIndex].contacts = newBranches[
          branchIndex
        ].contacts.filter((_, i) => i !== contactIndex);
        return { ...prev, branches: newBranches };
      }
      return prev;
    });
  };

  // Fix 4.1: Wrap handleContactChange in useCallback
  const handleContactChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
      path: "main" | "warehouse" | `branch-${number}`,
      contactIndex: number,
    ) => {
      const { name, value } = e.target;
      setFormData((prev) => {
        let contactsList: Contact[];
        if (path === "main") contactsList = [...prev.contacts];
        else if (path === "warehouse")
          contactsList = [...prev.warehouse.contacts];
        else {
          const branchIndex = parseInt(path.split("-")[1], 10);
          contactsList = [...prev.branches[branchIndex].contacts];
        }

        const updatedContact = { ...contactsList[contactIndex], [name]: value };
        if (name === "position" && value !== "custom") {
          updatedContact.customPosition = "";
        }
        contactsList[contactIndex] = updatedContact;

        if (path === "main") return { ...prev, contacts: contactsList };
        if (path === "warehouse")
          return {
            ...prev,
            warehouse: { ...prev.warehouse, contacts: contactsList },
          };

        const branchIndex = parseInt(path.split("-")[1], 10);
        const newBranches = [...prev.branches];
        newBranches[branchIndex].contacts = contactsList;
        return { ...prev, branches: newBranches };
      });
    },
    [],
  );

  const addPhoneNumber = (
    path: "main" | "warehouse" | `branch-${number}`,
    contactIndex: number,
  ) => {
    setFormData((prev) => {
      let contactsList: Contact[];
      if (path === "main") contactsList = [...prev.contacts];
      else if (path === "warehouse")
        contactsList = [...prev.warehouse.contacts];
      else {
        const branchIndex = parseInt(path.split("-")[1], 10);
        contactsList = [...prev.branches[branchIndex].contacts];
      }

      contactsList[contactIndex].phoneNumbers.push({
        id: Date.now(),
        number: "",
      });

      if (path === "main") return { ...prev, contacts: contactsList };
      if (path === "warehouse")
        return {
          ...prev,
          warehouse: { ...prev.warehouse, contacts: contactsList },
        };

      const branchIndex = parseInt(path.split("-")[1], 10);
      const newBranches = [...prev.branches];
      newBranches[branchIndex].contacts = contactsList;
      return { ...prev, branches: newBranches };
    });
  };

  const removePhoneNumber = (
    path: "main" | "warehouse" | `branch-${number}`,
    contactIndex: number,
    phoneIndex: number,
  ) => {
    setFormData((prev) => {
      let contactsList: Contact[];
      if (path === "main") contactsList = [...prev.contacts];
      else if (path === "warehouse")
        contactsList = [...prev.warehouse.contacts];
      else {
        const branchIndex = parseInt(path.split("-")[1], 10);
        contactsList = [...prev.branches[branchIndex].contacts];
      }

      contactsList[contactIndex].phoneNumbers = contactsList[
        contactIndex
      ].phoneNumbers.filter((_, i) => i !== phoneIndex);

      if (path === "main") return { ...prev, contacts: contactsList };
      if (path === "warehouse")
        return {
          ...prev,
          warehouse: { ...prev.warehouse, contacts: contactsList },
        };

      const branchIndex = parseInt(path.split("-")[1], 10);
      const newBranches = [...prev.branches];
      newBranches[branchIndex].contacts = contactsList;
      return { ...prev, branches: newBranches };
    });
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = ("" + value).replace(/\D/g, "");
    if (!cleaned) {
      return "";
    }
    const match = cleaned.match(/^(\d{0,4})(\d{0,3})(\d{0,4})$/);
    if (match) {
      return [match[1], match[2], match[3]].filter(Boolean).join("-");
    }
    return cleaned;
  };

  // Fix 4.7: Replace JSON.parse/stringify with structuredClone for better performance
  const handlePhoneNumberChange = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      path: "main" | "warehouse" | `branch-${number}`,
      contactIndex: number,
      phoneIndex: number,
    ) => {
      const { value } = e.target;
      const formattedValue = formatPhoneNumber(value);
      setFormData((prev) => {
        let contactsList: Contact[];
        if (path === "main")
          contactsList = prev.contacts.map(c => ({
            ...c,
            phoneNumbers: [...c.phoneNumbers]
          }));
        else if (path === "warehouse")
          contactsList = prev.warehouse.contacts.map(c => ({
            ...c,
            phoneNumbers: [...c.phoneNumbers]
          }));
        else {
          const branchIndex = parseInt(path.split("-")[1], 10);
          contactsList = prev.branches[branchIndex].contacts.map(c => ({
            ...c,
            phoneNumbers: [...c.phoneNumbers]
          }));
        }

        contactsList[contactIndex].phoneNumbers[phoneIndex].number =
          formattedValue;

        if (path === "main") return { ...prev, contacts: contactsList };
        if (path === "warehouse")
          return {
            ...prev,
            warehouse: { ...prev.warehouse, contacts: contactsList },
          };

        const branchIndex = parseInt(path.split("-")[1], 10);
        const newBranches = [...prev.branches];
        newBranches[branchIndex].contacts = contactsList;
        return { ...prev, branches: newBranches };
      });
    },
    [formatPhoneNumber],
  );
  // END: Contact Handlers

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { id, pendingSync, ...dataToSubmit } = formData;

      // Sanitize user inputs before submission
      const sanitizedData = sanitizeObject(dataToSubmit);

      // If offline, skip directly to queueing
      if (!isOnline) {
        throw new Error("Offline");
      }

      const submissionPayload = { form_data: sanitizedData };
      let error;
      
      // Use validation helper to determine action
      const idValidation = validateSubmissionId(formData.id);
      
      if (idValidation.action === 'update' && formData.id) {
        // Update existing database record
        const { error: updateError } = await supabase
          .from("companies")
          .update(submissionPayload)
          .eq("id", formData.id);
        error = updateError;
      } else if (idValidation.action === 'insert') {
        // Create new record
        const { error: insertError } = await supabase
          .from("companies")
          .insert([submissionPayload]);
        error = insertError;
      } else {
        // Local/pending item - handle via offline queue
        throw new Error("Offline");
      }

      if (error) {
        // If it's a network error, throw so catch block handles it
        throw error;
      } else {
        showToast("تم الحفظ بنجاح!", "success");
        await fetchSubmissions();
        setView("history");
        setCurrentStep(1);
        setFormData(initialFormData);
        setShowPreview(false);
      }
    } catch (e: any) {
      // Check if it's a network error or explicitly "Offline"
      if (
        e.message === "Offline" ||
        e.message === "Failed to fetch" ||
        !isOnline
      ) {
        logger.info("Network error or offline, queueing submission", { formDataId: formData.id }, 'sync');

        // Use validation helper for offline queue logic
        if (isValidDbId(formData.id)) {
          await addToQueue("UPDATE", formData);
          showToast("أنت غير متصل. تم حفظ التغييرات محلياً", "warning");
        } else if (isLocalId(formData.id)) {
          // Updating an already pending item
          await addToQueue("UPDATE", formData);
          showToast("تم تحديث التغييرات المحلية", "info");
        } else {
          await addToQueue("CREATE", formData);
          showToast("أنت غير متصل. تم إنشاء التقرير محلياً", "warning");
        }

        await fetchSubmissions();
        setView("history");
        setCurrentStep(1);
        setFormData(initialFormData);
        setShowPreview(false);
      } else {
        logger.error("Submission error", e, 'submission');
        showToast(`خطأ في حفظ النموذج: ${e.message}`, "error");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (submission: FormData) => {
    setFormData(submission);
    setView("form");
    setCurrentStep(1);
    setShowPreview(false);
  };

  const handleUpdateCompany = async (updatedCompany: FormData) => {
    // Fix 3.7: Add ID validation before database operations
    if (!isValidDbId(updatedCompany.id)) {
      showToast("معرف الشركة غير صالح", "error");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (!isOnline) {
        // Update locally and add to queue
        const updatedSubmissions = submissions.map((sub) =>
          sub.id === updatedCompany.id
            ? { ...updatedCompany, created_at: sub.created_at }
            : sub,
        );
        setSubmissions(updatedSubmissions);
        await addToQueue("UPDATE", updatedCompany);
        return;
      }

      const { error } = await supabase
        .from("companies")
        .update({
          form_data: updatedCompany,
        })
        .eq("id", updatedCompany.id);

      if (error) throw error;

      // Update local state
      const updatedSubmissions = submissions.map((sub) =>
        sub.id === updatedCompany.id
          ? { ...updatedCompany, created_at: sub.created_at }
          : sub,
      );
      setSubmissions(updatedSubmissions);
    } catch (e: any) {
      logger.error("Error updating company", e, 'data');
      alert(
        "Failed to update company. Changes saved locally and will sync when online.",
      );
      // Still update locally
      const updatedSubmissions = submissions.map((sub) =>
        sub.id === updatedCompany.id
          ? { ...updatedCompany, created_at: sub.created_at }
          : sub,
      );
      setSubmissions(updatedSubmissions);
      await addToQueue("UPDATE", updatedCompany);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetails = (submission: FormData & { created_at: string }) => {
    setSelectedSubmission(submission);
    setView("details");
    setShowPreview(false);
  };

  const requestDelete = (id: number) => {
    if (typeof id === "undefined") {
      logger.warn("Delete request cancelled: ID is undefined", undefined, 'data');
      return;
    }
    setDeleteCandidateId(id);
  };

  const confirmDelete = async () => {
    if (deleteCandidateId === null) return;

    setIsDeleting(true);
    try {
      if (!isOnline) throw new Error("Offline");

      // If ID is negative, it's a local item. Just remove from queue.
      if (deleteCandidateId < 0) {
        await addToQueue("DELETE", deleteCandidateId); // Helper handles removing CREATE action
        await fetchSubmissions();
        return;
      }

      const { error } = await supabase
        .from("companies")
        .delete()
        .eq("id", deleteCandidateId);

      if (error) throw error;

      await fetchSubmissions();
    } catch (e: any) {
      if (
        e.message === "Offline" ||
        e.message === "Failed to fetch" ||
        !isOnline
      ) {
        await addToQueue("DELETE", deleteCandidateId);
        showToast("أنت غير متصل. تم وضع الحذف في قائمة الانتظار", "warning");
        await fetchSubmissions();
      } else {
        logger.error("Error deleting", e, 'data');
        showToast(`تعذر الحذف: ${e.message}`, "error");
      }
    } finally {
      setDeleteCandidateId(null);
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteCandidateId(null);
  };

  const handleAddNew = () => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setView("form");
    setIsMobileMenuOpen(false);
    setShowPreview(false);
  };

  const handlePrintRequest = () => {
    setView("print");
    setIsMobileMenuOpen(false);
    setShowPreview(false);
  };

  const handleViewChange = (
    newView: "history" | "form" | "baristas" | "technicians",
  ) => {
    setView(newView);
    setIsMobileMenuOpen(false);
    if (
      newView === "history" ||
      newView === "baristas" ||
      newView === "technicians"
    ) {
      setShowPreview(false);
      setSelectedBarista(null);
    }
  };

  const suggestNotes = async (baristaIndex: number) => {
    if (!isOnline) {
      alert("AI suggestions are not available while offline.");
      return;
    }
    if (!ai) {
      alert(
        "AI suggestions are currently unavailable. The Gemini API key has not been configured correctly.",
      );
      return;
    }

    const barista = formData.baristas[baristaIndex];
    const prompt = `Based on a barista named ${barista.name}, write a brief, positive, and professional performance note for their file.`;

    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      // FIX: Correctly extract text from response
      const text = response.text;
      const updatedBaristas = [...formData.baristas];
      updatedBaristas[baristaIndex].notes = text.trim();
      setFormData((prev) => ({ ...prev, baristas: updatedBaristas }));
    } catch (error) {
      logger.error("Error generating notes", error, 'ai');
      alert(
        "Could not get an AI suggestion. This might be due to a network issue or a problem with the AI service. Please check your connection and try again. If the problem persists, the service may be temporarily unavailable.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const suggestBranchBaristaNotes = async (
    branchIndex: number,
    baristaIndex: number,
  ) => {
    if (!isOnline) {
      alert("AI suggestions are not available while offline.");
      return;
    }
    if (!ai) {
      alert(
        "AI suggestions are currently unavailable. The Gemini API key has not been configured correctly.",
      );
      return;
    }
    const barista = formData.branches[branchIndex].baristas[baristaIndex];
    const prompt = `Based on a barista named ${barista.name}, write a brief, positive, and professional performance note for their file.`;

    setIsLoading(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      const text = response.text;
      const updatedBranches = [...formData.branches];
      updatedBranches[branchIndex].baristas[baristaIndex].notes = text.trim();
      setFormData((prev) => ({ ...prev, branches: updatedBranches }));
    } catch (error) {
      logger.error("Error generating branch barista notes", error, 'ai');
      alert(
        "Could not get an AI suggestion. This might be due to a network issue or a problem with the AI service. Please check your connection and try again. If the problem persists, the service may be temporarily unavailable.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const addListItem = (
    listName: "branches" | "baristas" | "maintenanceHistory",
  ) => {
    const newId = Date.now();
    setNewlyAddedId(newId);
    setFormData((prev) => {
      let newItem;
      switch (listName) {
        case "branches":
          newItem = {
            id: newId,
            branchName: `Branch ${prev.branches.length + 1}`,
            contacts: [],
            email: prev.email,
            location: prev.location,
            taxNumber: prev.taxNumber,
            usesOurMachines: null,
            baristas: [],
            clientBaristas: [],
            maintenanceHistory: [],
          };
          break;
        case "baristas":
          newItem = { id: newId, name: "", phone: "", notes: "" };
          break;
        case "maintenanceHistory":
          newItem = getNewMaintenanceRecord(newId);
          break;
      }
      return {
        ...prev,
        [listName]: [...prev[listName], newItem],
      };
    });
  };

  const removeListItem = (
    listName: "branches" | "baristas" | "maintenanceHistory",
    index: number,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [listName]: prev[listName].filter((_, i) => i !== index),
    }));
  };

  const handleListItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    listName: "branches" | "baristas",
    index: number,
  ) => {
    const { name, value, type, checked } = e.target as {
      name: string;
      value: any;
      type?: string;
      checked?: boolean;
    };
    const list = [...formData[listName]];
    const currentItem = list[index] as any;

    currentItem[name] = type === "checkbox" ? checked : value;

    if (listName === "branches") {
      if (name === "usesOurMachines" && value === false) {
        delete currentItem.machineOwnershipType;
        delete currentItem.dailyLeaseCost;
      }
      if (name === "machineOwnershipType" && value !== "leased") {
        delete currentItem.dailyLeaseCost;
      }
    }

    setFormData((prev) => ({ ...prev, [listName]: list }));
  };

  const addNestedListItem = (
    branchIndex: number,
    listName: "baristas" | "maintenanceHistory" | "clientBaristas",
  ) => {
    const updatedBranches = [...formData.branches];
    const branch = updatedBranches[branchIndex];
    let newItem;
    const newId = Date.now();
    if (listName === "baristas") {
      newItem = { id: newId, name: "", phone: "", notes: "" };
      branch.baristas.push(newItem);
    } else if (listName === "clientBaristas") {
      newItem = { id: newId, name: "", phone: "", notes: "" };
      branch.clientBaristas.push(newItem);
    } else {
      newItem = getNewMaintenanceRecord(newId);
      branch.maintenanceHistory.push(newItem);
    }
    setNewlyAddedId(newId);
    setFormData((prev) => ({ ...prev, branches: updatedBranches }));
  };

  const removeNestedListItem = (
    branchIndex: number,
    listName: "baristas" | "maintenanceHistory" | "clientBaristas",
    itemIndex: number,
  ) => {
    const updatedBranches = [...formData.branches];
    if (listName === "baristas") {
      updatedBranches[branchIndex].baristas.splice(itemIndex, 1);
    } else if (listName === "clientBaristas") {
      updatedBranches[branchIndex].clientBaristas.splice(itemIndex, 1);
    } else {
      updatedBranches[branchIndex].maintenanceHistory.splice(itemIndex, 1);
    }
    setFormData((prev) => ({ ...prev, branches: updatedBranches }));
  };

  const handleNestedListItemChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    branchIndex: number,
    listName: "baristas" | "clientBaristas",
    itemIndex: number,
  ) => {
    const { name, value } = e.target as { name: string; value: any };
    const updatedBranches = [...formData.branches];
    const list = updatedBranches[branchIndex][listName];
    const currentItem = list[itemIndex] as any;
    currentItem[name] = value;
    setFormData((prev) => ({ ...prev, branches: updatedBranches }));
  };

  const handleQuickAddBarista = (name: string, branchIndex: number | null) => {
    const newBarista: Barista = {
      id: Date.now(),
      name: name,
      phone: "",
      notes: "Added from maintenance record",
    };

    if (branchIndex === null) {
      setFormData((prev) => ({
        ...prev,
        baristas: [...prev.baristas, newBarista],
      }));
    } else {
      setFormData((prev) => {
        const newBranches = [...prev.branches];
        newBranches[branchIndex].baristas.push(newBarista);
        return { ...prev, branches: newBranches };
      });
    }
  };

  const handleQuickAddClientBarista = (
    name: string,
    branchIndex: number | null,
  ) => {
    const newClientBarista: ClientBarista = {
      id: Date.now(),
      name: name,
      phone: "",
      notes: "Added from maintenance record",
    };

    if (branchIndex === null) {
      setFormData((prev) => ({
        ...prev,
        clientBaristas: [...(prev.clientBaristas || []), newClientBarista],
      }));
    } else {
      setFormData((prev) => {
        const newBranches = [...prev.branches];
        newBranches[branchIndex].clientBaristas.push(newClientBarista);
        return { ...prev, branches: newBranches };
      });
    }
  };

  const handleClientBaristaChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    branchIndex: number | null,
    index: number,
  ) => {
    const { name, value } = e.target;
    if (branchIndex === null) {
      const updatedClientBaristas = [...(formData.clientBaristas || [])];
      updatedClientBaristas[index] = {
        ...updatedClientBaristas[index],
        [name]: value,
      };
      setFormData((prev) => ({
        ...prev,
        clientBaristas: updatedClientBaristas,
      }));
    } else {
      const updatedBranches = [...formData.branches];
      updatedBranches[branchIndex].clientBaristas[index] = {
        ...updatedBranches[branchIndex].clientBaristas[index],
        [name]: value,
      };
      setFormData((prev) => ({ ...prev, branches: updatedBranches }));
    }
  };

  const removeClientBarista = (branchIndex: number | null, index: number) => {
    if (branchIndex === null) {
      setFormData((prev) => ({
        ...prev,
        clientBaristas:
          prev.clientBaristas?.filter((_, i) => i !== index) || [],
      }));
    } else {
      setFormData((prev) => {
        const newBranches = [...prev.branches];
        newBranches[branchIndex].clientBaristas.splice(index, 1);
        return { ...prev, branches: newBranches };
      });
    }
  };

  const textAreaClasses =
    "block w-full px-5 py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 border border-slate-200 dark:border-slate-600 shadow-sm";
  const selectClasses =
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 border border-slate-200 dark:border-slate-600 shadow-sm";

  const renderContacts = (path: "main" | "warehouse" | `branch-${number}`) => {
    // ... (existing code for renderContacts)
    let contacts: Contact[];
    if (path === "main") contacts = formData.contacts;
    else if (path === "warehouse") contacts = formData.warehouse.contacts;
    else {
      const branchIndex = parseInt(path.split("-")[1], 10);
      contacts = formData.branches[branchIndex].contacts;
    }

    return (
      <div className="space-y-4">
        {contacts.length > 0 ? (
          contacts.map((contact, contactIndex) => (
            <CollapsibleCard
              key={contact.id}
              initiallyOpen={contact.id === newlyAddedId}
              onRemove={() => removeContact(path, contactIndex)}
              titleContent={
                <span className="font-semibold">
                  {contact.name || "جهة اتصال جديدة"}
                </span>
              }
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextInput
                    label="الاسم"
                    name="name"
                    value={contact.name}
                    onChange={(e) => handleContactChange(e, path, contactIndex)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      المسمى الوظيفي
                    </label>
                    <select
                      name="position"
                      value={contact.position}
                      onChange={(e) =>
                        handleContactChange(e, path, contactIndex)
                      }
                      className={selectClasses}
                    >
                      {contactPositions.map((pos) => (
                        <option key={pos.value} value={pos.value}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {contact.position === "custom" && (
                    <TextInput
                      label="مسمى وظيفي مخصص"
                      name="customPosition"
                      value={contact.customPosition || ""}
                      onChange={(e) =>
                        handleContactChange(e, path, contactIndex)
                      }
                      className="md:col-span-2"
                    />
                  )}
                </div>
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    أرقام الهواتف
                  </h5>
                  <div className="space-y-2">
                    {contact.phoneNumbers.map((phone, phoneIndex) => (
                      <div key={phone.id} className="flex items-center gap-2">
                        <div className="relative flex-grow">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <PhoneIcon className="h-5 w-5 text-slate-400" />
                          </div>
                          <input
                            type="tel"
                            value={phone.number}
                            onChange={(e) =>
                              handlePhoneNumberChange(
                                e,
                                path,
                                contactIndex,
                                phoneIndex,
                              )
                            }
                            className="block w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg border-slate-200 dark:border-slate-600 shadow-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20"
                            placeholder="مثال: 0100-123-4567"
                            maxLength={13}
                          />
                        </div>
                        <button
                          onClick={() =>
                            removePhoneNumber(path, contactIndex, phoneIndex)
                          }
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors transform active:scale-95"
                          aria-label={`إزالة رقم الهاتف`}
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => addPhoneNumber(path, contactIndex)}
                    className="mt-3 w-full justify-center flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 rounded-md py-2 transition-colors transform active:scale-95"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    إضافة رقم هاتف
                  </button>
                </div>
              </div>
            </CollapsibleCard>
          ))
        ) : (
          <EmptyState
            icon={<UserGroupIcon className="w-8 h-8" />}
            title="لا توجد جهات اتصال"
            message="أضف الأفراد الرئيسيين لهذا الموقع."
          />
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Card title="معلومات الشركة">
            <div className="space-y-6">
              <TextInput
                label="اسم الشركة"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="مثال: شركة كافيه ميدوز"
              />
              <TextInput
                label="البريد الإلكتروني"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="مثال: manager@midoes.com"
              />
              <TextInput
                label="الرقم الضريبي"
                name="taxNumber"
                value={formData.taxNumber}
                onChange={handleChange}
                placeholder="مثال: 12-3456789"
              />
              <TextInput
                label="الموقع"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="مثال: شارع التحرير، القاهرة"
              />
              <div className="pt-8 mt-8 border-t dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                    جهات الاتصال
                  </h3>
                  <button
                    onClick={() => addContact("main")}
                    className="flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform active:scale-95"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    <span>إضافة جهة اتصال</span>
                  </button>
                </div>
                {renderContacts("main")}
              </div>
              <RadioGroup
                label="هل لدى الشركة عدة فروع؟"
                name="hasBranches"
                value={formData.hasBranches}
                onChange={(val) => handleRadioChange("hasBranches", val)}
                options={[
                  { label: "Yes", value: true },
                  { label: "No", value: false },
                ]}
                inline
              />

              {formData.hasBranches === false && (
                <div className="pt-6 mt-6 border-t dark:border-slate-700 space-y-6">
                  <RadioGroup
                    label="هل يستخدمون ماكيناتنا؟"
                    name="usesOurMachines"
                    value={formData.usesOurMachines}
                    onChange={(val) =>
                      handleRadioChange("usesOurMachines", val)
                    }
                    options={[
                      { label: "Yes", value: true },
                      { label: "No", value: false },
                    ]}
                    inline
                  />
                  {formData.usesOurMachines === true && (
                    <div className="pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                      <RadioGroup
                        label="كيف تم الحصول على الماكينة؟"
                        name="machineOwnershipType"
                        value={formData.machineOwnershipType}
                        onChange={(val) =>
                          handleRadioChange("machineOwnershipType", val)
                        }
                        options={[
                          { label: "شراء", value: "bought" },
                          { label: "إيجار", value: "leased" },
                        ]}
                        inline
                      />
                      {formData.machineOwnershipType === "leased" && (
                        <div className="mt-4">
                          <TextInput
                            label="قيمة الإيجار اليومي (ج.م)"
                            name="dailyLeaseCost"
                            type="number"
                            value={formData.dailyLeaseCost || ""}
                            onChange={handleChange}
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        );
      case 2:
        if (!formData.hasBranches) return null;
        return (
          <Card title="تفاصيل الفرع">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                الفروع
              </h3>
              <button
                onClick={() => addListItem("branches")}
                className="flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" />
                إضافة فرع
              </button>
            </div>
            <div className="space-y-4">
              {formData.branches.length > 0 ? (
                formData.branches.map((branch, index) => (
                  <CollapsibleCard
                    key={branch.id}
                    initiallyOpen={branch.id === newlyAddedId}
                    onRemove={() => removeListItem("branches", index)}
                    titleContent={
                      <div>
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span
                            className="font-bold truncate text-base"
                            title={formData.companyName}
                          >
                            {formData.companyName || "الشركة"}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            -
                          </span>
                          <span className="truncate text-base">
                            {branch.branchName || "فرع جديد"}
                          </span>
                        </div>
                        <div className="flex items-center gap-x-4 text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                          {branch.location && (
                            <span
                              className="flex items-center gap-1 truncate"
                              title={branch.location}
                            >
                              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {branch.location}
                              </span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <UserGroupIcon className="w-3.5 h-3.5 shrink-0" />
                            {branch.baristas.length} باريستا
                          </span>
                        </div>
                      </div>
                    }
                  >
                    <div className="space-y-4">
                      <TextInput
                        label="اسم الفرع"
                        name="branchName"
                        value={branch.branchName || ""}
                        onChange={(e) =>
                          handleListItemChange(e, "branches", index)
                        }
                        placeholder="مثال: المعادي (الاسم الكامل = اسم الشركة + اسم الفرع)"
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput
                          label="البريد الإلكتروني"
                          name="email"
                          value={branch.email}
                          onChange={(e) =>
                            handleListItemChange(e, "branches", index)
                          }
                        />
                        <TextInput
                          label="الرقم الضريبي"
                          name="taxNumber"
                          value={branch.taxNumber || ""}
                          onChange={(e) =>
                            handleListItemChange(e, "branches", index)
                          }
                        />
                        <TextInput
                          label="الموقع"
                          name="location"
                          value={branch.location}
                          onChange={(e) =>
                            handleListItemChange(e, "branches", index)
                          }
                          className="md:col-span-2"
                        />
                        <div className="md:col-span-2">
                          <RadioGroup
                            label="هل يستخدمون ماكيناتنا؟"
                            name={`usesOurMachines-${branch.id}`}
                            value={branch.usesOurMachines}
                            onChange={(val) =>
                              handleListItemChange(
                                {
                                  target: {
                                    name: "usesOurMachines",
                                    value: val,
                                  },
                                } as any,
                                "branches",
                                index,
                              )
                            }
                            options={[
                              { label: "Yes", value: true },
                              { label: "No", value: false },
                            ]}
                            inline
                          />
                          {branch.usesOurMachines === true && (
                            <div className="pl-6 mt-4 border-l-2 border-slate-200 dark:border-slate-700">
                              <RadioGroup
                                label="كيف تم الحصول على الماكينة؟"
                                name={`machineOwnershipType-${branch.id}`}
                                value={branch.machineOwnershipType}
                                onChange={(val) =>
                                  handleListItemChange(
                                    {
                                      target: {
                                        name: "machineOwnershipType",
                                        value: val,
                                      },
                                    } as any,
                                    "branches",
                                    index,
                                  )
                                }
                                options={[
                                  { label: "شراء", value: "bought" },
                                  { label: "إيجار", value: "leased" },
                                ]}
                                inline
                              />
                              {branch.machineOwnershipType === "leased" && (
                                <div className="mt-4">
                                  <TextInput
                                    label="قيمة الإيجار اليومي (ج.م)"
                                    name="dailyLeaseCost"
                                    type="number"
                                    value={branch.dailyLeaseCost || ""}
                                    onChange={(e) =>
                                      handleListItemChange(e, "branches", index)
                                    }
                                    placeholder="0.00"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Contacts in Branch */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                          جهات الاتصال
                        </h4>
                        <button
                          onClick={() => addContact(`branch-${index}`)}
                          className="flex items-center gap-2 bg-teal-600 text-white font-bold py-1.5 px-3 rounded-md hover:bg-teal-700 transition-colors text-sm shadow transform active:scale-95"
                        >
                          <PlusCircleIcon className="w-4 h-4" />
                          <span>إضافة جهة اتصال</span>
                        </button>
                      </div>
                      {renderContacts(`branch-${index}`)}
                    </div>

                    {/* Baristas in Branch */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                          الباريستا
                        </h4>
                        <button
                          onClick={() => addNestedListItem(index, "baristas")}
                          className="flex items-center gap-2 bg-teal-600 text-white font-bold py-1.5 px-3 rounded-md hover:bg-teal-700 transition-colors text-sm shadow transform active:scale-95"
                        >
                          <PlusCircleIcon className="w-4 h-4" /> إضافة باريستا
                        </button>
                      </div>
                      <div className="space-y-3">
                        {branch.baristas.length > 0 ? (
                          branch.baristas.map((barista, baristaIndex) => (
                            <CollapsibleCard
                              key={barista.id}
                              initiallyOpen={barista.id === newlyAddedId}
                              onRemove={() =>
                                removeNestedListItem(
                                  index,
                                  "baristas",
                                  baristaIndex,
                                )
                              }
                              titleContent={
                                <span className="font-semibold">
                                  {barista.name || "باريستا جديد"}
                                </span>
                              }
                            >
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                                  <TextInput
                                    label="الاسم"
                                    name="name"
                                    value={barista.name}
                                    onChange={(e) =>
                                      handleNestedListItemChange(
                                        e,
                                        index,
                                        "baristas",
                                        baristaIndex,
                                      )
                                    }
                                  />
                                  <TextInput
                                    label="رقم الهاتف"
                                    name="phone"
                                    value={barista.phone}
                                    onChange={(e) =>
                                      handleNestedListItemChange(
                                        e,
                                        index,
                                        "baristas",
                                        baristaIndex,
                                      )
                                    }
                                  />
                                </div>
                                 <div>
                                   <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                     ملاحظات
                                   </label>
                                   <textarea
                                     name="notes"
                                     value={barista.notes || ""}
                                     onChange={(e) =>
                                       handleNestedListItemChange(
                                         e,
                                         index,
                                         "baristas",
                                         baristaIndex,
                                       )
                                     }
                                     rows={3}
                                     className={textAreaClasses}
                                   ></textarea>
                                   <button
                                     onClick={() =>
                                       suggestBranchBaristaNotes(
                                         index,
                                         baristaIndex,
                                       )
                                     }
                                     disabled={isLoading || !isOnline}
                                     className="mt-2 text-sm text-teal-600 dark:text-teal-400 font-semibold disabled:opacity-50 transform active:scale-95 transition-transform"
                                   >
                                     {isLoading
                                       ? "جاري الإنشاء..."
                                       : isOnline
                                         ? "✨ اقتراح بالذكاء الاصطناعي"
                                         : "⚠ الذكاء الاصطناعي غير متاح دون اتصال"}
                                   </button>
                                 </div>
                              </div>
                            </CollapsibleCard>
                          ))
                        ) : (
                          <EmptyState
                            icon={<UserGroupIcon className="w-8 h-8" />}
                            title="لا يوجد باريستا"
            message="أضف الباريستا الذين يعملون في هذا الفرع."
                          />
                        )}
                      </div>
                    </div>

                    {/* Client Baristas in Branch */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                          باريستا العميل
                        </h4>
                        <button
                          onClick={() =>
                            addNestedListItem(index, "clientBaristas")
                          }
                          className="flex items-center gap-2 bg-teal-600 text-white font-bold py-1.5 px-3 rounded-md hover:bg-teal-700 transition-colors text-sm shadow transform active:scale-95"
                        >
                          <PlusCircleIcon className="w-4 h-4" /> إضافة باريستا عميل
                        </button>
                      </div>
                      <div className="space-y-3">
                        {(branch.clientBaristas || []).length > 0 ? (
                          (branch.clientBaristas || []).map(
                            (clientBarista, clientBaristaIndex) => (
                              <CollapsibleCard
                                key={clientBarista.id}
                                initiallyOpen={
                                  clientBarista.id === newlyAddedId
                                }
                                onRemove={() =>
                                  removeNestedListItem(
                                    index,
                                    "clientBaristas",
                                    clientBaristaIndex,
                                  )
                                }
                                titleContent={
                                  <span className="font-semibold">
                                    {clientBarista.name || "باريستا عميل جديد"}
                                  </span>
                                }
                              >
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                                    <TextInput
                                      label="الاسم"
                                      name="name"
                                      value={clientBarista.name}
                                      onChange={(e) =>
                                        handleNestedListItemChange(
                                          e,
                                          index,
                                          "clientBaristas",
                                          clientBaristaIndex,
                                        )
                                      }
                                    />
                                    <TextInput
                                      label="رقم الهاتف"
                                      name="phone"
                                      value={clientBarista.phone}
                                      onChange={(e) =>
                                        handleNestedListItemChange(
                                          e,
                                          index,
                                          "clientBaristas",
                                          clientBaristaIndex,
                                        )
                                      }
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                      ملاحظات
                                    </label>
                                    <textarea
                                      name="notes"
                                      value={clientBarista.notes || ""}
                                      onChange={(e) =>
                                        handleNestedListItemChange(
                                          e,
                                          index,
                                          "clientBaristas",
                                          clientBaristaIndex,
                                        )
                                      }
                                      rows={3}
                                      className={textAreaClasses}
                                    ></textarea>
                                  </div>
                                </div>
                              </CollapsibleCard>
                            ),
                          )
                        ) : (
                          <EmptyState
                            icon={<UserGroupIcon className="w-8 h-8" />}
                            title="لا يوجد باريستا للعميل"
            message="أضف باريستا شركة العميل الذين يعملون في هذا الفرع."
                          />
                        )}
                      </div>
                    </div>

                    {/* Maintenance in Branch */}
                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 tracking-tight">
                          سجل الصيانة
                        </h4>
                        <button
                          onClick={() =>
                            addNestedListItem(index, "maintenanceHistory")
                          }
                          className="flex items-center gap-2 bg-teal-600 text-white font-bold py-1.5 px-3 rounded-md hover:bg-teal-700 transition-colors text-sm shadow transform active:scale-95"
                        >
                          <PlusCircleIcon className="w-4 h-4" /> إضافة سجل
                        </button>
                      </div>
                      <div className="space-y-3">
                        {branch.maintenanceHistory.length > 0 ? (
                          branch.maintenanceHistory.map(
                            (record, recordIndex) => (
                              <MaintenanceRecordCard
                                key={record.id}
                                record={record}
                                onChange={(updatedRecord) => {
                                  const newBranches = [...formData.branches];
                                  newBranches[index].maintenanceHistory[
                                    recordIndex
                                  ] = updatedRecord;
                                  setFormData((prev) => ({
                                    ...prev,
                                    branches: newBranches,
                                  }));
                                }}
                                onRemove={() =>
                                  removeNestedListItem(
                                    index,
                                    "maintenanceHistory",
                                    recordIndex,
                                  )
                                }
                                onAddNewId={setNewlyAddedId}
                                partsList={partsList}
                                servicesList={servicesList}
                                problemCategories={problemCategories}
                                allPredefinedProblems={allPredefinedProblems}
                                newlyAddedId={newlyAddedId}
                                baristas={branch.baristas}
                                clientBaristas={branch.clientBaristas}
                                onAddBarista={(name) =>
                                  handleQuickAddBarista(name, index)
                                }
                                onAddClientBarista={(name) =>
                                  handleQuickAddClientBarista(name, index)
                                }
                                suggestedNames={allKnownBaristaNames}
                              />
                            ),
                          )
                        ) : (
                          <EmptyState
                            icon={<WrenchScrewdriverIcon className="w-8 h-8" />}
                            title="لا يوجد سجل صيانة"
            message="أضف سجلات الصيانة لهذا الفرع."
                          />
                        )}
                      </div>
                    </div>
                  </CollapsibleCard>
                ))
              ) : (
                <EmptyState
                  icon={<BuildingOffice2Icon className="w-8 h-8" />}
                  title="لم تتم إضافة فروع"
                  message="اضغط الزر أعلاه لإضافة أول فرع."
                />
              )}
            </div>
          </Card>
        );
      case 3:
        return (
          <Card title="معلومات المخزن">
            <div className="space-y-6">
              <TextInput
                label="Location"
                name="warehouse.location"
                value={formData.warehouse.location}
                onChange={handleChange}
              />
              <div className="pt-8 mt-8 border-t dark:border-slate-700">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                    جهات اتصال المخزن
                  </h3>
                  <button
                    onClick={() => addContact("warehouse")}
                    className="flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform active:scale-95"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    <span>إضافة جهة اتصال</span>
                  </button>
                </div>
                {renderContacts("warehouse")}
              </div>
            </div>
          </Card>
        );
      case 4:
        return (
          <Card title="الفريق / الباريستا (المكتب الرئيسي)">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                الباريستا
              </h3>
              <button
                onClick={() => addListItem("baristas")}
                className="flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" /> إضافة باريستا
              </button>
            </div>
            <div className="space-y-4">
              {formData.baristas.length > 0 ? (
                formData.baristas.map((barista, index) => (
                  <CollapsibleCard
                    key={barista.id}
                    initiallyOpen={barista.id === newlyAddedId}
                    onRemove={() => removeListItem("baristas", index)}
                    titleContent={
                      <span className="font-semibold">
                        {barista.name || "باريستا جديد"}
                      </span>
                    }
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput
                          label="الاسم"
                          name="name"
                          value={barista.name}
                          onChange={(e) =>
                            handleListItemChange(e, "baristas", index)
                          }
                        />
                        <TextInput
                          label="رقم الهاتف"
                          name="phone"
                          value={barista.phone}
                          onChange={(e) =>
                            handleListItemChange(e, "baristas", index)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          ملاحظات
                        </label>
                        <textarea
                          name="notes"
                          value={barista.notes || ""}
                          onChange={(e) =>
                            handleListItemChange(e, "baristas", index)
                          }
                          rows={3}
                          className={textAreaClasses}
                        ></textarea>
                        <button
                          onClick={() => suggestNotes(index)}
                          disabled={isLoading || !isOnline}
                          className="mt-2 text-sm text-teal-600 dark:text-teal-400 font-semibold disabled:opacity-50 transform active:scale-95 transition-transform"
                        >
                          {isLoading
                            ? "جاري الإنشاء..."
                            : isOnline
                              ? "✨ اقتراح بالذكاء الاصطناعي"
                              : "⚠ الذكاء الاصطناعي غير متاح دون اتصال"}
                        </button>
                      </div>
                    </div>
                  </CollapsibleCard>
                ))
              ) : (
                <EmptyState
                  icon={<UserGroupIcon className="w-8 h-8" />}
                  title="لا يوجد باريستا"
                  message="أضف الباريستا الذين يعملون في المكتب الرئيسي."
                />
              )}
            </div>
          </Card>
        );
      case 4.5:
        return (
          <Card title="باريستا العميل (المكتب الرئيسي)">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                باريستا العميل
              </h3>
              <button
                onClick={() => {
                  const newClientBarista: ClientBarista = {
                    id: Date.now(),
                    name: "",
                    phone: "",
                    notes: "",
                  };
                  setFormData((prev) => ({
                    ...prev,
                    clientBaristas: [
                      ...(prev.clientBaristas || []),
                      newClientBarista,
                    ],
                  }));
                }}
                className="flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" /> إضافة باريستا عميل
              </button>
            </div>
            <div className="space-y-4">
              {formData.clientBaristas && formData.clientBaristas.length > 0 ? (
                formData.clientBaristas.map((clientBarista, index) => (
                  <CollapsibleCard
                    key={clientBarista.id}
                    initiallyOpen={clientBarista.id === newlyAddedId}
                    onRemove={() => removeClientBarista(null, index)}
                    titleContent={
                      <span className="font-semibold">
                        {clientBarista.name || "باريستا عميل جديد"}
                      </span>
                    }
                  >
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextInput
                          label="الاسم"
                          name="name"
                          value={clientBarista.name}
                          onChange={(e) =>
                            handleClientBaristaChange(e, null, index)
                          }
                        />
                        <TextInput
                          label="رقم الهاتف"
                          name="phone"
                          value={clientBarista.phone}
                          onChange={(e) =>
                            handleClientBaristaChange(e, null, index)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          ملاحظات
                        </label>
                        <textarea
                          name="notes"
                          value={clientBarista.notes || ""}
                          onChange={(e) =>
                            handleClientBaristaChange(e, null, index)
                          }
                          rows={3}
                          className={textAreaClasses}
                        ></textarea>
                      </div>
                    </div>
                  </CollapsibleCard>
                ))
              ) : (
                <EmptyState
                  icon={<UserGroupIcon className="w-8 h-8" />}
                  title="لا يوجد باريستا للعميل"
                  message="أضف باريستا شركة العميل الذين يعملون مع ماكيناتنا."
                />
              )}
            </div>
          </Card>
        );
      case 5:
        return (
          <Card title="سجل الصيانة (المكتب الرئيسي)">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                سجلات الصيانة
              </h3>
              <button
                onClick={() => addListItem("maintenanceHistory")}
                className="flex items-center gap-2 bg-teal-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-700 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" /> إضافة سجل
              </button>
            </div>
            <div className="space-y-4">
              {formData.maintenanceHistory.length > 0 ? (
                formData.maintenanceHistory.map((record, index) => (
                  <MaintenanceRecordCard
                    key={record.id}
                    record={record}
                    onChange={(updatedRecord) => {
                      const newList = [...formData.maintenanceHistory];
                      newList[index] = updatedRecord;
                      setFormData((prev) => ({
                        ...prev,
                        maintenanceHistory: newList,
                      }));
                    }}
                    onRemove={() => removeListItem("maintenanceHistory", index)}
                    onAddNewId={setNewlyAddedId}
                    partsList={partsList}
                    servicesList={servicesList}
                    problemCategories={problemCategories}
                    allPredefinedProblems={allPredefinedProblems}
                    newlyAddedId={newlyAddedId}
                    baristas={formData.baristas}
                    clientBaristas={formData.clientBaristas}
                    onAddBarista={(name) => handleQuickAddBarista(name, null)}
                    onAddClientBarista={(name) =>
                      handleQuickAddClientBarista(name, null)
                    }
                    suggestedNames={allKnownBaristaNames}
                  />
                ))
              ) : (
                <EmptyState
                  icon={<WrenchScrewdriverIcon className="w-8 h-8" />}
                  title="لا يوجد سجل صيانة"
                  message="Add maintenance records for the main office."
                />
              )}
            </div>
          </Card>
        );
      case 6:
        return (
          <ReviewStep
            formData={formData}
            partsList={partsList}
            servicesList={servicesList}
          />
        );
      default:
        return <div>Unknown Step</div>;
    }
  };

  const handleDeleteBarista = (
    sources: {
      submissionId: number;
      branchIndex: number | null;
      baristaIndex: number;
    }[],
  ) => {
    setSubmissions((prev) => {
      const newSubmissions = JSON.parse(JSON.stringify(prev)) as FormData[];

      newSubmissions.forEach((sub) => {
        const sourcesForSub = sources.filter((s) => s.submissionId === sub.id);
        if (sourcesForSub.length === 0) return;

        const mainOfficeIndices = sourcesForSub
          .filter((s) => s.branchIndex === null)
          .map((s) => s.baristaIndex)
          .sort((a, b) => b - a);

        mainOfficeIndices.forEach((idx) => {
          if (sub.baristas && sub.baristas.length > idx) {
            sub.baristas.splice(idx, 1);
          }
        });

        sub.branches.forEach((br, brIdx) => {
          const branchIndices = sourcesForSub
            .filter((s) => s.branchIndex === brIdx)
            .map((s) => s.baristaIndex)
            .sort((a, b) => b - a);

          branchIndices.forEach((idx) => {
            if (br.baristas && br.baristas.length > idx) {
              br.baristas.splice(idx, 1);
            }
          });
        });
      });

      return newSubmissions;
    });
  };

  const handleUpdateBarista = (
    sources: {
      submissionId: number;
      branchIndex: number | null;
      baristaIndex: number;
    }[],
    newDetails: { name: string; phone: string },
  ) => {
    setSubmissions((prev) => {
      const newSubmissions = JSON.parse(JSON.stringify(prev)) as FormData[];
      newSubmissions.forEach((sub) => {
        const sourcesForSub = sources.filter((s) => s.submissionId === sub.id);
        if (sourcesForSub.length === 0) return;

        sourcesForSub.forEach((src) => {
          if (src.branchIndex === null) {
            if (sub.baristas[src.baristaIndex]) {
              sub.baristas[src.baristaIndex] = {
                ...sub.baristas[src.baristaIndex],
                ...newDetails,
              };
            }
          } else {
            if (
              sub.branches[src.branchIndex] &&
              sub.branches[src.branchIndex].baristas[src.baristaIndex]
            ) {
              sub.branches[src.branchIndex].baristas[src.baristaIndex] = {
                ...sub.branches[src.branchIndex].baristas[src.baristaIndex],
                ...newDetails,
              };
            }
          }
        });
      });
      return newSubmissions;
    });
  };

  const renderCurrentView = () => {
    if (view === "print") {
      return (
        <PrintableWorkOrder
          onBack={() => setView("history")}
          partsList={partsList}
          servicesList={servicesList}
        />
      );
    }

    if (view === "details" && selectedSubmission) {
      return (
        <SubmissionDetails
          submission={selectedSubmission}
          onBack={() => {
            setSelectedSubmission(null);
            setView("history");
          }}
        />
      );
    }

    if (view === "baristas") {
      return (
        <BaristasPage
          submissions={submissions}
          onViewDetails={(name) => {
            setSelectedBarista(name);
            setView("barista-details");
          }}
          onDelete={handleDeleteBarista}
          onUpdate={handleUpdateBarista}
        />
      );
    }

    if (view === "barista-details" && selectedBarista) {
      return (
        <BaristaDetailsPage
          baristaName={selectedBarista}
          submissions={submissions}
          onBack={() => setView("baristas")}
        />
      );
    }

    if (view === "maintenance-edit" && selectedSubmission) {
      return (
        <MaintenanceEditPage
          submission={selectedSubmission}
          onBack={() => {
            setSelectedSubmission(null);
            setView("history");
          }}
          onSave={(updatedSubmission) => {
            handleUpdateCompany(updatedSubmission);
            setSelectedSubmission(
              updatedSubmission as typeof selectedSubmission,
            );
          }}
          partsList={partsList}
          servicesList={servicesList}
          problemCategories={problemCategories}
          allPredefinedProblems={allPredefinedProblems}
          isSidebarExpanded={isSidebarExpanded}
        />
      );
    }

    if (view === "technicians") {
      return <UserAccessManagement />;
    }

    if (view === "history") {
      return (
        <div className="w-full">
          {isLoading && submissions.length === 0 ? (
            <div className="text-center text-slate-600 dark:text-slate-400 pt-12">
              جاري تحميل السجل...
            </div>
          ) : (
            <HistoryPage
              submissions={submissions}
              onEdit={handleEdit}
              onDelete={requestDelete}
              onAddNew={handleAddNew}
              onPrint={handlePrintRequest}
              onViewDetails={handleViewDetails}
              onUpdateCompany={handleUpdateCompany}
              onEditMaintenance={(submission) => {
                setSelectedSubmission(submission);
                setView("maintenance-edit");
              }}
              getTechnicianDisplayName={getTechnicianDisplayName}
            />
          )}
        </div>
      );
    }

    return (
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 relative h-full">
        {/* Form Content */}
        <div
          className={`flex-1 transition-all duration-300 ${showPreview ? "lg:w-1/2" : "w-full"}`}
        >
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 transform active:scale-95 shadow-sm ${showPreview ? "bg-teal-600 text-white shadow-teal-500/30" : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"}`}
            >
              {showPreview ? (
                <EyeSlashIcon className="w-5 h-5" />
              ) : (
                <EyeIcon className="w-5 h-5" />
              )}
              {showPreview ? "إخفاء المعاينة" : "معاينة حية"}
            </button>
          </div>
          <StepIndicator steps={visibleSteps} currentStep={currentStep} />
          <div
            key={currentStep}
            className="mt-8 sm:mt-12 animate-content-fade-in"
          >
            {renderStepContent()}
          </div>
        </div>

        {/* Preview Panel (Desktop Split) */}
        {showPreview && (
          <div className="hidden lg:block w-1/2 border-l border-slate-200 dark:border-slate-700 pl-6 h-[calc(100vh-140px)] overflow-y-auto sticky top-4 animate-item-fade-in-down custom-scrollbar">
            <div className="sticky top-0 bg-slate-100 dark:bg-slate-900 pt-2 pb-4 z-10 border-b border-slate-200 dark:border-slate-700 mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <EyeIcon className="w-4 h-4" /> معاينة حية
              </h3>
            </div>
            <div className="pb-10">
              <ReviewStep
                formData={formData}
                partsList={partsList}
                servicesList={servicesList}
                embedded={true}
              />
            </div>
          </div>
        )}

        {/* Preview Modal (Mobile Overlay) */}
        {showPreview && (
          <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto animate-content-fade-in">
            <div className="sticky top-0 bg-white dark:bg-slate-900 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shadow-md">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <EyeIcon className="w-5 h-5 text-teal-600" /> معاينة حية
              </h3>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 pb-20">
              <ReviewStep
                formData={formData}
                partsList={partsList}
                servicesList={servicesList}
                embedded={true}
              />
            </div>
          </div>
        )}
      </div>
    );
  };



  const mobileTitle =
    view === "form"
      ? visibleSteps.find((s) => s.id === currentStep)?.name || "Form"
      : view === "print"
        ? "طباعة أمر العمل"
        : view === "details"
          ? "تفاصيل السجل"
          : view === "baristas" || view === "barista-details"
            ? "أداء الباريستا"
            : view === "technicians"
              ? "إدارة المستخدمين"
              : "سجل عمليات الإرسال";

  return (
    <div className="h-[100dvh] overflow-hidden flex bg-gradient-to-br from-slate-100 to-teal-50 dark:from-slate-900 dark:to-teal-900/20">
          {/* Desktop Sidebar */}
          <aside
            className={`bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-r border-black/5 dark:border-white/5 text-slate-900 dark:text-white flex-col fixed h-full transition-all duration-300 ease-in-out hidden lg:flex shadow-2xl ${isSidebarExpanded ? "w-64" : "w-20"}`}
          >
            <SidebarContent 
              view={view}
              isSidebarExpanded={isSidebarExpanded}
              theme={theme}
              drafts={drafts}
              currentDraftId={currentDraftId}
              handleViewChange={handleViewChange}
              handleLoadDraft={handleLoadDraft}
              handleDeleteDraft={handleDeleteDraft}
              toggleTheme={toggleTheme}
              onAdminLogout={onAdminLogout}
              handleAddNew={handleAddNew}
              setIsSidebarExpanded={setIsSidebarExpanded}
              setCurrentDraftId={setCurrentDraftId}
              setFormData={setFormData}
              setCurrentStep={setCurrentStep}
              setView={setView}
            />
          </aside>

          {/* Mobile Sidebar */}
          <div
            className={`fixed inset-0 z-40 flex lg:hidden ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"} transition-transform duration-300 ease-in-out`}
          >
            <aside className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex flex-col w-64 h-full shadow-2xl">
              <SidebarContent 
                view={view}
                isSidebarExpanded={isSidebarExpanded}
                theme={theme}
                drafts={drafts}
                currentDraftId={currentDraftId}
                handleViewChange={handleViewChange}
                handleLoadDraft={handleLoadDraft}
                handleDeleteDraft={handleDeleteDraft}
                toggleTheme={toggleTheme}
                onAdminLogout={onAdminLogout}
                handleAddNew={handleAddNew}
                setIsSidebarExpanded={setIsSidebarExpanded}
                setCurrentDraftId={setCurrentDraftId}
                setFormData={setFormData}
                setCurrentStep={setCurrentStep}
                setView={setView}
              />
            </aside>
            <div
              className="flex-1 bg-black/50"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
          </div>

          {/* Main Content */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out lg:${isSidebarExpanded ? "ml-64" : "ml-20"}`}
          >
            <header className="sticky top-0 z-30 flex items-center justify-between lg:hidden h-16 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 px-4 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <img
                  src="/logo.svg"
                  alt="شعار ميدوز"
                  className="h-8 w-auto object-contain"
                />
                <h1 className="text-lg font-bold text-slate-800 dark:text-white truncate">
                  {mobileTitle}
                </h1>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </header>

            {/* Offline Status Banner */}
            {!isOnline && (
              <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 px-4 py-2 text-center text-sm font-medium border-b border-amber-200 dark:border-amber-800 flex items-center justify-center gap-2 shrink-0">
                <SignalSlashIcon className="w-4 h-4" />
                أنت غير متصل حالياً. سيتم حفظ التغييرات محلياً ومزامنتها عند عودة الاتصال.
              </div>
            )}
            {isSyncing && (
              <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-4 py-2 text-center text-sm font-medium border-b border-blue-200 dark:border-blue-800 flex items-center justify-center gap-2 shrink-0">
                <CloudArrowUpIcon className="w-4 h-4 animate-bounce" />
                جاري مزامنة التغييرات دون اتصال...
              </div>
            )}

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
              {renderCurrentView()}
            </main>
            {view === "form" && (
              <footer className="shrink-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                <div className="w-full max-w-4xl mx-auto p-4">
                  <NavigationButtons
                    currentStep={currentStep}
                    onPrev={handlePrev}
                    onNext={currentStep === 6 ? handleSubmit : handleNext}
                    isLastStep={currentStep === 6}
                    isLoading={isSubmitting}
                  />
                </div>
              </footer>
            )}
          </div>
          <ConfirmationModal
            isOpen={deleteCandidateId !== null}
            onClose={cancelDelete}
            onConfirm={confirmDelete}
            title="تأكيد الحذف"
            message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء."
            isConfirming={isDeleting}
          />
    </div>
  );
};

export default App;
