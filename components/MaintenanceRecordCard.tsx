import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useFloatingMenu } from "../hooks/useFloatingMenu";
import {
  MaintenanceRecord,
  Part,
  Service,
  PartRecord,
  ServiceRecord,
  Barista,
  ClientBarista,
} from "../types";
import CollapsibleCard from "./CollapsibleCard";
import TextInput from "./TextInput";
import RadioGroup from "./RadioGroup";
import CollapsibleSection from "./CollapsibleSection";
import ServiceSelector from "./ServiceSelector";
import PartsSelector from "./PartsSelector";
import CheckboxGroup from "./CheckboxGroup";
import {
  PlusCircleIcon,
  TrashIcon,
  UserPlusIcon,
  ExclamationCircleIcon,
  WrenchIcon,
  CalendarIcon,
  UserIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CheckCircleIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { StarRating, StarRatingDisplay } from "./form-ui/StarRating";
import { SafeModal } from "./form-ui/SafeModal";
// NEW: Context-aware suggestions based on reported problems
import { getSuggestedServices, getSuggestedParts } from "../utils/problemSuggestions";
import { generateUniqueId } from "../utils/idGenerator";
import { useVisitZones } from "../utils/visitZones";
import { useMergedCatalog } from "../hooks/useCustomCatalog";
import MachineLogisticsSection from "./MachineLogisticsSection";
import { useT } from "../utils/i18n";


interface MaintenanceRecordCardProps {
  record: MaintenanceRecord;
  onChange: (record: MaintenanceRecord) => void;
  onRemove: () => void;
  onAddNewId: (id: number) => void;

  partsList: Part[];
  servicesList: Service[];
  problemCategories: {
    title: string;
    options: { label: string; value: string }[];
  }[];
  allPredefinedProblems: string[];
  baristas?: Barista[];
  clientBaristas?: ClientBarista[];
  onAddBarista?: (name: string) => void;
  onAddClientBarista?: (name: string) => void;
  suggestedNames?: string[];

  newlyAddedId: number | null;
  isFollowUp?: boolean;
  customerId?: number | null;
}

// Levenshtein for Tooltip Logic
const levenshteinDistance = (a: string, b: string): number => {
  const matrix = [];
  let i, j;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  for (i = 0; i <= b.length; i++) matrix[i] = [i];
  for (j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1),
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

const getBestMatch = (input: string, options: string[]) => {
  if (!input || input.length < 3 || !options) return null;
  const lowerInput = input.toLowerCase().trim();
  let bestMatch = null;
  let bestScore = 0;

  options.forEach((opt) => {
    const lowerOpt = opt.toLowerCase();
    if (lowerOpt === lowerInput) return;

    const longer = lowerInput.length > lowerOpt.length ? lowerInput : lowerOpt;
    const similarity =
      (longer.length - levenshteinDistance(lowerInput, lowerOpt)) /
      parseFloat(longer.length.toString());

    if (similarity > 0.6 && similarity < 1 && similarity > bestScore) {
      bestScore = similarity;
      bestMatch = opt;
    }
  });
  return bestMatch;
};

export const getTodayDateString = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getNewMaintenanceRecord = (
  id: number,
  parentRecord?: MaintenanceRecord,
): MaintenanceRecord => ({
  id,
  maintenanceDate: getTodayDateString(),
  notes: "",
  type: parentRecord ? "requested" : "scheduled",
  isLogisticsVisit: parentRecord?.isLogisticsVisit ?? false,
  hadProblem: true,
  partsWereReplaced: false,
  problemSolved: false,
  partsReplaced: [],
  paidBy: parentRecord ? parentRecord.paidBy : "company",
  baristaName: parentRecord ? parentRecord.baristaName : "",
  clientBaristaName: "",
  visitRating: 0,
  recommendations: "",
  problems: [],
  visitZone: null,
  servicesPerformed: [],
  followUpVisits: [],
  machines: [],
  supervisors: [{ id: generateUniqueId(), name: "", phone: "" }],
  dailyLeaseCost: parentRecord?.dailyLeaseCost,
  nextVisitDate: "",
});

// Summary Component for Collapsed State
const MaintenanceSummary: React.FC<{ record: MaintenanceRecord }> = ({
  record,
}) => {
  const t = useT();
  const problemCount = record.problems?.length || 0;
  const serviceCount = record.servicesPerformed?.length || 0;
  const partsCount = record.partsReplaced?.length || 0;
  const hasFollowUps =
    record.followUpVisits && record.followUpVisits.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5 text-primary dark:text-latte">
        <CalendarIcon className="w-4 h-4" />
        <span>{record.maintenanceDate || t.ui.maintenanceEditor.noDate}</span>
      </div>

      {record.baristaName && (
        <div className="flex items-center gap-1.5 text-primary dark:text-latte">
          <UserIcon className="w-4 h-4" />
          <span className="truncate max-w-[120px]">{record.baristaName}</span>
        </div>
      )}

      {record.visitRating > 0 && (
        <StarRatingDisplay value={record.visitRating} size="xs" />
      )}

      <div className="flex items-center gap-2">
        {problemCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-ember-50 text-ember-700 dark:bg-ember-500/10 dark:text-ember-300">
            <ExclamationCircleIcon className="w-3 h-3 me-1" />
            {t.ui.maintenanceEditor.problemsCount.replace('{{count}}', String(problemCount))}
          </span>
        )}

        {serviceCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <WrenchIcon className="w-3 h-3 me-1" />
            {t.ui.maintenanceEditor.servicesCount.replace('{{count}}', String(serviceCount))}
          </span>
        )}

        {partsCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <CurrencyDollarIcon className="w-3 h-3 me-1" />
            {t.ui.maintenanceEditor.partsCount.replace('{{count}}', String(partsCount))}
          </span>
        )}

        {hasFollowUps && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <ClipboardDocumentListIcon className="w-3 h-3 me-1" />
            {t.ui.maintenanceEditor.followUpsCount.replace('{{count}}', String(record.followUpVisits?.length))}
          </span>
        )}

        {record.isLogisticsVisit && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-300/60 dark:border-amber-500/40">
            <TruckIcon className="w-3 h-3 me-1" />
            {t.ui.maintenanceEditor.logisticsVisit}
          </span>
        )}

        {record.problemSolved && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-leaf-50 text-leaf-700 dark:bg-leaf-500/10 dark:text-leaf-300">
            <CheckCircleIcon className="w-3 h-3 me-1" />
            {t.ui.maintenanceEditor.solved}
          </span>
        )}
      </div>
    </div>
  );
};

const MaintenanceRecordCard: React.FC<MaintenanceRecordCardProps> = (props) => {
  const t = useT();
  const {
    record,
    onChange,
    onRemove,
    onAddNewId,
    newlyAddedId,
    isFollowUp = false,
    baristas = [],
    clientBaristas = [],
    onAddBarista,
    onAddClientBarista,
    suggestedNames = [],
    customerId = null,
  } = props;

  const {
    parts: mergedPartsList,
    services: mergedServicesList,
    problemCategoriesWithCustoms,
    addItem,
  } = useMergedCatalog();
  const [typoSuggestion, setTypoSuggestion] = useState<string | null>(null);
  // Auto-triggered "did you mean…" popover. Controlled open because it's
  // driven by the fuzzy-match state rather than a click. Rendered through a
  // portal so CollapsibleCard's overflow-hidden can't clip it.
  const typoMenu = useFloatingMenu({
    controlledOpen: typoSuggestion !== null,
    onOpenChange: (open) => {
      if (!open) setTypoSuggestion(null);
    },
    menuWidth: 320, // full-width suggestions can be wide
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
  );
  const { zones } = useVisitZones();

  // Quick-add modal state (replaces prompt() — audit #54)
  const [quickAddModal, setQuickAddModal] = useState<{ type: 'barista' | 'clientBarista'; name: string } | null>(null);

  // NEW: Context-aware suggestions — compute relevant services/parts based on
  // the problems the technician reported for this record.
  const suggestedServices = useMemo(
    () => getSuggestedServices(record.problems || [], mergedServicesList),
    [record.problems, mergedServicesList],
  );
  const suggestedParts = useMemo(
    () => getSuggestedParts(record.problems || [], mergedPartsList),
    [record.problems, mergedPartsList],
  );

  useEffect(() => {
    if (baristas.length === 0 && record.baristaName) {
      const match = getBestMatch(record.baristaName, suggestedNames);
      setTypoSuggestion(match);
    } else {
      setTypoSuggestion(null);
    }
  }, [record.baristaName, baristas.length, suggestedNames]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleFieldChange = (
    e:
      | React.ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      | {
          target: {
            name: string;
            value: any;
            type?: string;
            checked?: boolean;
          };
        },
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const newValue = type === "checkbox" ? checked : value;

    let cleanValue = newValue;
    if (name === "baristaName" && typeof newValue === "string") {
      cleanValue = newValue.replace(/^\s+/, "");
    }

    let updatedRecord = { ...record, [name]: cleanValue };

    if (name === "hadProblem" && !checked) {
      updatedRecord = {
        ...updatedRecord,
        partsWereReplaced: false,
        problemSolved: false,
        partsReplaced: [],
        problems: [],
        followUpVisits: [],
      };
    }
    if (name === "isLogisticsVisit" && checked) {
      // Logistics visits carry no maintenance work data — only machine logistics.
      updatedRecord = {
        ...updatedRecord,
        hadProblem: false,
        partsWereReplaced: false,
        problemSolved: true,
        partsReplaced: [],
        problems: [],
        servicesPerformed: [],
        followUpVisits: [],
      };
    }
    if (name === "partsWereReplaced" && !checked) {
      updatedRecord = { ...updatedRecord, partsReplaced: [] };
    }

    if (name === "problemSolved" && checked) {
      updatedRecord.followUpVisits = [];
    }

    if (
      name === "paidBy" &&
      updatedRecord.followUpVisits &&
      updatedRecord.followUpVisits.length > 0
    ) {
      updatedRecord.followUpVisits = updatedRecord.followUpVisits.map(
        (followUp) => ({
          ...followUp,
          paidBy: newValue,
        }),
      );
    }

    onChange(updatedRecord);
  };

  const handleSubRecordChange = (
    subRecordIndex: number,
    updatedSubRecord: MaintenanceRecord,
  ) => {
    const newFollowUps = [...(record.followUpVisits || [])];
    newFollowUps[subRecordIndex] = updatedSubRecord;
    onChange({ ...record, followUpVisits: newFollowUps });
  };

  const handleAddFollowUp = () => {
    const newId = generateUniqueId();
    const newFollowUp = getNewMaintenanceRecord(newId, record);
    const newFollowUps = [...(record.followUpVisits || []), newFollowUp];
    onChange({ ...record, followUpVisits: newFollowUps });
    onAddNewId(newId);
  };

  const handleRemoveFollowUp = (subRecordIndex: number) => {
    const newFollowUps = (record.followUpVisits || []).filter(
      (_, i) => i !== subRecordIndex,
    );
    onChange({ ...record, followUpVisits: newFollowUps });
  };

  const handleAddMachine = () => {
    const newMachine = { id: generateUniqueId(), name: "", count: 1 };
    const newMachines = [...(record.machines || []), newMachine];
    onChange({ ...record, machines: newMachines });
  };

  const handleRemoveMachine = (index: number) => {
    const newMachines = (record.machines || []).filter((_, i) => i !== index);
    onChange({ ...record, machines: newMachines });
  };

  const handleMachineChange = (
    index: number,
    field: "name" | "count",
    value: string | number,
  ) => {
    const newMachines = [...(record.machines || [])];
    newMachines[index] = { ...newMachines[index], [field]: value };
    onChange({ ...record, machines: newMachines });
  };

  const handleAddSupervisor = () => {
    const newSupervisor = { id: generateUniqueId(), name: "", phone: "" };
    const newSupervisors = [...(record.supervisors || []), newSupervisor];
    onChange({ ...record, supervisors: newSupervisors });
  };

  const handleRemoveSupervisor = (index: number) => {
    const newSupervisors = (record.supervisors || []).filter(
      (_, i) => i !== index,
    );
    onChange({ ...record, supervisors: newSupervisors });
  };

  const handleSupervisorChange = (
    index: number,
    field: "name" | "phone",
    value: string,
  ) => {
    const newSupervisors = [...(record.supervisors || [])];
    newSupervisors[index] = { ...newSupervisors[index], [field]: value };
    onChange({ ...record, supervisors: newSupervisors });
  };

  const handleQuickAddBarista = () => {
    setQuickAddModal({ type: 'barista', name: '' });
  };

  const confirmQuickAdd = () => {
    if (!quickAddModal || !quickAddModal.name.trim()) return;
    const trimmedName = quickAddModal.name.trim();
    if (quickAddModal.type === 'barista' && onAddBarista) {
      onAddBarista(trimmedName);
      handleFieldChange({
        target: { name: "baristaName", value: trimmedName },
      } as any);
    } else if (quickAddModal.type === 'clientBarista' && onAddClientBarista) {
      onAddClientBarista(trimmedName);
    }
    setQuickAddModal(null);
  };

  const handleRatingChange = (rating: number) => {
    onChange({ ...record, visitRating: rating });
  };

  const applySuggestion = () => {
    if (typoSuggestion) {
      handleFieldChange({
        target: { name: "baristaName", value: typoSuggestion },
      } as any);
      setTypoSuggestion(null);
    }
  };

  const textAreaClasses =
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-white dark:bg-espresso text-primary dark:text-white rounded-lg placeholder-latte dark:placeholder-latte focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus:border-primary focus:ring-2 focus:ring-primary/20 border border-hairline dark:border-hairline shadow-sm";
  const selectClasses =
    "input-base px-4 py-3 sm:px-5 sm:py-4";

  return (
    <CollapsibleCard
      key={record.id}
      initiallyOpen={record.id === newlyAddedId}
      onRemove={onRemove}
      titleContent={<MaintenanceSummary record={record} />}
      className={record.isLogisticsVisit ? 'border-amber-500/60 bg-amber-50/40 dark:border-amber-500/40 dark:bg-amber-500/5' : ''}
    >
      <div className="space-y-6">
        {/* Basic Info Section */}
        <div className="bg-white dark:bg-espresso rounded-xl p-4 space-y-4 border border-hairline dark:border-hairline">
          <h4 className="text-sm font-semibold text-primary dark:text-cream flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {t.ui.maintenanceEditor.basicInfo}
          </h4>

          {/* Logistics visit toggle */}
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-hairline dark:border-hairline">
            <div className="flex items-center gap-2 min-w-0">
              <TruckIcon className={`w-5 h-5 shrink-0 ${record.isLogisticsVisit ? 'text-amber-500' : 'text-latte'}`} />
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${record.isLogisticsVisit ? 'text-amber-700 dark:text-amber-300' : 'text-primary dark:text-cream'}`}>
                  {t.ui.maintenanceEditor.logisticsVisit}
                </div>
                <div className="text-xs text-latte truncate">{t.ui.maintenanceEditor.logisticsVisitHint}</div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!record.isLogisticsVisit}
              onClick={() => handleFieldChange({ target: { name: "isLogisticsVisit", checked: !record.isLogisticsVisit, type: "checkbox" } } as any)}
              className={`relative w-12 h-7 rounded-full shrink-0 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${record.isLogisticsVisit ? 'bg-amber-500' : 'bg-cream-2 dark:bg-espresso-light border border-hairline dark:border-hairline'}`}
            >
              <span className={`absolute top-0.5 start-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform duration-200 ${record.isLogisticsVisit ? 'ltr:translate-x-5 rtl:-translate-x-5' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TextInput
              label={t.ui.maintenanceEditor.date}
              type="date"
              name="maintenanceDate"
              value={record.maintenanceDate}
              onChange={handleFieldChange}
            />
            {!record.isLogisticsVisit && (
              <TextInput
                label={t.ui.maintenanceEditor.nextVisit}
                type="date"
                name="nextVisitDate"
                value={record.nextVisitDate || ""}
                onChange={handleFieldChange}
              />
            )}

            {/* Staff Selector */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">
                {t.ui.maintenanceEditor.technician}
              </label>
              <div className="flex gap-2 relative">
                {baristas.length > 0 ? (
                  <select
                    name="baristaName"
                    value={record.baristaName}
                    onChange={handleFieldChange}
                    className={selectClasses}
                  >
                    <option value="">{t.ui.maintenanceEditor.selectTechnician}</option>
                    {baristas.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex-1 relative">
                    <input
                      ref={typoMenu.triggerRef as React.RefObject<HTMLInputElement>}
                      name="baristaName"
                      value={record.baristaName}
                      onChange={handleFieldChange}
                      className={`w-full ${selectClasses} ${typoSuggestion ? "ring-2 ring-amber-400 border-amber-400" : ""}`}
                      placeholder={t.ui.maintenanceEditor.technicianNamePlaceholder}
                    />
                    {typoSuggestion && createPortal(
                      <button
                        ref={typoMenu.contentRef as React.RefObject<HTMLButtonElement>}
                        type="button"
                        className="fixed z-[9999] text-end bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 rounded-md p-2 shadow-lg flex items-center gap-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors animate-content-fade-in"
                        style={typoMenu.style}
                        onClick={applySuggestion}
                      >
                        <ExclamationCircleIcon className="w-5 h-5 text-amber-600" />
                        <span className="text-xs text-amber-800 dark:text-amber-100">
                          {t.ui.maintenanceEditor.didYouMean}{" "}
                          <span className="font-bold underline">
                            {typoSuggestion}
                          </span>
                          {t.ui.maintenanceEditor.questionMark}
                        </span>
                      </button>,
                      document.body
                    )}
                  </div>
                )}
                {onAddBarista && (
                  <button
                    type="button"
                    onClick={handleQuickAddBarista}
                    className="btn-primary px-3 shrink-0 rounded-lg"
                    title={t.ui.maintenanceEditor.addTechnician}
                    aria-label={t.ui.maintenanceEditor.addTechnician}
                  >
                    <UserPlusIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Client Barista Selector - unified responsive */}
            {!record.isLogisticsVisit && (
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">
                {t.ui.maintenanceEditor.clientBarista}
              </label>
              <div className="flex gap-2 relative">
                {clientBaristas.length > 0 ? (
                  <select
                    name="clientBaristaName"
                    value={record.clientBaristaName || ""}
                    onChange={handleFieldChange}
                    className={selectClasses}
                  >
                    <option value="">{t.ui.maintenanceEditor.selectClientBarista}</option>
                    {clientBaristas.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name="clientBaristaName"
                    value={record.clientBaristaName || ""}
                    onChange={handleFieldChange}
                    className={selectClasses}
                    placeholder={t.ui.maintenanceEditor.clientBaristaNamePlaceholder}
                  />
                )}
                {onAddClientBarista && (
                  <button
                    type="button"
                    onClick={() => setQuickAddModal({ type: 'clientBarista', name: '' })}
                    className="px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm active:scale-95 shrink-0"
                    title={t.ui.maintenanceEditor.addClientBarista}
                    aria-label={t.ui.maintenanceEditor.addClientBarista}
                  >
                    <UserPlusIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
            )}

            {/* Rating */}
            {!record.isLogisticsVisit && (
            <StarRating
              value={record.visitRating || 0}
              onChange={handleRatingChange}
              size="sm"
              label={t.ui.maintenanceEditor.performanceRating}
              showNA
              showNumeric
            />
            )}
          </div>

          {!record.isLogisticsVisit && (
          <RadioGroup
            label={t.ui.maintenanceEditor.visitZoneWithFees}
            name={`visitZone-${record.id}`}
            value={record.visitZone}
            onChange={(val) =>
              handleFieldChange({
                target: { name: "visitZone", value: val },
              } as any)
            }
            options={zones.map((z) => ({
              label: `${z.label} (${z.fee.toLocaleString()} جم)`,
              value: z.key,
            }))}
            inline
          />
          )}
        </div>

        {/* Problem Section */}
        {!record.isLogisticsVisit && (
        <div className="bg-white dark:bg-espresso rounded-xl p-4 space-y-4 border border-ember-500/30 dark:border-ember-500/30">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-primary dark:text-cream flex items-center gap-2">
              <WrenchIcon className="w-4 h-4 text-ember-500" />
              {t.ui.maintenanceEditor.problemAndServices}
            </h4>
            <div className="flex items-center gap-x-3">
              <input
                id={`hadProblem-${record.id}`}
                type="checkbox"
                name="hadProblem"
                checked={record.hadProblem}
                onChange={handleFieldChange}
                className="h-4 w-4 rounded border-hairline dark:border-hairline text-ember-700 focus:ring-ember-500"
              />
              <label
                htmlFor={`hadProblem-${record.id}`}
                className="font-medium text-primary dark:text-cream"
              >
                {t.ui.maintenanceEditor.wasThereAProblem}
              </label>
            </div>
          </div>

          {record.hadProblem && (
            <div className="space-y-4">
              <CollapsibleSection title={t.ui.maintenanceEditor.detectedProblems}>
                <CheckboxGroup
                  categories={problemCategoriesWithCustoms}
                  selectedValues={record.problems || []}
                  onChange={(selected) =>
                    handleFieldChange({
                      target: { name: "problems", value: selected },
                    } as any)
                  }
                  predefinedProblems={props.allPredefinedProblems}
                  onAddCustom={(item) => addItem({ ...item, type: 'problem' })}
                  existingCategories={problemCategoriesWithCustoms.map((c) => c.title)}
                />
              </CollapsibleSection>

              <CollapsibleSection title={t.ui.maintenanceEditor.servicesProvided}>
                <ServiceSelector
                  options={mergedServicesList}
                  selectedValues={record.servicesPerformed || []}
                  onChange={(selected) =>
                    handleFieldChange({
                      target: { name: "servicesPerformed", value: selected },
                    } as any)
                  }
                  suggestedValues={suggestedServices}
                  onAddCustom={(item) => addItem({ ...item, type: 'service' })}
                  existingCategories={Array.from(new Set(mergedServicesList.map((s) => s.category)))}
                />
              </CollapsibleSection>

              <div className="flex items-center gap-x-3 pt-2">
                <input
                  id={`partsWereReplaced-${record.id}`}
                  name="partsWereReplaced"
                  type="checkbox"
                  checked={record.partsWereReplaced}
                  onChange={handleFieldChange}
                  className="h-4 w-4 rounded border-hairline dark:border-hairline text-amber-600 focus:ring-amber-600"
                />
                <label
                  htmlFor={`partsWereReplaced-${record.id}`}
                  className="font-medium text-primary dark:text-cream"
                >
                  {t.ui.maintenanceEditor.werePartsReplaced}
                </label>
              </div>

              {record.partsWereReplaced && (
                <div className="ltr:pe-6 rtl:ps-6 ltr:ps-2 rtl:pe-2 space-y-4">
                  <CollapsibleSection title={t.ui.maintenanceEditor.replacedParts}>
                    <PartsSelector
                      options={mergedPartsList}
                      selectedValues={record.partsReplaced || []}
                      onChange={(selected) =>
                        handleFieldChange({
                          target: { name: "partsReplaced", value: selected },
                        } as any)
                      }
                      suggestedValues={suggestedParts}
                      onAddCustom={(item) => addItem({ ...item, type: 'part' })}
                      existingCategories={[]}
                    />
                  </CollapsibleSection>
                </div>
              )}

              <div className="flex items-center gap-x-3 pt-2">
                <input
                  id={`problemSolved-${record.id}`}
                  name="problemSolved"
                  type="checkbox"
                  checked={record.problemSolved}
                  onChange={handleFieldChange}
                  className="h-4 w-4 rounded border-hairline dark:border-hairline text-leaf-600 focus:ring-leaf-500"
                />
                <label
                  htmlFor={`problemSolved-${record.id}`}
                  className="font-medium text-primary dark:text-cream"
                >
                  {t.ui.maintenanceEditor.wasProblemSolved}
                </label>
              </div>

              {/* Follow-up Section */}
              {!record.problemSolved && !isFollowUp && (
                <div className="pt-4 border-t border-hairline dark:border-hairline">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-primary dark:text-cream flex items-center gap-2">
                      <ClipboardDocumentListIcon className="w-4 h-4 text-primary" />
                      {t.ui.maintenanceEditor.followUpVisits}
                    </h4>
                    <span className="text-sm text-latte">
                      {t.ui.maintenanceEditor.visitCount.replace('{{count}}', String((record.followUpVisits || []).length))}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(record.followUpVisits || []).map((followUp, index) => (
                      <MaintenanceRecordCard
                        key={followUp.id}
                        record={followUp}
                        onChange={(updated) =>
                          handleSubRecordChange(index, updated)
                        }
                        onRemove={() => handleRemoveFollowUp(index)}
                        onAddNewId={onAddNewId}
                        isFollowUp={true}
                        partsList={props.partsList}
                        servicesList={props.servicesList}
                        problemCategories={props.problemCategories}
                        allPredefinedProblems={props.allPredefinedProblems}
                        newlyAddedId={newlyAddedId}
                        baristas={baristas}
                        onAddBarista={onAddBarista}
                        suggestedNames={suggestedNames}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddFollowUp}
                    className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500 transition-colors transform active:scale-95"
                  >
                    <PlusCircleIcon className="w-5 h-5" />
                    {t.ui.maintenanceEditor.addFollowUpVisit}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        )}

        {/* Type & Payment Section */}
        {!record.isLogisticsVisit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-hairline dark:border-hairline">
          <RadioGroup
            name={`type-${record.id}`}
            label={t.ui.maintenanceEditor.type}
            value={record.type}
            onChange={(val) =>
              handleFieldChange({ target: { name: "type", value: val } } as any)
            }
            options={[
              { label: t.ui.maintenanceEditor.requested, value: "requested" },
              { label: t.ui.maintenanceEditor.scheduled, value: "scheduled" },
            ]}
          />
          <RadioGroup
            name={`paidBy-${record.id}`}
            label={t.ui.maintenanceEditor.paidBy}
            value={record.paidBy}
            onChange={(val) =>
              handleFieldChange({
                target: { name: "paidBy", value: val },
              } as any)
            }
            options={[
              { label: t.ui.maintenanceEditor.midosLabel, value: "company" },
              { label: t.ui.maintenanceEditor.companyLabel, value: "client" },
            ]}
          />
          <TextInput
            label={t.ui.maintenanceEditor.dailyLeaseCost}
            type="number"
            name="dailyLeaseCost"
            value={record.dailyLeaseCost || ""}
            onChange={handleFieldChange}
            placeholder="0.00"
          />
        </div>
        )}

        {/* Machines Section */}
        {!record.isLogisticsVisit && (
        <div className="pt-4 border-t border-hairline dark:border-hairline">
          <CollapsibleSection title={t.ui.maintenanceEditor.maintainedMachines}>
            <div className="space-y-3">
              {(record.machines || []).map((machine, index) => (
                <div key={machine.id} className="flex ltr:items-start rtl:items-end gap-2">
                  <div className="grid grid-cols-4 gap-2 w-full">
                    <TextInput
                      placeholder={t.ui.maintenanceEditor.machineNamePlaceholder}
                      value={machine.name}
                      onChange={(e) =>
                        handleMachineChange(index, "name", e.target.value)
                      }
                      className="col-span-3"
                    />
                    <TextInput
                      type="number"
                      min="1"
                      placeholder={t.ui.maintenanceEditor.quantity}
                      value={machine.count}
                      onChange={(e) =>
                        handleMachineChange(
                          index,
                          "count",
                          parseInt(e.target.value) || 1,
                        )
                      }
                      className="col-span-1"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveMachine(index)}
                    className="mt-3 p-2 text-latte hover:text-ember-500 dark:hover:text-ember-300 rounded-full hover:bg-ember-500/20 dark:hover:bg-ember-500/20 transition-colors transform active:scale-95"
                    aria-label={t.ui.maintenanceEditor.removeMachine}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddMachine}
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-primary hover:text-primary dark:hover:text-leaf-500 transition-colors transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" />
                {t.ui.maintenanceEditor.addMachine}
              </button>
            </div>
          </CollapsibleSection>
        </div>
        )}

        {/* Supervisors Section */}
        {!record.isLogisticsVisit && (
        <div className="pt-4 border-t border-hairline dark:border-hairline">
          <CollapsibleSection title={t.ui.maintenanceEditor.supervisorDetails}>
            <div className="space-y-4">
              {(record.supervisors || []).map((supervisor, index) => (
                <div
                  key={supervisor.id}
                  className="p-3 border border-hairline dark:border-hairline rounded-md bg-white dark:bg-espresso flex gap-3 ltr:items-start rtl:items-end"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                      label={t.ui.maintenanceEditor.supervisorNameLabel}
                      value={supervisor.name}
                      onChange={(e) =>
                        handleSupervisorChange(index, "name", e.target.value)
                      }
                    />
                    <TextInput
                      label={t.ui.maintenanceEditor.supervisorPhoneLabel}
                      value={supervisor.phone}
                      onChange={(e) =>
                        handleSupervisorChange(index, "phone", e.target.value)
                      }
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveSupervisor(index)}
                    className="p-1.5 mt-2 shrink-0 text-latte hover:text-ember-500 dark:hover:text-ember-300 rounded-full hover:bg-ember-500/20 dark:hover:bg-ember-500/20 transition-colors transform active:scale-95"
                    aria-label={t.ui.maintenanceEditor.removeSupervisor}
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddSupervisor}
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-primary hover:text-primary dark:hover:text-leaf-500 transition-colors transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" />
                {t.ui.maintenanceEditor.addSupervisor}
              </button>
            </div>
          </CollapsibleSection>
        </div>
        )}

        {/* Machine Logistics Section — always visible */}
        <div className="pt-4 border-t border-hairline dark:border-hairline">
          <CollapsibleSection title={t.ui.maintenanceEditor.machineLogistics}>
            <MachineLogisticsSection
              customerId={customerId}
              recordId={typeof record.id === 'number' ? record.id : undefined as any}
              maintenanceDate={record.maintenanceDate}
            />
          </CollapsibleSection>
        </div>

        {/* Notes Section */}
        {!record.isLogisticsVisit && (
        <div className="pt-4 border-t border-hairline dark:border-hairline">
          <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">
            {t.ui.maintenanceEditor.notesOptional}
          </label>
          <textarea
            name="notes"
            value={record.notes || ""}
            onChange={handleFieldChange}
            rows={2}
            className={textAreaClasses}
          />
        </div>
        )}
      </div>

      {/* Quick-add modal (replaces prompt() — audit #54) */}
      <SafeModal
        isOpen={quickAddModal !== null}
        onClose={() => setQuickAddModal(null)}
        title={quickAddModal?.type === 'barista' ? t.ui.maintenanceEditor.addTechnician : t.ui.maintenanceEditor.addClientBarista}
      >
        <div className="space-y-4">
          <TextInput
            label={t.ui.maintenanceEditor.name}
            name="quickAddName"
            value={quickAddModal?.name || ''}
            onChange={(e) => setQuickAddModal(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder={quickAddModal?.type === 'barista' ? t.ui.maintenanceEditor.technicianNamePlaceholder : t.ui.maintenanceEditor.clientBaristaNamePlaceholder}
            autoFocus
          />
          <div className="flex ltr:justify-end rtl:justify-start gap-3">
            <button
              type="button"
              onClick={() => setQuickAddModal(null)}
              className="px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"
            >
              {t.ui.maintenanceEditor.cancel}
            </button>
            <button
              type="button"
              onClick={confirmQuickAdd}
              disabled={!quickAddModal?.name.trim()}
              className="btn-primary px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {t.ui.maintenanceEditor.add}
            </button>
          </div>
        </div>
      </SafeModal>
    </CollapsibleCard>
  );
};

export default MaintenanceRecordCard;
