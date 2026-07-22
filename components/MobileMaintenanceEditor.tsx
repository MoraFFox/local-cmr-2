import React, { useState, useCallback, useRef } from "react";
import { MaintenanceRecord, Part, Service, Barista } from "../types";
import BottomSheet from "./BottomSheet";
import { useAutoSave } from './forms/hooks/useAutoSave';
import { useSectionJump } from '../hooks/useSectionJump';
import { useFormValidation } from './forms/hooks/useFormValidation';
import { AutoSaveIndicator } from './form-ui/AutoSaveIndicator';
import { ValidationSummary } from './form-ui/ValidationSummary';
import { DateInputWithPresets } from './form-ui/EnhancedInput';
import { RequiredFieldBadge } from '@/packages/form-progress';
import Stepper, { StepperStep } from './ui/Stepper';
import { WrenchIcon, PlusIcon, ChevronRightIcon, ChevronLeftIcon, SparklesIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { maintenanceTemplates, applyTemplate } from "../utils/maintenanceTemplates";
import { useT } from "../utils/i18n";
import { useToast } from "./ToastContext";

const STEPPER_STEPS: StepperStep[] = [
  { id: 1, name: 'المعلومات الأساسية' },
  { id: 2, name: 'المشاكل' },
  { id: 3, name: 'القطع' },
  { id: 4, name: 'الخدمات' },
];

const STEP_SECTION_IDS = ['basic', 'problems', 'parts', 'services'];
const SECTION_TO_STEP: Record<string, number> = { basic: 1, problems: 2, parts: 3, services: 4 };

interface MobileMaintenanceEditorProps {
  records: MaintenanceRecord[];
  onChange: (records: MaintenanceRecord[]) => void;
  partsList: Part[];
  servicesList: Service[];
  problemCategories: { title: string; options: { label: string; value: string }[] }[];
  allPredefinedProblems: string[];
  baristas?: Barista[];
}

const MobileMaintenanceEditor: React.FC<MobileMaintenanceEditorProps> = ({
  records, onChange, partsList, servicesList,
  problemCategories, allPredefinedProblems, baristas = [],
}) => {
  const t = useT();
  const { showToast } = useToast();
  const [selectedRecordIndex, setSelectedRecordIndex] = useState<number | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const sectionContentRef = useRef<HTMLDivElement>(null);

  const selectedRecord = selectedRecordIndex !== null ? records[selectedRecordIndex] : null;

  const { highlightedSection, jumpToSection, jumpToFieldError, jumpToFirstError } = useSectionJump({
    isTabbed: true,
    scrollContainerRef: sectionContentRef,
    fieldSectionMapping: {
      maintenanceDate: 'basic', baristaName: 'basic', hadProblem: 'basic', problemSolved: 'basic',
      problems: 'problems',
      partsWereReplaced: 'parts', partsReplaced: 'parts',
      servicesPerformed: 'services',
    },
    onExpandSection: (sectionId) => { const step = SECTION_TO_STEP[sectionId]; if (step) setCurrentStep(step); },
    storageKey: selectedRecord ? `mobile-maintenance-record-${selectedRecord.id}-last-section` : undefined,
  });

  const autoSave = useAutoSave(
    selectedRecord ? `mobile-maintenance-record-${selectedRecord.id}` : '',
    selectedRecord, { debounceMs: 30000, enabled: !!selectedRecord }
  );

  const validation = useFormValidation(
    selectedRecord,
    { maintenanceDate: { required: true }, baristaName: { required: true, minLength: 2 } },
    { mode: 'onBlur', showSummary: true, validateOnMount: false }
  );

  const handleAddRecord = () => {
    const newRecord: MaintenanceRecord = {
      id: Date.now(), maintenanceDate: new Date().toISOString().split("T")[0],
      notes: "", type: "scheduled", hadProblem: false, partsWereReplaced: false,
      problemSolved: false, partsReplaced: [], paidBy: "company", baristaName: "",
      visitRating: 0, recommendations: "", problems: [], visitZone: null,
      servicesPerformed: [], followUpVisits: [], machines: [], supervisors: [],
      dailyLeaseCost: undefined, nextVisitDate: "",
    };
    onChange([...records, newRecord]);
  };

  const handleUpdateRecord = (updatedRecord: MaintenanceRecord) => {
    if (selectedRecordIndex === null) return;
    const newRecords = [...records];
    newRecords[selectedRecordIndex] = updatedRecord;
    onChange(newRecords);
    if (validation.errors) {
      Object.keys(validation.errors).forEach(key => {
        if (updatedRecord[key as keyof MaintenanceRecord] !== selectedRecord![key as keyof MaintenanceRecord]) {
          validation.clearError(key);
        }
      });
    }
  };

  const handleOpenEditor = (index: number) => {
    setSelectedRecordIndex(index);
    setIsEditorOpen(true);
    setCurrentStep(1);
  };

  // Shared validation error handler — shows toast + auto-jumps to first error
  const showValidationErrors = useCallback((errors: Record<string, string>) => {
    showToast('يرجى تصحيح الأخطاء قبل الحفظ', 'error');
    const { field } = jumpToFirstError(errors);
    if (!field) validation.focusNextError();
  }, [showToast, jumpToFirstError, validation.focusNextError]);

  // Validate on submit: auto-jump to first error on failure, save and close on success
  const handleSubmit = useCallback(() => {
    if (!selectedRecord) return;
    validation.handleSubmit(
      () => { setIsEditorOpen(false); },
      showValidationErrors
    )();
  }, [selectedRecord, validation.handleSubmit, showValidationErrors]);

  // Save current record and immediately create a new empty one for the next visit
  const handleSubmitAndAddAnother = useCallback(() => {
    if (!selectedRecord || selectedRecordIndex === null) return;
    validation.handleSubmit(
      () => {
        const newRecord: MaintenanceRecord = {
          id: Date.now(), maintenanceDate: new Date().toISOString().split("T")[0],
          notes: "", type: "scheduled", hadProblem: false, partsWereReplaced: false,
          problemSolved: false, partsReplaced: [], paidBy: "company", baristaName: "",
          visitRating: 0, recommendations: "", problems: [], visitZone: null,
          servicesPerformed: [], followUpVisits: [], machines: [], supervisors: [],
          dailyLeaseCost: undefined, nextVisitDate: "",
        };
        onChange([...records, newRecord]);
        setSelectedRecordIndex(records.length);
        setCurrentStep(1);
        showToast('تم الحفظ وإضافة سجل جديد', 'success');
      },
      showValidationErrors
    )();
  }, [selectedRecord, selectedRecordIndex, records, onChange, validation.handleSubmit, showValidationErrors, showToast]);

  const handleApplyTemplate = (templateId: string) => {
    if (selectedRecordIndex === null) return;
    const templateValues = applyTemplate(templateId, records[selectedRecordIndex]);
    handleUpdateRecord({ ...records[selectedRecordIndex], ...templateValues });
    setIsTemplateSelectorOpen(false);
  };

  const getStatusColor = (record: MaintenanceRecord) => {
    if (record.problemSolved) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (record.hadProblem) return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  };

  const getStatusText = (record: MaintenanceRecord) => {
    if (record.problemSolved) return t.ui.mobileMaintenanceEditor.solved;
    if (record.hadProblem) return t.ui.mobileMaintenanceEditor.hasIssues;
    return t.ui.mobileMaintenanceEditor.normal;
  };

  return (
    <div className="space-y-4">
      {selectedRecord && (
        <AutoSaveIndicator isSaving={autoSave.isSaving} lastSaved={autoSave.lastSaved} hasUnsavedChanges={autoSave.hasUnsavedChanges} onSaveNow={autoSave.saveNow} variant="compact" />
      )}
      {selectedRecord && validation.hasErrors && (
        <ValidationSummary errors={validation.allErrors} onJumpToError={(fieldName) => jumpToFieldError(fieldName)} title={t.ui.mobileMaintenanceEditor.validationTitle} />
      )}

      {/* Record List */}
      <div className="space-y-3">
        {records.map((record, index) => (
          <button key={record.id} onClick={() => handleOpenEditor(index)} className="w-full bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-700 text-left active:scale-[0.98] transition-transform">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-slate-900 dark:text-white">{record.maintenanceDate || t.ui.mobileMaintenanceEditor.noDate}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(record)}`}>{getStatusText(record)}</span>
                </div>
                {record.baristaName && <p className="text-sm text-slate-500 dark:text-slate-400">{record.baristaName}</p>}
                <div className="flex flex-wrap gap-2 mt-2">
                  {record.problems?.length > 0 && <span className="text-xs text-slate-500">{record.problems.length} {t.ui.mobileMaintenanceEditor.problems}</span>}
                  {record.servicesPerformed?.length > 0 && <span className="text-xs text-slate-500">{record.servicesPerformed.length} {t.ui.mobileMaintenanceEditor.services}</span>}
                </div>
              </div>
              <ChevronRightIcon className="w-5 h-5 text-slate-400" />
            </div>
          </button>
        ))}
      </div>

      <button onClick={handleAddRecord} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 text-white rounded-xl font-medium active:scale-[0.98] transition-transform">
        <PlusIcon className="w-5 h-5" />{t.ui.mobileMaintenanceEditor.addMaintenanceVisit}
      </button>

      {/* Mobile Editor Bottom Sheet */}
      <BottomSheet isOpen={isEditorOpen} onClose={() => setIsEditorOpen(false)} hasUnsavedChanges={autoSave.hasUnsavedChanges}
        title={selectedRecord ? `${t.ui.mobileMaintenanceEditor.visit} #${selectedRecordIndex! + 1}` : t.ui.mobileMaintenanceEditor.editVisit} maxHeight="90vh">
        {selectedRecord && (
          <div className="p-4 space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button onClick={() => setIsTemplateSelectorOpen(true)} className="flex items-center gap-1 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium whitespace-nowrap">
                <SparklesIcon className="w-4 h-4" />{t.ui.mobileMaintenanceEditor.templates}
              </button>
            </div>

            {/* Stepper */}
            <Stepper steps={STEPPER_STEPS} currentStep={currentStep} onChange={setCurrentStep} layout="horizontal" />

            {/* Section Content */}
            <div ref={sectionContentRef} data-testid="section-content" className={`space-y-4 ${highlightedSection === STEP_SECTION_IDS[currentStep - 1] ? 'animate-section-jump-highlight' : ''}`}>
              {currentStep === 1 && (
                <>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.ui.mobileMaintenanceEditor.date}<RequiredFieldBadge /></label>
                    <DateInputWithPresets name="maintenanceDate" value={selectedRecord.maintenanceDate}
                      onChange={(date) => { handleUpdateRecord({ ...selectedRecord, maintenanceDate: date }); validation.clearError('maintenanceDate'); }}
                      error={validation.errors.maintenanceDate} />
                    {validation.errors.maintenanceDate && <p className="mt-1 text-sm text-ember-600">{validation.errors.maintenanceDate}</p>}
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.ui.mobileMaintenanceEditor.staff}<RequiredFieldBadge /></label>
                    <select name="baristaName" value={selectedRecord.baristaName} onChange={(e) => handleUpdateRecord({ ...selectedRecord, baristaName: e.target.value })}
                      className={`w-full px-3 py-3 bg-slate-100 dark:bg-slate-700 border rounded-lg ${validation.errors.baristaName ? 'border-ember-500' : 'border-slate-300 dark:border-slate-600'}`}>
                      <option value="">{t.ui.mobileMaintenanceEditor.selectStaff}</option>
                      {baristas.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                    {validation.errors.baristaName && <p className="mt-1 text-sm text-ember-600">{validation.errors.baristaName}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedRecord.hadProblem} onChange={(e) => handleUpdateRecord({ ...selectedRecord, hadProblem: e.target.checked })} className="w-5 h-5 rounded border-slate-300" />
                      <span className="text-slate-700 dark:text-slate-300">{t.ui.mobileMaintenanceEditor.hadProblem}</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={selectedRecord.problemSolved} onChange={(e) => handleUpdateRecord({ ...selectedRecord, problemSolved: e.target.checked })} className="w-5 h-5 rounded border-slate-300" />
                      <span className="text-slate-700 dark:text-slate-300">{t.ui.mobileMaintenanceEditor.solved}</span>
                    </label>
                  </div>
                </>
              )}

              {currentStep === 2 && selectedRecord.hadProblem && (
                <div className="space-y-3">
                  {problemCategories.map((category) => (
                    <div key={category.title} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                      <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">{category.title}</h4>
                      <div className="space-y-2">
                        {category.options.map((option) => (
                          <label key={option.value} className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedRecord.problems?.includes(option.value)}
                              onChange={(e) => {
                                const newProblems = e.target.checked
                                  ? [...(selectedRecord.problems || []), option.value]
                                  : (selectedRecord.problems || []).filter((p) => p !== option.value);
                                handleUpdateRecord({ ...selectedRecord, problems: newProblems });
                              }} className="w-4 h-4 rounded" />
                            <span className="text-sm text-slate-600 dark:text-slate-400">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {currentStep === 2 && !selectedRecord.hadProblem && (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">لم يتم الإبلاغ عن أي مشاكل</div>
              )}

              {currentStep === 3 && (
                <div className="space-y-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" data-testid="parts-were-replaced" checked={selectedRecord.partsWereReplaced}
                      onChange={(e) => handleUpdateRecord({ ...selectedRecord, partsWereReplaced: e.target.checked })} className="w-5 h-5 rounded" />
                    <span className="text-slate-700 dark:text-slate-300">{t.ui.mobileMaintenanceEditor.partsWereReplaced}</span>
                  </label>
                  {selectedRecord.partsWereReplaced && (
                    <div className="grid grid-cols-2 gap-2">
                      {partsList.map((part) => (
                        <button key={part.value} onClick={() => {
                          const isSelected = selectedRecord.partsReplaced?.some((p) => p.name === part.label);
                          const newParts = isSelected
                            ? selectedRecord.partsReplaced?.filter((p) => p.name !== part.label)
                            : [...(selectedRecord.partsReplaced || []), { name: part.label, count: 1, cost: part.cost }];
                          handleUpdateRecord({ ...selectedRecord, partsReplaced: newParts });
                        }} className={`p-3 rounded-lg border text-left transition-colors ${selectedRecord.partsReplaced?.some((p) => p.name === part.label) ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-slate-200 dark:border-slate-600"}`}>
                          <span className="block font-medium text-sm">{part.label}</span>
                          <span className="block text-xs text-slate-500">{part.cost} EGP</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-3">
                  {servicesList.map((service) => (
                    <button key={service.value} onClick={() => {
                      const isSelected = selectedRecord.servicesPerformed?.some((s) => s.name === service.label);
                      const newServices = isSelected
                        ? selectedRecord.servicesPerformed?.filter((s) => s.name !== service.label)
                        : [...(selectedRecord.servicesPerformed || []), { name: service.label, count: 1, cost: service.cost }];
                      handleUpdateRecord({ ...selectedRecord, servicesPerformed: newServices });
                    }} className={`w-full p-3 rounded-lg border text-left transition-colors ${selectedRecord.servicesPerformed?.some((s) => s.name === service.label) ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20" : "border-slate-200 dark:border-slate-600"}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{service.label}</span>
                        <span className="text-sm text-slate-500">{service.cost} EGP</span>
                      </div>
                      {service.description && <p className="text-xs text-slate-400 mt-1">{service.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step Navigation */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <button type="button" onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))} disabled={currentStep === 1}
                className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${currentStep === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-teal-600'}`}>
                <ChevronRightIcon className="w-3.5 h-3.5" />السابق
              </button>
              <span className="text-xs text-slate-400">{currentStep} / 4</span>
              {currentStep === 4 ? (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={handleSubmitAndAddAnother}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 dark:bg-teal-900/20 border border-teal-300 dark:border-teal-700 hover:bg-teal-100 dark:hover:bg-teal-900/40 rounded-lg transition-colors">
                    <PlusIcon className="w-3.5 h-3.5" />حفظ وإضافة
                  </button>
                  <button type="button" onClick={handleSubmit}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors">
                    <CheckCircleIcon className="w-4 h-4" />تم
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setCurrentStep(prev => Math.min(prev + 1, 4))}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors text-slate-600 hover:text-teal-600">
                  التالي<ChevronLeftIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Template Selector */}
      <BottomSheet isOpen={isTemplateSelectorOpen} onClose={() => setIsTemplateSelectorOpen(false)} title="اختر القالب">
        <div className="p-4 space-y-3">
          {maintenanceTemplates.map((template) => (
            <button key={template.id} onClick={() => handleApplyTemplate(template.id)} className="w-full p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl text-left active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg"><WrenchIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" /></div>
                <div><h4 className="font-semibold text-slate-900 dark:text-white">{template.name}</h4><p className="text-sm text-slate-500 dark:text-slate-400">{template.description}</p></div>
              </div>
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
};

export default MobileMaintenanceEditor;
