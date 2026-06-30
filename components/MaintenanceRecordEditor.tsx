import React, { useState, useEffect } from 'react';
import { MaintenanceRecord, Part, Service, Barista, ClientBarista, MaintenancePhoto } from '../types';
import {
  CalendarIcon,
  UserIcon,
  StarIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  WrenchIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  BeakerIcon,
  ExclamationCircleIcon,
  ClipboardDocumentListIcon,
  PlusCircleIcon,
  CameraIcon,
  XMarkIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import RadioGroup from './RadioGroup';
import ServiceSelector from './ServiceSelector';
import PartsSelector from './PartsSelector';
import CheckboxGroup from './CheckboxGroup';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastContext';
import { compressImage, validateImageFile } from '../utils/imageCompression';
import { logger } from '../utils/logger';

interface MaintenanceRecordEditorProps {
  record: MaintenanceRecord;
  onSave: (record: MaintenanceRecord) => void;
  onCancel: () => void;
  partsList: Part[];
  servicesList: Service[];
  problemCategories: { title: string; options: { label: string; value: string; }[] }[];
  allPredefinedProblems: string[];
  baristas?: Barista[];
  clientBaristas?: ClientBarista[];
  lastVisitDate?: Date | null;
  averageDays?: number | null;
  isSidebarExpanded?: boolean;
}

const MaintenanceRecordEditor: React.FC<MaintenanceRecordEditorProps> = ({
  record,
  onSave,
  onCancel,
  partsList,
  servicesList,
  problemCategories,
  allPredefinedProblems,
  baristas = [],
  clientBaristas = [],
  lastVisitDate,
  averageDays,
  isSidebarExpanded = false
}) => {
  const { showToast } = useToast();
  const [editedRecord, setEditedRecord] = useState<MaintenanceRecord>(record);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(() => {
    const initial = new Set<string>(['basic']);
    if (record.hadProblem) initial.add('problems');
    if (record.servicesPerformed.length > 0) initial.add('services');
    if (record.partsReplaced.length > 0) initial.add('parts');
    if (record.notes) initial.add('notes');
    if (record.photos && record.photos.length > 0) initial.add('photos');
    return initial;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Sync state when record prop changes (e.g., when navigating between records)
  useEffect(() => {
    setEditedRecord(record);
    setErrors({});
    // Reset expanded sections based on new record data
    const newExpanded = new Set<string>(['basic']);
    if (record.hadProblem) newExpanded.add('problems');
    if (record.servicesPerformed.length > 0) newExpanded.add('services');
    if (record.partsReplaced.length > 0) newExpanded.add('parts');
    if (record.notes) newExpanded.add('notes');
    if (record.photos && record.photos.length > 0) newExpanded.add('photos');
    setExpandedSections(newExpanded);
  }, [record.id]); // Only re-sync when record ID changes (navigation)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    const newValue = type === 'checkbox' ? checked : value;

    setEditedRecord(prev => {
      let updated = { ...prev, [name]: newValue };
      
      if (name === 'hadProblem' && !checked) {
        updated = { 
          ...updated, 
          partsWereReplaced: false, 
          problemSolved: false,
          partsReplaced: [], 
          problems: [],
          followUpVisits: []
        };
      }
      
      if (name === 'partsWereReplaced' && !checked) {
        updated = { ...updated, partsReplaced: [] };
      }
      
      if (name === 'problemSolved' && checked) {
        updated.followUpVisits = [];
      }

      return updated;
    });

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleServicesChange = (services: any[]) => {
    setEditedRecord(prev => ({ ...prev, servicesPerformed: services }));
  };

  const handlePartsChange = (parts: any[]) => {
    setEditedRecord(prev => ({ ...prev, partsReplaced: parts }));
  };

  const handleProblemsChange = (problems: string[]) => {
    setEditedRecord(prev => ({ ...prev, problems }));
  };

  const handleRadioChange = (name: string, value: any) => {
    setEditedRecord(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addSupervisor = () => {
    setEditedRecord(prev => ({
      ...prev,
      supervisors: [
        ...(prev.supervisors || []),
        { id: Date.now(), name: "", phone: "" }
      ]
    }));
  };

  const updateSupervisor = (index: number, field: string, value: string) => {
    setEditedRecord(prev => {
      const supervisors = [...(prev.supervisors || [])];
      supervisors[index] = { ...supervisors[index], [field]: value };
      return { ...prev, supervisors };
    });
  };

  const removeSupervisor = (index: number) => {
    setEditedRecord(prev => ({
      ...prev,
      supervisors: prev.supervisors?.filter((_, i) => i !== index) || []
    }));
  };

  // Photo upload handler
  const handlePhotoUpload = async (files: FileList | null, type: "before" | "after") => {
    if (!files || files.length === 0) return;

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showToast("You must be logged in to upload photos", "error");
      return;
    }

    setUploadingPhotos(true);

    // Process each file
    for (const file of Array.from(files)) {
      try {
        // Validate
        const validation = validateImageFile(file);
        if (!validation.valid) {
          showToast(validation.error || "Invalid image", "error");
          continue;
        }

        // Compress
        const compressed = await compressImage(file);
        
        // Generate unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = compressed.name.split('.').pop() || 'webp';
        const fileName = `${timestamp}-${randomStr}.${extension}`;
        const filePath = `${editedRecord.id}/${fileName}`;

        // Upload to Supabase storage
        const { data, error } = await supabase.storage
          .from('maintenance-photos')
          .upload(filePath, compressed);
        
        if (error) throw error;
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('maintenance-photos')
          .getPublicUrl(data.path);
        
        // Add to photos array
        setEditedRecord(prev => ({
          ...prev,
          photos: [...(prev.photos || []), { url: publicUrl, type }]
        }));
        
        showToast("Photo uploaded successfully", "success");
      } catch (error) {
        logger.error('Upload error', error, 'upload');
        showToast("Could not upload photo", "error");
      }
    }

    setUploadingPhotos(false);
  };

  // Photo remove handler
  const handlePhotoRemove = async (photo: MaintenancePhoto) => {
    // Remove from record
    setEditedRecord(prev => ({
      ...prev,
      photos: (prev.photos || []).filter(p => p.url !== photo.url)
    }));

    // Try to delete from storage if it's in our bucket
    if (photo.url.includes('maintenance-photos')) {
      try {
        // Extract path from URL
        const urlParts = photo.url.split('/maintenance-photos/');
        if (urlParts.length > 1) {
          const path = urlParts[1];
          const { error } = await supabase.storage.from('maintenance-photos').remove([path]);
          if (error) {
            logger.warn('Could not delete from storage', error, 'upload');
            showToast("Photo removed from record, but could not delete from storage", "warning");
          }
        }
      } catch (error) {
        logger.warn('Could not delete from storage', error, 'upload');
        showToast("Photo removed from record, but could not delete from storage", "warning");
      }
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editedRecord.maintenanceDate) {
      newErrors.maintenanceDate = 'Date is required';
    }

    if (!editedRecord.baristaName.trim()) {
      newErrors.baristaName = 'Barista name is required';
    }

    if (!editedRecord.supervisors || editedRecord.supervisors.length === 0) {
      newErrors.supervisors = 'At least one supervisor is required';
    } else {
      editedRecord.supervisors.forEach((supervisor, index) => {
        if (!supervisor.name.trim()) {
          newErrors[`supervisor-${index}-name`] = 'Supervisor name is required';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(editedRecord);
    }
  };

  const SectionHeader: React.FC<{ 
    title: string; 
    section: string; 
    icon: React.ReactNode;
    badge?: React.ReactNode;
  }> = ({ title, section, icon, badge }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors rounded-t-lg"
    >
      <div className="flex items-center gap-3">
        <span className="text-slate-500 dark:text-slate-400">{icon}</span>
        <span className="font-semibold text-slate-900 dark:text-white">{title}</span>
        {badge}
      </div>
      {expandedSections.has(section) ? (
        <ChevronUpIcon className="w-5 h-5 text-slate-400" />
      ) : (
        <ChevronDownIcon className="w-5 h-5 text-slate-400" />
      )}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Basic Information"
          section="basic"
          icon={<DocumentTextIcon className="w-5 h-5" />}
        />
        
        {expandedSections.has('basic') && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Maintenance Date *
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="date"
                    name="maintenanceDate"
                    value={editedRecord.maintenanceDate}
                    onChange={handleFieldChange}
                    className={`w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                      errors.maintenanceDate 
                        ? 'border-red-500 focus:ring-red-500' 
                        : 'border-slate-200 dark:border-slate-600'
                    }`}
                  />
                </div>
                {errors.maintenanceDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.maintenanceDate}</p>
                )}
              </div>

              {/* Last Visit Info */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Last Visit
                </label>
                <div className="relative">
                  {lastVisitDate ? (
                    <div className="flex items-center gap-3 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                      <CalendarIcon className="w-5 h-5 text-teal-500" />
                      <div>
                        <div className="text-slate-900 dark:text-white font-medium">
                          {lastVisitDate.toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </div>
                        {averageDays && (
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Average {averageDays} days between visits
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                      <CalendarIcon className="w-5 h-5" />
                      <span className="text-sm">No previous visits</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Barista */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  My Technician *
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  {baristas.length > 0 ? (
                    <select
                      name="baristaName"
                      value={editedRecord.baristaName}
                      onChange={handleFieldChange}
                      className={`w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                        errors.baristaName 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                    >
                      <option value="">Select Barista</option>
                      {baristas.map(barista => (
                        <option key={barista.id} value={barista.name}>{barista.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="baristaName"
                      value={editedRecord.baristaName}
                      onChange={handleFieldChange}
                      placeholder="Enter barista name"
                      className={`w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border ${
                        errors.baristaName 
                          ? 'border-red-500 focus:ring-red-500' 
                          : 'border-slate-200 dark:border-slate-600'
                      }`}
                    />
                  )}
                </div>
                {errors.baristaName && (
                  <p className="mt-1 text-sm text-red-600">{errors.baristaName}</p>
                )}
              </div>

              {/* Client Barista */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Client Barista
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  {clientBaristas && clientBaristas.length > 0 ? (
                    <select
                      name="clientBaristaName"
                      value={editedRecord.clientBaristaName || ''}
                      onChange={handleFieldChange}
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border border-slate-200 dark:border-slate-600"
                    >
                      <option value="">Select Client Barista</option>
                      {clientBaristas.map(barista => (
                        <option key={barista.id} value={barista.name}>{barista.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      name="clientBaristaName"
                      value={editedRecord.clientBaristaName || ''}
                      onChange={handleFieldChange}
                      placeholder="Enter client barista name"
                      className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border border-slate-200 dark:border-slate-600"
                    />
                  )}
                </div>
              </div>

              {/* Client Barista Performance Rating */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Client Barista Performance Rating
                </label>
                <div className="flex items-center gap-1 sm:gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setEditedRecord(prev => ({ ...prev, visitRating: star }))}
                      className="p-2 sm:p-1 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      {star <= (editedRecord.visitRating || 0) ? (
                        <StarIconSolid className="w-8 h-8 text-yellow-400" />
                      ) : (
                        <StarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Visit Zone */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Visit Zone
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    name="visitZone"
                    value={editedRecord.visitZone || ''}
                    onChange={handleFieldChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border border-slate-200 dark:border-slate-600"
                  >
                    <option value="">Select Zone</option>
                    <option value="cairo">Cairo (500 EGP)</option>
                    <option value="outside_cairo">Outside Cairo (1500 EGP)</option>
                    <option value="el_sahel">El Sahel (4000 EGP)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Problems & Services Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Problems & Services"
          section="problems"
          icon={<ExclamationCircleIcon className="w-5 h-5" />}
          badge={editedRecord.problems?.length > 0 && (
            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
              {editedRecord.problems.length} problems
            </span>
          )}
        />
        
        {expandedSections.has('problems') && (
          <div className="p-6 space-y-6">
            {/* Had Problem */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="hadProblem"
                name="hadProblem"
                checked={editedRecord.hadProblem}
                onChange={handleFieldChange}
                className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
              />
              <label htmlFor="hadProblem" className="text-slate-700 dark:text-slate-300">
                Was there a problem?
              </label>
            </div>

            {editedRecord.hadProblem && (
              <>
                <div className="pl-8 space-y-4">
                  <CheckboxGroup
                    categories={problemCategories}
                    selectedValues={editedRecord.problems || []}
                    onChange={handleProblemsChange}
                    predefinedProblems={allPredefinedProblems}
                  />

                  <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <input
                      type="checkbox"
                      id="problemSolved"
                      name="problemSolved"
                      checked={editedRecord.problemSolved}
                      onChange={handleFieldChange}
                      className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <label htmlFor="problemSolved" className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      {editedRecord.problemSolved ? (
                        <>
                          <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          Problem is solved
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-5 h-5 text-red-500" />
                          Problem is NOT solved
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Services Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Services Performed"
          section="services"
          icon={<WrenchIcon className="w-5 h-5" />}
          badge={editedRecord.servicesPerformed.length > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
              {editedRecord.servicesPerformed.length} services
            </span>
          )}
        />
        
        {expandedSections.has('services') && (
          <div className="p-6">
            <ServiceSelector
              options={servicesList}
              selectedValues={editedRecord.servicesPerformed}
              onChange={handleServicesChange}
            />
          </div>
        )}
      </div>

      {/* Parts Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Parts Replaced"
          section="parts"
          icon={<BeakerIcon className="w-5 h-5" />}
          badge={editedRecord.partsReplaced.length > 0 && (
            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full">
              {editedRecord.partsReplaced.length} parts
            </span>
          )}
        />
        
        {expandedSections.has('parts') && (
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="partsWereReplaced"
                name="partsWereReplaced"
                checked={editedRecord.partsWereReplaced}
                onChange={handleFieldChange}
                className="w-5 h-5 text-teal-600 rounded focus:ring-teal-500"
              />
              <label htmlFor="partsWereReplaced" className="text-slate-700 dark:text-slate-300">
                Were parts replaced?
              </label>
            </div>

            {editedRecord.partsWereReplaced && (
              <div className="pl-8">
                <PartsSelector
                  options={partsList}
                  selectedValues={editedRecord.partsReplaced}
                  onChange={handlePartsChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Type & Payment Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Visit Type & Payment"
          section="payment"
          icon={<CurrencyDollarIcon className="w-5 h-5" />}
        />
        
        {expandedSections.has('payment') && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <RadioGroup
                label="Visit Type"
                name="type"
                options={[
                  { label: 'Requested', value: 'requested' },
                  { label: 'Scheduled', value: 'scheduled' }
                ]}
                value={editedRecord.type}
                onChange={(val) => handleRadioChange('type', val)}
              />

              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block mb-3">Paid By</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleRadioChange('paidBy', 'company')}
                    className={`
                      relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                      ${editedRecord.paidBy === 'company'
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-100'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                      }
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                      ${editedRecord.paidBy === 'company'
                        ? 'bg-teal-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }
                    `}>
                      M
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Mido's</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Company pays</div>
                    </div>                    
                    {editedRecord.paidBy === 'company' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-teal-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleRadioChange('paidBy', 'client')}
                    className={`
                      relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200
                      ${editedRecord.paidBy === 'client'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100'
                        : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500'
                      }
                    `}
                  >
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold
                      ${editedRecord.paidBy === 'client'
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      }
                    `}>
                      C
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Client</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Customer pays</div>
                    </div>
                    {editedRecord.paidBy === 'client' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Supervisor Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Supervisor Information"
          section="supervisor"
          icon={<ClipboardDocumentListIcon className="w-5 h-5" />}
          badge={
            !editedRecord.supervisors || editedRecord.supervisors.length === 0 ? (
              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs rounded-full">
                Required
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full">
                {editedRecord.supervisors.length} supervisor(s)
              </span>
            )
          }
        />
        {expandedSections.has('supervisor') && (
          <div className="p-6 space-y-4">
            {(editedRecord.supervisors || []).map((supervisor, index) => (
              <div key={supervisor.id} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300">Supervisor {index + 1}</h4>
                  {(editedRecord.supervisors || []).length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSupervisor(index)}
                      className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium rounded-lg transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Name *</label>
                    <input
                      type="text"
                      value={supervisor.name}
                      onChange={(e) => updateSupervisor(index, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-600 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Supervisor name"
                    />
                    {errors[`supervisor-${index}-name`] && (
                      <p className="mt-1 text-sm text-red-600">{errors[`supervisor-${index}-name`]}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                    <input
                      type="text"
                      value={supervisor.phone}
                      onChange={(e) => updateSupervisor(index, 'phone', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-600 text-slate-900 dark:text-white rounded-lg border border-slate-200 dark:border-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Phone number"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addSupervisor}
              className="flex items-center gap-2 px-4 py-2 text-teal-600 dark:text-teal-400 font-medium hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg border border-teal-300 dark:border-teal-700 transition-colors"
            >
              <PlusCircleIcon className="w-5 h-5" /> Add Supervisor
            </button>
          </div>
        )}
      </div>
      {/* Notes Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Notes & Recommendations"
          section="notes"
          icon={<DocumentTextIcon className="w-5 h-5" />}
          badge={editedRecord.notes && (
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs rounded-full">
              Has notes
            </span>
          )}
        />
        
        {expandedSections.has('notes') && (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={editedRecord.notes || ''}
                onChange={handleFieldChange}
                rows={4}
                placeholder="Add any additional notes..."
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border border-slate-200 dark:border-slate-600 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Recommendations
              </label>
              <textarea
                name="recommendations"
                value={editedRecord.recommendations || ''}
                onChange={handleFieldChange}
                rows={3}
                placeholder="Add recommendations for future visits..."
                className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 border border-slate-200 dark:border-slate-600 resize-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Before & After Photos Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <SectionHeader
          title="Before & After Photos"
          section="photos"
          icon={<CameraIcon className="w-5 h-5" />}
          badge={editedRecord.photos && editedRecord.photos.length > 0 && (
            <span className="px-2 py-0.5 bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 text-xs rounded-full">
              {editedRecord.photos.length} photo(s)
            </span>
          )}
        />
        
        {expandedSections.has('photos') && (
          <div className="p-6 space-y-6">
            {/* Upload Progress Indicator */}
            {uploadingPhotos && (
              <div className="flex items-center gap-3 p-4 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <svg className="animate-spin w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-teal-700 dark:text-teal-300 font-medium">Uploading photos...</span>
              </div>
            )}

            {/* Before Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-slate-700 dark:text-slate-300">Before Photos</span>
                <label className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                  uploadingPhotos 
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
                }`}>
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  <span>Upload Before</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    disabled={uploadingPhotos}
                    onChange={(e) => handlePhotoUpload(e.target.files, "before")} 
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {editedRecord.photos?.filter(p => p.type === "before").map((photo, i) => (
                  <div key={`before-${i}`} className="relative group aspect-square">
                    <img 
                      src={photo.url} 
                      alt={`Before photo ${i + 1}`} 
                      className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-600" 
                    />
                    <button 
                      onClick={() => handlePhotoRemove(photo)} 
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Remove photo"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                      Before
                    </div>
                  </div>
                ))}
                {(!editedRecord.photos || editedRecord.photos.filter(p => p.type === "before").length === 0) && (
                  <div className="col-span-full flex items-center justify-center h-20 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                    <span className="text-sm text-slate-400 dark:text-slate-500">No before photos</span>
                  </div>
                )}
              </div>
            </div>

            {/* After Photos */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-slate-700 dark:text-slate-300">After Photos</span>
                <label className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-colors ${
                  uploadingPhotos 
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed' 
                    : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/30 border border-teal-200 dark:border-teal-800'
                }`}>
                  <ArrowUpTrayIcon className="w-4 h-4" />
                  <span>Upload After</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    multiple 
                    className="hidden" 
                    disabled={uploadingPhotos}
                    onChange={(e) => handlePhotoUpload(e.target.files, "after")} 
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {editedRecord.photos?.filter(p => p.type === "after").map((photo, i) => (
                  <div key={`after-${i}`} className="relative group aspect-square">
                    <img 
                      src={photo.url} 
                      alt={`After photo ${i + 1}`} 
                      className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-600" 
                    />
                    <button 
                      onClick={() => handlePhotoRemove(photo)} 
                      className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      title="Remove photo"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500/80 text-white text-xs rounded">
                      After
                    </div>
                  </div>
                ))}
                {(!editedRecord.photos || editedRecord.photos.filter(p => p.type === "after").length === 0) && (
                  <div className="col-span-full flex items-center justify-center h-20 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                    <span className="text-sm text-slate-400 dark:text-slate-500">No after photos</span>
                  </div>
                )}
              </div>
            </div>

            {/* Legacy Photos - Display only, no upload */}
            {editedRecord.photos && editedRecord.photos.filter(p => p.type === "legacy").length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Legacy Photos</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">Imported from previous records</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {editedRecord.photos.filter(p => p.type === "legacy").map((photo, i) => (
                    <div key={`legacy-${i}`} className="relative group aspect-square">
                      <img 
                        src={photo.url} 
                        alt={`Legacy photo ${i + 1}`} 
                        className="w-full h-full object-cover rounded-lg border border-slate-200 dark:border-slate-600" 
                      />
                      <button 
                        onClick={() => handlePhotoRemove(photo)} 
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Remove photo"
                      >
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                      <div className="absolute bottom-2 left-2 px-2 py-1 bg-slate-500/80 text-white text-xs rounded">
                        Legacy
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Bar */}
      <div className={`fixed bottom-0 left-0 right-0 ${isSidebarExpanded ? 'lg:left-64' : 'lg:left-20'} bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-700 shadow-lg z-50 transition-all duration-300`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={onCancel}
              className="flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-5 py-2.5 text-slate-600 dark:text-slate-400 font-medium hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="hidden sm:inline">Cancel</span>
            </button>
            
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 min-h-[44px] px-5 sm:px-6 py-2.5 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-semibold rounded-lg shadow-lg shadow-teal-500/25 hover:shadow-teal-500/40 transform hover:-translate-y-0.5 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Save</span>
            </button>
          </div>        
        </div>
      </div>
      {/* Spacer for fixed action bar */}
      <div className="h-24"></div>
    </div>
  );
};

export default MaintenanceRecordEditor;
