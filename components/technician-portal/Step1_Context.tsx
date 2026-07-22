import React from 'react';
import { BuildingOfficeIcon, MapPinIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline';
import { StarRating } from '../form-ui/StarRating';
import TechCard from './ui/TechCard';
import SelectDrawer from './ui/SelectDrawer';
import TechButton from './ui/TechButton';
import TechInput from './ui/TechInput';
import { ar } from '../../utils/arabicTranslations';

export interface Step1ContextData {
  date: string;
  companyId: string | null;
  branchId: string | null;
  visitZone: 'cairo' | 'outside_cairo' | 'el_sahel' | null;
  clientBaristaName: string;
  clientBaristaRating: number;
}

interface Step1ContextProps {
  data: Step1ContextData;
  onChange: (data: Step1ContextData) => void;
  companies: { id: string; companyName: string; branches: any[] }[];
  loadingCompanies: boolean;
  sortedZones?: { value: string; label: string }[];
}

const defaultZones = [
  { value: 'cairo', label: ar.step3.cairo },
  { value: 'outside_cairo', label: ar.step3.outsideCairo },
  { value: 'el_sahel', label: ar.step3.elSahel },
];

const Step1_Context: React.FC<Step1ContextProps> = ({
  data,
  onChange,
  companies,
  loadingCompanies,
  sortedZones,
}) => {
  const zones = sortedZones || defaultZones;
  const selectedCompany = companies.find(c => c.id === data.companyId);
  const branches = selectedCompany?.branches || [];

  const handleZoneSelect = (zone: 'cairo' | 'outside_cairo' | 'el_sahel') => {
    onChange({ ...data, visitZone: zone });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Sector Selection (Company & Branch) */}
      <TechCard title={ar.tactical.missionSector} icon={<BuildingOfficeIcon />} variant="active">
        <div className="space-y-4">
             <SelectDrawer 
                label={ar.step1.companyLabel}
                value={data.companyId}
                options={companies.map(c => ({ value: c.id, label: c.companyName }))}
                onChange={(val) => onChange({ ...data, companyId: String(val), branchId: null })}
                searchable
                placeholder={loadingCompanies ? ar.common.loading : ar.step1.companyPlaceholder}
                disabled={loadingCompanies}
                icon={<BuildingOfficeIcon className="w-5 h-5" />}
             />

             {data.companyId && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <SelectDrawer
                        label={ar.step1.branchLabel}
                        value={data.branchId}
                        options={branches.map((b: any) => ({ value: b.id || b.branchId, label: b.branchName || b.name }))}
                        onChange={(val) => onChange({ ...data, branchId: String(val) })}
                        placeholder={ar.step1.branchPlaceholder}
                        icon={<MapPinIcon className="w-5 h-5" />}
                    />
                </div>
             )}
        </div>
      </TechCard>

      {/* Zone Deployment */}
      <TechCard title={ar.tactical.deploymentZone} icon={<MapPinIcon />}>
        <div className="grid grid-cols-1 gap-3">
          {zones.map((zone) => (
             <TechButton
                key={zone.value}
                variant={data.visitZone === zone.value ? 'primary' : 'secondary'}
                onClick={() => handleZoneSelect(zone.value as any)}
                className="justify-between"
             >
                {zone.label}
                {data.visitZone === zone.value && <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />}
             </TechButton>
          ))}
        </div>
      </TechCard>

      {/* Operation Timestamp */}
      <TechCard title={ar.tactical.operationDate} icon={<CalendarIcon />}>
          <TechInput 
             type="date"
             value={data.date || new Date().toISOString().split('T')[0]}
             onChange={(e) => onChange({ ...data, date: e.target.value })}
          />
      </TechCard>

       {/* On-Site Contact (Optional) */}
       <TechCard title={ar.tactical.onSiteContact} icon={<UserIcon />}>
          <div className="space-y-4">
              <TechInput
                  label={ar.step1.clientBaristaLabel}
                  placeholder={ar.step1.clientBaristaPlaceholder}
                  value={data.clientBaristaName}
                  onChange={(e) => onChange({ ...data, clientBaristaName: e.target.value })}
                  autoScroll
              />
              
              <StarRating
                  value={data.clientBaristaRating || 0}
                  onChange={(v) => onChange({ ...data, clientBaristaRating: v })}
                  size="lg"
                  showNA
                  showNumeric
                  label={ar.step1.ratingLabel}
                  className="bg-cream-2 p-4 rounded-xl border border-hairline"
                />
          </div>
       </TechCard>

    </div>
  );
};

export default Step1_Context;