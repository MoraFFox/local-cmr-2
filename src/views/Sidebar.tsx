import { initialFormData, SIDEBAR_TOGGLE_SHORTCUT } from "../../utils/sharedConstants";
import { NAV_ITEMS, isSidebarItemActive, type ViewKey } from "../../constants";
import React, { useState, useEffect } from "react";
import { FormData } from "../../types";
import {
  PlusCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  UsersIcon,
  UserGroupIcon,
  XMarkIcon,
  ArrowLeftOnRectangleIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  LanguageIcon,
  FolderOpenIcon,
} from "@heroicons/react/24/outline";
import ThemeToggle from "../../components/ThemeToggle";
import { KeyboardShortcutsHelpButton } from "../../components/KeyboardShortcutsHelp";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import SafeModal from "../../components/form-ui/SafeModal";
import { SidebarTooltip } from "../../components/ui/SidebarTooltip";
import { logger } from "../../utils/logger";
import { syncAllCompaniesToSheetsNow } from "../../utils/googleSheetsSync";
import { useToast } from "../../components/ToastContext";
import { useLanguage } from "../../utils/LanguageContext";

interface Draft {
  id: string;
  timestamp: number;
  formData: FormData;
  currentStep: number;
}

const ICONS: Record<string, React.ElementType> = {
  ClockIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  UserGroupIcon,
  PlusIcon,
  Cog6ToothIcon,
};

/** Navigation destinations reachable from the sidebar. */
export type SidebarNavView = Extract<ViewKey, "history" | "baristas" | "technicians" | "all-records" | "machines">;

interface SidebarContentProps {
  view: string;
  /** Explicitly true for the mobile drawer; the desktop rail is controlled by isSidebarExpanded. */
  presentation?: "desktop" | "mobile";
  isSidebarExpanded: boolean;
  theme: "light" | "dark";
  drafts: Draft[];
  currentDraftId: string | null;
  pathname?: string;
  handleViewChange: (newView: SidebarNavView) => void;
  handleLoadDraft: (draft: Draft) => void;
  handleDeleteDraft: (e: React.MouseEvent, draftId: string) => void;
  toggleTheme: () => void;
  toggleLanguage?: () => void;
  language?: 'ar' | 'en';
  onAdminLogout?: () => Promise<void> | void;
  handleAddNew: () => void;
  setIsSidebarExpanded: (expanded: boolean) => void;
  setCurrentDraftId: (id: string | null) => void;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  setView: React.Dispatch<React.SetStateAction<string>>;
}

const utilityButtonClass = (colorClass: string) =>
  `w-full min-h-[44px] flex items-center gap-3 p-3 rounded-lg text-sm font-semibold border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 ${colorClass}`;

const collapsedIconButtonClass =
  "w-11 h-11 min-w-[44px] min-h-[44px] mx-auto p-0 flex items-center justify-center shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

const collapsibleButtonClass = (colorClass: string, isSidebarExpanded: boolean) =>
  isSidebarExpanded
    ? utilityButtonClass(colorClass)
    : `${collapsedIconButtonClass} text-sm font-semibold border transition-colors ${colorClass}`;

/** Format a draft timestamp using the active locale. */
function formatDraftDate(timestamp: number, language: 'ar' | 'en'): string {
  const date = new Date(timestamp);
  const locale = language === "ar" ? "ar-EG" : "en-US";
  const datePart = date.toLocaleDateString(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timePart = date.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${datePart} ${timePart}`;
}

const SidebarContent = React.memo<SidebarContentProps>(({
  view,
  presentation = "desktop",
  isSidebarExpanded,
  theme,
  drafts,
  currentDraftId,
  pathname,
  handleViewChange,
  handleLoadDraft,
  handleDeleteDraft,
  toggleTheme,
  toggleLanguage,
  language,
  onAdminLogout,
  handleAddNew,
  setIsSidebarExpanded,
  setCurrentDraftId,
  setFormData,
  setCurrentStep,
  setView,
}: SidebarContentProps) => {
  const { t } = useLanguage();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isSheetsSyncing, setIsSheetsSyncing] = useState(false);
  const { showToast } = useToast();
  const s = t.admin.sidebar;

  const handleSheetsSync = async () => {
    setIsSheetsSyncing(true);
    try {
      const result = await syncAllCompaniesToSheetsNow();
      if (result.success) {
        showToast(s.syncSuccess, "success");
      } else {
        showToast(result.error || s.syncFailure, "error");
      }
    } catch {
      showToast(s.syncFailure, "error");
    } finally {
      setIsSheetsSyncing(false);
    }
  };

  const confirmLogout = () => {
    setLogoutConfirmOpen(false);
    if (!onAdminLogout) return;
    void Promise.resolve(onAdminLogout()).catch((error) => {
      logger.error("Admin logout error", error, "auth");
    });
  };

  const navItems = NAV_ITEMS.filter((item) => item.inSidebar);

  // Collapsed rail tooltips open outward from the sidebar edge: right in LTR,
  // left in RTL.
  // The sidebar lives at logical `start-0`; the tooltip must always open
  // toward its logical outside edge (`end`) in both RTL and LTR.
  const tooltipPlacement = "end" as const;

  return (
    <>
      {/* ── Header rail ── */}
      <div className="relative flex items-center justify-center h-16 border-b border-brass/20 shrink-0 transition-all duration-300 overflow-hidden">
        {isSidebarExpanded && (
          <img src="/logo.svg" alt={t.admin.appName} className="h-10 w-auto object-contain" />
        )}
        {presentation === "desktop" && (
          <button
            type="button"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-11 h-11 min-w-[44px] min-h-[44px] rounded-lg text-muted-chrome border border-transparent hover:text-on-chrome hover:bg-espresso-light/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 transition-colors ${
              isSidebarExpanded ? "start-2" : "start-1/2 ltr:-translate-x-1/2 rtl:translate-x-1/2"
            }`}
            aria-expanded={isSidebarExpanded}
            aria-controls="desktop-sidebar"
            aria-keyshortcuts={SIDEBAR_TOGGLE_SHORTCUT.label}
            aria-label={isSidebarExpanded ? s.collapseSidebar : s.expandSidebar}
            title={isSidebarExpanded ? `${s.collapseSidebar} (${SIDEBAR_TOGGLE_SHORTCUT.label})` : `${s.expandSidebar} (${SIDEBAR_TOGGLE_SHORTCUT.label})`}
          >
            {isSidebarExpanded ? (
              language === "en" ? <ChevronDoubleLeftIcon className="h-4 w-4" aria-hidden="true" /> : <ChevronDoubleRightIcon className="h-4 w-4" aria-hidden="true" />
            ) : (
              language === "en" ? <ChevronDoubleRightIcon className="h-4 w-4" aria-hidden="true" /> : <ChevronDoubleLeftIcon className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {/* ── Scrollable body: primary CTA + navigation + drafts ── */}
      <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1" aria-label={s.mainNavigation}>
        <div className="px-2 pb-2">
          {isSidebarExpanded ? (
            <button
              type="button"
              onClick={() => {
                if (currentDraftId && view === "form") {
                  setConfirmOpen(true);
                } else {
                  handleAddNew();
                }
              }}
              className="btn-primary w-full flex items-center gap-2 p-2 text-sm font-bold"
              title={s.addNewCompany}
              data-testid="add-company-button"
            >
              <PlusCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{s.addNewCompany}</span>
            </button>
          ) : (
            <SidebarTooltip label={s.addNewCompany} placement={tooltipPlacement} triggerClassName="w-full justify-center">
              <button
                type="button"
                onClick={() => {
                  if (currentDraftId && view === "form") {
                    setConfirmOpen(true);
                  } else {
                    handleAddNew();
                  }
                }}
                className={`btn-primary !w-11 !h-11 !min-w-[44px] !min-h-[44px] !p-0 flex items-center justify-center gap-2 text-sm font-bold ${collapsedIconButtonClass}`}

                aria-label={s.addNewCompany}
                data-testid="add-company-button"
              >
                <PlusCircleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>
            </SidebarTooltip>
          )}
        </div>

        {navItems.map((item) => {
          const Icon = ICONS[item.iconName];
          const label = s[item.labelKey];
          const isActive = isSidebarItemActive(item, view as ViewKey, pathname ?? "");
          const navButton = (
            <button
              key={item.key}
              type="button"
              onClick={() => handleViewChange(item.key as SidebarNavView)}
              className={`group relative flex items-center text-sm font-medium transition-all duration-300 overflow-hidden ${
                isSidebarExpanded
                  ? "w-full min-h-[44px] gap-3 p-2.5 rounded-lg"
                  : `${collapsedIconButtonClass} gap-3`
              } ${
                isActive
                  ? "text-on-chrome bg-primary/15 border border-primary/30 ltr:shadow-[inset_-3px_0_0_0_#B87333] rtl:shadow-[inset_3px_0_0_0_#B87333]"
                  : "text-muted-chrome hover:bg-espresso-light/40 hover:text-on-chrome"
              }`}
              aria-current={isActive ? "page" : undefined}
              aria-label={label}
              title={isSidebarExpanded ? label : undefined}
            >
              {!isActive && (
                <div className="absolute inset-0 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-cream/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              )}
              <Icon
                className={`h-5 w-5 shrink-0 transition-transform duration-300 ${
                  isActive
                    ? "text-primary-400 scale-110 drop-shadow-[0_0_8px_rgba(184,115,51,0.5)]"
                    : "group-hover:scale-110 group-hover:text-on-chrome"
                }`}
                aria-hidden="true"
              />
              <span
                className={`truncate transition-all duration-300 ${
                  isActive ? "font-bold tracking-wide" : ""
                } ${!isSidebarExpanded ? "hidden" : ""}`}
              >
                {label}
              </span>
            </button>
          );
          return isSidebarExpanded ? navButton : (
            <SidebarTooltip key={item.key} label={label} placement={tooltipPlacement} triggerClassName="w-full justify-center">
              {navButton}
            </SidebarTooltip>
          );
        })}

        {/* Drafts — in the scrollable body so they cannot clip the pinned footer */}
        {drafts.length > 0 && isSidebarExpanded && (
          <div className="pt-1">
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-brass/20"></div>
              <span className="flex-shrink-0 mx-2 text-xs font-semibold text-latte uppercase tracking-wider stamp-id">
                {s.drafts}
              </span>
              <div className="flex-grow border-t border-brass/20"></div>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar pe-1">
              {drafts.map((draft) => (
                <DraftRow
                  key={draft.id}
                  draft={draft}
                  current={currentDraftId === draft.id}
                  locale={language ?? "ar"}
                  deleteDraftLabel={s.deleteDraft}
                  onLoad={() => handleLoadDraft(draft)}
                  onDelete={(e) => handleDeleteDraft(e, draft.id)}
                />
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* ── Pinned footer: utilities ── */}
      <div className="p-2 pb-3 shrink-0 space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar" role="group" aria-label={s.utilities}>
        <div className="brass-hairline w-full" />

        {drafts.length > 0 && !isSidebarExpanded && (
          <SidebarTooltip label={`${s.openDrafts} (${drafts.length})`} placement={tooltipPlacement} triggerClassName="w-full justify-center">
            <CompactDrafts
            drafts={drafts}
            currentDraftId={currentDraftId}
            openLabel={s.openDrafts}
            closeLabel={s.closeDrafts}
            draftsLabel={s.drafts}
            draftDetailsLabel={s.draftDetails}
            draftCompanyLabel={s.draftCompany}
            draftEmailLabel={s.draftEmail}
            draftTaxLabel={s.draftTax}
            draftLocationLabel={s.draftLocation}
            draftWarehouseLabel={s.draftWarehouse}
            draftClientBaristasLabel={s.draftClientBaristas}
            draftAcquisitionLabel={s.draftAcquisition}
            draftDailyLeaseCostLabel={s.draftDailyLeaseCost}
            draftOwnershipLabels={{
              leased: s.draftOwnershipLeased,
              consumption: s.draftOwnershipConsumption,
              bought: s.draftOwnershipBought,
            }}
            draftNotesLabel={s.draftNotes}
            draftCoffeeLabel={s.draftCoffee}
            draftAllowedTimesLabel={s.draftAllowedTimes}
            draftProblemsLabel={s.draftProblems}
            draftServicesLabel={s.draftServices}
            draftPartsLabel={s.draftParts}
            draftMachineStatusTitle={s.draftMachineStatus}
            draftMachineStatusLabel={{
              ours: s.draftMachineStatusOurs,
              client: s.draftMachineStatusClient,
              mixed: s.draftMachineStatusMixed,
              unset: s.draftMachineStatusUnset,
            }}
            draftStepLabel={s.draftStep}
            draftUpdatedLabel={s.draftUpdated}
            draftBranchesLabel={s.draftBranches}
            draftMachinesLabel={s.draftMachines}
            draftBaristasLabel={s.draftBaristas}
            draftContactsLabel={s.draftContacts}
            draftMaintenanceLabel={s.draftMaintenance}
            draftFullDetailsLabel={s.draftFullDetails}
            draftNoDetailsLabel={s.draftNoDetails}
            loadLabel={s.loadDraft}
            deleteLabel={s.deleteDraft}
            untitledLabel={s.untitledCompany}
            locale={language ?? "ar"}
            onLoad={handleLoadDraft}
            onDelete={handleDeleteDraft}
          />
          </SidebarTooltip>
        )}

        {isSidebarExpanded ? (
          <ThemeToggle theme={theme} toggleTheme={toggleTheme} expanded />
        ) : (
          <SidebarTooltip label={theme === "light" ? s.switchToDark : s.switchToLight} placement={tooltipPlacement} triggerClassName="w-full justify-center">
            <ThemeToggle theme={theme} toggleTheme={toggleTheme} expanded={false} />
          </SidebarTooltip>
        )}

        {toggleLanguage && language && (
          isSidebarExpanded ? (
            <button
              type="button"
              onClick={toggleLanguage}
              className={utilityButtonClass("border-hairline/50 bg-cream/50 dark:bg-espresso-light/30 text-latte hover:text-on-chrome hover:bg-espresso-light/40")}
              title={language === "ar" ? s.switchToEnglish : s.switchToArabic}
            >
              <LanguageIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              <span className="truncate">{language === "ar" ? s.switchToEnglish : s.switchToArabic}</span>
            </button>
          ) : (
            <SidebarTooltip label={language === "ar" ? s.switchToEnglish : s.switchToArabic} placement={tooltipPlacement} triggerClassName="w-full justify-center">
              <button
                type="button"
                onClick={toggleLanguage}
                className={collapsibleButtonClass("border-hairline/50 bg-cream/50 dark:bg-espresso-light/30 text-latte hover:text-on-chrome hover:bg-espresso-light/40", isSidebarExpanded)}
                aria-label={language === "ar" ? s.switchToEnglish : s.switchToArabic}
              >
                <LanguageIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
              </button>
            </SidebarTooltip>
          )
        )}

        {isSidebarExpanded ? (
          <KeyboardShortcutsHelpButton
            className={utilityButtonClass("border-hairline/50 bg-cream/50 dark:bg-espresso-light/30 text-latte hover:text-on-chrome hover:bg-espresso-light/40")}
          />
        ) : (
          <SidebarTooltip label={s.keyboardShortcuts} placement={tooltipPlacement} triggerClassName="w-full justify-center">
            <KeyboardShortcutsHelpButton
              className={`${collapsibleButtonClass("border-hairline/50 bg-cream/50 dark:bg-espresso-light/30 text-latte hover:text-on-chrome hover:bg-espresso-light/40", isSidebarExpanded)} [&>svg]:h-5 [&>svg]:w-5`}
            />
          </SidebarTooltip>
        )}

        {isSidebarExpanded ? (
          <button
            type="button"
            onClick={handleSheetsSync}
            disabled={isSheetsSyncing}
            className={utilityButtonClass("border-leaf-500/30 bg-leaf-500/10 text-leaf-300 hover:bg-leaf-500/20 disabled:opacity-50")}
            title={s.syncSheets}
            aria-busy={isSheetsSyncing}
          >
            <CloudArrowUpIcon className={`h-5 w-5 shrink-0 ${isSheetsSyncing ? "animate-bounce" : ""}`} aria-hidden="true" />
            <span className="truncate">{isSheetsSyncing ? s.syncingSheets : s.syncSheets}</span>
          </button>
        ) : (
          <SidebarTooltip label={isSheetsSyncing ? s.syncingSheets : s.syncSheets} placement={tooltipPlacement} triggerClassName="w-full justify-center">
            <button
              type="button"
              onClick={handleSheetsSync}
              disabled={isSheetsSyncing}
              className={collapsibleButtonClass("border-leaf-500/30 bg-leaf-500/10 text-leaf-300 hover:bg-leaf-500/20 disabled:opacity-50", isSidebarExpanded)}
              aria-label={isSheetsSyncing ? s.syncingSheets : s.syncSheets}
              aria-busy={isSheetsSyncing}
            >
              <CloudArrowUpIcon className={`h-5 w-5 shrink-0 ${isSheetsSyncing ? "animate-bounce" : ""}`} aria-hidden="true" />
            </button>
          </SidebarTooltip>
        )}

        {onAdminLogout && (
          isSidebarExpanded ? (
            <button
              type="button"
              onClick={() => setLogoutConfirmOpen(true)}
              className={utilityButtonClass("border-ember-500/30 bg-ember-500/10 text-ember-300 hover:bg-ember-500/20")}
              title={s.logout}
            >
              <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              <span className="truncate">{s.logout}</span>
            </button>
          ) : (
            <SidebarTooltip label={s.logout} placement={tooltipPlacement} triggerClassName="w-full justify-center">
              <button
                type="button"
                onClick={() => setLogoutConfirmOpen(true)}
                className={collapsibleButtonClass("border-ember-500/30 bg-ember-500/10 text-ember-300 hover:bg-ember-500/20", isSidebarExpanded)}
                aria-label={s.logout}
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              </button>
            </SidebarTooltip>
          )
        )}
      </div>

      {/* Start-new-form confirmation (existing behavior preserved) */}
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
        title={s.startNewConfirmTitle}
        message={s.startNewConfirmMessage}
        confirmLabel={s.confirmStart}
        confirmLabelClass="btn-primary"
      />

      {/* Logout confirmation */}
      {onAdminLogout && (
        <ConfirmDialog
          isOpen={logoutConfirmOpen}
          onClose={() => setLogoutConfirmOpen(false)}
          onConfirm={confirmLogout}
          title={s.logoutConfirmTitle}
          message={s.logoutConfirmMessage}
          confirmLabel={s.confirmLogout}
          cancelLabel={s.cancelLogout}
          variant="danger"
        />
      )}
    </>
  );
});

interface DraftRowProps {
  draft: Draft;
  current: boolean;
  locale: "ar" | "en";
  deleteDraftLabel: string;
  onLoad: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

const DraftRow: React.FC<DraftRowProps> = ({ draft, current, locale, deleteDraftLabel, onLoad, onDelete }) => {
  const { t } = useLanguage();
  return (
    <div
      className={`group flex items-center justify-between rounded-md text-sm transition-colors ${
        current ? "bg-espresso-light border-e-2 border-primary text-on-chrome" : "text-muted-chrome hover:bg-espresso-light/40 hover:text-on-chrome"
      }`}
    >
      <button
        type="button"
        onClick={onLoad}
        className="flex min-h-[44px] min-w-0 flex-1 flex-col items-start truncate p-2 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        <span className="font-medium truncate">{draft.formData.companyName || t.admin.sidebar.untitledCompany}</span>
        <span className="stamp-id opacity-70 text-xs">{formatDraftDate(draft.timestamp, locale)}</span>
      </button>
      <button
        type="button"
        onClick={(e) => onDelete(e)}
        className="min-w-[44px] min-h-[44px] flex items-center justify-center opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus-visible:opacity-100 text-muted-chrome hover:text-ember-400 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        title={deleteDraftLabel}
        aria-label={deleteDraftLabel}
      >
        <XMarkIcon className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};

interface CompactDraftsProps {
  drafts: Draft[];
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseEnter?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseLeave?: React.MouseEventHandler<HTMLButtonElement>;
  onFocus?: React.FocusEventHandler<HTMLButtonElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  'aria-describedby'?: string;
  currentDraftId: string | null;
  openLabel: string;
  closeLabel: string;
  draftsLabel: string;
  draftDetailsLabel: string;
  draftCompanyLabel: string;
  draftEmailLabel: string;
  draftTaxLabel: string;
  draftLocationLabel: string;
  draftWarehouseLabel: string;
  draftClientBaristasLabel: string;
  draftAcquisitionLabel: string;
  draftDailyLeaseCostLabel: string;
  draftOwnershipLabels: {
    leased: string;
    consumption: string;
    bought: string;
  };
  draftNotesLabel: string;
  draftCoffeeLabel: string;
  draftAllowedTimesLabel: string;
  draftProblemsLabel: string;
  draftServicesLabel: string;
  draftPartsLabel: string;
  draftMachineStatusTitle: string;
  draftMachineStatusLabel: {
    ours: string;
    client: string;
    mixed: string;
    unset: string;
  };
  draftStepLabel: string;
  draftUpdatedLabel: string;
  draftBranchesLabel: string;
  draftMachinesLabel: string;
  draftBaristasLabel: string;
  draftContactsLabel: string;
  draftMaintenanceLabel: string;
  draftFullDetailsLabel: string;
  draftNoDetailsLabel: string;
  loadLabel: string;
  deleteLabel: string;
  untitledLabel: string;
  locale: "ar" | "en";
  onLoad: (draft: Draft) => void;
  onDelete: (e: React.MouseEvent, draftId: string) => void;
}

/**
 * Collapsed-mode drafts control: a square icon button that opens a centered
 * modal. Keeping the list in a portal prevents it from being clipped by the
 * sidebar or positioned outside the viewport.
 */
const CompactDrafts: React.FC<CompactDraftsProps> = ({
  drafts,
  currentDraftId,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  'aria-describedby': ariaDescribedBy,
  openLabel,
  closeLabel,
  draftsLabel,
  draftDetailsLabel,
  draftCompanyLabel,
  draftEmailLabel,
  draftTaxLabel,
  draftLocationLabel,
  draftWarehouseLabel,
  draftClientBaristasLabel,
  draftAcquisitionLabel,
  draftDailyLeaseCostLabel,
  draftOwnershipLabels,
  draftNotesLabel,
  draftCoffeeLabel,
  draftAllowedTimesLabel,
  draftProblemsLabel,
  draftServicesLabel,
  draftPartsLabel,
  draftMachineStatusTitle,
  draftMachineStatusLabel,
  draftStepLabel,
  draftUpdatedLabel,
  draftBranchesLabel,
  draftMachinesLabel,
  draftBaristasLabel,
  draftContactsLabel,
  draftMaintenanceLabel,
  draftFullDetailsLabel,
  draftNoDetailsLabel,
  loadLabel,
  deleteLabel,
  untitledLabel,
  locale,
  onLoad,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (drafts.length === 0) setIsOpen(false);
  }, [drafts.length]);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          setIsOpen((open) => !open);
          onClick?.(event);
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocus={onFocus}
        onBlur={onBlur}
        className={`${collapsedIconButtonClass} relative border border-hairline/50 bg-cream/50 dark:bg-espresso-light/30 text-latte hover:text-on-chrome hover:bg-espresso-light/40 transition-colors`}
        aria-label={isOpen ? closeLabel : `${openLabel} (${drafts.length})`}
        aria-describedby={ariaDescribedBy}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <FolderOpenIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
        <span
          aria-hidden="true"
          data-testid="draft-count-badge"
          className="absolute -top-1 -end-1 min-w-5 h-5 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none"
        >
          {drafts.length > 99 ? "99+" : drafts.length}
        </span>
      </button>

      <SafeModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={draftsLabel}
        type="info"
        size="lg"
        closeOnBackdropClick
        ariaLabel={draftsLabel}
        closeLabel={closeLabel}
        bodyClassName="!p-0"
      >
        <div className="space-y-3" aria-label={draftDetailsLabel}>
          {drafts.map((draft) => {
            const companyName = draft.formData.companyName || untitledLabel;
            const email = draft.formData.email || "—";
            const taxNumber = draft.formData.taxNumber || "—";
            const location = draft.formData.location || "—";
            const machineStatus = draft.formData.hasMultipleMachines
              ? draftMachineStatusLabel.mixed
              : draft.formData.usesOurMachines === true
                ? draftMachineStatusLabel.ours
                : draft.formData.usesOurMachines === false
                  ? draftMachineStatusLabel.client
                  : draftMachineStatusLabel.unset;
            const branches = draft.formData.branches?.length ?? 0;
            const machines = (draft.formData.machines?.length ?? 0) +
              (draft.formData.branches?.reduce((total, branch) => total + (branch.machines?.length ?? 0), 0) ?? 0);
            const baristas = (draft.formData.baristas?.length ?? 0) +
              (draft.formData.branches?.reduce((total, branch) => total + (branch.baristas?.length ?? 0), 0) ?? 0);
            const contacts = (draft.formData.contacts?.length ?? 0) +
              (draft.formData.warehouse?.contacts?.length ?? 0) +
              (draft.formData.branches?.reduce((total, branch) => total + (branch.contacts?.length ?? 0), 0) ?? 0);
            const warehouseDetails = [
              draft.formData.warehouse?.location,
              ...(draft.formData.warehouse?.contacts ?? []).map((contact) => contact.name),
            ].filter(Boolean) as string[];
            const clientBaristaNames = [
              ...(draft.formData.clientBaristas ?? []).map((barista) => [barista.name, barista.phone, barista.notes].filter(Boolean).join(" · ")),
              ...(draft.formData.branches ?? []).flatMap((branch) =>
                (branch.clientBaristas ?? []).map((barista) => [barista.name, barista.phone, barista.notes].filter(Boolean).join(" · ")),
              ),
            ];
            const formatAcquisition = (ownershipType?: "leased" | "consumption" | "bought", dailyLeaseCost?: number) => [
              ownershipType === "leased" ? draftOwnershipLabels.leased : undefined,
              ownershipType === "consumption" ? draftOwnershipLabels.consumption : undefined,
              ownershipType === "bought" ? draftOwnershipLabels.bought : undefined,
              dailyLeaseCost != null
                ? `${draftDailyLeaseCostLabel}: ${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "EGP" }).format(dailyLeaseCost)}`
                : undefined,
            ].filter(Boolean).join(" · ");
            const acquisitionDetails = [
              formatAcquisition(draft.formData.machineOwnershipType, draft.formData.dailyLeaseCost),
              ...(draft.formData.branches ?? []).map((branch) => formatAcquisition(branch.machineOwnershipType, branch.dailyLeaseCost)),
            ].filter(Boolean);
            const notesDetails = [
              draft.formData.allowedMaintenanceTimes ? `${draftAllowedTimesLabel}: ${draft.formData.allowedMaintenanceTimes}` : undefined,
              draft.formData.coffeeConsumptionKg != null ? `${draftCoffeeLabel}: ${draft.formData.coffeeConsumptionKg}` : undefined,
            ].filter(Boolean) as string[];
            const maintenance = (draft.formData.maintenanceHistory?.length ?? 0) +
              (draft.formData.branches?.reduce((total, branch) => total + (branch.maintenanceHistory?.length ?? 0), 0) ?? 0);
            const branchNames = draft.formData.branches?.map((branch) =>
              [
                branch.branchName || untitledLabel,
                branch.location,
                branch.email,
                branch.taxNumber,
              ].filter(Boolean).join(" · "),
            ) ?? [];
            const machineNames = [
              ...(draft.formData.machines ?? []).map((machine) =>
                [
                  machine.machineName || machine.machineOption || untitledLabel,
                  machine.machineType,
                  machine.machineOwnershipType === "leased" ? draftOwnershipLabels.leased :
                    machine.machineOwnershipType === "consumption" ? draftOwnershipLabels.consumption : undefined,
                  machine.dailyLeaseCost != null
                    ? `${draftDailyLeaseCostLabel}: ${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "EGP" }).format(machine.dailyLeaseCost)}`
                    : undefined,
                  machine.machineOwner === "ours"
                    ? draftMachineStatusLabel.ours
                    : machine.machineOwner === "client"
                      ? draftMachineStatusLabel.client
                      : undefined,
                ].filter(Boolean).join(" · "),
              ),
              ...(draft.formData.branches ?? []).flatMap((branch) =>
                (branch.machines ?? []).map((machine) =>
                  [
                    machine.machineName || machine.machineOption || untitledLabel,
                    machine.machineType,
                    machine.machineOwnershipType === "leased" ? draftOwnershipLabels.leased :
                      machine.machineOwnershipType === "consumption" ? draftOwnershipLabels.consumption : undefined,
                    machine.dailyLeaseCost != null
                      ? `${draftDailyLeaseCostLabel}: ${new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { style: "currency", currency: "EGP" }).format(machine.dailyLeaseCost)}`
                      : undefined,
                    machine.machineOwner === "ours"
                      ? draftMachineStatusLabel.ours
                      : machine.machineOwner === "client"
                        ? draftMachineStatusLabel.client
                        : undefined,
                  ].filter(Boolean).join(" · "),
                ),
              ),
            ];
            const baristaNames = [
              ...(draft.formData.baristas ?? []).map((barista) => [barista.name || untitledLabel, barista.phone, barista.notes].filter(Boolean).join(" · ")),
              ...(draft.formData.branches ?? []).flatMap((branch) =>
                (branch.baristas ?? []).map((barista) => [barista.name || untitledLabel, barista.phone, barista.notes].filter(Boolean).join(" · ")),
              ),
            ];
            const contactNames = [
              ...(draft.formData.contacts ?? []).map((contact) => [contact.name || untitledLabel, contact.position, contact.customPosition, contact.email, contact.phoneNumbers?.map((phone) => phone.number).join(", ")].filter(Boolean).join(" · ")),
              ...(draft.formData.warehouse?.contacts ?? []).map((contact) => [contact.name || untitledLabel, contact.position, contact.customPosition, contact.email, contact.phoneNumbers?.map((phone) => phone.number).join(", ")].filter(Boolean).join(" · ")),
              ...(draft.formData.branches ?? []).flatMap((branch) =>
                (branch.contacts ?? []).map((contact) => [contact.name || untitledLabel, contact.position, contact.customPosition, contact.email, contact.phoneNumbers?.map((phone) => phone.number).join(", ")].filter(Boolean).join(" · ")),
              ),
            ];
            const maintenanceDates = [
              ...(draft.formData.maintenanceHistory ?? []).map((record) => [
                record.maintenanceDate,
                record.notes,
                record.problems?.length ? `${draftProblemsLabel}: ${record.problems.join(", ")}` : undefined,
                record.servicesPerformed?.length ? `${draftServicesLabel}: ${record.servicesPerformed.map((service) => service.name).join(", ")}` : undefined,
                record.partsReplaced?.length ? `${draftPartsLabel}: ${record.partsReplaced.map((part) => part.name).join(", ")}` : undefined,
              ].filter(Boolean).join(" · ")),
              ...(draft.formData.branches ?? []).flatMap((branch) =>
                (branch.maintenanceHistory ?? []).map((record) => [
                  record.maintenanceDate,
                  record.notes,
                  record.problems?.length ? `${draftProblemsLabel}: ${record.problems.join(", ")}` : undefined,
                  record.servicesPerformed?.length ? `${draftServicesLabel}: ${record.servicesPerformed.map((service) => service.name).join(", ")}` : undefined,
                  record.partsReplaced?.length ? `${draftPartsLabel}: ${record.partsReplaced.map((part) => part.name).join(", ")}` : undefined,
                ].filter(Boolean).join(" · ")),
              ),
            ].filter((date): date is string => Boolean(date));
            const fullDetails: Array<[string, string[]]> = [
              [draftBranchesLabel, branchNames],
              [draftWarehouseLabel, warehouseDetails],
              [draftClientBaristasLabel, clientBaristaNames],
              [draftAcquisitionLabel, acquisitionDetails],
              [draftNotesLabel, notesDetails],
              [draftMachinesLabel, machineNames],
              [draftBaristasLabel, baristaNames],
              [draftContactsLabel, contactNames],
              [draftMaintenanceLabel, maintenanceDates],
            ];
            return (
              <article
                key={draft.id}
                className={`rounded-xl border p-4 transition-colors ${
                  currentDraftId === draft.id
                    ? "border-primary bg-primary/10"
                    : "border-hairline bg-cream-2/30 dark:bg-espresso-light/20"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="break-words text-base font-bold text-primary dark:text-white">{companyName}</h3>
                    <p className="mt-1 text-xs text-latte/70 stamp-id">{draft.id}</p>
                  </div>
                  {currentDraftId === draft.id && (
                    <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-xs font-semibold text-primary">
                      {draftDetailsLabel}
                    </span>
                  )}
                </div>

                <dl className="mt-3 grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs text-latte/70">{draftCompanyLabel}</dt>
                    <dd className="break-words text-latte">{companyName}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-latte/70">{draftEmailLabel}</dt>
                    <dd className="break-words text-latte" dir="ltr">{email}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-latte/70">{draftTaxLabel}</dt>
                    <dd className="break-words whitespace-normal text-latte">{taxNumber}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-latte/70">{draftLocationLabel}</dt>
                    <dd className="break-words text-latte">{location}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs text-latte/70">{draftMachineStatusTitle}</dt>
                    <dd className="break-words whitespace-normal text-latte">{machineStatus}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-latte/70">{draftStepLabel}</dt>
                    <dd className="text-latte">{draft.currentStep}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-latte/70">{draftUpdatedLabel}</dt>
                    <dd className="text-latte">{formatDraftDate(draft.timestamp, locale)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-latte/70">{draftBranchesLabel}</dt>
                    <dd className="text-latte">{branches}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-latte/70">{draftMachinesLabel}</dt>
                    <dd className="text-latte">{machines}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-latte/70">{draftBaristasLabel}</dt>
                    <dd className="text-latte">{baristas}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-latte/70">{draftContactsLabel}</dt>
                    <dd className="text-latte">{contacts}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-latte/70">{draftMaintenanceLabel}</dt>
                    <dd className="text-latte">{maintenance}</dd>
                  </div>
                </dl>

                <details className="mt-4 rounded-lg border border-hairline/60 bg-cream/40 dark:bg-espresso-light/20">
                  <summary className="flex min-h-[44px] cursor-pointer items-center px-3 py-2 text-sm font-semibold text-primary dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60">
                    {draftFullDetailsLabel}
                  </summary>
                  <div className="grid gap-3 border-t border-hairline/50 p-3 text-sm sm:grid-cols-2">
                    {fullDetails.map(([label, values]) => (
                      <div key={String(label)} className="min-w-0">
                        <h4 className="text-xs font-semibold text-latte/70">{label}</h4>
                        {values.length > 0 ? (
                          <ul className="mt-1 space-y-1 text-latte">
                            {values.map((value, index) => <li key={`${String(label)}-${index}`} className="break-words whitespace-normal">{value}</li>)}
                          </ul>
                        ) : (
                          <p className="mt-1 text-latte/60">{draftNoDetailsLabel}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onLoad(draft);
                    }}
                    className="btn-primary min-h-[44px] flex-1 sm:flex-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    {loadLabel}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      setIsOpen(false);
                      onDelete(e, draft.id);
                    }}
                    className="btn-danger min-h-[44px]"
                    aria-label={`${deleteLabel}: ${companyName}`}
                  >
                    <XMarkIcon className="h-4 w-4" aria-hidden="true" />
                    {deleteLabel}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </SafeModal>
    </>
  );
};

SidebarContent.displayName = 'SidebarContent';

export default SidebarContent;
