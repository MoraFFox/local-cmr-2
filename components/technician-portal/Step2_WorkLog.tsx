import React from 'react';
import {
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  CheckCircleIcon,
  CameraIcon,
  DocumentTextIcon,
  TrashIcon,
  UserIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import TechCard from './ui/TechCard';
import TechButton from './ui/TechButton';
import TechInput from './ui/TechInput';
import CheckboxGroup from '../CheckboxGroup';
import ServiceSelector from '../ServiceSelector';
import PartsSelector from '../PartsSelector';
import { ar } from '../../utils/arabicTranslations';
import { Service, Part } from '../../types';
import { problemCategories } from '../../constants';

export interface Step2WorkLogData {
  visitType: 'problem' | 'scheduled';
  hadProblem: boolean;
  problems: string[];
  servicesPerformed: { name: string; count: number }[];
  partsWereReplaced: boolean;
  partsReplaced: { name: string; count: number }[];
  problemSolved: boolean;
  photos: {
    id: string;
    file: File;
    preview: string;
    type: 'before' | 'after';
    compressed: boolean;
    originalSize: number;
    compressedSize?: number;
  }[];
  notes: string;
  clientSupervisorName?: string;
  clientSupervisorPhone?: string;
}

interface Step2WorkLogProps {
  data: Step2WorkLogData;
  onChange: (data: Step2WorkLogData) => void;
  onCameraOpen: () => void;
  sortedServices?: Service[];
  sortedParts?: Part[];
  sortedProblemCategories?: typeof problemCategories;
}

const predefinedProblemValues = problemCategories.flatMap((cat) =>
  cat.options.map((opt) => opt.value)
);

const Step2WorkLog: React.FC<Step2WorkLogProps> = ({
  data,
  onChange,
  onCameraOpen,
  sortedServices,
  sortedParts,
  sortedProblemCategories,
}) => {
  const handleVisitTypeChange = (type: 'problem' | 'scheduled') => {
    if (type === 'scheduled') {
      onChange({
        ...data,
        visitType: type,
        hadProblem: false,
        problems: [],
      });
    } else {
      onChange({
        ...data,
        visitType: type,
        hadProblem: true,
      });
    }
  };

  const handleProblemsChange = (problems: string[]) => {
    onChange({ ...data, problems });
  };

  const handleServicesChange = (
    servicesPerformed: { name: string; count: number }[]
  ) => {
    onChange({ ...data, servicesPerformed });
  };

  const handlePartsWereReplacedChange = (value: boolean) => {
    if (!value) {
      onChange({
        ...data,
        partsWereReplaced: value,
        partsReplaced: [],
      });
    } else {
      onChange({
        ...data,
        partsWereReplaced: value,
      });
    }
  };

  const handlePartsChange = (
    partsReplaced: { name: string; count: number }[]
  ) => {
    onChange({ ...data, partsReplaced });
  };

  const handleProblemSolvedChange = (value: boolean) => {
    onChange({ ...data, problemSolved: value });
  };

  const handleNotesChange = (notes: string) => {
    onChange({ ...data, notes });
  };

  const handleRemovePhoto = (photoId: string) => {
    onChange({
      ...data,
      photos: data.photos.filter((p) => p.id !== photoId),
    });
  };

  const problemCategoriesToUse = sortedProblemCategories || problemCategories;
  const servicesToUse = sortedServices || [];
  const partsToUse = sortedParts || [];

  const beforePhotos = data.photos.filter((p) => p.type === 'before');
  const afterPhotos = data.photos.filter((p) => p.type === 'after');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* 1. Mission Type Selection */}
      <TechCard title={ar.tactical.missionObjective} icon={<WrenchScrewdriverIcon/>} variant="primary">
         <div className="grid grid-cols-2 gap-4">
            <TechButton 
                variant={data.visitType === 'problem' ? 'danger' : 'secondary'}
                onClick={() => handleVisitTypeChange('problem')}
                className="flex flex-col items-center justify-center h-24 gap-2"
            >
                <ExclamationTriangleIcon className="w-8 h-8" />
                <span className="text-sm font-bold">{ar.portal.problemVisit}</span>
            </TechButton>

            <TechButton 
                variant={data.visitType === 'scheduled' ? 'primary' : 'secondary'}
                onClick={() => handleVisitTypeChange('scheduled')}
                className="flex flex-col items-center justify-center h-24 gap-2"
            >
                <WrenchScrewdriverIcon className="w-8 h-8" />
                <span className="text-sm font-bold">{ar.portal.scheduledVisit}</span>
            </TechButton>
         </div>

         {data.visitType === 'scheduled' && (
            <div className="mt-4 p-4 bg-primary/10 border border-primary/30 rounded-xl flex items-center gap-3 animate-in fade-in">
                <CheckCircleIcon className="w-6 h-6 text-primary" />
                <div className="text-sm text-ink">
                    <p className="font-bold">{ar.portal.routineMaintenance}</p>
                    <p className="opacity-80">{ar.portal.routineHint}</p>
                </div>
            </div>
         )}
      </TechCard>

      {/* 2. Problem Identification (If Problem Visit) */}
      {data.visitType === 'problem' && (
        <TechCard title={ar.tactical.problemDiagnostics} icon={<ExclamationTriangleIcon/>} variant="danger">
           <CheckboxGroup
             categories={problemCategoriesToUse}
             selectedValues={data.problems}
             onChange={handleProblemsChange}
             predefinedProblems={predefinedProblemValues}
           />
        </TechCard>
      )}

      {/* 3. Protocols Executed (Services) */}
      <TechCard title={ar.tactical.executionLog} icon={<WrenchScrewdriverIcon />} variant="active">
        <ServiceSelector
           options={servicesToUse}
           selectedValues={data.servicesPerformed}
           onChange={handleServicesChange}
        />
      </TechCard>

      {/* 4. Equipment Replacement (If Problem Visit) */}
      {data.visitType === 'problem' && (
        <TechCard title={ar.tactical.partsReplacement} icon={<WrenchScrewdriverIcon />} variant="warning">
            <div className="bg-espresso p-1 rounded-xl flex mb-4 border border-hairline">
                <button
                    onClick={() => handlePartsWereReplacedChange(true)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${data.partsWereReplaced ? 'bg-primary text-white shadow-lg' : 'text-latte hover:text-ink'}`}
                >
                    {ar.step2.partsReplacedYes}
                </button>
                <button
                    onClick={() => handlePartsWereReplacedChange(false)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${!data.partsWereReplaced ? 'bg-espresso-light text-cream' : 'text-latte hover:text-ink'}`}
                >
                    {ar.step2.partsReplacedNo}
                </button>
            </div>

            {data.partsWereReplaced && (
                <div className="animate-in fade-in slide-in-from-top-2">
                    <PartsSelector
                        options={partsToUse}
                        selectedValues={data.partsReplaced}
                        onChange={handlePartsChange}
                    />
                </div>
            )}
        </TechCard>
      )}

      {/* 5. Mission Outcome (If Problem Visit) */}
      {data.visitType === 'problem' && (
         <TechCard title={ar.tactical.missionOutcome} icon={<CheckCircleIcon />} variant="primary">
            <div className="bg-espresso p-1 rounded-xl flex border border-hairline">
                <button
                    onClick={() => handleProblemSolvedChange(true)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${data.problemSolved ? 'bg-leaf-500 text-white shadow-lg shadow-leaf-500/20' : 'text-latte hover:text-ink'}`}
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    {ar.step2.problemSolvedYes}
                </button>
                <button
                    onClick={() => handleProblemSolvedChange(false)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!data.problemSolved ? 'bg-ember-500 text-white shadow-lg shadow-ember-500/20' : 'text-latte hover:text-ink'}`}
                >
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    {ar.step2.problemSolvedNo}
                </button>
            </div>
         </TechCard>
      )}

      {/* 6. Photos - Before/After (Required) */}
      <TechCard title={ar.tactical.evidenceLocker} icon={<CameraIcon />}>
         <div className="space-y-4">
            {/* Before Photos */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-latte">{ar.portal.beforeMaintenance}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${beforePhotos.length > 0 ? 'bg-leaf-500/20 text-leaf-600' : 'bg-ember-500/20 text-ember-700'}`}>
                        {beforePhotos.length > 0 ? `${beforePhotos.length} صور` : 'مطلوب'}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {beforePhotos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-hairline group">
                            <img src={photo.preview} alt={ar.portal.beforeMaintenance} className="w-full h-full object-cover" />
                            <button onClick={() => handleRemovePhoto(photo.id)} className="absolute top-1 right-1 p-1 bg-ember-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="حذف الصورة">
                                <TrashIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={onCameraOpen}
                        className="aspect-square rounded-lg border-2 border-dashed border-hairline bg-cream-2/30 hover:bg-cream-3 hover:border-leaf-500/50 transition-colors flex flex-col items-center justify-center gap-1"
                        aria-label={`${ar.portal.capturePhoto} - ${ar.portal.beforeMaintenance}`}
                    >
                        <CameraIcon className="w-6 h-6 text-leaf-600" />
                        <span className="text-[10px] text-latte">{ar.tactical.tapToCapture}</span>
                    </button>
                </div>
            </div>

            {/* After Photos */}
            <div>
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-latte">{ar.portal.afterMaintenance}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${afterPhotos.length > 0 ? 'bg-leaf-500/20 text-leaf-600' : 'bg-ember-500/20 text-ember-700'}`}>
                        {afterPhotos.length > 0 ? `${afterPhotos.length} صور` : 'مطلوب'}
                    </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {afterPhotos.map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-hairline group">
                            <img src={photo.preview} alt={ar.portal.afterMaintenance} className="w-full h-full object-cover" />
                            <button onClick={() => handleRemovePhoto(photo.id)} className="absolute top-1 right-1 p-1 bg-ember-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity" aria-label="حذف الصورة">
                                <TrashIcon className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={onCameraOpen}
                        className="aspect-square rounded-lg border-2 border-dashed border-hairline bg-cream-2/30 hover:bg-cream-3 hover:border-leaf-500/50 transition-colors flex flex-col items-center justify-center gap-1"
                        aria-label={`${ar.portal.capturePhoto} - ${ar.portal.afterMaintenance}`}
                    >
                        <CameraIcon className="w-6 h-6 text-leaf-600" />
                        <span className="text-[10px] text-latte">{ar.tactical.tapToCapture}</span>
                    </button>
                </div>
            </div>
         </div>
      </TechCard>

      {/* 7. Client Supervisor Contact */}
      <TechCard title={ar.tactical.clientContact} icon={<UserIcon />} variant="active">
        <div className="space-y-4">
          <TechInput
            label={ar.tactical.clientSupervisorName}
            value={data.clientSupervisorName || ''}
            onChange={(e) => onChange({ ...data, clientSupervisorName: e.target.value })}
            placeholder={ar.tactical.clientSupervisorName}
            required
          />
          <TechInput
            label={ar.tactical.clientSupervisorPhone}
            value={data.clientSupervisorPhone || ''}
            onChange={(e) => onChange({ ...data, clientSupervisorPhone: e.target.value })}
            placeholder={ar.tactical.clientSupervisorPhone}
            type="tel"
            required
          />
        </div>
      </TechCard>

      {/* 8. Field Notes */}
      <TechCard title={ar.tactical.fieldNotes} icon={<DocumentTextIcon />}>
         <textarea
            value={data.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={ar.step3.notesPlaceholder}
            rows={4}
            className="w-full bg-cream text-ink p-4 rounded-xl border border-hairline focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none resize-none placeholder-latte"
         />
      </TechCard>

    </div>
  );
};

export default Step2WorkLog;
