/** @format */

import React, { useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import SidebarContent from "./src/views/Sidebar";
import HistoryView from "./src/views/HistoryView";
import BaristasView from "./src/views/BaristasView";
import FormWizardView from "./src/views/FormWizardView";
import PrintView from "./src/views/PrintView";
import SubmissionDetailsView from "./src/views/SubmissionDetailsView";
import BaristaDetailsView from "./src/views/BaristaDetailsView";
import MaintenanceEditView from "./src/views/MaintenanceEditView";
import UserAccessView from "./src/views/UserAccessView";

import type { FormData, MaintenanceRecord } from "./types";
import type { Draft } from "./hooks/useDrafts";

import { Bars3Icon, XMarkIcon, MoonIcon, SunIcon, SignalSlashIcon, CloudArrowUpIcon } from "@heroicons/react/24/outline";

import { NAV_ITEMS, ViewKey, pathToView } from "./constants";
import { CLASSES } from "./utils/sharedConstants";
import { initialFormData, allPredefinedProblems, VIEW_TITLES, steps } from "./utils/sharedConstants";

import { ConfirmDialog } from "./components/ui/ConfirmDialog";
import { useToast } from "./components/ToastContext";
import { logger } from "./utils/logger";
import { generateMockWizardData } from "./utils/mockData";

import { useTheme } from "./hooks/useTheme";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useDrafts } from "./hooks/useDrafts";
import { useTechnicians } from "./hooks/useTechnicians";
import { useSubmissions } from "./hooks/useSubmissions";
import { useOfflineQueue } from "./hooks/useOfflineQueue";

interface AppProps {
  onAdminLogout?: () => Promise<void> | void;
}

const App: React.FC<AppProps> = ({ onAdminLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  // ── Hooks ──
  const { theme, toggleTheme } = useTheme();
  const isOnline = useNetworkStatus();
  const { isSyncing, processOfflineQueue } = useOfflineQueue();
  const { techniciansMap, getTechnicianDisplayName } = useTechnicians(isOnline);
  const {
    submissions,
    setSubmissions,
    isLoading,
    fetchSubmissions,
    createSubmission,
    updateCompany,
    deleteSubmission,
  } = useSubmissions(isOnline);

  // ── View State ──
  const [view, setView] = useState<ViewKey>(() => pathToView(location.pathname));

  // Sync view with URL changes
  React.useEffect(() => {
    setView(pathToView(location.pathname));
  }, [location.pathname]);

  const setViewWrapper = useCallback(
    (v: ViewKey) => {
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
    },
    [navigate],
  );

  // ── Wizard Form State ──
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  const {
    drafts,
    setDrafts,
    currentDraftId,
    setCurrentDraftId,
    deleteDraftById,
    discardCurrent,
  } = useDrafts(formData, currentStep, view === "form");

  // ── Selection State ──
  const [selectedSubmission, setSelectedSubmission] = useState<
    (FormData & { created_at: string }) | null
  >(null);
  const [selectedBarista, setSelectedBarista] = useState<string | null>(null);

  // ── Modal / UI State ──
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deleteCandidateId, setDeleteCandidateId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [offlineBannerDismissed, setOfflineBannerDismissed] = useState(false);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const [draftToLoad, setDraftToLoad] = useState<Draft | null>(null);
  const justLoadedDraftRef = React.useRef(false);

  // ── Collapse sidebar on maintenance-edit view ──
  React.useEffect(() => {
    if (view === "maintenance-edit") {
      setIsSidebarExpanded(false);
    }
  }, [view]);

  // ── Network-driven data fetch + queue processing ──
  React.useEffect(() => {
    fetchSubmissions();
  }, [isOnline, fetchSubmissions]);

  React.useEffect(() => {
    if (isOnline) {
      processOfflineQueue(() => fetchSubmissions());
    }
  }, [isOnline, processOfflineQueue, fetchSubmissions]);

  // ── Dev mock data listener ──
  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    const handleMockData = () => {
      setFormData(generateMockWizardData());
      setCurrentStep(6);
      showToast("تم ملء بيانات المسودة التجريبية للشركة", "success");
    };
    window.addEventListener("MOCK_WIZARD_DATA", handleMockData);
    return () => window.removeEventListener("MOCK_WIZARD_DATA", handleMockData);
  }, [showToast]);

  // ── Hydrate selectedSubmission from URL on hard refresh ──
  React.useEffect(() => {
    const m = location.pathname.match(/^\/companies\/(?!new)([^/]+)(\/maintenance)?$/);
    if (!m) return;
    const id = m[1];
    const found = submissions.find((s) => String(s.id) === id);

    if (found) {
      setSelectedSubmission((prev) => (prev?.id === found.id ? prev : found));
      return;
    }
    if (!isLoading && submissions.length > 0) {
      navigate("/");
      showToast("السجل غير متاح، تم العودة للرئيسية", "info");
    }
  }, [location.pathname, submissions, isLoading, navigate, showToast]);

  // ── Aggregated barista names for auto-suggest ──
  const allKnownBaristaNames = useMemo(() => {
    const names = new Set<string>();
    formData.baristas.forEach((b) => names.add(b.name));
    formData.branches.forEach((br) =>
      br.baristas.forEach((b) => names.add(b.name)),
    );
    return Array.from(names);
  }, [formData.baristas, formData.branches]);

  // ── Draft actions ──
  const handleLoadDraft = useCallback((draft: Draft) => {
    setDraftToLoad(draft);
  }, []);

  const confirmLoadDraft = useCallback(() => {
    if (draftToLoad) {
      justLoadedDraftRef.current = true;
      setFormData(draftToLoad.formData);
      setCurrentStep(draftToLoad.currentStep);
      setCurrentDraftId(draftToLoad.id);
      navigate("/companies/new");
      if (window.innerWidth < 1024) setIsSidebarExpanded(false);
      setDraftToLoad(null);
    }
  }, [draftToLoad, navigate, setCurrentDraftId]);

  const handleDeleteDraft = useCallback(
    (e: React.MouseEvent, draftId: string) => {
      e.stopPropagation();
      setDraftToDelete(draftId);
    },
    [],
  );

  const confirmDeleteDraft = useCallback(() => {
    if (draftToDelete) {
      deleteDraftById(draftToDelete);
      if (currentDraftId === draftToDelete) {
        setCurrentDraftId(null);
      }
      setDraftToDelete(null);
      showToast("تم حذف المسودة بنجاح", "success");
    }
  }, [draftToDelete, currentDraftId, deleteDraftById, setCurrentDraftId, showToast]);

  // ── View actions ──
  const handleViewChange = useCallback(
    (newView: "history" | "form" | "baristas" | "technicians") => {
      const item = NAV_ITEMS.find((n) => n.key === newView);
      if (item) navigate(item.path);
      setIsMobileMenuOpen(false);
      if (
        newView === "history" ||
        newView === "baristas" ||
        newView === "technicians"
      ) {
        setSelectedBarista(null);
      }
    },
    [navigate],
  );

  const handleAddNew = useCallback(() => {
    setFormData(initialFormData);
    setCurrentStep(1);
    setCurrentDraftId(null);
    navigate("/companies/new");
    setIsMobileMenuOpen(false);
  }, [navigate, setCurrentDraftId]);

  const handleEdit = useCallback(
    (submission: FormData) => {
      setFormData(submission);
      navigate("/companies/new");
      setCurrentStep(1);
    },
    [navigate],
  );

  const requestDelete = useCallback((id: number) => {
    setDeleteCandidateId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteCandidateId === null) return;
    setIsDeleting(true);
    await deleteSubmission(deleteCandidateId);
    setDeleteCandidateId(null);
    setIsDeleting(false);
  }, [deleteCandidateId, deleteSubmission]);

  const cancelDelete = useCallback(() => {
    setDeleteCandidateId(null);
  }, []);

  const handleViewDetails = useCallback(
    (submission: FormData & { created_at: string }) => {
      setSelectedSubmission(submission);
      navigate(`/companies/${submission.id}`);
    },
    [navigate],
  );

  const handleEditMaintenance = useCallback(
    (submission: FormData & { created_at: string }) => {
      // Set state and navigate using the submission passed in directly —
      // NOT from `selectedSubmission` state, which is async and would be stale
      // within the same tick. Mirrors handleViewDetails.
      setSelectedSubmission(submission);
      setIsSidebarExpanded(false);
      navigate(`/companies/${submission.id}/maintenance`);
    },
    [navigate],
  );

  const handlePrintRequest = useCallback(() => {
    navigate("/print");
    setIsMobileMenuOpen(false);
  }, [navigate]);

  // ── Barista management (delegated to views) ──
  const handleQuickAddBarista = useCallback(
    (name: string, branchIndex: number | null) => {
      const newBarista = {
        id: Date.now(),
        name,
        phone: "",
        notes: "Added from maintenance record",
      };

      setFormData((prev) => {
        if (branchIndex === null) {
          return { ...prev, baristas: [...prev.baristas, newBarista] };
        }
        const newBranches = [...prev.branches];
        newBranches[branchIndex].baristas.push(newBarista);
        return { ...prev, branches: newBranches };
      });
    },
    [],
  );

  const handleQuickAddClientBarista = useCallback(
    (name: string, branchIndex: number | null) => {
      const newClientBarista = {
        id: Date.now(),
        name,
        phone: "",
        notes: "Added from maintenance record",
      };

      setFormData((prev) => {
        if (branchIndex === null) {
          return {
            ...prev,
            clientBaristas: [...(prev.clientBaristas || []), newClientBarista],
          };
        }
        const newBranches = [...prev.branches];
        newBranches[branchIndex].clientBaristas.push(newClientBarista);
        return { ...prev, branches: newBranches };
      });
    },
    [],
  );

  const handleDeleteBarista = useCallback(
    (
      sources: {
        submissionId: number;
        branchIndex: number | null;
        baristaIndex: number;
      }[],
    ) => {
      setSubmissions((prev) => {
        const newSubmissions = structuredClone(prev) as FormData[];

        newSubmissions.forEach((sub) => {
          const sourcesForSub = sources.filter(
            (s) => s.submissionId === sub.id,
          );
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
    },
    [],
  );

  const handleUpdateBarista = useCallback(
    (
      sources: {
        submissionId: number;
        branchIndex: number | null;
        baristaIndex: number;
      }[],
      newDetails: { name: string; phone: string },
    ) => {
      setSubmissions((prev) => {
        const newSubmissions = structuredClone(prev) as FormData[];
        newSubmissions.forEach((sub) => {
          const sourcesForSub = sources.filter(
            (s) => s.submissionId === sub.id,
          );
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
                sub.branches[src.branchIndex]?.baristas[src.baristaIndex]
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
    },
    [],
  );

  // ── Mobile title ──
  const mobileTitle =
    view === "form"
      ? steps.find((s) => s.id === currentStep)?.name || "Form"
      : VIEW_TITLES[view] || "سجل عمليات الإرسال";

  // ── Render Current View ──
  const renderCurrentView = () => {
    switch (view) {
      case "print":
        return <PrintView setView={setViewWrapper} />;
      case "details":
        return (
          <SubmissionDetailsView
            selectedSubmission={selectedSubmission}
            setSelectedSubmission={setSelectedSubmission}
            setView={setViewWrapper}
            onUpdate={(updated) => {
              updateCompany(updated);
              setSelectedSubmission(updated);
            }}
          />
        );
      case "baristas":
        return (
          <BaristasView
            submissions={submissions}
            setSelectedBarista={setSelectedBarista}
            setView={setViewWrapper}
            handleDeleteBarista={handleDeleteBarista}
            handleUpdateBarista={handleUpdateBarista}
          />
        );
      case "barista-details":
        return (
          <BaristaDetailsView
            selectedBarista={selectedBarista}
            submissions={submissions}
            setView={setViewWrapper}
          />
        );
      case "maintenance-edit":
        return (
          <MaintenanceEditView
            selectedSubmission={selectedSubmission}
            setSelectedSubmission={setSelectedSubmission}
            setView={setViewWrapper}
            handleUpdateCompany={updateCompany}
            allPredefinedProblems={allPredefinedProblems}
            isSidebarExpanded={isSidebarExpanded}
          />
        );
      case "technicians":
        return <UserAccessView />;
      case "history":
        return (
          <HistoryView
            isLoading={isLoading}
            submissions={submissions}
            handleEdit={handleEdit}
            requestDelete={requestDelete}
            handleAddNew={handleAddNew}
            handlePrintRequest={handlePrintRequest}
            handleViewDetails={handleViewDetails}
            handleUpdateCompany={updateCompany}
            handleEditMaintenance={handleEditMaintenance}
            handleRequestMissingData={(sub) => {
              setSelectedSubmission(sub);
              navigate(`/companies/${sub.id}`);
            }}
            getTechnicianDisplayName={getTechnicianDisplayName}
          />
        );
      case "form":
      default:
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
            refreshSubmissions={fetchSubmissions}
            createSubmission={createSubmission}
          />
        );
    }
  };

  // ── Sidebar props shared between desktop/mobile ──
  const sidebarProps = {
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
  };

  const offlineBanner = !isOnline && !offlineBannerDismissed;
  const syncBanner = isSyncing;

  return (
    <div className="h-[100dvh] overflow-hidden flex bg-paper ">
      {/* Desktop Sidebar */}
      <aside
        className={`chrome border-l border-brass/20 flex-col fixed h-full transition-all duration-300 ease-in-out hidden lg:flex z-50 ${
          isSidebarExpanded ? "w-64" : "w-20"
        }`}
      >
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          isMobileMenuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
            isMobileMenuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsMobileMenuOpen(false)}
        />
        <aside
          className={`absolute top-0 right-0 h-full w-64 chrome border-l border-brass/20 shadow-xl transition-transform duration-300 ease-in-out flex flex-col ${
            isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <SidebarContent {...sidebarProps} />
        </aside>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out lg:${
          isSidebarExpanded ? "mr-64" : "mr-20"
        }`}
      >
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between lg:hidden h-16 chrome border-b border-brass/20 px-4 shrink-0">
          <div className="w-1/4 flex justify-start items-center gap-1">
            <button
              aria-label="القائمة"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 -mr-2 rounded-md text-cream/70 hover:text-cream hover:bg-espresso-light transition-colors shrink-0"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-md text-cream/70 hover:text-cream hover:bg-espresso-light transition-colors shrink-0"
              aria-label={
                theme === "light" ? "الوضع الليلي" : "الوضع النهاري"
              }
              title={
                theme === "light" ? "الوضع الليلي" : "الوضع النهاري"
              }
            >
              {theme === "light" ? (
                <MoonIcon className="h-5 w-5" />
              ) : (
                <SunIcon className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <h1 className="text-lg font-bold text-cream truncate">
              {mobileTitle}
            </h1>
          </div>

          <div className="w-1/4 flex justify-end">
            <img
              src="/logo.svg"
              alt="شعار ميدوز"
              className="h-9 w-auto object-contain shrink-0 -ml-2"
            />
          </div>
        </header>

        {/* Offline Banner */}
        {offlineBanner && (
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

        {/* Sync Banner */}
        {syncBanner && (
          <div className="bg-cream-2 text-espresso px-4 py-2 text-center text-sm font-medium border-b border-hairline flex items-center justify-center gap-2 shrink-0">
            <CloudArrowUpIcon className="w-4 h-4 text-copper-500 animate-bounce" />
            جاري مزامنة التغييرات دون اتصال...
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10">
          {renderCurrentView()}
        </main>
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        isOpen={deleteCandidateId !== null}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="تأكيد الحذف"
        message="هل أنت متأكد من حذف هذا السجل؟ لا يمكن التراجع عن هذا الإجراء."
        isConfirming={isDeleting}
      />
      <ConfirmDialog
        isOpen={draftToDelete !== null}
        onClose={() => setDraftToDelete(null)}
        onConfirm={confirmDeleteDraft}
        title="تأكيد حذف المسودة"
        message="هل أنت متأكد من حذف هذه المسودة؟ سيتم فقدان كافة البيانات المحفوظة بها."
        confirmLabel="حذف المسودة"
      />
      <ConfirmDialog
        isOpen={draftToLoad !== null}
        onClose={() => setDraftToLoad(null)}
        onConfirm={confirmLoadDraft}
        title="تحميل المسودة"
        message="هل تريد تحميل هذه المسودة؟ سيتم فقدان أي تغييرات حالية غير محفوظة."
        confirmLabel="تحميل المسودة"
      />
    </div>
  );
};

export default App;
