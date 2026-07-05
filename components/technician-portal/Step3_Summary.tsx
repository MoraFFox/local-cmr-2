import React from 'react';
import {
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  CalendarIcon,
  CheckBadgeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import TechCard from './ui/TechCard';
import TechButton from './ui/TechButton';
import TechInput from './ui/TechInput';
import CompactStarRating from './CompactStarRating';
import { ar } from '../../utils/arabicTranslations';
import { Step1ContextData } from './Step1_Context';
import { Step2WorkLogData } from './Step2_WorkLog';

interface Step3SummaryProps {
  step1Data: Step1ContextData;
  step2Data: Step2WorkLogData;
  companyName?: string;
  branchName?: string;
  onEditStep: (step: number) => void;
  onUpdateRating: (rating: number) => void;

  onUpdateProblemSolved: (solved: boolean) => void;
  onUpdateSupervisorName: (name: string) => void;
  onUpdateSupervisorPhone: (phone: string) => void;
}

const zoneLabels = {
  cairo: ar.step3.cairo,
  outside_cairo: ar.step3.outsideCairo,
  el_sahel: ar.step3.elSahel,
};

const Step3Summary: React.FC<Step3SummaryProps> = ({
  step1Data,
  step2Data,
  companyName,
  branchName,
  onEditStep,
  onUpdateRating,

  onUpdateProblemSolved,
  onUpdateSupervisorName,
  onUpdateSupervisorPhone,
}) => {
  const renderDataRow = (label: string, value: string | React.ReactNode) => (
    <div className="flex justify-between items-start py-2 border-b border-dashed border-slate-800 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-200 text-right max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* 1. Mission Intel Summary */}
      <TechCard 
        title={ar.tactical.missionIntel} 
        icon={<BuildingOfficeIcon />} 
        variant="primary"
        action={
            <button onClick={() => onEditStep(1)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-teal-400 transition-colors">
                <PencilIcon className="w-4 h-4" />
            </button>
        }
      >
        <div className="space-y-1">
          {renderDataRow(ar.review.company, companyName || '-')}
          {renderDataRow(ar.review.branch, branchName || ar.step1.branchPlaceholder)}
          {renderDataRow(ar.review.date, step1Data.date || '-')}
          {renderDataRow(ar.review.visitZone, step1Data.visitZone ? zoneLabels[step1Data.visitZone] : '-')}
        </div>
      </TechCard>

      {/* 2. Operations Summary */}
      <TechCard 
        title={ar.tactical.operationsLog} 
        icon={<WrenchScrewdriverIcon />} 
        variant="active"
        action={
            <button onClick={() => onEditStep(2)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-success-400 transition-colors" aria-label="تعديل">
                <PencilIcon className="w-4 h-4" />
            </button>
        }
      >
         <div className="space-y-4">
            <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                step2Data.visitType === 'problem'
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-success-500/10 border-success-500/30 text-success-400'
            }`}>
               {step2Data.visitType === 'problem' ? (
                   <>
                     <div className="p-1 bg-red-500/20 rounded"><WrenchScrewdriverIcon className="w-5 h-5"/></div>
                     <span className="font-bold">{ar.portal.problemVisit}</span>
                   </>
               ) : (
                   <>
                     <div className="p-1 bg-success-500/20 rounded"><CheckBadgeIcon className="w-5 h-5"/></div>
                     <span className="font-bold">{ar.portal.scheduledVisit}</span>
                   </>
               )}
            </div>

            {/* Services */}
            {step2Data.servicesPerformed.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">{ar.tactical.executedProtocols}</h4>
                    <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800 space-y-2">
                        {step2Data.servicesPerformed.map((s, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-slate-300">{s.name}</span>
                                <span className="text-success-400 font-mono">x{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Parts */}
            {step2Data.partsWereReplaced && step2Data.partsReplaced.length > 0 && (
                <div>
                   <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">{ar.tactical.replacedHardware}</h4>
                   <div className="bg-slate-950/50 rounded-lg p-2 border border-slate-800 space-y-2">
                       {step2Data.partsReplaced.map((p, idx) => (
                           <div key={idx} className="flex justify-between text-sm">
                               <span className="text-slate-300">{p.name}</span>
                               <span className="text-amber-400 font-mono">x{p.count}</span>
                           </div>
                       ))}
                   </div>
                </div>
            )}
         </div>
      </TechCard>

      {/* 3. Client Supervisor */}
      <TechCard title={ar.tactical.clientContact} icon={<CheckBadgeIcon />}>
          <div className="space-y-4">
              <TechInput
                  label={ar.tactical.clientSupervisorName}
                  value={step2Data.clientSupervisorName || ''}
                  onChange={onUpdateSupervisorName}
                  placeholder={ar.tactical.clientSupervisorName}
              />
              <TechInput
                  label={ar.tactical.clientSupervisorPhone}
                  value={step2Data.clientSupervisorPhone || ''}
                  onChange={onUpdateSupervisorPhone}
                  placeholder={ar.tactical.clientSupervisorPhone}
                  type="tel"
              />
          </div>
      </TechCard>

      {/* 4. Debrief & Feedback */}
      <TechCard title={ar.tactical.debrief} icon={<CheckBadgeIcon />}>
         <div className="space-y-4">
             {/* Problem Solved Toggle (Quick Edit) */}
             {step2Data.visitType === 'problem' && (
                 <div className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                     <span className="text-sm font-medium text-slate-300">{ar.step2.problemSolvedLabel}</span>
                     <div className="flex items-center gap-2">
                         <button 
                            onClick={() => onUpdateProblemSolved(true)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${step2Data.problemSolved ? 'bg-success-500 text-slate-900' : 'text-slate-500 bg-slate-800'}`}
                         >
                            {ar.common.yes}
                         </button>
                         <button 
                            onClick={() => onUpdateProblemSolved(false)}
                            className={`px-3 py-1 rounded text-xs font-bold transition-all ${!step2Data.problemSolved ? 'bg-red-500 text-white' : 'text-slate-500 bg-slate-800'}`}
                         >
                            {ar.common.no}
                         </button>
                     </div>
                 </div>
             )}
             
             {/* Rating */}
             {step1Data.clientBaristaName && (
                 <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-medium text-slate-300">{step1Data.clientBaristaName}</span>
                         <span className="text-xs text-slate-500">{ar.tactical.clientContact}</span>
                     </div>
                     <CompactStarRating 
                        value={step1Data.clientBaristaRating}
                        onChange={onUpdateRating}
                        size="lg"
                     />
                 </div>
             )}

             {step2Data.notes && (
                 <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                     <h4 className="text-xs font-bold uppercase text-slate-500 mb-1">{ar.tactical.fieldNotes}</h4>
                     <p className="text-sm text-slate-300 italic">"{step2Data.notes}"</p>
                 </div>
             )}
         </div>
      </TechCard>
      
    </div>
  );
};

export default Step3Summary;