import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MaintenanceRecord, Part, Service, Barista, ClientBarista, MaintenancePhoto } from '../types';
import {
  CalendarIcon, UserIcon, MapPinIcon, CheckCircleIcon, XCircleIcon,
  WrenchIcon, CurrencyDollarIcon, ChevronRightIcon, ChevronLeftIcon,
  DocumentTextIcon, BeakerIcon, ExclamationCircleIcon,
  ClipboardDocumentListIcon, PlusCircleIcon, CameraIcon,
  XMarkIcon, ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import RadioGroup from './RadioGroup';
import ServiceSelector from './ServiceSelector';
import PartsSelector from './PartsSelector';
import CheckboxGroup from './CheckboxGroup';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastContext';
import { compressImage, validateImageFile } from '../utils/imageCompression';
import { logger } from '../utils/logger';
import { ConfirmDialog } from './ui/ConfirmDialog';
import Stepper, { StepperStep } from './ui/Stepper';
import { useAutoSave } from './forms/hooks/useAutoSave';
import { useFormValidation } from './forms/hooks/useFormValidation';
import { AutoSaveIndicator } from './form-ui/AutoSaveIndicator';
import { ValidationSummary } from './form-ui/ValidationSummary';
import { DatePresetButtons } from './form-ui/EnhancedInput';
import { StarRating } from './form-ui/StarRating';
import { RequiredFieldBadge } from '@/packages/form-progress';
import { getSuggestedServices, getSuggestedParts } from '../utils/problemSuggestions';
import { useT } from '../utils/i18n';
import { generateUniqueId } from '../utils/idGenerator';
import { formatEgyptianPhone } from '../utils/phone';
import { useSectionJump } from '../hooks/useSectionJump';
import { useVisitZones } from '../utils/visitZones';
import VisitZoneManager from './VisitZoneManager';

interface MaintenanceRecordEditorProps {
  record: MaintenanceRecord;
  onSave: (record: MaintenanceRecord) => void;
  onCancel: () => void;
  partsList: Part[];
  servicesList: Service[];
  problemCategories: { title: string; options: { label: string; value: string }[] }[];
  allPredefinedProblems: string[];
  baristas?: Barista[];
  clientBaristas?: ClientBarista[];
  lastVisitDate?: Date | null;
  averageDays?: number | null;
  isSidebarExpanded?: boolean;
}

const STEP_TO_SECTION: Record<number, string> = { 1: 'basic', 2: 'problems', 3: 'services', 4: 'parts', 5: 'payment', 6: 'supervisor', 7: 'notes', 8: 'photos' };
const SECTION_TO_STEP: Record<string, number> = { basic: 1, problems: 2, services: 3, parts: 4, payment: 5, supervisor: 6, notes: 7, photos: 8 };

const STEPPER_STEPS: StepperStep[] = [
  { id: 1, name: 'المعلومات الأساسية' },
  { id: 2, name: 'المشاكل' },
  { id: 3, name: 'الخدمات المنفذة' },
  { id: 4, name: 'القطع المستبدلة' },
  { id: 5, name: 'الدفع' },
  { id: 6, name: 'بيانات المشرف' },
  { id: 7, name: 'ملاحظات وتوصيات' },
  { id: 8, name: 'صور قبل وبعد' },
];

const MaintenanceRecordEditor: React.FC<MaintenanceRecordEditorProps> = ({
  record, onSave, onCancel, partsList, servicesList,
  problemCategories, allPredefinedProblems,
  baristas = [], clientBaristas = [],
  lastVisitDate, averageDays, isSidebarExpanded = false
}) => {
  const { showToast } = useToast();
  const t = useT();
  const { zones } = useVisitZones();
  const [isZoneManagerOpen, setIsZoneManagerOpen] = useState(false);
  const [editedRecord, setEditedRecord] = useState<MaintenanceRecord>(record);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [confirmPhotoDelete, setConfirmPhotoDelete] = useState<{ isOpen: boolean; url: string; category: string } | null>(null);

  const { highlightedSection, jumpToSection, jumpToFirstError } = useSectionJump({
    fieldSectionMapping: {
      maintenanceDate: 'basic', baristaName: 'basic', clientBaristaName: 'basic', visitRating: 'basic', visitZone: 'basic',
      hadProblem: 'problems', problems: 'problems', problemSolved: 'problems',
      servicesPerformed: 'services',
      partsWereReplaced: 'parts', partsReplaced: 'parts',
      type: 'payment', paidBy: 'payment',
      supervisors: 'supervisor',
      notes: 'notes', recommendations: 'notes',
      photos: 'photos',
    },
    onExpandSection: (sectionId) => {
      const step = SECTION_TO_STEP[sectionId];
      if (step) setCurrentStep(step);
    },
    storageKey: `maintenance-record-${record.id}-last-section`,
  });

  // Auto-save
  const autoSave = useAutoSave(`maintenance-record-${record.id}`, editedRecord, {
    debounceMs: 30000,
    onSave: (data) => logger.info('Auto-saved maintenance record', { id: data.id }, 'autosave'),
    onSaveError: (error) => logger.error('Auto-save failed', error, 'autosave'),
    enabled: true,
  });

  // Validation
  const validation = useFormValidation(editedRecord, {
    maintenanceDate: { required: true },
    baristaName: { required: true, minLength: 2 },
    supervisors: { custom: (value) => {
      if (!Array.isArray(value) || value.length === 0) return 'At least one supervisor is required';
      return value.some((s: any) => !s.name?.trim()) ? 'All supervisor names are required' : null;
    }},
  }, { mode: 'onBlur', showSummary: true, validateOnMount: false });

  // Re-sync when record prop changes
  useEffect(() => {
    setEditedRecord(record);
    setErrors({});
    setCurrentStep(1);
  }, [record]);

  // Step navigation
  const goToNextStep = useCallback(() => setCurrentStep(prev => Math.min(prev + 1, STEPPER_STEPS.length)), []);
  const goToPrevStep = useCallback(() => setCurrentStep(prev => Math.max(prev - 1, 1)), []);

  // Field handlers
  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const newValue = type === 'checkbox' ? checked : value;
    setEditedRecord(prev => {
      let updated = { ...prev, [name]: newValue };
      if (name === 'hadProblem' && !checked) updated = { ...updated, partsWereReplaced: false, problemSolved: false, partsReplaced: [], problems: [], followUpVisits: [] };
      if (name === 'partsWereReplaced' && !checked) updated = { ...updated, partsReplaced: [] };
      if (name === 'problemSolved' && checked) updated.followUpVisits = [];
      return updated;
    });
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleServicesChange = (services: any[]) => setEditedRecord(prev => ({ ...prev, servicesPerformed: services }));
  const handlePartsChange = (parts: any[]) => setEditedRecord(prev => ({ ...prev, partsReplaced: parts }));
  const handleProblemsChange = (problems: string[]) => setEditedRecord(prev => ({ ...prev, problems }));
  const handleRadioChange = (name: string, value: any) => { setEditedRecord(prev => ({ ...prev, [name]: value })); if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' })); };

  const suggestedServices = useMemo(() => getSuggestedServices(editedRecord.problems || []), [editedRecord.problems]);
  const suggestedParts = useMemo(() => getSuggestedParts(editedRecord.problems || []), [editedRecord.problems]);

  // Supervisor handlers
  const addSupervisor = () => setEditedRecord(prev => ({ ...prev, supervisors: [...(prev.supervisors || []), { id: generateUniqueId(), name: '', phone: '' }] }));
  const updateSupervisor = (index: number, field: string, value: string) => setEditedRecord(prev => { const s = [...(prev.supervisors || [])]; s[index] = { ...s[index], [field]: value }; return { ...prev, supervisors: s }; });
  const removeSupervisor = (index: number) => setEditedRecord(prev => ({ ...prev, supervisors: prev.supervisors?.filter((_, i) => i !== index) || [] }));

  // Photo handlers
  const handlePhotoUpload = async (files: FileList | null, type: 'before' | 'after') => {
    if (!files || files.length === 0) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { showToast('يجب تسجيل الدخول لرفع الصور', 'error'); return; }
    setUploadingPhotos(true);
    for (const file of Array.from(files)) {
      try {
        const v = validateImageFile(file);
        if (!v.valid) { showToast(v.error || 'صورة غير صالحة', 'error'); continue; }
        const compressed = await compressImage(file);
        const ts = Date.now();
        const rnd = Math.random().toString(36).substring(2, 8);
        const ext = compressed.name.split('.').pop() || 'webp';
        const fp = `${editedRecord.id}/${ts}-${rnd}.${ext}`;
        const { data, error } = await supabase.storage.from('maintenance-photos').upload(fp, compressed);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('maintenance-photos').getPublicUrl(data.path);
        setEditedRecord(prev => ({ ...prev, photos: [...(prev.photos || []), { url: publicUrl, type }] }));
        showToast('تم رفع الصورة بنجاح', 'success');
      } catch (err) { logger.error('Upload error', err, 'upload'); showToast('تعذر رفع الصورة', 'error'); }
    }
    setUploadingPhotos(false);
  };

  const handlePhotoRemove = async (photo: MaintenancePhoto) => {
    setEditedRecord(prev => ({ ...prev, photos: (prev.photos || []).filter(p => p.url !== photo.url) }));
    if (photo.url.includes('maintenance-photos')) {
      try {
        const parts = photo.url.split('/maintenance-photos/');
        if (parts.length > 1) {
          const { error } = await supabase.storage.from('maintenance-photos').remove([parts[1]]);
          if (error) showToast('تمت إزالة الصورة من السجل، لكن تعذر حذفها من التخزين', 'warning');
        }
      } catch { showToast('تمت إزالة الصورة من السجل، لكن تعذر حذفها من التخزين', 'warning'); }
    }
  };

  const handleSave = () => {
    validation.handleSubmit(
      () => { onSave(editedRecord); showToast('تم حفظ السجل بنجاح', 'success'); },
      (errors) => { showToast('يرجى تصحيح الأخطاء قبل الحفظ', 'error'); jumpToFirstError(errors); }
    )();
  };

  // Completed steps for Stepper visual feedback
  const completedSteps = useMemo(() => {
    const completed: number[] = [];
    if (editedRecord.maintenanceDate && editedRecord.baristaName) completed.push(1);
    if (!editedRecord.hadProblem || (editedRecord.problems && editedRecord.problems.length > 0)) completed.push(2);
    if (editedRecord.servicesPerformed.length > 0) completed.push(3);
    if (!editedRecord.partsWereReplaced || editedRecord.partsReplaced.length > 0) completed.push(4);
    if (editedRecord.type && editedRecord.paidBy) completed.push(5);
    if (editedRecord.supervisors && editedRecord.supervisors.some(s => s.name.trim())) completed.push(6);
    if (editedRecord.notes || editedRecord.recommendations) completed.push(7);
    if (editedRecord.photos && editedRecord.photos.length > 0) completed.push(8);
    return completed;
  }, [editedRecord]);

  // Shared section wrapper
  const sectionClass = (stepId: number) => `bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline overflow-hidden ${highlightedSection === STEP_TO_SECTION[stepId] ? 'animate-section-jump-highlight' : ''}`;

  return (
    <div className="space-y-6">
      <AutoSaveIndicator isSaving={autoSave.isSaving} lastSaved={autoSave.lastSaved} hasUnsavedChanges={autoSave.hasUnsavedChanges} onSaveNow={autoSave.saveNow} variant="full" />

      {validation.hasErrors && (
        <ValidationSummary errors={validation.allErrors} onJumpToError={(fieldName) => {
          const el = document.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
          el?.focus(); el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }} title={t.ui.maintenanceEditor.validationTitle} />
      )}

      {/* Stepper */}
      <div className="bg-cream dark:bg-espresso rounded-xl border border-hairline dark:border-hairline p-4">
        <Stepper steps={STEPPER_STEPS} currentStep={currentStep} onChange={setCurrentStep} layout="horizontal" completedSteps={completedSteps} />
      </div>

      {/* === STEP 1: Basic Info === */}
      {currentStep === 1 && (
        <div id="step-content-1" className={sectionClass(1)}>
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <DocumentTextIcon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-primary dark:text-white">المعلومات الأساسية</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.maintenanceDate}<RequiredFieldBadge /></label>
                <DatePresetButtons value={editedRecord.maintenanceDate} onChange={(date) => { setEditedRecord(prev => ({ ...prev, maintenanceDate: date })); if (errors.maintenanceDate) setErrors(prev => ({ ...prev, maintenanceDate: '' })); if (validation.errors.maintenanceDate) validation.clearError('maintenanceDate'); }} variant="cream" className="mb-2" />
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-latte" />
                  <input type="date" name="maintenanceDate" value={editedRecord.maintenanceDate} onChange={handleFieldChange} className={`w-full pl-10 pr-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border ${errors.maintenanceDate ? 'border-ember-500 focus:ring-ember-500' : 'border-hairline dark:border-hairline'}`} />
                </div>
                {errors.maintenanceDate && <p className="mt-1 text-sm text-ember-700">{errors.maintenanceDate}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.lastVisit}</label>
                {lastVisitDate ? (
                  <div className="flex items-center gap-3 p-3 bg-cream dark:bg-espresso-light rounded-lg border border-hairline dark:border-hairline">
                    <CalendarIcon className="w-5 h-5 text-primary" />
                    <div><div className="text-primary dark:text-white font-medium">{lastVisitDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                      {averageDays && <div className="text-xs text-latte">{t.ui.maintenanceEditor.averageDaysBetweenVisits.replace('{{days}}', String(averageDays))}</div>}</div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-3 bg-cream dark:bg-espresso-light rounded-lg border border-hairline dark:border-hairline text-latte"><CalendarIcon className="w-5 h-5" /><span className="text-sm">{t.ui.maintenanceEditor.noPreviousVisits}</span></div>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.myTechnician}<RequiredFieldBadge /></label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-latte" />
                  {baristas.length > 0 ? (
                    <select name="baristaName" value={editedRecord.baristaName} onChange={handleFieldChange} className={`w-full pl-10 pr-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border ${errors.baristaName ? 'border-ember-500' : 'border-hairline dark:border-hairline'}`}>
                      <option value="">{t.ui.maintenanceEditor.selectTechnician}</option>
                      {baristas.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" name="baristaName" value={editedRecord.baristaName} onChange={handleFieldChange} placeholder="أدخل اسم فرد صيانة (Midoe's)" className={`w-full pl-10 pr-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border ${errors.baristaName ? 'border-ember-500' : 'border-hairline dark:border-hairline'}`} />
                  )}
                </div>
                {errors.baristaName && <p className="mt-1 text-sm text-ember-700">{errors.baristaName}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.clientBarista}</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-latte" />
                  {clientBaristas && clientBaristas.length > 0 ? (
                    <select name="clientBaristaName" value={editedRecord.clientBaristaName || ''} onChange={handleFieldChange} className="w-full pl-10 pr-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline">
                      <option value="">{t.ui.maintenanceEditor.selectClientBarista}</option>
                      {clientBaristas.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" name="clientBaristaName" value={editedRecord.clientBaristaName || ''} onChange={handleFieldChange} placeholder="أدخل اسم باريستا العميل" className="w-full pl-10 pr-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline" />
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.clientBaristaPerformanceRating}</label>
                <StarRating value={editedRecord.visitRating || 0} onChange={(v) => setEditedRecord(prev => ({ ...prev, visitRating: v }))} size="lg" showNA showNumeric />
              </div>
              <div>
                <label className="flex items-center justify-between text-sm font-medium text-primary dark:text-latte/70 mb-2">
                  <span>{t.ui.maintenanceEditor.visitZone}</span>
                  <button
                    type="button"
                    onClick={() => setIsZoneManagerOpen(true)}
                    className="text-xs text-primary hover:text-hover underline"
                  >
                    إدارة المناطق
                  </button>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-latte" />
                  <select name="visitZone" value={editedRecord.visitZone || ''} onChange={handleFieldChange} className="w-full pl-10 pr-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline">
                    <option value="">{t.ui.maintenanceEditor.selectZone}</option>
                    {zones.map((z) => (
                      <option key={z.key} value={z.key}>{z.label} ({z.fee.toLocaleString()} جم)</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <span></span>
            <button type="button" onClick={goToNextStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors">{STEPPER_STEPS[1].name}<ChevronLeftIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* === STEP 2: Problems === */}
      {currentStep === 2 && (
        <div id="step-content-2" className={sectionClass(2)}>
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <ExclamationCircleIcon className="w-5 h-5 text-ember-500" />
            <h3 className="font-semibold text-primary dark:text-white">المشاكل</h3>
            {editedRecord.problems?.length > 0 && <span className="px-2 py-0.5 bg-ember-50 dark:bg-ember-500/10 text-ember-700 dark:text-ember-300 text-xs rounded-full">{editedRecord.problems.length} مشاكل</span>}
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="hadProblem" name="hadProblem" checked={editedRecord.hadProblem} onChange={handleFieldChange} className="w-5 h-5 text-primary rounded focus:ring-primary" />
              <label htmlFor="hadProblem" className="text-primary dark:text-latte/70">{t.ui.maintenanceEditor.wasThereAProblem}</label>
            </div>
            {editedRecord.hadProblem && (
              <div className="space-y-4">
                <CheckboxGroup categories={problemCategories} selectedValues={editedRecord.problems || []} onChange={handleProblemsChange} predefinedProblems={allPredefinedProblems} />
                <div className="flex items-center gap-3 pt-4 border-t border-hairline dark:border-hairline">
                  <input type="checkbox" id="problemSolved" name="problemSolved" checked={editedRecord.problemSolved} onChange={handleFieldChange} className="w-5 h-5 text-primary rounded focus:ring-primary" />
                  <label htmlFor="problemSolved" className="text-primary dark:text-latte/70 flex items-center gap-2">
                    {editedRecord.problemSolved ? <><CheckCircleIcon className="w-5 h-5 text-leaf-500" />{t.ui.maintenanceEditor.problemIsSolved}</> : <><XCircleIcon className="w-5 h-5 text-ember-500" />{t.ui.maintenanceEditor.problemIsNotSolved}</>}
                  </label>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <button type="button" onClick={goToPrevStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" />السابق</button>
            <button type="button" onClick={goToNextStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors">{STEPPER_STEPS[2].name}<ChevronLeftIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* === STEP 3: Services === */}
      {currentStep === 3 && (
        <div id="step-content-3" className={sectionClass(3)}>
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <WrenchIcon className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-primary dark:text-white">الخدمات المنفذة</h3>
            {editedRecord.servicesPerformed.length > 0 && <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">{editedRecord.servicesPerformed.length}</span>}
          </div>
          <div className="p-6">
            <ServiceSelector options={servicesList} selectedValues={editedRecord.servicesPerformed} onChange={handleServicesChange} suggestedValues={suggestedServices} />
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <button type="button" onClick={goToPrevStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" />السابق</button>
            <button type="button" onClick={goToNextStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors">{STEPPER_STEPS[3].name}<ChevronLeftIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* === STEP 4: Parts === */}
      {currentStep === 4 && (
        <div id="step-content-4" className={sectionClass(4)}>
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <BeakerIcon className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-primary dark:text-white">القطع المستبدلة</h3>
            {editedRecord.partsReplaced.length > 0 && <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">{editedRecord.partsReplaced.length}</span>}
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <input type="checkbox" id="partsWereReplaced" name="partsWereReplaced" checked={editedRecord.partsWereReplaced} onChange={handleFieldChange} className="w-5 h-5 text-primary rounded focus:ring-primary" />
              <label htmlFor="partsWereReplaced" className="text-primary dark:text-latte/70">{t.ui.maintenanceEditor.werePartsReplaced}</label>
            </div>
            {editedRecord.partsWereReplaced && <PartsSelector options={partsList} selectedValues={editedRecord.partsReplaced} onChange={handlePartsChange} suggestedValues={suggestedParts} />}
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <button type="button" onClick={goToPrevStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" />السابق</button>
            <button type="button" onClick={goToNextStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors">{STEPPER_STEPS[4].name}<ChevronLeftIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* === STEP 5: Payment === */}
      {currentStep === 5 && (
        <div id="step-content-5" className={sectionClass(5)}>
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <CurrencyDollarIcon className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-primary dark:text-white">نوع الزيارة والدفع</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RadioGroup label="نوع الزيارة" name="type" options={[{ label: t.ui.maintenanceEditor.requested, value: 'requested' }, { label: t.ui.maintenanceEditor.scheduled, value: 'scheduled' }]} value={editedRecord.type} onChange={(val) => handleRadioChange('type', val)} />
              <div>
                <label className="text-sm font-medium text-primary dark:text-latte/70 block mb-3">{t.ui.maintenanceEditor.paidBy}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button type="button" onClick={() => handleRadioChange('paidBy', 'company')} className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${editedRecord.paidBy === 'company' ? 'border-primary bg-cream-2 dark:bg-primary/10 text-primary-900 dark:text-primary-300' : 'border-hairline dark:border-hairline bg-cream dark:bg-espresso text-primary dark:text-latte/70'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${editedRecord.paidBy === 'company' ? 'bg-primary text-white' : 'bg-cream-2 dark:bg-espresso-light text-primary dark:text-latte'}`}>M</div>
                    <div className="text-center"><div className="font-semibold">{t.ui.maintenanceEditor.midos}</div><div className="text-xs text-latte">{t.ui.maintenanceEditor.companyPays}</div></div>
                    {editedRecord.paidBy === 'company' && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>}
                  </button>
                  <button type="button" onClick={() => handleRadioChange('paidBy', 'client')} className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 ${editedRecord.paidBy === 'client' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100' : 'border-hairline dark:border-hairline bg-cream dark:bg-espresso text-primary dark:text-latte/70'}`}>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${editedRecord.paidBy === 'client' ? 'bg-amber-500 text-white' : 'bg-cream-2 dark:bg-espresso-light text-primary dark:text-latte'}`}>C</div>
                    <div className="text-center"><div className="font-semibold">{t.ui.maintenanceEditor.client}</div><div className="text-xs text-latte">{t.ui.maintenanceEditor.customerPays}</div></div>
                    {editedRecord.paidBy === 'client' && <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <button type="button" onClick={goToPrevStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" />السابق</button>
            <button type="button" onClick={goToNextStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors">{STEPPER_STEPS[5].name}<ChevronLeftIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* === STEP 6: Supervisor === */}
      {currentStep === 6 && (
        <div id="step-content-6" className={sectionClass(6)} data-field="supervisors">
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <ClipboardDocumentListIcon className="w-5 h-5 text-leaf-500" />
            <h3 className="font-semibold text-primary dark:text-white">بيانات المشرف</h3>
            {(!editedRecord.supervisors || editedRecord.supervisors.length === 0) ? (
              <span className="px-2 py-0.5 bg-ember-50 dark:bg-ember-500/10 text-ember-700 dark:text-ember-300 text-xs rounded-full">مطلوب</span>
            ) : (
              <span className="px-2 py-0.5 bg-leaf-50 dark:bg-leaf-500/10 text-leaf-700 dark:text-leaf-300 text-xs rounded-full">{editedRecord.supervisors.length}</span>
            )}
          </div>
          <div className="p-6 space-y-4">
            {(editedRecord.supervisors || []).map((supervisor, index) => (
              <div key={supervisor.id} className="p-4 bg-cream dark:bg-espresso-light/50 rounded-lg border border-hairline dark:border-hairline">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-primary dark:text-latte/70">{t.ui.maintenanceEditor.supervisor} {index + 1}</h4>
                  {(editedRecord.supervisors || []).length > 1 && <button type="button" onClick={() => removeSupervisor(index)} className="min-h-[44px] px-3 py-2 text-ember-700 hover:text-ember-700 hover:bg-ember-50 dark:hover:bg-ember-500/10 text-sm font-medium rounded-lg transition-colors">{t.ui.maintenanceEditor.remove}</button>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={`supervisor-${supervisor.id}-name`} className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.supervisorName}</label>
                    <input id={`supervisor-${supervisor.id}-name`} name={`supervisor-${index}-name`} type="text" value={supervisor.name} onChange={(e) => updateSupervisor(index, 'name', e.target.value)} className="w-full px-3 py-2 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline focus:outline-none focus:ring-2 focus:ring-primary" placeholder="اسم المشرف" />
                  </div>
                  <div>
                    <label htmlFor={`supervisor-${supervisor.id}-phone`} className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.phone}</label>
                    <input id={`supervisor-${supervisor.id}-phone`} name={`supervisor-${index}-phone`} type="tel" value={supervisor.phone} onChange={(e) => updateSupervisor(index, 'phone', formatEgyptianPhone(e.target.value))} className="w-full px-3 py-2 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg border border-hairline dark:border-hairline focus:outline-none focus:ring-2 focus:ring-primary" placeholder="رقم الهاتف" dir="ltr" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSupervisor} className="flex items-center gap-2 px-4 py-2 text-primary dark:text-primary-400 font-medium hover:bg-cream-2 dark:hover:bg-primary/10 rounded-lg border border-primary/30 dark:border-copper-700 transition-colors"><PlusCircleIcon className="w-5 h-5" /> {t.ui.maintenanceEditor.addSupervisor}</button>
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <button type="button" onClick={goToPrevStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" />السابق</button>
            <button type="button" onClick={goToNextStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors">{STEPPER_STEPS[6].name}<ChevronLeftIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* === STEP 7: Notes === */}
      {currentStep === 7 && (
        <div id="step-content-7" className={sectionClass(7)}>
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <DocumentTextIcon className="w-5 h-5 text-latte" />
            <h3 className="font-semibold text-primary dark:text-white">ملاحظات وتوصيات</h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.notes}</label>
              <textarea name="notes" value={editedRecord.notes || ''} onChange={handleFieldChange} rows={4} placeholder="أضف أي ملاحظات إضافية..." className="w-full px-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline resize-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary dark:text-latte/70 mb-2">{t.ui.maintenanceEditor.recommendations}</label>
              <textarea name="recommendations" value={editedRecord.recommendations || ''} onChange={handleFieldChange} rows={3} placeholder="أضف توصيات للزيارات القادمة..." className="w-full px-4 py-3 bg-cream dark:bg-espresso-light text-primary dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-hairline dark:border-hairline resize-none" />
            </div>
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <button type="button" onClick={goToPrevStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" />السابق</button>
            <button type="button" onClick={goToNextStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-700 rounded-lg transition-colors">{STEPPER_STEPS[7].name}<ChevronLeftIcon className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      {/* === STEP 8: Photos === */}
      {currentStep === 8 && (
        <div id="step-content-8" className={sectionClass(8)}>
          <div className="flex items-center gap-3 p-4 border-b border-hairline dark:border-hairline">
            <CameraIcon className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-primary dark:text-white">صور قبل وبعد</h3>
            {editedRecord.photos && editedRecord.photos.length > 0 && <span className="px-2 py-0.5 bg-primary/10 dark:bg-primary/10 text-primary dark:text-primary-400 text-xs rounded-full">{editedRecord.photos.length}</span>}
          </div>
          <div className="p-6 space-y-6">
            {uploadingPhotos && (
              <div className="flex items-center gap-3 p-4 bg-cream-2 dark:bg-primary/10 rounded-lg border border-primary/30 dark:border-primary/30">
                <svg className="animate-spin w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                <span className="text-primary dark:text-primary-400 font-medium">{t.ui.maintenanceEditor.uploadingPhotos}</span>
              </div>
            )}
            {/* Before Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-primary dark:text-latte/70">{t.ui.maintenanceEditor.beforePhotos}</span>
                <label className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${uploadingPhotos ? 'bg-cream dark:bg-espresso-light text-latte cursor-not-allowed' : 'bg-cream-2 dark:bg-primary/10 text-primary dark:text-primary-400 hover:bg-primary/10 border border-primary/30'}`}>
                  <ArrowUpTrayIcon className="w-4 h-4" /><span>{t.ui.maintenanceEditor.uploadBefore}</span>
                  <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingPhotos} onChange={(e) => handlePhotoUpload(e.target.files, 'before')} />
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {editedRecord.photos?.filter(p => p.type === 'before').map((photo, i) => (
                  <div key={`before-${i}`} className="relative group aspect-square">
                    <img src={photo.url} alt={`${t.ui.maintenanceEditor.before} ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-hairline dark:border-hairline" loading="lazy" />
                    <button onClick={() => setConfirmPhotoDelete({ isOpen: true, url: photo.url, category: 'before' })} className="absolute top-2 right-2 bg-ember-500 hover:bg-ember-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" title="إزالة الصورة" aria-label="إزالة الصورة"><XMarkIcon className="w-4 h-4" /></button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">{t.ui.maintenanceEditor.before}</div>
                  </div>
                ))}
                {(!editedRecord.photos || editedRecord.photos.filter(p => p.type === 'before').length === 0) && (
                  <div className="col-span-full flex items-center justify-center h-20 bg-cream dark:bg-espresso-light/50 rounded-lg border border-dashed border-hairline dark:border-hairline"><span className="text-sm text-latte">{t.ui.maintenanceEditor.noBeforePhotos}</span></div>
                )}
              </div>
            </div>
            {/* After Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-primary dark:text-latte/70">{t.ui.maintenanceEditor.afterPhotos}</span>
                <label className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${uploadingPhotos ? 'bg-cream dark:bg-espresso-light text-latte cursor-not-allowed' : 'bg-cream-2 dark:bg-primary/10 text-primary dark:text-primary-400 hover:bg-primary/10 border border-primary/30'}`}>
                  <ArrowUpTrayIcon className="w-4 h-4" /><span>{t.ui.maintenanceEditor.uploadAfter}</span>
                  <input type="file" accept="image/*" multiple className="hidden" disabled={uploadingPhotos} onChange={(e) => handlePhotoUpload(e.target.files, 'after')} />
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {editedRecord.photos?.filter(p => p.type === 'after').map((photo, i) => (
                  <div key={`after-${i}`} className="relative group aspect-square">
                    <img src={photo.url} alt={`${t.ui.maintenanceEditor.after} ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-hairline dark:border-hairline" loading="lazy" />
                    <button onClick={() => setConfirmPhotoDelete({ isOpen: true, url: photo.url, category: 'after' })} className="absolute top-2 right-2 bg-ember-500 hover:bg-ember-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" title="إزالة الصورة" aria-label="إزالة الصورة"><XMarkIcon className="w-4 h-4" /></button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-leaf-500/80 text-white text-xs rounded">{t.ui.maintenanceEditor.after}</div>
                  </div>
                ))}
                {(!editedRecord.photos || editedRecord.photos.filter(p => p.type === 'after').length === 0) && (
                  <div className="col-span-full flex items-center justify-center h-20 bg-cream dark:bg-espresso-light/50 rounded-lg border border-dashed border-hairline dark:border-hairline"><span className="text-sm text-latte">{t.ui.maintenanceEditor.noAfterPhotos}</span></div>
                )}
              </div>
            </div>
            {/* Legacy Photos */}
            {editedRecord.photos && editedRecord.photos.filter(p => p.type === 'legacy').length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3"><span className="font-medium text-primary dark:text-latte/70">{t.ui.maintenanceEditor.legacyPhotos}</span><span className="text-xs text-latte">{t.ui.maintenanceEditor.legacyPhotosHint}</span></div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {editedRecord.photos.filter(p => p.type === 'legacy').map((photo, i) => (
                    <div key={`legacy-${i}`} className="relative group aspect-square">
                      <img src={photo.url} alt={`${t.ui.maintenanceEditor.legacyPhotos} ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-hairline dark:border-hairline" loading="lazy" />
                      <button onClick={() => setConfirmPhotoDelete({ isOpen: true, url: photo.url, category: 'legacy' })} className="absolute top-2 right-2 bg-ember-500 hover:bg-ember-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" title="إزالة الصورة" aria-label="إزالة الصورة"><XMarkIcon className="w-4 h-4" /></button>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-espresso/80 text-white text-xs rounded">{t.ui.maintenanceEditor.legacy}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center p-4 border-t border-hairline dark:border-hairline">
            <button type="button" onClick={goToPrevStep} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-latte hover:text-primary rounded-lg transition-colors"><ChevronRightIcon className="w-4 h-4" />السابق</button>
            <span className="text-xs text-latte">الخطوة الأخيرة</span>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className={`fixed bottom-0 left-0 right-0 ${isSidebarExpanded ? 'lg:right-64' : 'lg:right-20'} bg-cream/90 dark:bg-espresso/90 backdrop-blur-lg border-t border-hairline dark:border-hairline shadow-lg z-50 transition-all duration-300`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <button onClick={onCancel} className="flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-5 py-2.5 text-primary dark:text-latte font-medium hover:text-primary dark:hover:text-white hover:bg-cream dark:hover:bg-espresso-light/50 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              <span className="hidden sm:inline">{t.ui.maintenanceEditor.cancel}</span>
            </button>
            <button onClick={handleSave} className="btn-primary rounded-lg min-h-[44px] px-5 sm:px-6 py-2.5 shadow-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>{t.ui.maintenanceEditor.save}</span>
            </button>
          </div>
        </div>
      </div>
      <div className="h-24"></div>

      <ConfirmDialog isOpen={!!confirmPhotoDelete?.isOpen} onClose={() => setConfirmPhotoDelete(null)} onConfirm={() => { if (confirmPhotoDelete) { handlePhotoRemove({ url: confirmPhotoDelete.url, type: confirmPhotoDelete.category as any }); } setConfirmPhotoDelete(null); }} title="إزالة الصورة" aria-label="إزالة الصورة" message="هل أنت متأكد من رغبتك في إزالة هذه الصورة؟ لا يمكن التراجع عن هذا الإجراء." confirmLabel="نعم، إزالة" />

      <VisitZoneManager isOpen={isZoneManagerOpen} onClose={() => setIsZoneManagerOpen(false)} />
    </div>
  );
};

export default MaintenanceRecordEditor;
