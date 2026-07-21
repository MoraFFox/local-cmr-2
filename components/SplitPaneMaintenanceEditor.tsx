import React, { useState, useEffect } from "react";
import { MaintenanceRecord, Part, Service, Barista } from "../types";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  UserIcon,
  WrenchIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  TrashIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
// NEW: Import auto-save and validation hooks
import { useAutoSave } from './forms/hooks/useAutoSave';
import { useFormValidation } from './forms/hooks/useFormValidation';
// NEW: Import UI components
import { AutoSaveIndicator } from './form-ui/AutoSaveIndicator';
import { ValidationSummary } from './form-ui/ValidationSummary';
import { RequiredFieldBadge } from './form-ui/RequiredFieldBadge';
import { DatePresetButtons } from './form-ui/EnhancedInput';

interface SplitPaneMaintenanceEditorProps {
  records: MaintenanceRecord[];
  onChange: (records: MaintenanceRecord[]) => void;
  partsList: Part[];
  servicesList: Service[];
  problemCategories: {
    title: string;
    options: { label: string; value: string }[];
  }[];
  allPredefinedProblems: string[];
  baristas?: Barista[];
  onAddBarista?: (name: string) => void;
  suggestedNames?: string[];
}

const SplitPaneMaintenanceEditor: React.FC<SplitPaneMaintenanceEditorProps> = ({
  records,
  onChange,
  partsList,
  servicesList,
  problemCategories,
  allPredefinedProblems,
  baristas = [],
  onAddBarista,
  suggestedNames = [],
}) => {
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number>(0);
  const [isPaneOpen, setIsPaneOpen] = useState<boolean>(true);

  const selectedRecord = records[selectedRecordIndex];

  // NEW: Auto-save hook - saves form automatically after each change
  const autoSave = useAutoSave(
    `splitpane-maintenance-record-${selectedRecord?.id || 'new'}`,
    selectedRecord || ({} as MaintenanceRecord),
    {
      debounceMs: 30000, // 30 seconds
      onSave: (data) => {
        // Auto-save to localStorage only
        // Actual save happens via onChange callback
      },
      onSaveError: (error) => {
        console.error('Auto-save failed:', error);
      },
      enabled: !!selectedRecord
    }
  );

  // NEW: Validation hook with rules
  const validation = useFormValidation(
    selectedRecord || ({} as MaintenanceRecord),
    {
      maintenanceDate: { required: true },
      baristaName: { required: true, minLength: 2 }
    },
    {
      mode: 'onBlur',
      showSummary: true,
      validateOnMount: false
    }
  );

  const handleRecordSelect = (index: number) => {
    setSelectedRecordIndex(index);
  };

  const handleUpdateRecord = (updatedRecord: MaintenanceRecord) => {
    const newRecords = [...records];
    newRecords[selectedRecordIndex] = updatedRecord;
    onChange(newRecords);
  };

  const handleAddRecord = () => {
    const newId = Date.now();
    const newRecord: MaintenanceRecord = {
      id: newId,
      maintenanceDate: new Date().toISOString().split("T")[0],
      notes: "",
      type: "scheduled",
      hadProblem: false,
      partsWereReplaced: false,
      problemSolved: false,
      partsReplaced: [],
      paidBy: "company",
      baristaName: "",
      visitRating: 0,
      recommendations: "",
      problems: [],
      visitZone: null,
      servicesPerformed: [],
      followUpVisits: [],
      machines: [],
      supervisors: [],
      dailyLeaseCost: undefined,
      nextVisitDate: "",
    };
    onChange([...records, newRecord]);
    setSelectedRecordIndex(records.length);
  };

  const handleRemoveRecord = (index: number) => {
    const newRecords = records.filter((_, i) => i !== index);
    onChange(newRecords);
    if (selectedRecordIndex >= newRecords.length) {
      setSelectedRecordIndex(Math.max(0, newRecords.length - 1));
    }
  };

  const handleMoveRecord = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index > 0) {
      const newRecords = [...records];
      [newRecords[index], newRecords[index - 1]] = [
        newRecords[index - 1],
        newRecords[index],
      ];
      onChange(newRecords);
      setSelectedRecordIndex(index - 1);
    } else if (direction === "down" && index < records.length - 1) {
      const newRecords = [...records];
      [newRecords[index], newRecords[index + 1]] = [
        newRecords[index + 1],
        newRecords[index],
      ];
      onChange(newRecords);
      setSelectedRecordIndex(index + 1);
    }
  };

  const getStatusColor = (record: MaintenanceRecord) => {
    if (record.problemSolved)
      return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (record.hadProblem)
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const getStatusText = (record: MaintenanceRecord) => {
    if (record.problemSolved) return "Solved";
    if (record.hadProblem) return "Has Issues";
    return "Normal";
  };

  return (
    <div className="flex h-[600px] bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* Left Pane - Record List */}
      <div
        className={`${isPaneOpen ? "w-80" : "w-12"} flex flex-col border-r border-slate-200 dark:border-slate-700 transition-all duration-300`}
      >
        {/* Pane Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
          {isPaneOpen && (
            <>
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Visits ({records.length})
              </span>
              <button
                onClick={() => setIsPaneOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
            </>
          )}
          {!isPaneOpen && (
            <button
              onClick={() => setIsPaneOpen(true)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 mx-auto"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {isPaneOpen && (
          <>
            {/* Add Button */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-700">
              <button
                onClick={handleAddRecord}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Add Visit
              </button>
            </div>

            {/* Record List */}
            <div className="flex-1 overflow-y-auto">
              {records.map((record, index) => (
                <div
                  key={record.id}
                  onClick={() => handleRecordSelect(index)}
                  className={`p-3 border-b border-slate-100 dark:border-slate-700 cursor-pointer transition-colors ${
                    selectedRecordIndex === index
                      ? "bg-teal-50 dark:bg-teal-900/20 border-l-4 border-l-teal-500"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700/50 border-l-4 border-l-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {record.maintenanceDate || "No Date"}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(record)}`}
                        >
                          {getStatusText(record)}
                        </span>
                      </div>

                      {record.baristaName && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                          {record.baristaName}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        {record.problems?.length > 0 && (
                          <span>{record.problems.length} problems</span>
                        )}
                        {record.servicesPerformed?.length > 0 && (
                          <span>
                            {record.servicesPerformed.length} services
                          </span>
                        )}
                        {record.followUpVisits?.length > 0 && (
                          <span>{record.followUpVisits.length} follow-ups</span>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col gap-1 ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveRecord(index, "up");
                        }}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ArrowUpIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveRecord(index, "down");
                        }}
                        disabled={index === records.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                      >
                        <ArrowDownIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Right Pane - Record Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedRecord ? (
          <>
            {/* Editor Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                    Visit #{selectedRecordIndex + 1}
                  </span>
                  <span
                    className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedRecord)}`}
                  >
                    {getStatusText(selectedRecord)}
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveRecord(selectedRecordIndex)}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </button>
              </div>

              {/* NEW: Auto-save indicator */}
              <AutoSaveIndicator
                isSaving={autoSave.isSaving}
                lastSaved={autoSave.lastSaved}
                hasUnsavedChanges={autoSave.hasUnsavedChanges}
                onSaveNow={autoSave.saveNow}
                variant="full"
              />

              {/* NEW: Validation summary (shows when there are errors) */}
              {validation.hasErrors && (
                <ValidationSummary
                  errors={validation.allErrors}
                  onJumpToError={(fieldName) => {
                    const element = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
                    element?.focus();
                    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  title="Please fix the following errors before saving"
                />
              )}
            </div>

            {/* Editor Content - Placeholder for actual form */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <p className="text-amber-800 dark:text-amber-200 text-sm">
                  <strong>Split-Pane Editor Active</strong>
                  <br />
                  This is the split-pane editing interface. The full editing
                  form would be rendered here with all the maintenance record
                  fields. This provides a timeline view on the left and detailed
                  editing on the right.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date
                      <RequiredFieldBadge />
                    </label>
                    {/* Quick-select presets (audit issue #13) */}
                    <DatePresetButtons
                      value={selectedRecord.maintenanceDate}
                      onChange={(date) => {
                        handleUpdateRecord({
                          ...selectedRecord,
                          maintenanceDate: date,
                        });
                        validation.touchField('maintenanceDate');
                      }}
                      variant="slate"
                      className="mb-2"
                    />
                    <input
                      type="date"
                      name="maintenanceDate"
                      value={selectedRecord.maintenanceDate}
                      onChange={(e) => {
                        handleUpdateRecord({
                          ...selectedRecord,
                          maintenanceDate: e.target.value,
                        });
                        validation.touchField('maintenanceDate');
                      }}
                      className={`w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border rounded-lg ${
                        validation.errors.maintenanceDate
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    />
                    {validation.errors.maintenanceDate && (
                      <p className="mt-1 text-sm text-red-600">{validation.errors.maintenanceDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Staff
                      <RequiredFieldBadge />
                    </label>
                    <select
                      name="baristaName"
                      value={selectedRecord.baristaName}
                      onChange={(e) => {
                        handleUpdateRecord({
                          ...selectedRecord,
                          baristaName: e.target.value,
                        });
                        validation.touchField('baristaName');
                      }}
                      className={`w-full px-3 py-2 bg-slate-100 dark:bg-slate-700 border rounded-lg ${
                        validation.errors.baristaName
                          ? 'border-red-500 focus:ring-red-500'
                          : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      <option value="">Select Staff</option>
                      {baristas.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                    {validation.errors.baristaName && (
                      <p className="mt-1 text-sm text-red-600">{validation.errors.baristaName}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRecord.hadProblem}
                      onChange={(e) =>
                        handleUpdateRecord({
                          ...selectedRecord,
                          hadProblem: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Had Problem
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRecord.problemSolved}
                      onChange={(e) =>
                        handleUpdateRecord({
                          ...selectedRecord,
                          problemSolved: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Problem Solved
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <ClipboardIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">
                Select a visit from the list to edit
              </p>
              <button
                onClick={handleAddRecord}
                className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Add First Visit
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Icon component for empty state
const ClipboardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
    />
  </svg>
);

export default SplitPaneMaintenanceEditor;
