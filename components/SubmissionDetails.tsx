/** @format */

import React, { useState, useMemo, useRef, useEffect, useId } from "react";
import { createPortal } from "react-dom";
import { useFloatingMenu } from "../hooks/useFloatingMenu";
import {
  FormData,
  MaintenanceRecord,
  Branch,
  Contact,
  Barista,
  MaintenancePhoto,
  Machine,
} from "../types";
import CollapsibleCard from "./CollapsibleCard";
import Avatar from "./Avatar";
import {
  generateInternalCompanyReport,
  generateInternalBranchReport,
  generateClientCompanyReport,
  generateClientBranchReport,
  generateCostCompanyReport,
  generateCostBranchReport,
  generateInternalVisitReport,
  generateClientVisitReport,
  generateCostVisitReport,
} from "../utils/internalReportPdf";
import { useLogisticsOperations } from "../hooks/useLogisticsOperations";
import DateRangeExportModal from "./DateRangeExportModal";
import { DateRange, filterMaintenanceByDateRange, getReportRecords } from "../utils/dateRangeFilter";
import { getVisitZoneLabel } from "../utils/visitZones";
import { getMachineOwnershipStatus } from "./ReviewStep";
import {
  generateMissingDataPDF,
  parseMissingDataPDF,
  applyParsedMissingData,
} from "../utils/missingDataPdf";
import { logger } from "../utils/logger";
import { useToast } from "./ToastContext";
import { useT } from "../utils/i18n";
import { ConfirmDialog } from "./ui/ConfirmDialog";
import {
  PrinterIcon,
  ArrowLeftIcon,
  MapPinIcon,
  EnvelopeIcon,
  IdentificationIcon,
  PhoneIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
  ClipboardDocumentCheckIcon,
  CubeIcon,
  PencilSquareIcon,
  UserIcon,
  CheckBadgeIcon,
  StarIcon,
  CalendarIcon,
  XMarkIcon,
  ChevronDownIcon,
  ExclamationCircleIcon,
  ClipboardDocumentListIcon,
  ArrowUturnLeftIcon,
  CameraIcon,
  DocumentArrowUpIcon,
  DocumentArrowDownIcon,
  ScaleIcon,
  TruckIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface SubmissionDetailsProps {
  submission: FormData & { created_at?: string };
  onBack: () => void;
  onUpdate?: (updated: FormData & { created_at?: string }) => void;
}

// --- HELPERS ---

const getBranchStats = (records: MaintenanceRecord[]) => {
  let visitCount = 0;
  const partsMap: Record<string, number> = {};

  const traverse = (recs: MaintenanceRecord[]) => {
    recs.forEach((r) => {
      visitCount++;
      if (r.partsReplaced) {
        r.partsReplaced.forEach((p) => {
          const qty = p.count || 0;
          partsMap[p.name] = (partsMap[p.name] || 0) + qty;
        });
      }
      if (r.followUpVisits) traverse(r.followUpVisits);
    });
  };

  traverse(records);
  return { visitCount, partsMap };
};

const formatSummaryDate = (value: string | null) => {
  if (!value) return null;

  // Maintenance dates are calendar dates, not instants. Parse date-only values
  // in local time so users west of UTC do not see the previous day.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  const date = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const getMaintenanceSummary = (records: MaintenanceRecord[]) => {
  const visits: MaintenanceRecord[] = [];

  const collect = (recs: MaintenanceRecord[]) => {
    recs.forEach((record) => {
      if (record.isLogisticsVisit) return;
      visits.push(record);
      if (record.followUpVisits) collect(record.followUpVisits);
    });
  };

  collect(records || []);
  const dates = visits.map((record) => record.maintenanceDate).filter(Boolean).sort();

  return {
    visitCount: visits.length,
    latestVisit: formatSummaryDate(dates[dates.length - 1] || null),
    openIssues: visits.filter((record) => record.hadProblem && !record.problemSolved).length,
  };
};

const SummaryMetric: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone?: "default" | "warning";
  testId?: string;
}> = ({ label, value, icon: Icon, tone = "default", testId }) => (
  <div className={`rounded-xl border p-3 ${tone === "warning" ? "border-amber-500/30 bg-amber-500/10" : "border-hairline bg-cream-2/50"}`} data-testid={testId}>
    <div className="flex items-center gap-2 text-xs font-semibold text-latte">
      <Icon className={`h-4 w-4 ${tone === "warning" ? "text-amber-500" : "text-primary"}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
    <div className="mt-1 text-lg font-bold text-text">{value}</div>
  </div>
);

const InfoTile: React.FC<{
  label: string;
  value: React.ReactNode;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}> = ({ label, value, icon: Icon }) => {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-cream-2/40 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-latte">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="mt-1 break-words text-sm font-semibold text-text">{value}</div>
    </div>
  );
};

const MachineList = ({
  entity,
  hideCosts = false,
}: {
  entity: {
    usesOurMachines: boolean | null;
    hasMultipleMachines?: boolean | null;
    machines?: Machine[];
  };
  hideCosts?: boolean;
}) => {
  // Mixed machine fleet: each machine carries its own owner status.
  if (entity.hasMultipleMachines === true) {
    if (!entity.machines || entity.machines.length === 0) {
      return <span>ماكينات مختلطة</span>;
    }
    return (
      <div className="space-y-2 mt-1 w-full">
        {entity.machines.map((m, idx) => {
          const isClientMachine = m.machineOwner === "client";
          let typeStr = isClientMachine ? "مكينة العميل" : "مكينتنا";
          if (!isClientMachine && m.machineOwnershipType) {
            typeStr = `مكينتنا (${m.machineOwnershipType.charAt(0).toUpperCase() + m.machineOwnershipType.slice(1)})`;
          }

          let costStr = "";
          if (!hideCosts && !isClientMachine && (m.machineOwnershipType === "leased" || m.machineOwnershipType === "consumption") && m.dailyLeaseCost) {
            costStr = ` - ${new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(m.dailyLeaseCost)} / day`;
          }

          const extras = [m.machineName, m.machineType, m.machineOption].filter(Boolean);
          let extrasStr = "";
          if (extras.length > 0) {
            extrasStr = ` | ${extras.join(" - ")}`;
          }

          return (
            <div key={idx} className="text-sm bg-cream-2 border border-hairline p-2 rounded w-full">
              <div className="font-semibold text-primary">{typeStr}{costStr}</div>
              {extrasStr && <div className="text-latte mt-1">{extrasStr.replace(" | ", "")}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  if (
    entity.usesOurMachines === null ||
    typeof entity.usesOurMachines === "undefined"
  ) {
    return <span>Not specified</span>;
  }
  if (entity.usesOurMachines === false) {
    return <span>مكينة العميل</span>;
  }

  if (!entity.machines || entity.machines.length === 0) {
    return <span>مكينتنا (لا توجد ماكينات مضافة)</span>;
  }

  return (
    <div className="space-y-2 mt-1 w-full">
      {entity.machines.map((m, idx) => {
        let typeStr = "نوع الاستحواذ غير محدد";
        if (m.machineOwnershipType) {
          typeStr = m.machineOwnershipType.charAt(0).toUpperCase() + m.machineOwnershipType.slice(1);
        }
        
        let costStr = "";
        if (!hideCosts && (m.machineOwnershipType === "leased" || m.machineOwnershipType === "consumption") && m.dailyLeaseCost) {
          costStr = ` - ${new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(m.dailyLeaseCost)} / day`;
        }

        const extras = [m.machineName, m.machineType, m.machineOption].filter(Boolean);
        let extrasStr = "";
        if (extras.length > 0) {
          extrasStr = ` | ${extras.join(" - ")}`;
        }

        return (
          <div key={idx} className="text-sm bg-cream-2 border border-hairline p-2 rounded w-full">
            <div className="font-semibold text-primary">{typeStr}{costStr}</div>
            {extrasStr && <div className="text-latte mt-1">{extrasStr.replace(" | ", "")}</div>}
          </div>
        );
      })}
    </div>
  );
};

const getPaidByLabel = (val: string) =>
  val === "company" ? "By Midos" : "By Client";

// --- SCREEN COMPONENTS (UI) ---

const InfoRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon?: any;
  label: string;
  value: string | number | null | undefined;
}) => {
  if (!value && value !== 0) return null;
  return (
    <div className='flex ltr:items-start rtl:items-end gap-2 text-sm py-1'>
      {Icon && <Icon className='w-4 h-4 text-latte mt-0.5 shrink-0' />}
      <span className='font-medium text-latte shrink-0'>
        {label}:
      </span>
      <span className='text-text break-all'>
        {value}
      </span>
    </div>
  );
};

const ContactList = ({
  contacts,
  emptyTitle = 'No contacts listed',
  emptyMessage = 'Add a contact for this location to make follow-up easier.',
}: {
  contacts: Contact[];
  emptyTitle?: string;
  emptyMessage?: string;
}) => {
  if (!contacts || contacts.length === 0) {
    return (
      <div className='flex min-h-[132px] flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-cream-2/40 px-4 py-5 text-center'>
        <UserGroupIcon className='mb-2 h-7 w-7 text-latte/70' aria-hidden='true' />
        <p className='text-sm font-semibold text-text'>{emptyTitle}</p>
        <p className='mt-1 max-w-xs text-xs leading-relaxed text-latte'>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
      {contacts.map((c) => (
        <div
          key={c.id}
          className='flex min-w-0 items-start gap-3 rounded-xl border border-hairline bg-cream-2/60 p-3 transition-colors hover:border-primary/40'
        >
          <Avatar name={c.name} />
          <div className='min-w-0 flex-1'>
            <p className='break-words text-sm font-bold leading-snug text-text' title={c.name}>
              {c.name}
            </p>
            <p className='mb-2 break-words text-xs font-semibold leading-snug text-latte'>
              {c.position === "custom" ? c.customPosition : c.position}
            </p>
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className='flex items-center gap-1 break-all text-xs text-text transition-colors hover:text-primary'
              >
                <EnvelopeIcon className='h-3 w-3 shrink-0 text-latte' />
                {c.email}
              </a>
            )}
            {c.phoneNumbers.map((p) => (
              <a
                key={p.id}
                href={`tel:${p.number}`}
                className='flex items-center gap-1 text-xs text-text transition-colors hover:text-primary'
              >
                <PhoneIcon className='h-3 w-3 shrink-0 text-latte' />
                {p.number}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const renderPhotoGroup = (
  photos: MaintenancePhoto[],
  type: "before" | "after" | "legacy",
  label: string,
) => {
  const filtered = photos.filter((p) => p.type === type);
  if (filtered.length === 0) return null;

  return (
    <div className="mb-3">
      <span className="text-sm font-medium text-latte">{label}</span>
      <div className="grid grid-cols-4 gap-2 mt-1">
        {filtered.map((photo, i) => (
          <a
            key={i}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative group"
          >
            <img
              src={photo.url}
              alt={`${label} photo ${i + 1}`}
              className="w-full h-20 object-cover rounded border border-hairline group-hover:ring-2 group-hover:ring-primary transition-all"
            />
          </a>
        ))}
      </div>
    </div>
  );
};

const MaintenanceRecordView: React.FC<{
  record: MaintenanceRecord;
  onExport?: (record: MaintenanceRecord, mode: "internal" | "client" | "cost", format: "pdf" | "word") => void;
}> = ({ record, onExport }) => {
  const t = useT();
  const [isExpanded, setIsExpanded] = useState(false);
  const hasOpenIssue = Boolean(record.hadProblem && !record.problemSolved);
  const accentClass = record.isLogisticsVisit
    ? 'border-amber-500/70 bg-amber-500/[0.04]'
    : hasOpenIssue
      ? 'border-ember-500/70 bg-ember-500/[0.035]'
      : 'border-primary/60 bg-cream-2/60';

  const detailCount =
    (record.machines?.length || 0) +
    (record.problems?.length || 0) +
    (record.servicesPerformed?.length || 0) +
    (record.partsReplaced?.length || 0) +
    (record.photos?.length || 0) +
    (record.followUpVisits?.length || 0) +
    (record.supervisors?.length || 0) +
    (record.notes ? 1 : 0) +
    (record.recommendations ? 1 : 0);
  const summaryItems = [
    record.problems?.length ? { key: 'issues', text: `${record.problems.length} ${record.problems.length === 1 ? t.admin.recordDetails.issue : t.admin.recordDetails.issues}` } : null,
    record.servicesPerformed?.length ? { key: 'services', text: `${record.servicesPerformed.length} ${record.servicesPerformed.length === 1 ? t.admin.recordDetails.service : t.admin.recordDetails.services}` } : null,
    record.partsReplaced?.length ? { key: 'parts', text: `${record.partsReplaced.length} ${record.partsReplaced.length === 1 ? t.admin.recordDetails.part : t.admin.recordDetails.parts}` } : null,
    record.photos?.length ? { key: 'photos', text: `${record.photos.length} ${record.photos.length === 1 ? t.admin.recordDetails.photo : t.admin.recordDetails.photos}` } : null,
  ].filter(Boolean) as Array<{ key: string; text: string }>;
  const detailsId = `maintenance-details-${record.id}`;
  const recordAccessibleName = `${isExpanded ? t.admin.recordDetails.hideDetails : t.admin.recordDetails.viewDetails} ${record.maintenanceDate}${record.baristaName ? ` — ${record.baristaName}` : ''}`;

  return (
    <article className={`relative mb-3 rounded-xl border-s-4 p-3 shadow-sm transition-shadow hover:shadow-md sm:mb-4 sm:p-5 ${accentClass}`}>
      {/* Compact scan header */}
      <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
        {/* Visit identity and status */}
        <div className='min-w-0 flex-1'>
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-base font-bold text-text' dir="ltr">
              {record.maintenanceDate}
            </span>
            <span className='rounded-full border border-hairline bg-cream px-2 py-0.5 text-[11px] font-semibold text-latte'>
              <bdi>{record.type}</bdi>
            </span>
            {record.isLogisticsVisit && (
              <span className='inline-flex items-center gap-1 rounded-full border border-amber-300/60 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-300'>
                <TruckIcon className="h-3 w-3" />
                {t.admin.recordDetails.logisticsVisit}
              </span>
            )}
            {hasOpenIssue && (
              <span className='inline-flex items-center gap-1 rounded-full border border-ember-500/30 bg-ember-500/10 px-2 py-0.5 text-[11px] font-bold text-ember-700 dark:text-ember-300'>
                <ExclamationCircleIcon className='h-3 w-3' />
                {t.admin.recordDetails.openIssue}
              </span>
            )}
          </div>

          <div className='mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-latte'>
            {record.baristaName && (
              <span className='inline-flex items-center gap-1 font-semibold text-text'>
                <UserIcon className="h-3.5 w-3.5 text-latte" />
                {record.baristaName}
              </span>
            )}
            {record.visitZone && (
              <span><bdi>{getVisitZoneLabel(record.visitZone)}</bdi></span>
            )}
            <span className='rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-text'>
              {t.admin.recordDetails.paidBy}: {record.paidBy === 'company' ? t.ui.maintenanceEditor.companyPays : t.ui.maintenanceEditor.customerPays}
            </span>
            {record.dailyLeaseCost && (
              <span className='inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-amber-500'>
                <BanknotesIcon className="h-3.5 w-3.5" />
                {record.dailyLeaseCost} ج.م.
              </span>
            )}
          </div>

        </div>

        {/* Secondary scheduling detail and export action */}
        <div className='flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:flex-col lg:items-end'>
          {record.nextVisitDate && (
            <div className='inline-flex items-center justify-end gap-1 text-xs font-semibold text-text'>
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>{t.admin.recordDetails.nextVisit}: <bdi>{record.nextVisitDate}</bdi></span>
            </div>
          )}
          {onExport && (
            <PrintDropdown
              label={t.admin.recordDetails.visitReport}
              onPrint={(mode, format) => onExport(record, mode, format)}
              className='w-full sm:w-auto [&>button]:w-full [&>button]:justify-center [&>button]:border [&>button]:border-primary/30 [&>button]:bg-transparent [&>button]:text-primary [&>button]:shadow-none [&>button]:hover:bg-primary/10 [&>button]:py-1.5 [&>button]:px-3 [&>button]:text-xs'
            />
          )}
        </div>
      </div>

      <div className='mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-latte'>
        {summaryItems.length > 0 ? (
          summaryItems.map((item) => <span key={item.key} className='rounded-full bg-cream-2 px-2 py-1'>{item.text}</span>)
        ) : (
          <span>{t.admin.recordDetails.noWorkDetails}</span>
        )}
        {record.followUpVisits?.length ? (
          <span className='rounded-full bg-primary/10 px-2 py-1 text-primary'>
            {record.followUpVisits.length} {record.followUpVisits.length === 1 ? t.admin.recordDetails.followUp : t.admin.recordDetails.followUps}
          </span>
        ) : null}
      </div>

      <div className='mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-hairline/70 pt-3'>
        <button
          type='button'
          aria-expanded={isExpanded}
          aria-controls={isExpanded ? detailsId : undefined}
          aria-label={recordAccessibleName}
          onClick={() => setIsExpanded((open) => !open)}
          className='inline-flex min-h-9 min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-latte transition-colors hover:bg-cream-2 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        >
          <ChevronDownIcon className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} aria-hidden='true' />
          <span>{isExpanded ? t.admin.recordDetails.hideDetails : t.admin.recordDetails.viewDetails}</span>
          {detailCount > 0 && <span className='text-[11px] font-normal'>({detailCount})</span>}
        </button>
        {record.nextVisitDate ? <span className='text-[11px] text-latte'>{`${t.admin.recordDetails.nextVisit}: ${record.nextVisitDate}`}</span> : <span aria-hidden='true' />}
      </div>

      {/* Expandable body: Lists and Notes */}
      {isExpanded && <div id={detailsId} className='mt-4 space-y-4 border-t border-hairline/70 pt-4 text-sm sm:mt-5'>
        {record.machines && record.machines.length > 0 && (
          <div>
            <div className='font-semibold text-text flex items-center gap-1.5 mb-1.5'>
              <WrenchScrewdriverIcon className="w-4 h-4 text-latte" />
              {t.review.machines}
            </div>
            <div className='space-y-1 text-text'>
              {record.machines.map((m) => (
                <div key={m.id} className="flex ltr:items-start rtl:items-end gap-1.5">
                  <span className="text-latte mt-0.5">•</span>
                  <div className="flex-1 min-w-0" dir="ltr">
                    <div className="text-end w-full">{m.count}x {m.name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {record.problems && record.problems.length > 0 && (
          <div>
            <div className='font-semibold text-text flex items-center gap-1.5 mb-2'>
              <ExclamationCircleIcon className="w-4 h-4 text-amber-500" />
              {t.review.problems}
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {record.problems.map((p, i) => (
                <span
                  key={i}
                  className='inline-flex items-center px-2 py-0.5 rounded text-xs bg-ember-500/10 border border-ember-500/20 text-ember-700 dark:text-ember-300 font-medium'
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}

        {record.partsWereReplaced && record.partsReplaced && record.partsReplaced.length > 0 && (
          <div>
            <div className='font-semibold text-ember-700 dark:text-ember-300 flex items-center gap-1.5 mb-1.5'>
              <CubeIcon className="w-4 h-4" />
              {t.review.partsReplaced}
            </div>
            <div className='space-y-1 text-text-secondary'>
              {record.partsReplaced.map((p, i) => (
                <div key={i} className="flex ltr:items-start rtl:items-end gap-1.5">
                  <span className="text-latte mt-0.5">•</span>
                  <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1" dir="rtl">
                    <div dir="ltr" className="text-end">{p.count}x {p.name}</div>
                    {p.paidByClient && (
                      <span className="text-xs text-ember-600 dark:text-ember-400 bg-ember-50 dark:bg-ember-900/30 px-1.5 py-0.5 rounded border border-ember-100 dark:border-ember-800/50 whitespace-nowrap">
                        ({t.selectors.paidByClient})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {record.servicesPerformed && record.servicesPerformed.length > 0 && (
          <div>
            <div className='font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 mb-1.5'>
              <ClipboardDocumentListIcon className="w-4 h-4" />
              {t.review.services}
            </div>
            <div className='space-y-1 text-text-secondary'>
              {record.servicesPerformed.map((s, i) => (
                <div key={i} className="flex ltr:items-start rtl:items-end gap-1.5">
                  <span className="text-latte mt-0.5">•</span>
                  <div className="flex-1 flex flex-wrap items-center gap-x-2 gap-y-1" dir="rtl">
                    <div dir="ltr" className="text-end">{s.count}x {s.name}</div>
                    {s.paidByClient && (
                      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded border border-blue-100 dark:border-blue-800/50 whitespace-nowrap">
                        ({t.selectors.paidByClient})
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {record.notes && (
          <div className='mt-3 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-hairline'>
            <p className='italic text-text-secondary break-words leading-relaxed'>
              "{record.notes}"
            </p>
          </div>
        )}
      </div>}

      {/* Photos Section */}
      {isExpanded && record.photos && record.photos.length > 0 && (
        <div className="mt-5 p-3 bg-white/50 dark:bg-black/20 border border-hairline rounded-lg">
          <h4 className="text-sm font-semibold mb-3 text-text-secondary flex items-center gap-1.5">
            <CameraIcon className="w-4 h-4 text-latte" />
            {t.review.photos}
          </h4>
          {renderPhotoGroup(record.photos, "before", t.ui.maintenanceEditor.before)}
          {renderPhotoGroup(record.photos, "after", t.ui.maintenanceEditor.after)}
          {renderPhotoGroup(record.photos, "legacy", t.ui.maintenanceEditor.legacy)}
        </div>
      )}

      {/* Recursively show follow-ups */}
      {isExpanded && record.followUpVisits && record.followUpVisits.length > 0 && (
        <div className='mt-5 pe-3 border-e-2 border-hairline pt-2'>
          <p className='text-xs font-bold text-latte mb-3 flex items-center gap-1.5'>
            <ArrowUturnLeftIcon className="w-4 h-4" />
            {t.admin.recordDetails.followUpVisits}
          </p>
          {record.followUpVisits.map((fu) => (
            <MaintenanceRecordView key={fu.id} record={fu} onExport={onExport} />
          ))}
        </div>
      )}
    </article>
  );
};

// --- PRINT COMPONENTS (Formal Layout) ---

const PrintSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div className='mb-6 break-inside-avoid'>
    <h3 className='text-xs font-bold uppercase tracking-widest text-latte border-b border-hairline pb-1 mb-3'>
      {title}
    </h3>
    {children}
  </div>
);

const PrintField: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className='flex flex-col mb-2 break-inside-avoid'>
    <span className='text-[10px] uppercase text-latte font-semibold'>
      {label}
    </span>
    <span className='text-sm text-text font-medium'>{value || "-"}</span>
  </div>
);

const MaintenanceTable: React.FC<{
  records: MaintenanceRecord[];
  hideCosts?: boolean;
}> = ({ records, hideCosts }) => {
  // Logistics-only visits are excluded from every printed report.
  const reportRecords = getReportRecords(records || []);
  if (!reportRecords || reportRecords.length === 0)
    return <p className='text-xs text-latte italic'>No records found.</p>;

  return (
    <table className='w-full text-start text-xs border border-hairline mb-4 break-inside-auto'>
      <thead className='bg-cream text-text uppercase font-bold'>
        <tr>
          <th className='px-2 py-1.5 border-b border-hairline w-24'>Date</th>
          <th className='px-2 py-1.5 border-b border-hairline w-32'>Staff</th>
          <th className='px-2 py-1.5 border-b border-hairline'>
            Work Details
          </th>
        </tr>
      </thead>
      <tbody className='divide-y divide-slate-200'>
        {reportRecords.map((rec) => (
          <React.Fragment key={rec.id}>
            <tr className='break-inside-avoid'>
              <td className='px-2 py-2 align-top'>
                <div>{rec.maintenanceDate}</div>
                <div className='text-[10px] text-latte mt-0.5'>
                  {rec.type}
                </div>
                {rec.nextVisitDate && (
                  <div className='text-[10px] text-text mt-1 font-semibold'>
                    Next: {rec.nextVisitDate}
                  </div>
                )}
              </td>
              <td className='px-2 py-2 align-top'>{rec.baristaName}</td>
              <td className='px-2 py-2 align-top'>
                <div className='mb-1'>
                  <span className='font-bold'>Paid By:</span>{" "}
                  {getPaidByLabel(rec.paidBy)}
                </div>
                {!hideCosts && rec.dailyLeaseCost && (
                  <div className='mb-1'>
                    <span className='font-bold'>Daily Lease:</span>{" "}
                    {rec.dailyLeaseCost} EGP
                  </div>
                )}
                {rec.machines && rec.machines.length > 0 && (
                  <div className='mb-1'>
                    <span className='font-bold'>Machines:</span>
                    {rec.machines
                      .map((m) => ` ${m.count}x ${m.name}`)
                      .join(", ")}
                  </div>
                )}
                {rec.hadProblem && (
                  <div className='mb-1'>
                    <span className='font-bold text-ember-700'>Issue:</span>{" "}
                    {rec.problems?.join(", ") || "Unspecified"}
                  </div>
                )}
                {rec.partsWereReplaced &&
                  rec.partsReplaced &&
                  rec.partsReplaced.length > 0 && (
                    <div className='mb-1'>
                      <span className='font-bold'>Parts:</span>
                      {rec.partsReplaced
                        .map((p) => ` ${p.count}x ${p.name}`)
                        .join(", ")}
                    </div>
                  )}
                {rec.servicesPerformed && rec.servicesPerformed.length > 0 && (
                  <div className='mb-1'>
                    <span className='font-bold'>Services:</span>
                    {rec.servicesPerformed
                      .map((s) => ` ${s.count}x ${s.name}`)
                      .join(", ")}
                  </div>
                )}
                {rec.notes && (
                  <div className='italic text-text mt-1'>
                    "{rec.notes}"
                  </div>
                )}
              </td>
            </tr>
            {rec.followUpVisits && rec.followUpVisits.length > 0 && (
              <tr className='bg-cream'>
                <td colSpan={3} className='px-4 py-1 border-t border-hairline'>
                  <div className='text-[10px] font-bold uppercase text-latte my-1'>
                    Follow-ups
                  </div>
                  <MaintenanceTable
                    records={rec.followUpVisits}
                    hideCosts={hideCosts}
                  />
                </td>
              </tr>
            )}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

const DetailedRecordPrint: React.FC<{
  record: MaintenanceRecord;
  depth?: number;
  hideCosts?: boolean;
}> = ({ record, depth = 0, hideCosts }) => {
  return (
    <div
      className={`mb-6 break-inside-avoid border border-hairline rounded-lg overflow-hidden ${depth > 0 ? "ms-6 border-s-4 ltr:border-l-slate rtl:border-r-slate-400 bg-cream" : "bg-white shadow-sm"}`}
    >
      <div className='bg-cream px-4 py-2 border-b border-hairline flex justify-between items-center'>
        <div className='flex items-center gap-3'>
          <span className='font-bold text-sm text-text'>
            {record.maintenanceDate}
          </span>
          <span className='text-xs text-latte uppercase font-semibold tracking-wider bg-white border border-hairline px-2 py-0.5 rounded-full'>
            {record.type} Visit
          </span>
          {record.visitZone && (
            <span className='text-xs text-text bg-cream-2 border border-hairline px-2 py-0.5 rounded-full capitalize'>
              {getVisitZoneLabel(record.visitZone)}
            </span>
          )}
        </div>
        {/* Performed By Section in Header */}
        <div className='flex items-center gap-3'>
          {record.nextVisitDate && (
            <span className='text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full'>
              Next: {record.nextVisitDate}
            </span>
          )}
          <div className='flex items-center gap-1.5 text-xs font-semibold text-text bg-white border border-hairline px-2 py-1 rounded shadow-sm'>
            <UserIcon className='w-3.5 h-3.5 text-latte' />
            Performed by:{" "}
            <span className='text-text font-bold'>
              {record.baristaName || "Unknown"}
            </span>
          </div>
        </div>
      </div>

      <div className='p-4 grid grid-cols-12 gap-6 text-xs'>
        {/* Left Col: Issues & Details */}
        <div className='col-span-8 space-y-3'>
          <div className='flex gap-2 p-1.5 bg-blue-50 border border-blue-100 rounded'>
            <span className='font-bold text-blue-800 w-24'>Paid By:</span>
            <span className='font-mono text-blue-900'>
              {getPaidByLabel(record.paidBy)}
            </span>
          </div>

          {!hideCosts && record.dailyLeaseCost && (
            <div className='flex gap-2 p-1.5 bg-yellow-50 border border-yellow-100 rounded'>
              <span className='font-bold text-yellow-800 w-24'>
                Daily Lease:
              </span>
              <span className='font-mono text-yellow-900'>
                {record.dailyLeaseCost} EGP
              </span>
            </div>
          )}

          {/* Machines Section - Highlighted */}
          {record.machines && record.machines.length > 0 ? (
            <div className='flex gap-2 p-2 bg-cream rounded border border-hairline'>
              <span className='font-bold text-text w-20 uppercase text-[10px] tracking-wider pt-0.5'>
                Machines
              </span>
              <div className='flex-1 flex flex-wrap gap-2'>
                {record.machines.map((m, i) => (
                  <span
                    key={i}
                    className='inline-flex items-center bg-white border border-hairline px-2 py-1 rounded font-bold text-text shadow-sm'
                  >
                    <CubeIcon className='w-3 h-3 text-latte me-1' />
                    {m.count > 1 ? `${m.count}x ` : ""}
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className='flex gap-2'>
              <span className='font-bold text-latte w-20 uppercase text-[10px] tracking-wider pt-0.5'>
                Machines
              </span>
              <span className='text-latte italic'>No machines listed</span>
            </div>
          )}

          {record.hadProblem && (
            <div className='flex gap-2 mt-2'>
              <span className='font-bold text-ember-700 w-20 uppercase text-[10px] tracking-wider pt-0.5'>
                Issues
              </span>
              <div className='flex-1 font-medium text-ember-700 bg-ember-50 p-1.5 rounded border border-ember-500/30'>
                {record.problems?.join(", ") || "Unspecified"}
              </div>
            </div>
          )}

          {(record.partsWereReplaced ||
            record.servicesPerformed.length > 0) && (
            <div className='flex gap-2'>
              <span className='font-bold text-text w-20 uppercase text-[10px] tracking-wider pt-0.5'>
                Work Done
              </span>
              <div className='flex-1 space-y-1'>
                {record.partsReplaced?.map((p, i) => (
                  <div key={`p-${i}`} className='flex items-center gap-1'>
                    <WrenchScrewdriverIcon className='w-3 h-3 text-latte' />
                    <span>
                      Replaced:{" "}
                      <b>
                        {p.count}x {p.name}
                      </b>{" "}
                      {p.paidByClient ? (
                        <span className='text-[10px] text-text border border-hairline px-1 rounded bg-cream-2'>
                          (Client Paid)
                        </span>
                      ) : (
                        ""
                      )}
                    </span>
                  </div>
                ))}
                {record.servicesPerformed?.map((s, i) => (
                  <div key={`s-${i}`} className='flex items-center gap-1'>
                    <CheckBadgeIcon className='w-3 h-3 text-latte' />
                    <span>
                      Service:{" "}
                      <b>
                        {s.count}x {s.name}
                      </b>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {record.recommendations && (
            <div className='flex gap-2 mt-2 pt-2 border-t border-hairline'>
              <span className='font-bold text-text w-20 uppercase text-[10px] tracking-wider'>
                Recs
              </span>
              <div className='italic text-text bg-yellow-50/50 p-1 rounded'>
                {record.recommendations}
              </div>
            </div>
          )}
          {record.notes && (
            <div className='flex gap-2'>
              <span className='font-bold text-text w-20 uppercase text-[10px] tracking-wider'>
                Notes
              </span>
              <div className='italic text-text'>{record.notes}</div>
            </div>
          )}
        </div>

        {/* Right Col: Supervisors */}
        <div className='col-span-4 ps-4 flex flex-col'>
          <div className='bg-white p-3 rounded-lg border-2 border-dashed border-hairline h-full flex flex-col justify-between'>
            <div>
              <p className='font-bold text-latte uppercase tracking-wider text-[10px] mb-3 text-center border-b border-hairline pb-1'>
                Supervisors
              </p>
              {record.supervisors && record.supervisors.length > 0 ? (
                <div className='space-y-2'>
                  {record.supervisors.map((s) => (
                    <div key={s.id} className='text-center p-2 bg-cream rounded'>
                      <p className='font-bold text-[11px] text-text uppercase'>
                        {s.name}
                      </p>
                      <p className='text-[9px] text-latte'>{s.phone}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className='h-24 flex flex-col items-center justify-center text-latte/70 italic text-center'>
                  <UserIcon className='w-6 h-6 mb-1 opacity-50' />
                  <span>No supervisors</span>
                </div>
              )}
            </div>
            <div className='text-[9px] text-center text-latte/70 mt-2'>
              Verified & Approved
            </div>
          </div>
        </div>
      </div>

      {/* Recursion for Follow-ups */}
      {record.followUpVisits && record.followUpVisits.length > 0 && (
        <div className='bg-cream px-4 py-3 border-t border-hairline'>
          <p className='text-[10px] font-bold uppercase text-latte mb-3 flex items-center gap-1'>
            <ArrowLeftIcon className='w-3 h-3 rotate-180' /> Follow-up Visits
          </p>
          {record.followUpVisits.map((fu) => (
            <DetailedRecordPrint
              key={fu.id}
              record={fu}
              depth={depth + 1}
              hideCosts={hideCosts}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const BranchPrintableDocument: React.FC<{
  companyName: string;
  branch: Branch;
  hideCosts?: boolean;
}> = ({ companyName, branch, hideCosts }) => {
  // Logistics-only visits are excluded from every printed report.
  const reportHistory = getReportRecords(branch.maintenanceHistory || []);
  const stats = getBranchStats(reportHistory);

  return (
    <div
      id='print-container'
      className='hidden print:block font-sans text-black force-daylight bg-white w-full max-w-[210mm] mx-auto p-8'
    >
      {/* Header */}
      <div className='flex justify-between ltr:items-start rtl:items-end mb-8 border-b-2 border-hairline pb-6'>
        <div className='flex items-center gap-4'>
          <img
            src='/logo.svg'
            alt="Mido's For Distribution"
            className='h-16 w-auto object-contain'
          />
          <div>
            <h1 className='text-2xl font-bold text-text tracking-tight leading-none'>
              {companyName}
            </h1>
            <h2 className='text-lg text-text mt-1 font-medium'>
              {branch.branchName || "Branch Report"}
            </h2>
          </div>
        </div>
        <div className='text-end'>
          <div className='text-3xl font-bold text-cream'>BRANCH REPORT</div>
          <p className='text-xs text-latte mt-1'>
            Generated: {new Date().toLocaleDateString()}
          </p>
          <p className='text-xs text-latte'>{branch.location}</p>
        </div>
      </div>

      {/* Branch Summary & Staff Grid */}
      <div className='grid grid-cols-12 gap-6 mb-8'>
        {/* Info Card */}
        <div className='col-span-8 bg-cream border border-hairline rounded-lg p-4'>
          <div className='grid grid-cols-2 gap-x-8 gap-y-4 text-sm'>
            <div>
              <span className='text-xs font-bold text-latte uppercase block mb-0.5'>
                Email
              </span>
              <span className='font-medium text-text'>
                {branch.email || "-"}
              </span>
            </div>
            <div>
              <span className='text-xs font-bold text-latte uppercase block mb-0.5'>
                Tax ID
              </span>
              <span className='font-medium text-text'>
                {branch.taxNumber || "-"}
              </span>
            </div>
            <div>
              <span className='text-xs font-bold text-latte uppercase block mb-0.5'>
                Machine Ownership
              </span>
              <span className='font-medium text-text'>
                {getMachineOwnershipStatus(branch, hideCosts)}
              </span>
            </div>
            <div>
              <span className='text-xs font-bold text-latte uppercase block mb-0.5'>
                Total Visits
              </span>
              <span className='font-medium text-text'>
                {stats.visitCount}
              </span>
            </div>
          </div>

          <div className='mt-4 pt-4 border-t border-hairline'>
            <span className='text-[10px] font-bold text-latte uppercase block mb-2'>
              Key Contacts
            </span>
            {branch.contacts.length > 0 ? (
              <div className='grid grid-cols-2 gap-2'>
                {branch.contacts.map((c) => (
                  <div key={c.id} className='text-xs'>
                    <span className='font-bold text-text'>{c.name}</span>
                    <span className='text-latte mx-1'>•</span>
                    <span className='text-text'>
                      {c.phoneNumbers[0]?.number}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <span className='text-xs text-latte italic'>No contacts</span>
            )}
          </div>
        </div>

        {/* Assigned Staff Card - NEW */}
        <div className='col-span-4 border border-hairline rounded-lg p-4 flex flex-col'>
          <h4 className='text-xs font-bold uppercase text-latte border-b border-hairline pb-2 mb-2 flex items-center gap-1'>
            <UserGroupIcon className='w-4 h-4' /> Assigned Staff
          </h4>
          {branch.baristas && branch.baristas.length > 0 ? (
            <div className='space-y-2 overflow-y-auto max-h-40'>
              {branch.baristas.map((b) => (
                <div
                  key={b.id}
                  className='flex justify-between items-center text-xs p-1.5 bg-cream rounded'
                >
                  <span className='font-semibold text-text truncate'>
                    {b.name}
                  </span>
                  <div className='flex items-center gap-1'>
                    <span className='font-bold text-amber-600'>{b.rating}</span>
                    <StarIconSolid className='w-3 h-3 text-amber-400' />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='flex-1 flex items-center justify-center text-latte text-xs italic'>
              No baristas assigned
            </div>
          )}
        </div>
      </div>

      {/* Detailed Maintenance History */}
      <div>
        <div className='flex items-center gap-2 mb-4 bg-espresso text-white p-2 rounded'>
          <ClipboardDocumentCheckIcon className='w-5 h-5' />
          <h3 className='text-sm font-bold uppercase tracking-wider'>
            Maintenance History Log
          </h3>
        </div>

        {reportHistory.length > 0 ? (
          <div className='space-y-4'>
            {reportHistory.map((rec) => (
              <DetailedRecordPrint
                key={rec.id}
                record={rec}
                hideCosts={hideCosts}
              />
            ))}
          </div>
        ) : (
          <div className='p-12 text-center border-2 border-dashed border-hairline rounded-lg'>
            <WrenchScrewdriverIcon className='w-10 h-10 text-latte/70 mx-auto mb-2' />
            <p className='text-latte italic'>
              No maintenance records found for this branch.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='mt-12 pt-4 border-t border-hairline text-center text-[10px] text-latte'>
        <p>CONFIDENTIAL - Internal Use Only • Mido for Distribution</p>
      </div>
    </div>
  );
};

const PrintableDocument: React.FC<{
  data: FormData & { created_at?: string };
  hideCosts?: boolean;
}> = ({ data, hideCosts }) => {
  const t = useT();
  // Logistics-only visits are excluded from every printed report.
  const reportData: FormData = {
    ...data,
    maintenanceHistory: getReportRecords(data.maintenanceHistory || []),
    branches: (data.branches || []).map((b) => ({
      ...b,
      maintenanceHistory: getReportRecords(b.maintenanceHistory || []),
    })),
  };
  return (
    <div
      id='print-container'
      className='hidden print:block font-sans text-black force-daylight bg-white w-full max-w-[210mm] mx-auto'
    >
      {/* Logo Center */}
      <div className='flex justify-center mb-6'>
        <img
          src='/logo.svg'
          alt="Mido's For Distribution"
          className='h-24 w-auto object-contain'
        />
      </div>

      {/* Document Header */}
      <div className='flex justify-between ltr:items-end rtl:items-start border-b-2 border-hairline pb-4 mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-text tracking-tight'>
            {data.companyName}
          </h1>
          <p className='text-sm text-text mt-1'>
            Comprehensive Maintenance Report
          </p>
        </div>
        <div className='text-end text-xs text-latte'>
          <p>Report Date: {new Date().toLocaleDateString()}</p>
          <p>Submission ID: {data.id ? data.id : "Pending"}</p>
        </div>
      </div>

      {/* Company Info Grid */}
      <PrintSection title='Company Profile'>
        <div className='grid grid-cols-3 gap-6 mb-6'>
          <PrintField label='Tax Number' value={data.taxNumber} />
          <PrintField label='Email' value={data.email} />
          <PrintField label='Location' value={data.location} />
          {!data.hasBranches && (
            <PrintField
              label='Machines'
              value={getMachineOwnershipStatus(data, hideCosts)}
            />
          )}
        </div>

        {data.contacts.length > 0 && (
          <div className='mt-2'>
            <h4 className='text-[10px] uppercase text-latte font-semibold mb-1'>
              Key Contacts
            </h4>
            <ul className='text-sm list-disc ps-4 space-y-0.5'>
              {data.contacts.map((c) => (
                <li key={c.id}>
                  <span className='font-semibold'>{c.name}</span>
                  <span className='text-text'> — {c.position}</span>
                  {c.phoneNumbers.length > 0 && (
                    <span className='text-latte text-xs ms-2'>
                      ({c.phoneNumbers.map((p) => p.number).join(", ")})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </PrintSection>

      {/* Main Office Maintenance (Only if no branches) */}
      {!reportData.hasBranches && reportData.maintenanceHistory.length > 0 && (
        <PrintSection title={t.admin.fields.mainOfficeMaintenanceHistory}>
          <MaintenanceTable
            records={reportData.maintenanceHistory}
            hideCosts={hideCosts}
          />
        </PrintSection>
      )}

      {/* Branches Section */}
      {reportData.hasBranches && (
        <div className='mt-8'>
          <h2 className='text-lg font-bold text-text border-b-2 border-hairline pb-1 mb-4'>
            Branch Details & Maintenance
          </h2>

          {reportData.branches.map((branch, idx) => {
            const stats = getBranchStats(branch.maintenanceHistory);
            return (
              <div key={branch.id} className='mb-8 break-inside-avoid-page'>
                <div className='bg-cream p-2 border-s-4 border-hairline mb-3 flex justify-between items-baseline'>
                  <h3 className='font-bold text-base text-text'>
                    {branch.branchName || `Branch ${idx + 1}`}
                  </h3>
                  <span className='text-xs text-text font-normal'>
                    {branch.location}
                  </span>
                </div>

                <div className='grid grid-cols-4 gap-4 mb-4 px-2'>
                  <PrintField label='Email' value={branch.email} />
                  <PrintField label='Tax ID' value={branch.taxNumber} />
                  <PrintField
                    label='Machines'
                    value={
                      branch.hasMultipleMachines
                        ? "Mixed"
                        : branch.usesOurMachines
                          ? branch.machineOwnershipType === "leased"
                            ? "Leased"
                            : "Bought"
                          : "No"
                    }
                  />
                  <PrintField label='Maint. Visits' value={stats.visitCount} />
                </div>

                {/* Financials & Stats Row */}
                {((!hideCosts && branch.dailyLeaseCost) ||
                  Object.keys(stats.partsMap).length > 0) && (
                  <div className='mb-4 px-2 py-2 bg-cream border border-hairline rounded text-xs flex flex-wrap gap-x-8 gap-y-2'>
                    {!hideCosts && branch.dailyLeaseCost && (
                      <div>
                        <span className='uppercase text-latte font-bold me-2'>
                          Daily Lease:
                        </span>
                        <span className='font-bold text-text'>
                          {branch.dailyLeaseCost} EGP
                        </span>
                      </div>
                    )}
                    {Object.keys(stats.partsMap).length > 0 && (
                      <div>
                        <span className='uppercase text-latte font-bold me-2'>
                          Parts Replaced:
                        </span>
                        <span className='text-text'>
                          {Object.entries(stats.partsMap)
                            .map(([name, count]) => `${count}x ${name}`)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {branch.contacts.length > 0 && (
                  <div className='mb-4 px-2'>
                    <p className='text-[10px] uppercase text-latte font-semibold mb-1'>
                      Contacts
                    </p>
                    <div className='text-xs text-text'>
                      {branch.contacts.map((c) => c.name).join(", ")}
                    </div>
                  </div>
                )}

                <div className='px-2'>
                  <p className='text-[10px] uppercase text-latte font-semibold mb-2'>
                    Maintenance Records
                  </p>
                  <MaintenanceTable
                    records={branch.maintenanceHistory}
                    hideCosts={hideCosts}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const PrintDropdown: React.FC<{
  label: string;
  onPrint: (mode: "internal" | "client" | "cost", format: "pdf" | "word") => void;
  className?: string;
  disabled?: boolean;
}> = ({ label, onPrint, className, disabled }) => {
  const menuId = useId();
  const t = useT();
  const menuItemsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const focusRafRef = useRef<number | null>(null);
  const wasOpenRef = useRef(false);
  const { open: isOpen, setOpen: setIsOpen, triggerRef, contentRef, style, toggle } = useFloatingMenu({
    menuWidth: 288,
    edgeMargin: 8,
  });

  useEffect(() => {
    if (focusRafRef.current !== null) {
      cancelAnimationFrame(focusRafRef.current);
      focusRafRef.current = null;
    }

    if (isOpen) {
      focusRafRef.current = requestAnimationFrame(() => {
        focusRafRef.current = null;
        menuItemsRef.current[0]?.focus();
      });
    } else if (wasOpenRef.current) {
      triggerRef.current?.focus();
    }
    wasOpenRef.current = isOpen;

    return () => {
      if (focusRafRef.current !== null) {
        cancelAnimationFrame(focusRafRef.current);
        focusRafRef.current = null;
      }
    };
  }, [isOpen, triggerRef]);

  const handleSelect = (mode: "internal" | "client" | "cost", format: "pdf" | "word") => {
    setIsOpen(false);
    onPrint(mode, format);
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = menuItemsRef.current.filter((item): item is HTMLButtonElement => Boolean(item));
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(currentIndex + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(currentIndex - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    }
  };

  return (
    <div className={`relative inline-block text-start ${className}`}>
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type='button'
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        disabled={disabled}
        aria-haspopup='menu'
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        className='flex items-center gap-2 bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-hover transition-colors shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed'
      >
        <PrinterIcon className='w-5 h-5' />
        {label}
        <ChevronDownIcon className='w-4 h-4 ms-1' />
      </button>

      {isOpen && createPortal(
        <div
          ref={contentRef}
          className='fixed z-[9999] max-h-[calc(100vh-1rem)] w-72 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-2xl border border-hairline bg-cream shadow-2xl focus:outline-none'
          style={style}
        >
          <div className='border-b border-hairline bg-cream-2/60 px-4 py-3'>
            <div className='flex items-center gap-2 text-sm font-bold text-text'>
              <PrinterIcon className='h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
              <span>{label}</span>
            </div>
            <p className='mt-1 text-xs text-latte'>{t.admin.recordDetails.chooseReportFormat}</p>
          </div>
          <div
            id={menuId}
            role='menu'
            aria-orientation='vertical'
            aria-label={`${label} options`}
            onKeyDown={handleMenuKeyDown}
          >
            {(
              [
                { value: "internal", name: t.admin.recordDetails.internalReport, desc: t.admin.recordDetails.internalReportDescription },
                { value: "client", name: t.admin.recordDetails.clientReport, desc: t.admin.recordDetails.clientReportDescription },
                { value: "cost", name: t.admin.recordDetails.costReport, desc: t.admin.recordDetails.costReportDescription },
              ] as const
            ).map((md, idx) => (
              <div key={md.value} className={`px-3 py-3.5 sm:px-4 ${idx > 0 ? "border-t border-hairline" : ""}`}>
                <div className='grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3'>
                  <div className='min-w-0'>
                    <span className='block truncate text-sm font-bold text-text'>{md.name}</span>
                    <p className='mt-1 break-words text-xs leading-relaxed text-latte'>{md.desc}</p>
                  </div>
                  <div className='flex shrink-0 gap-1.5'>
                    <button
                      type='button'
                      role='menuitem'
                      aria-label={`${md.name} PDF`}
                      ref={(element) => {
                        menuItemsRef.current[idx * 2] = element;
                      }}
                      onClick={() => handleSelect(md.value, "pdf")}
                      className='min-h-9 rounded-lg border border-hairline bg-white px-2.5 py-1 text-xs font-bold text-text transition-colors hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-espresso-light'
                    >
                      PDF
                    </button>
                    <button
                      type='button'
                      role='menuitem'
                      aria-label={`${md.name} Word`}
                      ref={(element) => {
                        menuItemsRef.current[idx * 2 + 1] = element;
                      }}
                      onClick={() => handleSelect(md.value, "word")}
                      className='min-h-9 rounded-lg border border-hairline bg-white px-2.5 py-1 text-xs font-bold text-text transition-colors hover:border-primary/50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-espresso-light'
                    >
                      Word
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---

const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({
  submission,
  onBack,
  onUpdate,
}) => {
  const { showToast } = useToast();
  const t = useT();
  const [printingBranch, setPrintingBranch] = useState<Branch | null>(null);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isParsingPDF, setIsParsingPDF] = useState(false);
  const [pendingParsedData, setPendingParsedData] = useState<FormData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Date-range modal state
  const [showDateRangeModal, setShowDateRangeModal] = useState(false);
  const [pendingPrintAction, setPendingPrintAction] = useState<{
    type: "full" | "branch";
    mode: "internal" | "client" | "cost";
    format: "pdf" | "word";
    branch?: Branch;
  } | null>(null);

  // Fetch logistics operations for this customer to include in reports
  const { operations: logisticsOps } = useLogisticsOperations(submission.id ?? null);

  // Helper: clone submission with filtered maintenance history by date range
  const getFilteredSubmission = (range: DateRange) => {
    if (!range.startDate && !range.endDate) return submission;
    const filtered = structuredClone(submission) as FormData;
    filtered.maintenanceHistory = filterMaintenanceByDateRange(
      filtered.maintenanceHistory || [],
      range,
    );
    filtered.branches = filtered.branches.map((b) => ({
      ...b,
      maintenanceHistory: filterMaintenanceByDateRange(b.maintenanceHistory, range),
    }));
    return filtered;
  };

  // Intercepted: opens date-range modal instead of generating directly
  const handlePrintFull = (mode: "internal" | "client" | "cost", format: "pdf" | "word") => {
    setPendingPrintAction({ type: "full", mode, format });
    setShowDateRangeModal(true);
  };

  const handlePrintBranch = (branch: Branch, mode: "internal" | "client" | "cost", format: "pdf" | "word") => {
    setPendingPrintAction({ type: "branch", mode, branch, format });
    setShowDateRangeModal(true);
  };

  // Per-visit export — internal (with costs), client (costs hidden) or cost (full costs, no payer split).
  const handlePrintVisit = async (
    record: MaintenanceRecord,
    mode: "internal" | "client" | "cost",
    format: "pdf" | "word",
    branch?: Branch,
  ) => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const entity = branch
        ? {
            branchName: branch.branchName,
            location: branch.location,
            email: branch.email,
            taxNumber: branch.taxNumber,
          }
        : {
            location: submission.location,
            email: submission.email,
            taxNumber: submission.taxNumber,
          };
      const modeLabel = mode === "internal" ? "Internal" : mode === "client" ? "Client" : "Cost";
      const baseName = `${submission.companyName.replace(/\s+/g, "_")}_Visit_${record.maintenanceDate}_${modeLabel}_Report`;
      if (format === "word") {
        const { generateVisitWordReport, downloadWordDoc } = await import("../utils/wordExport");
        const doc = await generateVisitWordReport(submission.companyName, entity, record, {
          clientMode: mode === "client",
          costMode: mode === "cost",
        });
        await downloadWordDoc(doc, `${baseName}.docx`);
      } else if (mode === "internal") {
        const doc = await generateInternalVisitReport(submission.companyName, entity, record);
        doc.save(`${baseName}.pdf`);
      } else if (mode === "client") {
        const doc = await generateClientVisitReport(submission.companyName, entity, record);
        doc.save(`${baseName}.pdf`);
      } else {
        const doc = await generateCostVisitReport(submission.companyName, entity, record);
        doc.save(`${baseName}.pdf`);
      }
    } catch (error) {
      logger.error("Error generating visit report", error, "pdf");
      showToast("فشل إنشاء التقرير. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Actual PDF generation after date range is selected
  const handleDateRangeExport = async (range: DateRange) => {
    if (!pendingPrintAction) return;
    setShowDateRangeModal(false);
    setIsGeneratingPDF(true);

    const { type, mode, branch, format } = pendingPrintAction;
    const filteredSub = getFilteredSubmission(range);

    try {
      // Word export — lazy-load the docx generator (keeps the PDF bundle untouched)
      if (format === "word") {
        const word = await import("../utils/wordExport");
        const dateStr = new Date().toISOString().split("T")[0];
        const modeLabel = mode === "internal" ? "Internal" : mode === "client" ? "Client" : "Cost";
        if (type === "full") {
          const doc = await word.generateCompanyWordReport(filteredSub, {
            logisticsOperations: logisticsOps,
            dateRange: range.preset !== "allTime" ? range : undefined,
            clientMode: mode === "client",
            costMode: mode === "cost",
          });
          await word.downloadWordDoc(
            doc,
            `${submission.companyName.replace(/\s+/g, "_")}_${modeLabel}_Report_${dateStr}.docx`,
          );
        } else if (branch) {
          const filteredBranch = filteredSub.branches.find((b) => b.id === branch.id) || branch;
          const doc = await word.generateBranchWordReport(filteredSub.companyName, filteredBranch, {
            logisticsOperations: logisticsOps,
            dateRange: range.preset !== "allTime" ? range : undefined,
            clientMode: mode === "client",
            costMode: mode === "cost",
          });
          await word.downloadWordDoc(
            doc,
            `${submission.companyName.replace(/\s+/g, "_")}_${filteredBranch.branchName?.replace(/\s+/g, "_")}_${modeLabel}_Report_${dateStr}.docx`,
          );
        }
        return;
      }
      if (type === "full") {
        if (mode === "internal") {
          const doc = await generateInternalCompanyReport(filteredSub, {
            logisticsOperations: logisticsOps,
            dateRange: range.preset !== "allTime" ? range : undefined,
          });
          const fileName = `${submission.companyName.replace(/\s+/g, "_")}_Internal_Report_${new Date().toISOString().split("T")[0]}.pdf`;
          doc.save(fileName);
        } else if (mode === "client") {
          const doc = await generateClientCompanyReport(filteredSub, {
            logisticsOperations: logisticsOps,
            dateRange: range.preset !== "allTime" ? range : undefined,
          });
          const fileName = `${submission.companyName.replace(/\s+/g, "_")}_Client_Report_${new Date().toISOString().split("T")[0]}.pdf`;
          doc.save(fileName);
        } else {
          const doc = await generateCostCompanyReport(filteredSub, {
            logisticsOperations: logisticsOps,
            dateRange: range.preset !== "allTime" ? range : undefined,
          });
          const fileName = `${submission.companyName.replace(/\s+/g, "_")}_Cost_Report_${new Date().toISOString().split("T")[0]}.pdf`;
          doc.save(fileName);
        }
      } else if (branch) {
        // Look up the filtered branch from the cloned submission (CR #1 fix)
        const filteredBranch = filteredSub.branches.find(b => b.id === branch.id) || branch;
        if (mode === "internal") {
          const doc = await generateInternalBranchReport(
            filteredSub.companyName,
            filteredBranch,
            { logisticsOperations: logisticsOps, dateRange: range.preset !== "allTime" ? range : undefined },
          );
          const fileName = `${submission.companyName.replace(/\s+/g, "_")}_${filteredBranch.branchName?.replace(/\s+/g, "_")}_Internal_Report_${new Date().toISOString().split("T")[0]}.pdf`;
          doc.save(fileName);
        } else if (mode === "client") {
          const doc = await generateClientBranchReport(
            filteredSub.companyName,
            filteredBranch,
            { logisticsOperations: logisticsOps, dateRange: range.preset !== "allTime" ? range : undefined },
          );
          const fileName = `${submission.companyName.replace(/\s+/g, "_")}_${filteredBranch.branchName?.replace(/\s+/g, "_")}_Client_Report_${new Date().toISOString().split("T")[0]}.pdf`;
          doc.save(fileName);
        } else {
          const doc = await generateCostBranchReport(
            filteredSub.companyName,
            filteredBranch,
            { logisticsOperations: logisticsOps, dateRange: range.preset !== "allTime" ? range : undefined },
          );
          const fileName = `${submission.companyName.replace(/\s+/g, "_")}_${filteredBranch.branchName?.replace(/\s+/g, "_")}_Cost_Report_${new Date().toISOString().split("T")[0]}.pdf`;
          doc.save(fileName);
        }
      }
    } catch (error) {
      logger.error("Error generating PDF", error, "pdf");
      showToast("فشل إنشاء التقرير. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsGeneratingPDF(false);
      setPendingPrintAction(null);
    }
  };


  const handleGenerateMissingDataPDF = async (scope: "company" | "branch", branchId?: number) => {
    setIsGeneratingPDF(true);
    try {
      const doc = await generateMissingDataPDF(submission, {
        scope,
        branchId,
        mode: "dynamic",
      });
      if (!doc) {
        showToast("لا توجد بيانات ناقصة لاستكمالها.", "info");
        return;
      }
      const scopeLabel = scope === "company" ? "Company" : "Branch";
      const fileName = `${submission.companyName.replace(/\s+/g, "_")}_${scopeLabel}_Missing_Data_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      logger.error("Error generating missing data PDF", error, "pdf");
      showToast("فشل إنشاء PDF. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleGenerateMissingDataWord = async (scope: "company" | "branch", branchId?: number) => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const { generateMissingDataWordReport, downloadWordDoc } = await import("../utils/wordExport");
      const doc = await generateMissingDataWordReport(submission, { scope, branchId, mode: "dynamic" });
      if (!doc) {
        showToast("لا توجد بيانات ناقصة لاستكمالها.", "info");
        return;
      }
      const scopeLabel = scope === "company" ? "Company" : "Branch";
      const fileName = `${submission.companyName.replace(/\s+/g, "_")}_${scopeLabel}_Missing_Data_${new Date().toISOString().split("T")[0]}.docx`;
      await downloadWordDoc(doc, fileName);
    } catch (error) {
      logger.error("Error generating missing data Word report", error, "pdf");
      showToast("فشل إنشاء التقرير. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleUploadFilledPDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingPDF(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const parsed = await parseMissingDataPDF(arrayBuffer);
      const updated = applyParsedMissingData(submission, parsed);
      setPendingParsedData(updated);
    } catch (error) {
      logger.error("Error parsing filled PDF", error, "pdf");
      showToast(error instanceof Error ? error.message : "فشل استيراد البيانات.", "error");
    } finally {
      setIsParsingPDF(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmApplyParsedData = () => {
    if (!pendingParsedData) return;
    onUpdate?.(pendingParsedData);
    showToast("تم استيراد البيانات بنجاح.", "success");
    setPendingParsedData(null);
  };

  const cancelApplyParsedData = () => {
    setPendingParsedData(null);
  };

  const filterRecords = (records: MaintenanceRecord[]) =>
    filterMaintenanceByDateRange(records || [], {
      startDate: filterStartDate || undefined,
      endDate: filterEndDate || undefined,
    });

  // Derived filtered maintenance history for main office
  const filteredMainHistory = useMemo(
    () => filterRecords(submission.maintenanceHistory || []),
    [submission.maintenanceHistory, filterStartDate, filterEndDate],
  );

  const companyMaintenanceSummary = useMemo(
    () => getMaintenanceSummary([
      ...filteredMainHistory,
      ...((submission.branches || []).flatMap((branch) => filterRecords(branch.maintenanceHistory || []))),
    ]),
    [filteredMainHistory, submission.branches, filterStartDate, filterEndDate],
  );

  return (
    <div className='w-full max-w-5xl mx-auto pb-10 print:max-w-none print:pb-0 print:w-full'>
      {/* === SCREEN VIEW === */}
      <div className='print:hidden'>
        <div className='mb-5 flex min-h-[44px] items-center justify-between gap-3'>
          <span className='text-xs font-semibold uppercase tracking-[0.18em] text-latte'>
            {t.admin.recordDetails.companyRecord}
          </span>
          <button
            onClick={onBack}
            className='group inline-flex min-h-[44px] items-center gap-2 rounded-lg px-2 text-sm font-semibold text-latte transition-colors hover:bg-cream-2 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          >
            <ArrowLeftIcon className='h-5 w-5 transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5' />
            Back to History
          </button>
        </div>

        <section
          aria-labelledby='record-actions-heading'
          data-testid='record-actions'
          className='mb-4 rounded-2xl border border-hairline bg-cream-2/35 p-3 shadow-sm sm:p-4'
        >
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div>
              <h2 id='record-actions-heading' className='text-sm font-bold text-text'>{t.admin.recordDetails.recordActions}</h2>
              <p className='mt-0.5 text-xs text-latte'>{t.admin.recordDetails.recordActionsHint}</p>
            </div>
            <span className='hidden rounded-full border border-hairline bg-cream px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-latte sm:inline-flex'>
              {t.admin.recordDetails.tools}
            </span>
          </div>

          <input
            type='file'
            accept='.pdf'
            ref={fileInputRef}
            onChange={handleUploadFilledPDF}
            className='hidden'
            disabled={isParsingPDF}
          />
          <span id='missing-data-actions-help' className='sr-only'>
            {t.admin.recordDetails.missingDataHelp}
          </span>
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4'>              <button
        onClick={() => fileInputRef.current?.click()}
              disabled={isParsingPDF || !onUpdate}
              className='inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-cream px-3 py-2.5 text-sm font-bold text-text transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-cream-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
            >
              <DocumentArrowUpIcon className='h-5 w-5 shrink-0' />
              <span>{isParsingPDF ? "جاري الاستيراد..." : "رفع PDF مكتمل"}</span>
            </button>
            <div className='contents'>
              <button
                onClick={() => handleGenerateMissingDataPDF("company")}
                disabled={isGeneratingPDF}
                aria-describedby='missing-data-actions-help'
                className='inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2.5 text-sm font-bold text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
              >
                <DocumentArrowDownIcon className='h-5 w-5 shrink-0' />
                <span>استكمال بيانات ناقصة (PDF)</span>
              </button>
              <button
                onClick={() => handleGenerateMissingDataWord("company")}
                disabled={isGeneratingPDF}
                aria-describedby='missing-data-actions-help'
                className='inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-cream px-3 py-2.5 text-sm font-bold text-text transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-cream-2 focus:outline-none focus-visible:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50'
              >
                <DocumentArrowDownIcon className='h-5 w-5 shrink-0' />
                <span>استكمال بيانات ناقصة (Word)</span>
              </button>
            </div>
            <PrintDropdown
              label={t.admin.recordDetails.exportFullReport}
              onPrint={handlePrintFull}
              disabled={isGeneratingPDF}
              className='w-full [&>button]:min-h-[44px] [&>button]:w-full [&>button]:justify-center [&>button]:rounded-xl'
            />
          </div>
        </section>

        {/* Local Date Range Filter */}
        <section
          aria-labelledby='history-filter-heading'
          data-testid='history-filter'
          className='mb-6 rounded-2xl border border-hairline bg-cream-2/20 p-4 shadow-sm sm:p-5'
        >
          <div className='mb-4 flex items-start gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
              <CalendarIcon className='h-5 w-5' aria-hidden='true' />
            </div>
            <div>
              <h2 id='history-filter-heading' className='text-sm font-bold text-text'>{t.admin.recordDetails.filterHistory}</h2>
              <p className='mt-0.5 text-xs text-latte'>{t.admin.recordDetails.filterHistoryHint}</p>
            </div>
          </div>

          <div className='grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]'>
            <label className='min-w-0'>
              <span className='mb-1.5 block text-xs font-semibold text-latte'>{t.admin.recordDetails.from}</span>
              <input
                type='date'
                aria-label={t.admin.recordDetails.filterStartDate}
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className='h-11 w-full min-w-0 rounded-xl border border-hairline bg-cream px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
              />
            </label>
            <span className='hidden pb-3 text-center text-sm font-bold text-latte sm:col-span-1 sm:block' aria-hidden='true'>
              {t.admin.recordDetails.to}
            </span>
            <label className='min-w-0'>
              <span className='mb-1.5 block text-xs font-semibold text-latte'>{t.admin.recordDetails.to}</span>
              <input
                type='date'
                aria-label={t.admin.recordDetails.filterEndDate}
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className='h-11 w-full min-w-0 rounded-xl border border-hairline bg-cream px-3 text-sm text-text outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
              />
            </label>
            <button
              type='button'
              onClick={() => {
                setFilterStartDate("");
                setFilterEndDate("");
              }}
              disabled={!filterStartDate && !filterEndDate}
              className='inline-flex min-h-[44px] items-center justify-center gap-1.5 justify-self-end rounded-xl px-3 text-sm font-semibold text-latte transition-colors hover:bg-cream-2 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40 sm:col-span-1'
              title={t.admin.recordDetails.clearDates}
            >
              <XMarkIcon className='h-4 w-4' aria-hidden='true' />
              <span>{t.admin.recordDetails.clear}</span>
            </button>
          </div>
        </section>

        <div className='bg-cream rounded-xl shadow-lg overflow-hidden border border-hairline'>
          {/* Screen View Content */}
          <div className='border-b border-hairline bg-cream-2/20 p-4 sm:p-6'>
            <div className='flex flex-col gap-5'>
              <div className='flex items-start justify-between gap-4'>
                <div className='flex min-w-0 items-center gap-3'>
                  <div className='flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-hairline bg-cream-2 p-2 shadow-sm sm:h-16 sm:w-16'>
                    <img
                      src='/logo.svg'
                      alt={t.admin.recordDetails.logoAlt}
                      className='max-h-full max-w-full object-contain'
                    />
                  </div>
                  <div className='min-w-0'>
                    <h1 className='break-words text-2xl font-bold tracking-tight text-text sm:text-3xl'>
                      {submission.companyName}
                    </h1>
                    <div className='mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-latte'>
                      <span>
                        {submission.hasBranches
                          ? `${submission.branches.length} branches`
                          : 'Single location'}
                      </span>
                      {submission.created_at && (
                        <>
                          <span aria-hidden='true'>•</span>
                          <span>Submitted: {new Date(submission.created_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${submission.pendingSync ? 'border-amber-500/30 bg-amber-500/10 text-amber-500' : 'border-leaf-500/30 bg-leaf-500/10 text-leaf-600 dark:text-leaf-400'}`}>
                  <span className='h-2 w-2 rounded-full bg-current' aria-hidden='true' />
                  {submission.pendingSync ? 'Pending sync' : 'Synced'}
                </span>
              </div>

              <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                <SummaryMetric
                  label='Branches'
                  value={submission.hasBranches ? submission.branches.length : 1}
                  icon={BuildingStorefrontIcon}
                  testId='summary-branches'
                />
                <SummaryMetric
                  label={t.admin.recordDetails.maintenanceVisits}
                  value={companyMaintenanceSummary.visitCount}
                  icon={ClipboardDocumentCheckIcon}
                  testId='summary-visits'
                />
                <SummaryMetric
                  label={t.admin.recordDetails.lastVisit}
                  value={companyMaintenanceSummary.latestVisit || 'No visits'}
                  icon={CalendarIcon}
                  testId='summary-last-visit'
                />
                <SummaryMetric
                  label={t.admin.recordDetails.openIssues}
                  value={companyMaintenanceSummary.openIssues}
                  icon={ExclamationCircleIcon}
                  tone={companyMaintenanceSummary.openIssues > 0 ? 'warning' : 'default'}
                  testId='summary-open-issues'
                />
              </div>

              <div className='grid gap-5 md:grid-cols-[1.1fr_0.9fr]'>
                <section aria-labelledby='company-details-heading'>
                  <h3 id='company-details-heading' className='mb-3 text-sm font-bold text-text'>{t.admin.recordDetails.companyInformation}</h3>
                  <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                    <InfoTile label='Location' value={submission.location} icon={MapPinIcon} />
                    <InfoTile label='Email' value={submission.email} icon={EnvelopeIcon} />
                    <InfoTile label={t.admin.recordDetails.taxNumber} value={submission.taxNumber} icon={IdentificationIcon} />
                    <InfoTile
                      label={t.admin.recordDetails.coffeeConsumption}
                      value={submission.coffeeConsumptionKg ? `${submission.coffeeConsumptionKg} kg/month` : undefined}
                      icon={ScaleIcon}
                    />
                  </div>
                  {submission.hasBranches === false && (
                    <div className='mt-2 rounded-xl border border-hairline bg-cream-2/40 p-3'>
                      <div className='mb-2 flex items-center gap-2 text-xs font-semibold text-latte'>
                        <WrenchScrewdriverIcon className='h-4 w-4 text-primary' aria-hidden='true' />
                        <span>Machines</span>
                      </div>
                      <MachineList entity={submission} />
                    </div>
                  )}
                </section>
                <section aria-labelledby='main-contacts-heading'>
                  <h3 id='main-contacts-heading' className='mb-3 text-sm font-bold text-text'>{t.admin.recordDetails.mainContacts}</h3>
                  <ContactList
                    contacts={submission.contacts}
                    emptyTitle={t.admin.recordDetails.noContactsListed}
                    emptyMessage={t.admin.recordDetails.noContactsHint}
                  />
                </section>
              </div>

            {/* Main Office Maintenance */}
            {filteredMainHistory.length > 0 && (
              <div className='mt-6 pt-6 border-t border-hairline'>
                <h3 className='text-md font-bold text-text mb-3 flex items-center gap-2'>
                  <WrenchScrewdriverIcon className='w-5 h-5' /> {t.admin.fields.mainOfficeMaintenance}
                </h3>
                {filteredMainHistory.map((r) => (
                  <MaintenanceRecordView
                    key={r.id}
                    record={r}
                    onExport={(rec, mode, format) => handlePrintVisit(rec, mode, format)}
                  />
                ))}
              </div>
            )}
            {submission.maintenanceHistory.length > 0 &&
              filteredMainHistory.length === 0 && (
                <div className='mt-6 pt-6 border-t border-hairline text-center py-8'>
                  <p className='text-latte italic'>
                    No maintenance records match the selected date range.
                  </p>
                </div>
              )}              </div>
            </div>

          {/* Branches List Screen View */}
          {submission.hasBranches && (
            <div className='p-6 sm:p-8 bg-paper'>
              <div className='mb-5 flex flex-col gap-2 border-b border-hairline pb-4 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <p className='text-[11px] font-bold uppercase tracking-[0.18em] text-primary'>
                    {t.admin.recordDetails.branchWorkspace}
                  </p>
                  <h2 className='mt-1 flex items-center gap-2 text-xl font-bold text-text sm:text-2xl'>
                    <BuildingStorefrontIcon className='h-6 w-6 shrink-0 text-primary' aria-hidden='true' />
                    {t.admin.recordDetails.branchesAndMaintenance}
                  </h2>
                </div>
                <p className='text-xs text-latte'>
                  {submission.branches.length} {submission.branches.length === 1 ? t.admin.recordDetails.branch : t.admin.recordDetails.branches}
                </p>
              </div>

              <div className='space-y-4'>
                {submission.branches.map((branch, index) => {
                  // Apply filter to branch records
                  const filteredBranchHistory = filterRecords(
                    branch.maintenanceHistory,
                  );
                  // Recalculate stats based on filtered view so the "Total Visits" reflects the filter
                  const reportBranchHistory = getReportRecords(filteredBranchHistory);
                  const stats = getBranchStats(reportBranchHistory);
                  const branchSummary = getMaintenanceSummary(reportBranchHistory);

                  return (
                    <div
                      key={branch.id}
                      style={{
                        position: "relative",
                        zIndex: submission.branches.length - index,
                      }}
                    >
                      <CollapsibleCard
                        titleContent={
                          <div className='flex min-w-0 flex-1 flex-col gap-2 pe-4'>
                            <div className='flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3'>
                              <span
                                data-testid={`branch-card-title-${branch.id}`}
                                className='min-w-0 break-words whitespace-normal text-lg font-bold leading-snug'
                              >
                                {branch.branchName || `Branch ${index + 1}`}
                              </span>
                              <span className='flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-latte sm:justify-end'>
                                <span>{branch.location}</span>
                                <span aria-hidden='true'>•</span>
                                <span>{branchSummary.visitCount === 0 ? t.admin.recordDetails.noMaintenanceVisits : `${branchSummary.visitCount} ${branchSummary.visitCount === 1 ? t.admin.recordDetails.maintenanceVisit : t.admin.recordDetails.maintenanceVisitsPlural}`}</span>
                                {branchSummary.latestVisit && (
                                  <>
                                    <span aria-hidden='true'>•</span>
                                    <span>{t.admin.recordDetails.lastVisitPrefix} {branchSummary.latestVisit}</span>
                                  </>
                                )}
                                {branchSummary.openIssues > 0 && (
                                  <span className='text-amber-500'>
                                    • {branchSummary.openIssues} {branchSummary.openIssues === 1 ? t.admin.recordDetails.openIssue : t.admin.recordDetails.openIssuesPlural}
                                  </span>
                                )}
                              </span>
                            </div>

                          </div>
                        }
                        headerActions={
                          <div
                            data-testid={`branch-card-actions-${branch.id}`}
                            className='hidden min-w-0 flex-wrap items-center justify-end gap-2 sm:flex'
                          >
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isParsingPDF || !onUpdate}
                              className='flex items-center gap-1 bg-cream-2 text-text hover:bg-cream-3 font-bold py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-hairline'
                            >
                              <DocumentArrowUpIcon className='w-4 h-4' />
                              {isParsingPDF ? "جاري الاستيراد..." : "رفع PDF مكتمل"}
                            </button>
                            <button
                              onClick={() => handleGenerateMissingDataPDF("branch", branch.id)}
                              disabled={isGeneratingPDF}
                              className='flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 font-bold py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              <DocumentArrowDownIcon className='w-4 h-4' />
                              استكمال (PDF)
                            </button>
                            <button
                              onClick={() => handleGenerateMissingDataWord("branch", branch.id)}
                              disabled={isGeneratingPDF}
                              className='flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 font-bold py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed'
                            >
                              <DocumentArrowDownIcon className='w-4 h-4' />
                              استكمال (Word)
                            </button>
                            <PrintDropdown
                              label={t.admin.recordDetails.printBranch}
                              onPrint={(mode, format) =>
                                handlePrintBranch(branch, mode, format)
                              }
                              className='scale-90 ltr:origin-right rtl:origin-left'
                              disabled={isGeneratingPDF}
                            />
                          </div>
                        }
                        initiallyOpen={false}
                      >
                        <div className='space-y-6'>
                          {/* Mobile only buttons */}
                          <div className='mb-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:hidden'>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isParsingPDF || !onUpdate}
                              className='flex min-w-0 items-center justify-center gap-2 rounded-lg border border-hairline bg-cream-2 px-3 py-2 text-center text-xs font-bold text-text transition-colors hover:bg-cream-3 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                            >
                              <DocumentArrowUpIcon className='w-4 h-4' />
                              {isParsingPDF ? "جاري الاستيراد..." : "رفع PDF مكتمل"}
                            </button>
                            <button
                              onClick={() => handleGenerateMissingDataPDF("branch", branch.id)}
                              disabled={isGeneratingPDF}
                              className='flex min-w-0 items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                            >
                              <DocumentArrowDownIcon className='w-4 h-4' />
                              استكمال (PDF)
                            </button>
                            <button
                              onClick={() => handleGenerateMissingDataWord("branch", branch.id)}
                              disabled={isGeneratingPDF}
                              className='flex min-w-0 items-center justify-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-center text-xs font-bold text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm'
                            >
                              <DocumentArrowDownIcon className='w-4 h-4' />
                              استكمال (Word)
                            </button>
                            <div className='min-w-0 min-[360px]:col-span-2'>
                              <PrintDropdown
                                label={t.admin.recordDetails.printBranchReport}
                                onPrint={(mode, format) =>
                                  handlePrintBranch(branch, mode, format)
                                }
                                className='w-full [&>button]:w-full [&>button]:justify-center'
                                disabled={isGeneratingPDF}
                              />
                            </div>
                          </div>

                          <div className='grid grid-cols-1 gap-5 lg:grid-cols-[1.08fr_0.92fr]'>
                            <section aria-labelledby={`branch-info-${branch.id}`}>
                              <div className='mb-3 flex items-center justify-between gap-3'>
                                <h4 id={`branch-info-${branch.id}`} className='flex items-center gap-2 text-sm font-bold text-text'>
                                  <MapPinIcon className='h-4 w-4 text-primary' aria-hidden='true' />
                                  {t.admin.recordDetails.branchInformation}
                                </h4>
                                <span className='text-[11px] font-semibold uppercase tracking-wider text-latte'>
                                  {branch.location || t.admin.recordDetails.notSpecified}
                                </span>
                              </div>
                              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                                <InfoTile label={t.admin.recordDetails.location} value={branch.location || t.admin.recordDetails.notSpecified} icon={MapPinIcon} />
                                <InfoTile label={t.admin.recordDetails.email} value={branch.email || t.admin.recordDetails.notSpecified} icon={EnvelopeIcon} />
                                <InfoTile label={t.admin.recordDetails.taxNumber} value={branch.taxNumber || t.admin.recordDetails.notSpecified} icon={IdentificationIcon} />
                                <InfoTile label={t.admin.recordDetails.machines} value={getMachineOwnershipStatus(branch)} icon={WrenchScrewdriverIcon} />
                                {branch.coffeeConsumptionKg ? (
                                  <InfoTile label={t.admin.recordDetails.coffeeConsumption} value={`${branch.coffeeConsumptionKg} kg/month`} icon={ScaleIcon} />
                                ) : null}
                              </div>
                              {(branch.usesOurMachines || branch.hasMultipleMachines) && (
                                <div className='mt-2 rounded-xl border border-hairline bg-cream-2/40 p-3'>
                                  <div className='mb-2 flex items-center gap-2 text-xs font-semibold text-latte'>
                                    <WrenchScrewdriverIcon className='h-4 w-4 text-primary' aria-hidden='true' />
                                    <span>{t.admin.recordDetails.machineDetails}</span>
                                  </div>
                                  <MachineList entity={branch} hideCosts={false} />
                                </div>
                              )}
                            </section>

                            <section aria-labelledby={`branch-contacts-${branch.id}`}>
                              <div className='mb-3 flex items-center justify-between gap-3'>
                                <h4 id={`branch-contacts-${branch.id}`} className='flex items-center gap-2 text-sm font-bold text-text'>
                                  <UserGroupIcon className='h-4 w-4 text-primary' aria-hidden='true' />
                                  {t.admin.recordDetails.branchContacts}
                                </h4>
                                <span className='rounded-full bg-cream-2 px-2 py-0.5 text-[11px] font-bold text-latte'>
                                  {branch.contacts.length}
                                </span>
                              </div>
                              <ContactList
                                contacts={branch.contacts}
                                emptyTitle={t.admin.recordDetails.noContactsListed}
                                emptyMessage={t.admin.recordDetails.noContactsHint}
                              />
                            </section>
                          </div>

                          <div className='grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:grid-cols-4'>
                            <SummaryMetric label={t.admin.recordDetails.maintenanceVisits} value={stats.visitCount} icon={ClipboardDocumentCheckIcon} testId={`branch-${branch.id}-visits`} />
                            <SummaryMetric label={t.admin.recordDetails.lastVisit} value={branchSummary.latestVisit || t.admin.recordDetails.noVisits} icon={CalendarIcon} testId={`branch-${branch.id}-last-visit`} />
                            <SummaryMetric label={t.admin.recordDetails.openIssues} value={branchSummary.openIssues} icon={ExclamationCircleIcon} tone={branchSummary.openIssues > 0 ? 'warning' : 'default'} testId={`branch-${branch.id}-open-issues`} />
                            <SummaryMetric label={t.admin.recordDetails.replacedParts} value={Object.values(stats.partsMap).reduce((total, count) => total + count, 0)} icon={CubeIcon} testId={`branch-${branch.id}-parts`} />
                          </div>

                          {Object.keys(stats.partsMap).length > 0 && (
                            <div className='flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-hairline bg-cream-2/40 p-3 text-sm'>
                              <CubeIcon className='h-4 w-4 shrink-0 text-primary' aria-hidden='true' />
                              <span className='font-semibold text-latte'>{t.admin.recordDetails.partsSummary}</span>
                              {Object.entries(stats.partsMap).map(([name, count]) => (
                                <span key={name} className='inline-flex max-w-full items-center rounded-full border border-hairline bg-cream px-2 py-1 text-xs text-text'>
                                  <span className='me-1 font-bold'>{count}x</span>{name}
                                </span>
                              ))}
                            </div>
                          )}

                          {branch.baristas && branch.baristas.length > 0 && (
                            <section aria-labelledby={`branch-staff-${branch.id}`}>
                              <h4 id={`branch-staff-${branch.id}`} className='mb-2 flex items-center gap-2 text-sm font-bold text-text'>
                                <UserIcon className='h-4 w-4 text-primary' aria-hidden='true' />
                                {t.admin.recordDetails.assignedStaff}
                              </h4>
                              <div className='flex flex-wrap gap-2'>
                                {branch.baristas.map((b) => (
                                  <span
                                    key={b.id}
                                    className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream-2 text-text'
                                  >
                                    {b.name} ({b.rating}★)
                                  </span>
                                ))}
                              </div>
                            </section>
                          )}

                          <section aria-labelledby={`branch-maintenance-${branch.id}`}>
                            <div className='mb-3 flex flex-col gap-2 border-t border-hairline pt-5 sm:flex-row sm:items-end sm:justify-between'>
                              <div>
                                <h4 id={`branch-maintenance-${branch.id}`} className='flex items-center gap-2 text-base font-bold text-text'>
                                  <WrenchScrewdriverIcon className='h-5 w-5 text-primary' aria-hidden='true' />
                                  {t.admin.recordDetails.maintenanceAndLogisticsHistory}
                                </h4>
                                <p className='mt-1 text-xs text-latte'>{t.admin.recordDetails.maintenanceHistoryHint}</p>
                              </div>
                              <span className='self-start rounded-full bg-cream-2 px-2.5 py-1 text-xs font-bold text-latte sm:self-auto'>
                                {filteredBranchHistory.length} {filteredBranchHistory.length === 1 ? t.admin.recordDetails.visit : t.admin.recordDetails.visits}
                              </span>
                            </div>
                            {filteredBranchHistory.length > 0 ? (
                              filteredBranchHistory.map((r) => (
                                <MaintenanceRecordView
                                  key={r.id}
                                  record={r}
                                  onExport={(rec, mode, format) => handlePrintVisit(rec, mode, format, branch)}
                                />
                              ))
                            ) : (
                              <div className='rounded-xl border border-dashed border-hairline bg-cream-2/30 px-3 py-7 text-center sm:px-4 sm:py-8'>
                                <ClipboardDocumentCheckIcon className='mx-auto mb-2 h-8 w-8 text-latte/70' aria-hidden='true' />
                                <p className='text-sm font-semibold text-text'>{t.admin.recordDetails.noRecordsTitle}</p>
                                <p className='mt-1 text-xs text-latte'>{t.admin.recordDetails.noRecordsMatchFilter}</p>
                              </div>
                            )}
                          </section>
                        </div>
                      </CollapsibleCard>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <DateRangeExportModal
        isOpen={showDateRangeModal}
        onClose={() => {
          setShowDateRangeModal(false);
          setPendingPrintAction(null);
        }}
        onExport={handleDateRangeExport}
        isGenerating={isGeneratingPDF}
      />
      <ConfirmDialog
        isOpen={pendingParsedData !== null}
        onClose={cancelApplyParsedData}
        onConfirm={confirmApplyParsedData}
        title="استكمال البيانات"
        message="سيتم استبدال البيانات الناقصة بالبيانات المستوردة من ملف PDF. هل تريد المتابعة؟"
        confirmLabel="استيراد"
        cancelLabel="إلغاء"
      />

    </div>
  );
};

export default SubmissionDetails;
