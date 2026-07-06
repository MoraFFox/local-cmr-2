/** @format */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Routes, Route, useNavigate, useLocation, useParams } from "react-router-dom";
// FIX: Use correct import for GoogleGenAI
import { GoogleGenAI } from "@google/genai";
import { supabase } from "./supabaseClient";

import SidebarContent from "./src/views/Sidebar";
import HistoryView from "./src/views/HistoryView";
import BaristasView from "./src/views/BaristasView";
import FormWizardView from "./src/views/FormWizardView";
import PrintView from "./src/views/PrintView";
import SubmissionDetailsView from "./src/views/SubmissionDetailsView";
import BaristaDetailsView from "./src/views/BaristaDetailsView";
import MaintenanceEditView from "./src/views/MaintenanceEditView";
import UserAccessView from "./src/views/UserAccessView";

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
import ConfirmationModal from "./components/ConfirmationModal";
import ThemeToggle from "./components/ThemeToggle";
import CollapsibleCard from "./components/CollapsibleCard";
import EmptyState from "./components/EmptyState";
import { ConfirmDialog } from "./components/ui/ConfirmDialog";
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
  NAV_ITEMS,
  ViewKey,
  pathToView,
} from "./constants";
import MaintenanceRecordCard from "./components/MaintenanceRecordCard";
import PrintableWorkOrder from "./components/PrintableWorkOrder";
import SubmissionDetails from "./components/SubmissionDetails";
import BaristaDetailsPage from "./components/BaristaDetailsPage";
import MaintenanceEditPage from "./components/MaintenanceEditPage";
import UserAccessManagement from "./components/UserAccessManagement";
import {
  addToQueue,
  getQueue,
  removeFromQueue,
  getPendingCreations,
  QueueItem,
} from "./utils/offlineQueue";
import { sanitizeString, sanitizeObject } from "./utils/sanitization";
import { validateSubmissionId, isValidDbId, isLocalId } from "./utils/validation";
import { useToast } from "./components/ToastContext";
import { logger } from "./utils/logger";
import { useT } from "./utils/i18n";

// FIX: Initialize Gemini API client according to guidelines.
// The API key MUST be provided via the `process.env.API_KEY` environment variable.
const ai = process.env.API_KEY
  ? new GoogleGenAI({ apiKey: process.env.API_KEY })
  : null;

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


// FIX: Implement the main App component to orchestrate the multi-step form.
interface AppProps {
  onAdminLogout?: () => Promise<void> | void;
}

const App: React.FC<AppProps> = ({ onAdminLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [view, setView] = useState<ViewKey>(pathToView(location.pathname));

  useEffect(() => {
    setView(pathToView(location.pathname));
  }, [location.pathname]);

  const setViewWrapper = (v: ViewKey) => {
    const item = NAV_ITEMS.find((n) => n.key === v);
    if (item) {
      navigate(item.path);
      return;
    }
    if (v === "maintenance-edit" && selectedSubmission?.id) {
      navigate(`/companies/${selectedSubmission.id}/maintenance`);
      return;
    }
    if (v === "barista-details" && selectedBarista) {
      navigate(`/baristas/${selectedBarista}`);
      return;
    }
    if (v === "details" && selectedSubmission?.id) {
      navigate(`/companies/${selectedSubmission.id}`);
      return;
    }
  };
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
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
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
      const timer = setTimeout(() => setNewlyAddedId(null), 1500);
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
      navigate("/companies/new");
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
    navigate("/companies/new");
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

  // Fix 4.1: Wrap event handlers in useCallback to prevent unnecessary re-renders
  // START: Contact Handlers
  // Fix 4.1: Wrap handleContactChange in useCallback
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
  // END: Contact Handlers

  const handleEdit = (submission: FormData) => {
    setFormData(submission);
    navigate("/companies/new");
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
      showToast("تم تحديث الشركة محلياً وستتم المزامنة لاحقاً.", "warning");
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
    navigate(`/companies/${submission.id}`);
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
    navigate("/companies/new");
    setIsMobileMenuOpen(false);
    setShowPreview(false);
  };

  const handlePrintRequest = () => {
    navigate("/print");
    setIsMobileMenuOpen(false);
    setShowPreview(false);
  };

  const handleViewChange = (
    newView: "history" | "form" | "baristas" | "technicians",
  ) => {
    const item = NAV_ITEMS.find((n) => n.key === newView);
    if (item) navigate(item.path);
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

  const textAreaClasses =
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-cream dark:bg-espresso-light text-ink dark:text-cream rounded-lg placeholder-latte dark:placeholder-latte focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20 border border-hairline dark:border-hairline shadow-sm";
  const selectClasses =
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-cream dark:bg-espresso-light text-ink dark:text-cream rounded-lg placeholder-latte dark:placeholder-latte focus:outline-none focus:border-copper-500 focus:ring-2 focus:ring-copper-500/20 border border-hairline dark:border-hairline shadow-sm";

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
    if (view === "print") return <PrintView setView={setViewWrapper} />;
    if (view === "details") return (
      <SubmissionDetailsView 
        selectedSubmission={selectedSubmission} 
        setSelectedSubmission={setSelectedSubmission} 
        setView={setViewWrapper} 
      />
    );
    if (view === "baristas") return (
      <BaristasView 
        submissions={submissions} 
        setSelectedBarista={setSelectedBarista} 
        setView={setViewWrapper} 
        handleDeleteBarista={handleDeleteBarista} 
        handleUpdateBarista={handleUpdateBarista} 
      />
    );
    if (view === "barista-details") return (
      <BaristaDetailsView 
        selectedBarista={selectedBarista} 
        submissions={submissions} 
        setView={setViewWrapper} 
      />
    );
    if (view === "maintenance-edit") return (
      <MaintenanceEditView 
        selectedSubmission={selectedSubmission} 
        setSelectedSubmission={setSelectedSubmission} 
        setView={setViewWrapper} 
        handleUpdateCompany={handleUpdateCompany} 
        allPredefinedProblems={allPredefinedProblems} 
        isSidebarExpanded={isSidebarExpanded} 
      />
    );
    if (view === "technicians") return <UserAccessView />;
    if (view === "history") return (
      <HistoryView 
        isLoading={isLoading} 
        submissions={submissions} 
        handleEdit={handleEdit} 
        requestDelete={requestDelete} 
        handleAddNew={handleAddNew} 
        handlePrintRequest={handlePrintRequest} 
        handleViewDetails={handleViewDetails} 
        handleUpdateCompany={handleUpdateCompany} 
        setSelectedSubmission={setSelectedSubmission} 
        setView={setViewWrapper} 
        getTechnicianDisplayName={getTechnicianDisplayName} 
      />
    );
    
    // Default form view
    return (
      <FormWizardView 
        formData={formData} 
        setFormData={setFormData} 
        currentStep={currentStep} 
        setCurrentStep={setCurrentStep} 
        currentDraftId={currentDraftId} 
        setCurrentDraftId={setCurrentDraftId} 
        drafts={drafts} 
        setDrafts={setDrafts} 
        setView={setViewWrapper} 
        setSubmissions={setSubmissions} 
      />
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
              ? "إدارة الفنيين"
              : "سجل عمليات الإرسال";

  return (
    <div className="h-[100dvh] overflow-hidden flex bg-paper dark:bg-[#1A1210]">
          {/* Desktop Sidebar — espresso chrome */}
          <aside
            className={`chrome border-l border-brass/20 flex-col fixed h-full transition-all duration-300 ease-in-out hidden lg:flex z-50 ${isSidebarExpanded ? "w-64" : "w-20"}`}
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
              setView={setViewWrapper}
            />
          </aside>

          {/* Mobile Sidebar */}
          <div
            className={`fixed inset-0 z-40 lg:hidden ${isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          >
            {/* Backdrop */}
            <div
              className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isMobileMenuOpen ? "opacity-100" : "opacity-0"}`}
              onClick={() => setIsMobileMenuOpen(false)}
            />
            
            {/* Sidebar Container — espresso chrome */}
            <aside 
              className={`absolute top-0 right-0 h-full w-64 chrome border-l border-brass/20 shadow-xl transition-transform duration-300 ease-in-out flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}
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
                setView={setViewWrapper}
              />
            </aside>
          </div>

          {/* Main Content */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out lg:${isSidebarExpanded ? "mr-64" : "mr-20"}`}
          >
            <header className="sticky top-0 z-30 flex items-center justify-between lg:hidden h-16 chrome border-b border-brass/20 px-4 shrink-0 gap-3">
              <div className="flex items-center gap-2 overflow-hidden w-full">
                <button
                  aria-label="القائمة"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-md text-cream/70 hover:text-cream hover:bg-espresso-light transition-colors shrink-0"
                >
                  <Bars3Icon className="h-6 w-6" />
                </button>
                <h1 className="text-lg font-bold text-cream truncate">
                  {mobileTitle}
                </h1>
              </div>
              <img
                src="/logo.svg"
                alt="شعار ميدوز"
                className="h-10 w-auto object-contain shrink-0"
              />
            </header>

            {/* Offline Status Banner */}
            {!isOnline && !offlineBannerDismissed && (
              <div className="bg-cream-2 text-espresso px-4 py-2 text-center text-sm font-medium border-b border-hairline flex items-center justify-between gap-2 shrink-0">
                <span className="flex items-center gap-2 flex-1 justify-center">
                  <SignalSlashIcon className="w-4 h-4 text-ember-500" />
                  أنت غير متصل حالياً. سيتم حفظ التغييرات محلياً ومزامنتها عند عودة الاتصال.
                </span>
                <button
                  onClick={() => setOfflineBannerDismissed(true)}
                  className="p-1 rounded hover:bg-cream-3 transition-colors"
                  aria-label="إخفاء التنبيه"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}
            {isSyncing && (
              <div className="bg-cream-2 text-espresso px-4 py-2 text-center text-sm font-medium border-b border-hairline flex items-center justify-center gap-2 shrink-0">
                <CloudArrowUpIcon className="w-4 h-4 text-copper-500 animate-bounce" />
                جاري مزامنة التغييرات دون اتصال...
              </div>
            )}

            <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
              {renderCurrentView()}
            </main>

          </div>
          <ConfirmDialog
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
