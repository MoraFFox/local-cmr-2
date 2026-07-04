import React, { useState, useEffect } from "react";
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
  ChevronDownIcon,
  ChevronUpIcon,
  WrenchIcon,
  CalendarIcon,
  UserIcon,
  StarIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

const visitZoneFees: Record<"cairo" | "outside_cairo" | "el_sahel", number> = {
  cairo: 500,
  outside_cairo: 1500,
  el_sahel: 4000,
};

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
  supervisors: [{ id: Date.now(), name: "", phone: "" }],
  dailyLeaseCost: parentRecord?.dailyLeaseCost,
  nextVisitDate: "",
});

// Summary Component for Collapsed State
const MaintenanceSummary: React.FC<{ record: MaintenanceRecord }> = ({
  record,
}) => {
  const problemCount = record.problems?.length || 0;
  const serviceCount = record.servicesPerformed?.length || 0;
  const partsCount = record.partsReplaced?.length || 0;
  const hasFollowUps =
    record.followUpVisits && record.followUpVisits.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
        <CalendarIcon className="w-4 h-4" />
        <span>{record.maintenanceDate || "No date"}</span>
      </div>

      {record.baristaName && (
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <UserIcon className="w-4 h-4" />
          <span className="truncate max-w-[120px]">{record.baristaName}</span>
        </div>
      )}

      {record.visitRating > 0 && (
        <div className="flex items-center gap-0.5">
          <StarIconSolid className="w-4 h-4 text-yellow-400" />
          <span className="text-slate-600 dark:text-slate-400">
            {record.visitRating}/5
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        {problemCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <ExclamationCircleIcon className="w-3 h-3 mr-1" />
            {problemCount} Problems
          </span>
        )}

        {serviceCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <WrenchIcon className="w-3 h-3 mr-1" />
            {serviceCount} Services
          </span>
        )}

        {partsCount > 0 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
            <CurrencyDollarIcon className="w-3 h-3 mr-1" />
            {partsCount} Parts
          </span>
        )}

        {hasFollowUps && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            <ClipboardDocumentListIcon className="w-3 h-3 mr-1" />
            {record.followUpVisits?.length} Follow-ups
          </span>
        )}

        {record.problemSolved && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Solved
          </span>
        )}
      </div>
    </div>
  );
};

const MaintenanceRecordCard: React.FC<MaintenanceRecordCardProps> = (props) => {
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
  } = props;
  const [typoSuggestion, setTypoSuggestion] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(),
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
    const newId = Date.now();
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
    const newMachine = { id: Date.now(), name: "", count: 1 };
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
    const newSupervisor = { id: Date.now(), name: "", phone: "" };
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
    const name = prompt("Enter new staff member name:");
    if (name && name.trim()) {
      const trimmedName = name.trim();
      if (onAddBarista) {
        onAddBarista(trimmedName);
        handleFieldChange({
          target: { name: "baristaName", value: trimmedName },
        } as any);
      }
    }
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
    "block w-full px-5 py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 border border-slate-200 dark:border-slate-600 shadow-sm";
  const selectClasses =
    "block w-full px-4 py-3 sm:px-5 sm:py-4 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-400/20 border border-slate-200 dark:border-slate-600 shadow-sm";

  return (
    <CollapsibleCard
      key={record.id}
      initiallyOpen={record.id === newlyAddedId}
      onRemove={onRemove}
      titleContent={<MaintenanceSummary record={record} />}
    >
      <div className="space-y-6">
        {/* Basic Info Section */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            Basic Information
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <TextInput
              label="التاريخ"
              type="date"
              name="maintenanceDate"
              value={record.maintenanceDate}
              onChange={handleFieldChange}
            />
            <TextInput
              label="الزيارة القادمة"
              type="date"
              name="nextVisitDate"
              value={record.nextVisitDate || ""}
              onChange={handleFieldChange}
            />

            {/* Barista Selector & Rating */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                My Staff
              </label>
              <div className="flex gap-2 relative">
                {baristas.length > 0 ? (
                  <select
                    name="baristaName"
                    value={record.baristaName}
                    onChange={handleFieldChange}
                    className={`flex-1 ${selectClasses}`}
                  >
                    <option value="">-- Select Staff --</option>
                    {baristas.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex-1 relative">
                    <input
                      name="baristaName"
                      value={record.baristaName}
                      onChange={handleFieldChange}
                      className={`w-full ${selectClasses} ${typoSuggestion ? "ring-2 ring-amber-400 border-amber-400" : ""}`}
                      placeholder="اسم الموظف"
                    />
                    {typoSuggestion && (
                      <div
                        className="absolute left-0 top-full mt-1 z-10 w-full bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700 rounded-md p-2 shadow-lg flex items-center gap-2 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors animate-content-fade-in"
                        onClick={applySuggestion}
                      >
                        <ExclamationCircleIcon className="w-5 h-5 text-amber-600" />
                        <div className="text-xs text-amber-800 dark:text-amber-100">
                          Did you mean:{" "}
                          <span className="font-bold underline">
                            {typoSuggestion}
                          </span>
                          ?
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {onAddBarista && (
                  <button
                    type="button"
                    onClick={handleQuickAddBarista}
                    className="px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm active:scale-95"
                    title="إضافة موظف جديد"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Client Barista Performance
              </label>
              <div className="flex items-center gap-1 h-full bg-slate-100 dark:bg-slate-700 rounded-lg px-4 border border-slate-200 dark:border-slate-600">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingChange(star)}
                    className="focus:outline-none transform active:scale-110 transition-transform"
                  >
                    {star <= (record.visitRating || 0) ? (
                      <StarIconSolid className="w-6 h-6 text-yellow-400" />
                    ) : (
                      <StarIcon className="w-6 h-6 text-slate-400" />
                    )}
                  </button>
                ))}
                <span className="text-xs text-slate-500 ml-2 font-semibold">
                  {(record.visitRating || 0) > 0
                    ? `${record.visitRating}/5`
                    : "Rate"}
                </span>
              </div>
            </div>

            <div className="flex flex-col md:hidden">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Client Barista
              </label>
              <div className="flex gap-2 relative">
                {clientBaristas.length > 0 ? (
                  <select
                    name="clientBaristaName"
                    value={record.clientBaristaName || ""}
                    onChange={handleFieldChange}
                    className={`flex-1 ${selectClasses}`}
                  >
                    <option value="">-- Select Client Barista --</option>
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
                    className={`flex-1 ${selectClasses}`}
                    placeholder="اسم باريستا العميل"
                  />
                )}
                {onAddClientBarista && (
                  <button
                    type="button"
                    onClick={() => {
                      const name = window.prompt("Enter client barista name:");
                      if (name && onAddClientBarista) onAddClientBarista(name);
                    }}
                    className="px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm active:scale-95"
                    title="إضافة باريستا عميل جديد"
                  >
                    <UserPlusIcon className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="hidden md:flex flex-col">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Client Barista
            </label>
            <div className="flex gap-2 relative">
              {clientBaristas.length > 0 ? (
                <select
                  name="clientBaristaName"
                  value={record.clientBaristaName || ""}
                  onChange={handleFieldChange}
                  className="flex-1"
                  style={selectClasses}
                >
                  <option value="">-- Select Client Barista --</option>
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
                  className={`flex-1 ${selectClasses}`}
                  placeholder="اسم باريستا العميل"
                />
              )}
              {onAddClientBarista && (
                <button
                  type="button"
                  onClick={() => {
                    const name = window.prompt("Enter client barista name:");
                    if (name && onAddClientBarista) onAddClientBarista(name);
                  }}
                  className="px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors flex items-center justify-center shadow-sm active:scale-95"
                  title="إضافة باريستا عميل جديد"
                >
                  <UserPlusIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <RadioGroup
            label="منطقة الزيارة (رسوم الانتقال)"
            name={`visitZone-${record.id}`}
            value={record.visitZone}
            onChange={(val) =>
              handleFieldChange({
                target: { name: "visitZone", value: val },
              } as any)
            }
            options={[
              {
                label: `القاهرة الكبرى (${visitZoneFees.cairo} جم)`,
                value: "cairo",
              },
              {
                label: `خارج القاهرة (${visitZoneFees.outside_cairo} جم)`,
                value: "outside_cairo",
              },
              {
                label: `الساحل الشمالي (${visitZoneFees.el_sahel} جم)`,
                value: "el_sahel",
              },
            ]}
            inline
          />
        </div>

        {/* Problem Section */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <WrenchIcon className="w-4 h-4" />
              Problem & Services
            </h4>
            <div className="flex items-center gap-x-3">
              <input
                id={`hadProblem-${record.id}`}
                type="checkbox"
                name="hadProblem"
                checked={record.hadProblem}
                onChange={handleFieldChange}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-600"
              />
              <label
                htmlFor={`hadProblem-${record.id}`}
                className="font-medium text-slate-800 dark:text-slate-200"
              >
                Was there a problem?
              </label>
            </div>
          </div>

          {record.hadProblem && (
            <div className="space-y-4">
              <CollapsibleSection title="المشاكل المكتشفة">
                <CheckboxGroup
                  categories={props.problemCategories}
                  selectedValues={record.problems || []}
                  onChange={(selected) =>
                    handleFieldChange({
                      target: { name: "problems", value: selected },
                    } as any)
                  }
                  predefinedProblems={props.allPredefinedProblems}
                />
              </CollapsibleSection>

              <CollapsibleSection title="الخدمات المُقدمة">
                <ServiceSelector
                  options={props.servicesList}
                  selectedValues={record.servicesPerformed || []}
                  onChange={(selected) =>
                    handleFieldChange({
                      target: { name: "servicesPerformed", value: selected },
                    } as any)
                  }
                />
              </CollapsibleSection>

              <div className="flex items-center gap-x-3 pt-2">
                <input
                  id={`partsWereReplaced-${record.id}`}
                  name="partsWereReplaced"
                  type="checkbox"
                  checked={record.partsWereReplaced}
                  onChange={handleFieldChange}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-600"
                />
                <label
                  htmlFor={`partsWereReplaced-${record.id}`}
                  className="font-medium text-slate-800 dark:text-slate-200"
                >
                  Were parts changed?
                </label>
              </div>

              {record.partsWereReplaced && (
                <div className="pl-6 space-y-4">
                  <CollapsibleSection title="القطع المستبدلة">
                    <PartsSelector
                      options={props.partsList}
                      selectedValues={record.partsReplaced || []}
                      onChange={(selected) =>
                        handleFieldChange({
                          target: { name: "partsReplaced", value: selected },
                        } as any)
                      }
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
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-teal-600 focus:ring-teal-600"
                />
                <label
                  htmlFor={`problemSolved-${record.id}`}
                  className="font-medium text-slate-800 dark:text-slate-200"
                >
                  Is the problem solved?
                </label>
              </div>

              {/* Follow-up Section */}
              {!record.problemSolved && !isFollowUp && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                      Follow-up Visits
                    </h4>
                    <span className="text-sm text-slate-500">
                      {(record.followUpVisits || []).length} visits
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
                    Add Follow-up Visit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Type & Payment Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t dark:border-slate-700">
          <RadioGroup
            name={`type-${record.id}`}
            label="النوع"
            value={record.type}
            onChange={(val) =>
              handleFieldChange({ target: { name: "type", value: val } } as any)
            }
            options={[
              { label: "Requested", value: "requested" },
              { label: "Scheduled", value: "scheduled" },
            ]}
          />
          <RadioGroup
            name={`paidBy-${record.id}`}
            label="الدفع بواسطة"
            value={record.paidBy}
            onChange={(val) =>
              handleFieldChange({
                target: { name: "paidBy", value: val },
              } as any)
            }
            options={[
              { label: "Mido's", value: "company" },
              { label: "الشركة", value: "client" },
            ]}
          />
          <TextInput
            label="تكلفة الإيجار اليومي (ج.م)"
            type="number"
            name="dailyLeaseCost"
            value={record.dailyLeaseCost || ""}
            onChange={handleFieldChange}
            placeholder="0.00"
          />
        </div>

        {/* Machines Section */}
        <div className="pt-4 border-t dark:border-slate-700">
          <CollapsibleSection title="الماكينات التي تمت صيانتها">
            <div className="space-y-3">
              {(record.machines || []).map((machine, index) => (
                <div key={machine.id} className="flex items-start gap-2">
                  <div className="grid grid-cols-4 gap-2 w-full">
                    <TextInput
                      placeholder="اسم/رقم الماكينة"
                      value={machine.name}
                      onChange={(e) =>
                        handleMachineChange(index, "name", e.target.value)
                      }
                      className="col-span-3"
                    />
                    <TextInput
                      type="number"
                      min="1"
                      placeholder="الكمية"
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
                    className="mt-3 p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors transform active:scale-95"
                    aria-label="إزالة الماكينة"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddMachine}
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-500 transition-colors transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Add Machine
              </button>
            </div>
          </CollapsibleSection>
        </div>

        {/* Supervisors Section */}
        <div className="pt-4 border-t dark:border-slate-700">
          <CollapsibleSection title="بيانات المشرف">
            <div className="space-y-4">
              {(record.supervisors || []).map((supervisor, index) => (
                <div
                  key={supervisor.id}
                  className="p-3 border dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-800/40 relative"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TextInput
                      label="اسم المشرف"
                      value={supervisor.name}
                      onChange={(e) =>
                        handleSupervisorChange(index, "name", e.target.value)
                      }
                    />
                    <TextInput
                      label="رقم هاتف المشرف"
                      value={supervisor.phone}
                      onChange={(e) =>
                        handleSupervisorChange(index, "phone", e.target.value)
                      }
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveSupervisor(index)}
                    className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-full hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors transform active:scale-95"
                    aria-label="إزالة المشرف"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddSupervisor}
                className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-500 transition-colors transform active:scale-95"
              >
                <PlusCircleIcon className="w-5 h-5" />
                Add Supervisor
              </button>
            </div>
          </CollapsibleSection>
        </div>

        {/* Notes Section */}
        <div className="pt-4 border-t dark:border-slate-700">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Optional Notes
          </label>
          <textarea
            name="notes"
            value={record.notes || ""}
            onChange={handleFieldChange}
            rows={2}
            className={textAreaClasses}
          />
        </div>
      </div>
    </CollapsibleCard>
  );
};

export default MaintenanceRecordCard;
