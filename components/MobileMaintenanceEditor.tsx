import React, { useState } from "react";
import { MaintenanceRecord, Part, Service, Barista } from "../types";
import BottomSheet from "./BottomSheet";
import {
  CalendarIcon,
  UserIcon,
  WrenchIcon,
  CheckCircleIcon,
  PlusIcon,
  ChevronRightIcon,
  BeakerIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import {
  maintenanceTemplates,
  applyTemplate,
  getSuggestedTemplates,
} from "../utils/maintenanceTemplates";

interface MobileMaintenanceEditorProps {
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
}

const MobileMaintenanceEditor: React.FC<MobileMaintenanceEditorProps> = ({
  records,
  onChange,
  partsList,
  servicesList,
  problemCategories,
  allPredefinedProblems,
  baristas = [],
}) => {
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(
    null,
  );
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<
    "basic" | "problems" | "parts" | "services"
  >("basic");

  const selectedRecord =
    selectedRecordIndex !== null ? records[selectedRecordIndex] : null;

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
  };

  const handleUpdateRecord = (updatedRecord: MaintenanceRecord) => {
    if (selectedRecordIndex === null) return;
    const newRecords = [...records];
    newRecords[selectedRecordIndex] = updatedRecord;
    onChange(newRecords);
  };

  const handleOpenEditor = (index: number) => {
    setSelectedRecordIndex(index);
    setIsEditorOpen(true);
    setActiveSection("basic");
  };

  const handleApplyTemplate = (templateId: string) => {
    if (selectedRecordIndex === null) return;
    const templateValues = applyTemplate(
      templateId,
      records[selectedRecordIndex],
    );
    handleUpdateRecord({ ...records[selectedRecordIndex], ...templateValues });
    setIsTemplateSelectorOpen(false);
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
    <div className="space-y-4">
      {/* Record List */}
      <div className="space-y-3">
        {records.map((record, index) => (
          <button
            key={record.id}
            onClick={() => handleOpenEditor(index)}
            className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {record.maintenanceDate || "No Date"}
                  </span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(record)}`}
                  >
                    {getStatusText(record)}
                  </span>
                </div>

                {record.baristaName && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {record.baristaName}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  {record.problems?.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {record.problems.length} problems
                    </span>
                  )}
                  {record.servicesPerformed?.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {record.servicesPerformed.length} services
                    </span>
                  )}
                </div>
              </div>

              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            </div>
          </button>
        ))}
      </div>

      {/* Add Button */}
      <button
        onClick={handleAddRecord}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform"
      >
        <PlusIcon className="w-5 h-5" />
        Add Maintenance Visit
      </button>

      {/* Mobile Editor Bottom Sheet */}
      <BottomSheet
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={
          selectedRecord ? `Visit #${selectedRecordIndex! + 1}` : "Edit Visit"
        }
        maxHeight="90vh"
      >
        {selectedRecord && (
          <div className="p-4 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setIsTemplateSelectorOpen(true)}
                className="flex items-center gap-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium whitespace-nowrap"
              >
                <SparklesIcon className="w-4 h-4" />
                Templates
              </button>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
              {(["basic", "problems", "parts", "services"] as const).map(
                (section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      activeSection === section
                        ? "bg-white dark:bg-slate-600 text-teal-600 dark:text-teal-400 shadow-sm"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </button>
                ),
              )}
            </div>

            {/* Section Content */}
            <div className="space-y-4">
              {activeSection === "basic" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedRecord.maintenanceDate}
                      onChange={(e) =>
                        handleUpdateRecord({
                          ...selectedRecord,
                          maintenanceDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Staff
                    </label>
                    <select
                      value={selectedRecord.baristaName}
                      onChange={(e) =>
                        handleUpdateRecord({
                          ...selectedRecord,
                          baristaName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-3 bg-slate-100 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg"
                    >
                      <option value="">Select Staff</option>
                      {baristas.map((b) => (
                        <option key={b.id} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
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
                        className="w-5 h-5 rounded border-slate-300"
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
                        className="w-5 h-5 rounded border-slate-300"
                      />
                      <span className="text-slate-700 dark:text-slate-300">
                        Solved
                      </span>
                    </label>
                  </div>
                </>
              )}

              {activeSection === "problems" && selectedRecord.hadProblem && (
                <div className="space-y-3">
                  {problemCategories.map((category) => (
                    <div
                      key={category.title}
                      className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3"
                    >
                      <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">
                        {category.title}
                      </h4>
                      <div className="space-y-2">
                        {category.options.map((option) => (
                          <label
                            key={option.value}
                            className="flex items-center gap-2"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRecord.problems?.includes(
                                option.value,
                              )}
                              onChange={(e) => {
                                const newProblems = e.target.checked
                                  ? [
                                      ...(selectedRecord.problems || []),
                                      option.value,
                                    ]
                                  : (selectedRecord.problems || []).filter(
                                      (p) => p !== option.value,
                                    );
                                handleUpdateRecord({
                                  ...selectedRecord,
                                  problems: newProblems,
                                });
                              }}
                              className="w-4 h-4 rounded"
                            />
                            <span className="text-sm text-slate-600 dark:text-slate-400">
                              {option.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeSection === "parts" && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedRecord.partsWereReplaced}
                      onChange={(e) =>
                        handleUpdateRecord({
                          ...selectedRecord,
                          partsWereReplaced: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Parts Were Replaced
                    </span>
                  </label>

                  {selectedRecord.partsWereReplaced && (
                    <div className="grid grid-cols-2 gap-2">
                      {partsList.map((part) => (
                        <button
                          key={part.value}
                          onClick={() => {
                            const isSelected =
                              selectedRecord.partsReplaced?.some(
                                (p) => p.partId === part.value,
                              );
                            const newParts = isSelected
                              ? selectedRecord.partsReplaced?.filter(
                                  (p) => p.partId !== part.value,
                                )
                              : [
                                  ...(selectedRecord.partsReplaced || []),
                                  {
                                    partId: part.value,
                                    partName: part.label,
                                    quantity: 1,
                                    unitCost: part.cost,
                                  },
                                ];
                            handleUpdateRecord({
                              ...selectedRecord,
                              partsReplaced: newParts,
                            });
                          }}
                          className={`p-3 rounded-lg border text-left transition-colors ${
                            selectedRecord.partsReplaced?.some(
                              (p) => p.partId === part.value,
                            )
                              ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                              : "border-slate-200 dark:border-slate-600"
                          }`}
                        >
                          <span className="block font-medium text-sm">
                            {part.label}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {part.cost} EGP
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeSection === "services" && (
                <div className="space-y-3">
                  {servicesList.map((service) => (
                    <button
                      key={service.value}
                      onClick={() => {
                        const isSelected =
                          selectedRecord.servicesPerformed?.some(
                            (s) => s.serviceId === service.value,
                          );
                        const newServices = isSelected
                          ? selectedRecord.servicesPerformed?.filter(
                              (s) => s.serviceId !== service.value,
                            )
                          : [
                              ...(selectedRecord.servicesPerformed || []),
                              {
                                serviceId: service.value,
                                serviceName: service.label,
                                quantity: 1,
                                unitCost: service.cost,
                              },
                            ];
                        handleUpdateRecord({
                          ...selectedRecord,
                          servicesPerformed: newServices,
                        });
                      }}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        selectedRecord.servicesPerformed?.some(
                          (s) => s.serviceId === service.value,
                        )
                          ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                          : "border-slate-200 dark:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">
                          {service.label}
                        </span>
                        <span className="text-sm text-slate-500">
                          {service.cost} EGP
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-xs text-slate-400 mt-1">
                          {service.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Template Selector */}
      <BottomSheet
        isOpen={isTemplateSelectorOpen}
        onClose={() => setIsTemplateSelectorOpen(false)}
        title="اختر القالب"
      >
        <div className="p-4 space-y-3">
          {maintenanceTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => handleApplyTemplate(template.id)}
              className="w-full p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-left active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                  <WrenchIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    {template.name}
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {template.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};

export default MobileMaintenanceEditor;
