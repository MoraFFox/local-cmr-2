import React from 'react';
import {
  BuildingOfficeIcon,
  WrenchScrewdriverIcon,
  MapPinIcon,
  CalendarIcon,
  CheckBadgeIcon,
  PencilIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import TechCard from './ui/TechCard';
import TechButton from './ui/TechButton';
import TechInput from './ui/TechInput';
import { StarRating } from '../form-ui/StarRating';
import { useT } from '../../utils/i18n';
import { getVisitZoneLabel } from '../../utils/visitZones';
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
  const t = useT();
  const renderDataRow = (label: string, value: string | React.ReactNode) => (
    <div className="flex justify-between ltr:items-start rtl:items-end py-2 border-b border-dashed border-hairline last:border-0">
      <span className="text-sm text-latte">{label}</span>
      <span className="text-sm font-medium text-primary text-end max-w-[60%] break-words">
        {value}
      </span>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24">
      
      {/* 1. Mission Intel Summary */}
      <TechCard 
        title={t.tactical.missionIntel} 
        icon={<BuildingOfficeIcon />} 
        variant="primary"
        action={
            <button onClick={() => onEditStep(1)} className="p-2 hover:bg-cream-2 rounded text-latte hover:text-primary transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={t.common.edit}>
                <PencilIcon className="w-4 h-4" />
            </button>
        }
      >
        <div className="space-y-1">
          {renderDataRow(t.review.company, companyName || '-')}
          {renderDataRow(t.review.branch, branchName || t.step1.branchPlaceholder)}
          {renderDataRow(t.review.date, step1Data.date || '-')}
          {renderDataRow(t.review.visitZone, step1Data.visitZone ? getVisitZoneLabel(step1Data.visitZone) : '-')}
        </div>
      </TechCard>

      {/* 2. Operations Summary */}
      <TechCard 
        title={t.tactical.operationsLog} 
        icon={<WrenchScrewdriverIcon />} 
        variant="active"
        action={
            <button onClick={() => onEditStep(2)} className="p-2 hover:bg-cream-2 rounded text-latte hover:text-leaf-600 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label={t.common.edit}>
                <PencilIcon className="w-4 h-4" />
            </button>
        }
      >
         <div className="space-y-4">
            <div className={`p-3 rounded-lg border flex items-center gap-3 ${
                step2Data.visitType === 'problem'
                ? 'bg-ember-500/10 border-ember-500/30 text-ember-700'
                : step2Data.visitType === 'logistics'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-700'
                : 'bg-leaf-500/10 border-leaf-500/30 text-leaf-600'
            }`}>
               {step2Data.visitType === 'problem' ? (
                   <>
                     <div className="p-1 bg-ember-500/20 rounded"><WrenchScrewdriverIcon className="w-5 h-5"/></div>
                     <span className="font-bold">{t.portal.problemVisit}</span>
                   </>
               ) : step2Data.visitType === 'logistics' ? (
                   <>
                     <div className="p-1 bg-amber-500/20 rounded"><TruckIcon className="w-5 h-5"/></div>
                     <span className="font-bold">{t.portal.logisticsVisit}</span>
                   </>
               ) : (
                   <>
                     <div className="p-1 bg-leaf-500/20 rounded"><CheckBadgeIcon className="w-5 h-5"/></div>
                     <span className="font-bold">{t.portal.scheduledVisit}</span>
                   </>
               )}
            </div>

            {/* Services */}
            {step2Data.servicesPerformed.length > 0 && (
                <div>
                    <h4 className="text-xs font-bold uppercase text-latte mb-2">{t.tactical.executedProtocols}</h4>
                    <div className="bg-cream-2/50 rounded-lg p-2 border border-hairline space-y-2">
                        {step2Data.servicesPerformed.map((s, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                                <span className="text-primary">{s.name}</span>
                                <span className="text-leaf-600 font-mono">x{s.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Parts */}
            {step2Data.partsWereReplaced && step2Data.partsReplaced.length > 0 && (
                <div>
                   <h4 className="text-xs font-bold uppercase text-latte mb-2">{t.tactical.replacedHardware}</h4>
                   <div className="bg-cream-2/50 rounded-lg p-2 border border-hairline space-y-2">
                       {step2Data.partsReplaced.map((p, idx) => (
                           <div key={idx} className="flex justify-between text-sm">
                               <span className="text-primary">{p.name}</span>
                               <span className="text-primary font-mono">x{p.count}</span>
                           </div>
                       ))}
                   </div>
                </div>
            )}
         </div>
      </TechCard>

      {/* 3. Client Supervisor */}
      <TechCard title={t.tactical.clientContact} icon={<CheckBadgeIcon />}>
          <div className="space-y-4">
              <TechInput
                  label={t.tactical.clientSupervisorName}
                  value={step2Data.clientSupervisorName || ''}
                  onChange={onUpdateSupervisorName}
                  placeholder={t.tactical.clientSupervisorName}
                  autoScroll
              />
              <TechInput
                  label={t.tactical.clientSupervisorPhone}
                  value={step2Data.clientSupervisorPhone || ''}
                  onChange={onUpdateSupervisorPhone}
                  placeholder={t.tactical.clientSupervisorPhone}
                  type="tel"
                  autoScroll
              />
          </div>
      </TechCard>

      {/* 4. Debrief & Feedback */}
      <TechCard title={t.tactical.debrief} icon={<CheckBadgeIcon />}>
         <div className="space-y-4">
             {/* Problem Solved Toggle (Quick Edit) */}
             {step2Data.visitType === 'problem' && (
                 <div className="flex items-center justify-between p-3 bg-cream-2 border border-hairline rounded-xl">
                     <span className="text-sm font-medium text-primary">{t.step2.problemSolvedLabel}</span>
                     <div className="flex items-center gap-2">
                         <button
                            onClick={() => onUpdateProblemSolved(true)}
                            className={`px-4 py-2 min-h-[44px] rounded text-sm font-bold transition-all ${step2Data.problemSolved ? 'bg-leaf-500 text-white' : 'text-latte bg-cream-3'}`}
                         >
                            {t.common.yes}
                         </button>
                         <button
                            onClick={() => onUpdateProblemSolved(false)}
                            className={`px-4 py-2 min-h-[44px] rounded text-sm font-bold transition-all ${!step2Data.problemSolved ? 'bg-ember-500 text-white' : 'text-latte bg-cream-3'}`}
                         >
                            {t.common.no}
                         </button>
                     </div>
                 </div>
             )}
             
             {/* Rating */}
             {step1Data.clientBaristaName && (
                 <div className="p-3 bg-cream-2 border border-hairline rounded-xl">
                     <div className="flex justify-between items-center mb-2">
                         <span className="text-sm font-medium text-primary">{step1Data.clientBaristaName}</span>
                         <span className="text-xs text-latte">{t.tactical.clientContact}</span>
                     </div>
                     <StarRating 
                        value={step1Data.clientBaristaRating || 0}
                        onChange={onUpdateRating}
                        size="lg"
                        showNA
                        showNumeric
                     />
                 </div>
             )}

             {step2Data.notes && (
                 <div className="p-3 bg-cream-2 border border-hairline rounded-xl">
                     <h4 className="text-xs font-bold uppercase text-latte mb-1">{t.tactical.fieldNotes}</h4>
                     <p className="text-sm text-primary italic">"{step2Data.notes}"</p>
                 </div>
             )}
         </div>
      </TechCard>
      
    </div>
  );
};

export default Step3Summary;