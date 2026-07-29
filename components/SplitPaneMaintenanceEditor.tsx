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
import MaintenanceRecordEditor from './MaintenanceRecordEditor';
import { useAutoSave } from './forms/hooks/useAutoSave';
import { AutoSaveIndicator } from './form-ui/AutoSaveIndicator';

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

  // Auto-save the entire records list so add/remove/reorder changes are
  // persisted to localStorage (the embedded MaintenanceRecordEditor already
  // has its own per-record auto-save for in-progress edits).
  const autoSave = useAutoSave(
    'split-pane-maintenance-records',
    records,
    { debounceMs: 30000 }
  );

  const selectedRecord = records[selectedRecordIndex];

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
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                  Visit #{selectedRecordIndex + 1}
                </span>
                <span
                  className={`text-sm px-3 py-1 rounded-full ${getStatusColor(selectedRecord)}`}
                >
                  {getStatusText(selectedRecord)}
                </span>
                <AutoSaveIndicator
                  isSaving={autoSave.isSaving}
                  lastSaved={autoSave.lastSaved}
                  hasUnsavedChanges={autoSave.hasUnsavedChanges}
                  variant="compact"
                />
              </div>

              <button
                onClick={() => handleRemoveRecord(selectedRecordIndex)}
                className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors min-h-[44px]"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
            </div>

            <MaintenanceRecordEditor
              record={selectedRecord}
              onSave={handleUpdateRecord}
              onCancel={() => {}}
              partsList={partsList}
              servicesList={servicesList}
              problemCategories={problemCategories}
              allPredefinedProblems={allPredefinedProblems}
              baristas={baristas}
              isEmbedded
            />
          </div>
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
