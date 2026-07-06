import { initialFormData } from "../../App";
import { NAV_ITEMS } from "../../constants";
import React, { useState } from "react";
import { FormData } from "../../types";
import {
  HomeIcon,
  DocumentTextIcon,
  PlusCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  UsersIcon,
  UserGroupIcon,
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

const ICONS: Record<string, React.ElementType> = {
  HomeIcon,
  UsersIcon,
  UserGroupIcon,
  DocumentTextIcon,
};

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
      {/* ── Logo rail ── */}
      <div
        className={`flex items-center justify-center h-16 border-b border-brass/20 shrink-0 transition-all duration-300 overflow-hidden`}
      >
        <img src="/logo.svg" alt="شعار ميدوز" className="h-10 w-auto object-contain" />
      </div>

      {/* ── Nav + CTA ── */}
      <nav className="flex-grow p-2 space-y-1">
        {/* Primary CTA — crema→copper gradient */}
        <div className="px-2 pb-2">
          <button
            onClick={() => {
              if (currentDraftId && view === "form") {
                setConfirmOpen(true);
              } else {
                handleAddNew();
              }
            }}
            className="btn-primary w-full flex items-center gap-2 p-2 text-sm font-bold"
            title="إضافة شركة جديدة"
          >
            <PlusCircleIcon className="h-5 w-5 shrink-0" />
            <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
              إضافة شركة
            </span>
          </button>
        </div>

        {/* Nav items — creative active state */}
        {NAV_ITEMS.filter((n) => n.inSidebar).map((item) => {
          const Icon = ICONS[item.iconName];
          const isActive = view === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleViewChange(item.key as any)}
              className={`group relative flex items-center w-full gap-3 p-2.5 rounded-lg text-sm font-medium transition-all duration-300 overflow-hidden ${
                isActive
                  ? "text-cream bg-gradient-to-l from-copper-500/15 to-transparent shadow-[inset_-3px_0_0_0_#B87333]"
                  : "text-cream/60 hover:bg-espresso-light/40 hover:text-cream"
              } ${!isSidebarExpanded && "justify-center"}`}
              title={item.label}
            >
              {/* Hover glow effect for inactive items */}
              {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-l from-cream/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              )}
              
              <Icon 
                className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                  isActive 
                    ? "text-copper-400 scale-110 drop-shadow-[0_0_8px_rgba(184,115,51,0.5)]" 
                    : "group-hover:scale-110 group-hover:text-cream/90"
                }`} 
              />
              <span className={`truncate transition-all duration-300 ${
                isActive ? "font-bold tracking-wide" : ""
              } ${!isSidebarExpanded && "lg:hidden"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* ── Bottom section ── */}
      <div className="p-2 shrink-0 space-y-2">
        {/* Brass hairline divider */}
        <div className="brass-hairline mx-2" />

        {/* Drafts Section */}
        {drafts.length > 0 && (
          <div className={`mb-4 ${!isSidebarExpanded && "hidden"}`}>
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-brass/20"></div>
              <span className="flex-shrink-0 mx-2 text-xs font-semibold text-latte uppercase tracking-wider stamp-id">
                المسودات
              </span>
              <div className="flex-grow border-t border-brass/20"></div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  onClick={() => handleLoadDraft(draft)}
                  className={`group flex items-center justify-between p-2 rounded-md text-sm cursor-pointer transition-colors ${currentDraftId === draft.id ? "bg-espresso-light border-r-2 border-copper-500 text-cream" : "text-cream/60 hover:bg-espresso-light/40 hover:text-cream"}`}
                >
                  <div className="flex flex-col truncate">
                    <span className="font-medium truncate">
                      {draft.formData.companyName || "شركة بدون اسم"}
                    </span>
                    <span className="stamp-id opacity-70">
                      {new Date(draft.timestamp).toLocaleDateString()}{" "}
                      {new Date(draft.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDraft(e, draft.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-cream/40 hover:text-ember-400 transition-all"
                    title="حذف المسودة"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <ThemeToggle theme={theme} toggleTheme={toggleTheme} expanded={isSidebarExpanded} />
        {onAdminLogout && (
          <button
            onClick={() => {
              void Promise.resolve(onAdminLogout()).catch((error) => {
                logger.error("Admin logout error", error, "auth");
              });
            }}
            className={`w-full flex items-center gap-3 p-3 rounded-md text-sm font-semibold border border-ember-500/30 bg-ember-500/10 text-ember-300 hover:bg-ember-500/20 transition-colors ${!isSidebarExpanded && "justify-center"}`}
            title="تسجيل الخروج"
          >
            <ArrowLeftOnRectangleIcon className="h-6 w-6 shrink-0" />
            <span className={`truncate ${!isSidebarExpanded && "lg:hidden"}`}>
              تسجيل الخروج
            </span>
          </button>
        )}
        <button
          onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
          className={`w-full hidden lg:flex items-center p-2 rounded-md text-sm font-medium text-cream/40 hover:text-cream/70 hover:bg-espresso-light/30 transition-colors overflow-hidden ${!isSidebarExpanded && "justify-center"}`}
          aria-label={isSidebarExpanded ? "طي الشريط الجانبي" : "فتح الشريط الجانبي"}
          title={isSidebarExpanded ? "طي" : "فتح"}
        >
          {isSidebarExpanded ? (
            <ChevronDoubleRightIcon className="h-6 w-6 shrink-0" />
          ) : (
            <ChevronDoubleLeftIcon className="h-6 w-6 shrink-0" />
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
        confirmLabelClass="btn-primary"
      />
    </>
  );
});

SidebarContent.displayName = 'SidebarContent';

export default SidebarContent;
