import { initialFormData } from "../../App";
import React, { useState } from "react";
import { FormData } from "../../types";
import {
  HomeIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  WrenchIcon,
  UsersIcon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import ThemeToggle from "../../components/ThemeToggle";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { logger } from "../../utils/logger";

interface Draft {
  id: string;
  timestamp: number;
  formData: FormData;
  currentStep: number;
}

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
  const [confirmOpen, setConfirmOpen] = useState(false);

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
              setConfirmOpen(true);
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
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          setCurrentDraftId(null);
          setFormData(initialFormData);
          setCurrentStep(1);
          setView("form");
        }}
        title="بدء نموذج جديد؟"
        message="سيتم حفظ عملك الحالي كمسودة."
        confirmLabel="نعم، ابدأ"
      />
    </>
  );
});

SidebarContent.displayName = 'SidebarContent';

// FIX: Implement the main App component to orchestrate the multi-step form.
interface AppProps {
  onAdminLogout?: () => Promise<void> | void;
}

export default SidebarContent;

