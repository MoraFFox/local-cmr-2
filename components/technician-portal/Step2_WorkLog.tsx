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
            <div className="mt-4 p-4 bg-teal-500/10 border border-teal-500/30 rounded-xl flex items-center gap-3 animate-in fade-in">
                <CheckCircleIcon className="w-6 h-6 text-teal-400" />
                <div className="text-sm text-teal-200">
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
            <div className="bg-slate-900/50 p-1 rounded-xl flex mb-4 border border-slate-700/50">
                <button
                    onClick={() => handlePartsWereReplacedChange(true)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${data.partsWereReplaced ? 'bg-amber-500 text-slate-900 shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    {ar.step2.partsReplacedYes}
                </button>
                <button
                    onClick={() => handlePartsWereReplacedChange(false)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${!data.partsWereReplaced ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'}`}
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
            <div className="bg-slate-900/50 p-1 rounded-xl flex border border-slate-700/50">
                <button
                    onClick={() => handleProblemSolvedChange(true)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${data.problemSolved ? 'bg-teal-500 text-slate-900 shadow-lg shadow-teal-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <CheckCircleIcon className="w-5 h-5" />
                    {ar.step2.problemSolvedYes}
                </button>
                <button
                    onClick={() => handleProblemSolvedChange(false)}
                    className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${!data.problemSolved ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    {ar.step2.problemSolvedNo}
                </button>
            </div>
         </TechCard>
      )}

      {/* 6. Evidence Locker (Photos) */}
      <TechCard title={ar.tactical.evidenceLocker} icon={<CameraIcon />}>
         <div className="grid grid-cols-2 gap-3 mb-4">
            <TechButton onClick={onCameraOpen} variant="secondary" className="h-full py-6 flex flex-col items-center justify-center gap-2 border-dashed border-2 border-slate-700 bg-slate-900/30 hover:bg-slate-800">
                <CameraIcon className="w-8 h-8 text-teal-400" />
                <span className="text-xs font-bold text-teal-400 uppercase tracking-widest">{ar.tactical.tapToCapture}</span>
            </TechButton>
            
            {/* Photo Preview Grid */}
            <div className="grid grid-cols-2 gap-2">
                {data.photos.length > 0 ? (
                    data.photos.slice(0, 3).map((photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                            <img src={photo.preview} alt="Evidence" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => handleRemovePhoto(photo.id)} className="p-2 bg-red-500 rounded-full text-white">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/60 text-[10px] text-white rounded font-mono border border-white/10">
                                {photo.type === 'before' ? ar.portal.beforeMaintenance : ar.portal.afterMaintenance}
                            </span>
                        </div>
                    ))
                ) : (
                    <div className="col-span-2 flex items-center justify-center text-slate-600 text-xs italic">
                        {ar.portal.noPhotosYet}
                    </div>
                )}
                {data.photos.length > 3 && (
                    <div className="aspect-square rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                        <span className="text-slate-400 font-bold">+{data.photos.length - 3}</span>
                    </div>
                )}
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
            className="w-full bg-slate-950 text-slate-200 p-4 rounded-xl border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500/50 outline-none resize-none placeholder-slate-600"
         />
      </TechCard>

    </div>
  );
};

export default Step2WorkLog;
