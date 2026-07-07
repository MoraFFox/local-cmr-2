/** @format */

import React, { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useFloatingMenu } from "../hooks/useFloatingMenu";
import {
  FormData,
  MaintenanceRecord,
  Branch,
  Contact,
  Barista,
  MaintenancePhoto,
} from "../types";
import CollapsibleCard from "./CollapsibleCard";
import Avatar from "./Avatar";
import { generateCompanyPDF, generateBranchPDF } from "../utils/pdfGenerator";
import { logger } from "../utils/logger";
import { useToast } from "./ToastContext";
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
} from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";

interface SubmissionDetailsProps {
  submission: FormData & { created_at?: string };
  onBack: () => void;
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

const getMachineOwnershipStatus = (
  entity: {
    usesOurMachines: boolean | null;
    machineOwnershipType?: "bought" | "leased";
    dailyLeaseCost?: number;
  },
  hideCosts = false,
) => {
  if (
    entity.usesOurMachines === null ||
    typeof entity.usesOurMachines === "undefined"
  ) {
    return "Not specified";
  }
  if (entity.usesOurMachines === false) {
    return "No";
  }
  if (entity.usesOurMachines === true) {
    if (entity.machineOwnershipType) {
      const type =
        entity.machineOwnershipType.charAt(0).toUpperCase() +
        entity.machineOwnershipType.slice(1);
      let status = `Yes (${type})`;
      if (
        !hideCosts &&
        entity.machineOwnershipType === "leased" &&
        entity.dailyLeaseCost
      ) {
        status += ` - ${new Intl.NumberFormat("ar-EG", { style: "currency", currency: "EGP" }).format(entity.dailyLeaseCost)} / day`;
      }
      return status;
    }
    return "Yes (Acquisition type not specified)";
  }
  return "Not specified";
};

const getPaidByLabel = (val: string) =>
  val === "company" ? "Mido's" : "Company";

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
    <div className='flex items-start gap-2 text-sm py-1'>
      {Icon && <Icon className='w-4 h-4 text-latte mt-0.5 shrink-0' />}
      <span className='font-medium text-latte shrink-0'>
        {label}:
      </span>
      <span className='text-ink break-all'>
        {value}
      </span>
    </div>
  );
};

const ContactList = ({ contacts }: { contacts: Contact[] }) => {
  if (!contacts || contacts.length === 0)
    return <p className='text-xs text-latte italic'>No contacts listed.</p>;
  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2'>
      {contacts.map((c) => (
        <div
          key={c.id}
          className='bg-cream-2 p-2 rounded border border-hairline'
        >
          <p className='font-bold text-ink text-sm'>
            {c.name}
          </p>
          <p className='text-xs text-latte uppercase font-semibold mb-1'>
            {c.position === "custom" ? c.customPosition : c.position}
          </p>
          {c.phoneNumbers.map((p) => (
            <div
              key={p.id}
              className='flex items-center gap-1 text-xs text-ink'
            >
              <PhoneIcon className='w-3 h-3 text-latte' />
              {p.number}
            </div>
          ))}
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
              className="w-full h-20 object-cover rounded border border-hairline group-hover:ring-2 group-hover:ring-copper-500 transition-all"
            />
          </a>
        ))}
      </div>
    </div>
  );
};

const MaintenanceRecordView: React.FC<{ record: MaintenanceRecord }> = ({
  record,
}) => {
  return (
    <div className='border-l-2 border-copper-500 pl-4 py-2 mb-4 bg-cream-2 rounded-r-md'>
      <div className='flex justify-between items-start'>
        <div>
          <div className='flex items-center gap-2'>
            <p className='font-bold text-ink'>
              {record.maintenanceDate}
            </p>
            {record.dailyLeaseCost && (
              <span className='text-xs bg-amber-500/10 px-1.5 py-0.5 rounded text-amber-500 border border-amber-500/20'>
                Lease: {record.dailyLeaseCost} EGP
              </span>
            )}
            <span className='text-xs bg-copper-500/10 px-1.5 py-0.5 rounded text-copper-600 border border-copper-500/20'>
              Paid By: {getPaidByLabel(record.paidBy)}
            </span>
          </div>
          <p className='text-xs text-latte'>
            {record.type} • {record.visitZone || "No Zone"}
          </p>
          {record.nextVisitDate && (
            <p className='text-xs text-copper-500 mt-1'>
              <span className='font-semibold'>Next Scheduled:</span>{" "}
              {record.nextVisitDate}
            </p>
          )}
        </div>
        {record.baristaName && (
          <span className='text-xs bg-cream-2 px-2 py-1 rounded text-ink'>
            Staff: {record.baristaName}
          </span>
        )}
      </div>

      <div className='mt-2 text-sm space-y-1'>
        {record.machines && record.machines.length > 0 && (
          <div>
            <span className='font-semibold text-ink'>
              Machines:
            </span>
            <ul className='list-disc list-inside pl-1 text-ink'>
              {record.machines.map((m) => (
                <li key={m.id}>
                  {m.count}x {m.name}
                </li>
              ))}
            </ul>
          </div>
        )}
        {record.problems && record.problems.length > 0 && (
          <p className="text-ink">
            <span className='font-semibold'>Issues:</span>{" "}
            {record.problems.join(", ")}
          </p>
        )}
        {record.partsWereReplaced &&
          record.partsReplaced &&
          record.partsReplaced.length > 0 && (
            <div>
              <span className='font-semibold text-ember-700 dark:text-ember-300'>
                Parts Replaced:
              </span>
              <ul className='list-disc list-inside pl-1 text-ink dark:text-latte/70'>
                {record.partsReplaced.map((p, i) => (
                  <li key={i}>
                    {p.count}x {p.name} {p.paidByClient && "(Paid by Client)"}
                  </li>
                ))}
              </ul>
            </div>
          )}
        {record.servicesPerformed && record.servicesPerformed.length > 0 && (
          <div>
            <span className='font-semibold text-blue-600 dark:text-blue-400'>
              Services:
            </span>
            <ul className='list-disc list-inside pl-1 text-ink dark:text-latte/70'>
              {record.servicesPerformed.map((s, i) => (
                <li key={i}>
                  {s.count}x {s.name} {s.paidByClient && "(Paid by Client)"}
                </li>
              ))}
            </ul>
          </div>
        )}
        {record.notes && (
          <p className='italic text-ink dark:text-latte mt-1'>
            "{record.notes}"
          </p>
        )}
      </div>

      {/* Photos Section */}
      {record.photos && record.photos.length > 0 && (
        <div className="mt-4 p-3 bg-cream dark:bg-espresso rounded-lg">
          <h4 className="text-sm font-semibold mb-2 text-ink dark:text-latte/70">Photos</h4>
          {renderPhotoGroup(record.photos, "before", "Before")}
          {renderPhotoGroup(record.photos, "after", "After")}
          {renderPhotoGroup(record.photos, "legacy", "Legacy")}
        </div>
      )}

      {/* Recursively show follow-ups */}
      {record.followUpVisits && record.followUpVisits.length > 0 && (
        <div className='mt-3 ml-2'>
          <p className='text-xs font-bold uppercase text-latte mb-1'>
            Follow-up Visits
          </p>
          {record.followUpVisits.map((fu) => (
            <MaintenanceRecordView key={fu.id} record={fu} />
          ))}
        </div>
      )}
    </div>
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
    <span className='text-sm text-ink font-medium'>{value || "-"}</span>
  </div>
);

const MaintenanceTable: React.FC<{
  records: MaintenanceRecord[];
  hideCosts?: boolean;
}> = ({ records, hideCosts }) => {
  if (!records || records.length === 0)
    return <p className='text-xs text-latte italic'>No records found.</p>;

  return (
    <table className='w-full text-left text-xs border border-hairline mb-4 break-inside-auto'>
      <thead className='bg-cream text-ink uppercase font-bold'>
        <tr>
          <th className='px-2 py-1.5 border-b border-hairline w-24'>Date</th>
          <th className='px-2 py-1.5 border-b border-hairline w-32'>Staff</th>
          <th className='px-2 py-1.5 border-b border-hairline'>
            Work Details
          </th>
        </tr>
      </thead>
      <tbody className='divide-y divide-slate-200'>
        {records.map((rec) => (
          <React.Fragment key={rec.id}>
            <tr className='break-inside-avoid'>
              <td className='px-2 py-2 align-top'>
                <div>{rec.maintenanceDate}</div>
                <div className='text-[10px] text-latte mt-0.5'>
                  {rec.type}
                </div>
                {rec.nextVisitDate && (
                  <div className='text-[10px] text-copper-700 mt-1 font-semibold'>
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
                  <div className='italic text-ink mt-1'>
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
      className={`mb-6 break-inside-avoid border border-hairline rounded-lg overflow-hidden ${depth > 0 ? "ml-6 border-l-4 border-l-slate-400 bg-cream" : "bg-white shadow-sm"}`}
    >
      <div className='bg-cream px-4 py-2 border-b border-hairline flex justify-between items-center'>
        <div className='flex items-center gap-3'>
          <span className='font-bold text-sm text-ink'>
            {record.maintenanceDate}
          </span>
          <span className='text-xs text-latte uppercase font-semibold tracking-wider bg-white border border-hairline px-2 py-0.5 rounded-full'>
            {record.type} Visit
          </span>
          {record.visitZone && (
            <span className='text-xs text-copper-700 bg-cream-2 border border-copper-500/30 px-2 py-0.5 rounded-full capitalize'>
              {record.visitZone.replace("_", " ")}
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
          <div className='flex items-center gap-1.5 text-xs font-semibold text-ink bg-white border border-hairline px-2 py-1 rounded shadow-sm'>
            <UserIcon className='w-3.5 h-3.5 text-latte' />
            Performed by:{" "}
            <span className='text-ink font-bold'>
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
              <span className='font-bold text-ink w-20 uppercase text-[10px] tracking-wider pt-0.5'>
                Machines
              </span>
              <div className='flex-1 flex flex-wrap gap-2'>
                {record.machines.map((m, i) => (
                  <span
                    key={i}
                    className='inline-flex items-center bg-white border border-hairline px-2 py-1 rounded font-bold text-ink shadow-sm'
                  >
                    <CubeIcon className='w-3 h-3 text-latte mr-1' />
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
              <span className='font-bold text-ink w-20 uppercase text-[10px] tracking-wider pt-0.5'>
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
                        <span className='text-[10px] text-copper-600 border border-copper-500/30 px-1 rounded bg-cream-2'>
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
              <span className='font-bold text-ink w-20 uppercase text-[10px] tracking-wider'>
                Recs
              </span>
              <div className='italic text-ink bg-yellow-50/50 p-1 rounded'>
                {record.recommendations}
              </div>
            </div>
          )}
          {record.notes && (
            <div className='flex gap-2'>
              <span className='font-bold text-ink w-20 uppercase text-[10px] tracking-wider'>
                Notes
              </span>
              <div className='italic text-ink'>{record.notes}</div>
            </div>
          )}
        </div>

        {/* Right Col: Supervisors */}
        <div className='col-span-4 pl-4 flex flex-col'>
          <div className='bg-white p-3 rounded-lg border-2 border-dashed border-hairline h-full flex flex-col justify-between'>
            <div>
              <p className='font-bold text-latte uppercase tracking-wider text-[10px] mb-3 text-center border-b border-hairline pb-1'>
                Supervisors
              </p>
              {record.supervisors && record.supervisors.length > 0 ? (
                <div className='space-y-2'>
                  {record.supervisors.map((s) => (
                    <div key={s.id} className='text-center p-2 bg-cream rounded'>
                      <p className='font-bold text-[11px] text-ink uppercase'>
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
  const stats = getBranchStats(branch.maintenanceHistory);

  return (
    <div
      id='print-container'
      className='hidden print:block font-sans text-black force-daylight bg-white w-full max-w-[210mm] mx-auto p-8'
    >
      {/* Header */}
      <div className='flex justify-between items-start mb-8 border-b-2 border-hairline pb-6'>
        <div className='flex items-center gap-4'>
          <img
            src='/logo.svg'
            alt="Mido's For Distribution"
            className='h-16 w-auto object-contain'
          />
          <div>
            <h1 className='text-2xl font-bold text-ink tracking-tight leading-none'>
              {companyName}
            </h1>
            <h2 className='text-lg text-ink mt-1 font-medium'>
              {branch.branchName || "Branch Report"}
            </h2>
          </div>
        </div>
        <div className='text-right'>
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
              <span className='font-medium text-ink'>
                {branch.email || "-"}
              </span>
            </div>
            <div>
              <span className='text-xs font-bold text-latte uppercase block mb-0.5'>
                Tax ID
              </span>
              <span className='font-medium text-ink'>
                {branch.taxNumber || "-"}
              </span>
            </div>
            <div>
              <span className='text-xs font-bold text-latte uppercase block mb-0.5'>
                Machine Ownership
              </span>
              <span className='font-medium text-ink'>
                {getMachineOwnershipStatus(branch, hideCosts)}
              </span>
            </div>
            <div>
              <span className='text-xs font-bold text-latte uppercase block mb-0.5'>
                Total Visits
              </span>
              <span className='font-medium text-ink'>
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
                    <span className='font-bold text-ink'>{c.name}</span>
                    <span className='text-latte mx-1'>•</span>
                    <span className='text-ink'>
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
                  <span className='font-semibold text-ink truncate'>
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

        {branch.maintenanceHistory.length > 0 ? (
          <div className='space-y-4'>
            {branch.maintenanceHistory.map((rec) => (
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
      <div className='flex justify-between items-end border-b-2 border-hairline pb-4 mb-8'>
        <div>
          <h1 className='text-3xl font-bold text-ink tracking-tight'>
            {data.companyName}
          </h1>
          <p className='text-sm text-ink mt-1'>
            Comprehensive Maintenance Report
          </p>
        </div>
        <div className='text-right text-xs text-latte'>
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
            <ul className='text-sm list-disc pl-4 space-y-0.5'>
              {data.contacts.map((c) => (
                <li key={c.id}>
                  <span className='font-semibold'>{c.name}</span>
                  <span className='text-ink'> — {c.position}</span>
                  {c.phoneNumbers.length > 0 && (
                    <span className='text-latte text-xs ml-2'>
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
      {!data.hasBranches && data.maintenanceHistory.length > 0 && (
        <PrintSection title='Main Office Maintenance History'>
          <MaintenanceTable
            records={data.maintenanceHistory}
            hideCosts={hideCosts}
          />
        </PrintSection>
      )}

      {/* Branches Section */}
      {data.hasBranches && (
        <div className='mt-8'>
          <h2 className='text-lg font-bold text-ink border-b-2 border-hairline pb-1 mb-4'>
            Branch Details & Maintenance
          </h2>

          {data.branches.map((branch, idx) => {
            const stats = getBranchStats(branch.maintenanceHistory);
            return (
              <div key={branch.id} className='mb-8 break-inside-avoid-page'>
                <div className='bg-cream p-2 border-l-4 border-hairline mb-3 flex justify-between items-baseline'>
                  <h3 className='font-bold text-base text-ink'>
                    {branch.branchName || `Branch ${idx + 1}`}
                  </h3>
                  <span className='text-xs text-ink font-normal'>
                    {branch.location}
                  </span>
                </div>

                <div className='grid grid-cols-4 gap-4 mb-4 px-2'>
                  <PrintField label='Email' value={branch.email} />
                  <PrintField label='Tax ID' value={branch.taxNumber} />
                  <PrintField
                    label='Machines'
                    value={
                      branch.usesOurMachines
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
                        <span className='uppercase text-latte font-bold mr-2'>
                          Daily Lease:
                        </span>
                        <span className='font-bold text-ink'>
                          {branch.dailyLeaseCost} EGP
                        </span>
                      </div>
                    )}
                    {Object.keys(stats.partsMap).length > 0 && (
                      <div>
                        <span className='uppercase text-latte font-bold mr-2'>
                          Parts Replaced:
                        </span>
                        <span className='text-ink'>
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
                    <div className='text-xs text-ink'>
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
  onPrint: (mode: "internal" | "client") => void;
  className?: string;
  disabled?: boolean;
}> = ({ label, onPrint, className, disabled }) => {
  const { open: isOpen, setOpen: setIsOpen, triggerRef, contentRef, style, toggle } = useFloatingMenu();

  const handleSelect = (mode: "internal" | "client") => {
    setIsOpen(false);
    onPrint(mode);
  };

  return (
    <div className={`relative inline-block text-left ${className}`}>
      <button
        ref={triggerRef as React.RefObject<HTMLButtonElement>}
        type='button'
        onClick={(e) => {
          e.stopPropagation();
          toggle();
        }}
        disabled={disabled}
        className='flex items-center gap-2 bg-copper-500 text-ink font-bold py-2 px-4 rounded-lg hover:bg-copper-600 transition-colors shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-copper-500 disabled:opacity-50 disabled:cursor-not-allowed'
      >
        <PrinterIcon className='w-5 h-5' />
        {label}
        <ChevronDownIcon className='w-4 h-4 ml-1' />
      </button>

      {isOpen && createPortal(
        <div
          ref={contentRef}
          className='fixed w-56 rounded-md shadow-lg bg-cream border border-hairline focus:outline-none z-[9999] overflow-hidden'
          style={style}
        >
          <div className='py-1' role='menu' aria-orientation='vertical'>
            <button
              onClick={() => handleSelect("internal")}
              className='block w-full text-left px-4 py-3 text-sm text-ink hover:bg-cream-2'
              role='menuitem'
            >
              <span className='font-bold'>Internal Report</span>
              <span className='block text-xs text-latte mt-0.5'>
                Includes all costs & financial data
              </span>
            </button>
            <button
              onClick={() => handleSelect("client")}
              className='block w-full text-left px-4 py-3 text-sm text-ink hover:bg-cream-2 border-t border-hairline'
              role='menuitem'
            >
              <span className='font-bold'>Client Report</span>
              <span className='block text-xs text-latte mt-0.5'>
                Hides all cost information
              </span>
            </button>
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
}) => {
  const { showToast } = useToast();
  const [printingBranch, setPrintingBranch] = useState<Branch | null>(null);
  const [isPrintingClientVersion, setIsPrintingClientVersion] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrintFull = async (mode: "internal" | "client") => {
    setIsGeneratingPDF(true);
    try {
      const doc = await generateCompanyPDF(submission, {
        includeCosts: mode === "internal",
      });
      const fileName = `${submission.companyName.replace(/\s+/g, "_")}_${mode === "internal" ? "Internal" : "Client"}_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      logger.error("Error generating PDF", error, "pdf");
      showToast("فشل إنشاء PDF. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrintBranch = async (
    branch: Branch,
    mode: "internal" | "client",
  ) => {
    setIsGeneratingPDF(true);
    try {
      const doc = await generateBranchPDF(submission.companyName, branch, {
        includeCosts: mode === "internal",
      });
      const fileName = `${submission.companyName.replace(/\s+/g, "_")}_${branch.branchName?.replace(/\s+/g, "_")}_${mode === "internal" ? "Internal" : "Client"}_Report_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(fileName);
    } catch (error) {
      logger.error("Error generating PDF", error, "pdf");
      showToast("فشل إنشاء PDF. يرجى المحاولة مرة أخرى.", "error");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const filterRecords = (records: MaintenanceRecord[]) => {
    if (!filterStartDate && !filterEndDate) return records;

    return records.filter((r) => {
      const rDate = new Date(r.maintenanceDate);
      let match = true;
      if (filterStartDate && rDate < new Date(filterStartDate)) match = false;
      if (filterEndDate && rDate > new Date(filterEndDate)) match = false;
      return match;
    });
  };

  // Derived filtered maintenance history for main office
  const filteredMainHistory = useMemo(
    () => filterRecords(submission.maintenanceHistory || []),
    [submission.maintenanceHistory, filterStartDate, filterEndDate],
  );

  return (
    <div className='w-full max-w-5xl mx-auto pb-10 print:max-w-none print:pb-0 print:w-full'>
      {/* === SCREEN VIEW === */}
      <div className='print:hidden'>
        <div className='flex justify-between items-center mb-6'>
          <button
            onClick={onBack}
            className='flex items-center gap-2 text-latte hover:text-ink transition-colors'
          >
            <ArrowLeftIcon className='w-5 h-5' /> Back to History
          </button>
          <PrintDropdown
            label='Export Full Report'
            onPrint={handlePrintFull}
            disabled={isGeneratingPDF}
          />
        </div>

        {/* Local Date Range Filter */}
        <div className='bg-cream p-4 rounded-xl shadow-sm border border-hairline mb-6 flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-2 text-ink font-semibold text-sm'>
            <CalendarIcon className='w-5 h-5 text-copper-500' />
            <span>Filter History by Date:</span>
          </div>
          <div className='flex items-center gap-2'>
            <input
              type='date'
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className='px-3 py-1.5 rounded-lg border-hairline bg-cream text-ink text-sm focus:ring-copper-500 focus:border-copper-500'
            />
            <span className='text-latte'>-</span>
            <input
              type='date'
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className='px-3 py-1.5 rounded-lg border-hairline bg-cream text-ink text-sm focus:ring-copper-500 focus:border-copper-500'
            />
            {(filterStartDate || filterEndDate) && (
              <button
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
                className='ml-2 p-1.5 text-latte hover:text-copper-500 hover:bg-copper-500/10 rounded-full transition-colors'
                title='Clear Dates'
              >
                <XMarkIcon className='w-5 h-5' />
              </button>
            )}
          </div>
        </div>

        <div className='bg-cream rounded-xl shadow-lg overflow-hidden border border-hairline'>
          {/* Screen View Content */}
          <div className='p-6 sm:p-8 bg-cream-2/20 border-b border-hairline'>
            <div className='flex flex-col sm:flex-row justify-between items-start gap-4'>
              <div className='flex items-center gap-4'>
                <div className='h-16 w-16 bg-cream-2 rounded-lg border border-hairline flex items-center justify-center p-2 shadow-sm shrink-0'>
                  <img
                    src='/logo.svg'
                    alt='Logo'
                    className='max-h-full max-w-full object-contain'
                  />
                </div>
                <div>
                  <h1 className='text-3xl font-bold text-ink mb-1'>
                    {submission.companyName}
                  </h1>
                  <div className='flex flex-wrap gap-x-4 gap-y-1 text-sm text-latte'>
                    {submission.created_at && (
                      <span>
                        Submitted:{" "}
                        {new Date(submission.created_at).toLocaleDateString()}
                      </span>
                    )}
                    <span>•</span>
                    <span>
                      {submission.hasBranches
                        ? `${submission.branches.length} Branches`
                        : "Single Location"}
                    </span>
                  </div>
                </div>
              </div>
              <div className='bg-cream p-3 rounded-lg border border-hairline shadow-sm self-start'>
                <div className='text-xs text-latte uppercase font-semibold'>
                  Status
                </div>
                <div className='font-bold text-copper-500'>
                  {submission.pendingSync ? "Offline (Pending Sync)" : "Synced"}
                </div>
              </div>
            </div>

            <div className='mt-6 grid grid-cols-1 md:grid-cols-2 gap-6'>
              <div>
                <h3 className='text-sm font-bold uppercase text-latte mb-2'>
                  Company Details
                </h3>
                <div className='space-y-1'>
                  <InfoRow
                    icon={EnvelopeIcon}
                    label='Email'
                    value={submission.email}
                  />
                  <InfoRow
                    icon={IdentificationIcon}
                    label='Tax Number'
                    value={submission.taxNumber}
                  />
                  <InfoRow
                    icon={MapPinIcon}
                    label='Location'
                    value={submission.location}
                  />
                  {submission.hasBranches === false && (
                    <InfoRow
                      icon={WrenchScrewdriverIcon}
                      label='Machines'
                      value={getMachineOwnershipStatus(submission)}
                    />
                  )}
                </div>
              </div>
              <div>
                <h3 className='text-sm font-bold uppercase text-latte mb-2'>
                  Main Contacts
                </h3>
                <ContactList contacts={submission.contacts} />
              </div>
            </div>

            {/* Main Office Maintenance */}
            {filteredMainHistory.length > 0 && (
              <div className='mt-6 pt-6 border-t border-hairline'>
                <h3 className='text-md font-bold text-ink mb-3 flex items-center gap-2'>
                  <WrenchScrewdriverIcon className='w-5 h-5' /> Main Office
                  Maintenance
                </h3>
                {filteredMainHistory.map((r) => (
                  <MaintenanceRecordView key={r.id} record={r} />
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
              )}
          </div>

          {/* Branches List Screen View */}
          {submission.hasBranches && (
            <div className='p-6 sm:p-8 bg-paper'>
              <h2 className='text-xl font-bold text-ink mb-4 flex items-center gap-2 border-b border-hairline pb-2'>
                <BuildingStorefrontIcon className='w-6 h-6 text-copper-500' />
                Branches & Maintenance
              </h2>

              <div className='space-y-4'>
                {submission.branches.map((branch, index) => {
                  // Apply filter to branch records
                  const filteredBranchHistory = filterRecords(
                    branch.maintenanceHistory,
                  );
                  // Recalculate stats based on filtered view so the "Total Visits" reflects the filter
                  const stats = getBranchStats(filteredBranchHistory);

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
                          <div className='flex flex-col sm:flex-row sm:items-baseline gap-2 w-full pr-4'>
                            <div className='flex flex-col sm:flex-row sm:items-baseline gap-2'>
                              <span className='font-bold text-lg'>
                                {branch.branchName || `Branch ${index + 1}`}
                              </span>
                            </div>
                            <div className='flex-grow'></div>

                            {/* Desktop Dropdown for Branch */}
                            <div className='hidden sm:block'>
                              <PrintDropdown
                                label='Print Branch'
                                onPrint={(mode) =>
                                  handlePrintBranch(branch, mode)
                                }
                                className='scale-90 origin-right'
                                disabled={isGeneratingPDF}
                              />
                            </div>
                          </div>
                        }
                        initiallyOpen={false}
                      >
                        <div className='space-y-6'>
                          {/* Mobile only print button */}
                          <div className='sm:hidden mb-4'>
                            <PrintDropdown
                              label='Print Branch Report'
                              onPrint={(mode) =>
                                handlePrintBranch(branch, mode)
                              }
                              className='w-full'
                              disabled={isGeneratingPDF}
                            />
                          </div>

                          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                            <div>
                              <h4 className='text-xs font-bold uppercase text-latte mb-2'>
                                Branch Info
                              </h4>
                              <InfoRow
                                icon={MapPinIcon}
                                label='Location'
                                value={branch.location}
                              />
                              <InfoRow
                                icon={EnvelopeIcon}
                                label='Email'
                                value={branch.email}
                              />
                              <InfoRow
                                icon={IdentificationIcon}
                                label='Tax ID'
                                value={branch.taxNumber}
                              />
                              <InfoRow
                                icon={WrenchScrewdriverIcon}
                                label='Machines'
                                value={getMachineOwnershipStatus(branch)}
                              />
                            </div>
                            <div>
                              <h4 className='text-xs font-bold uppercase text-latte mb-2'>
                                Contacts
                              </h4>
                              <ContactList contacts={branch.contacts} />
                            </div>
                          </div>

                          {/* Branch Stats Summary */}
                          <div className='bg-cream rounded-lg p-3 border border-hairline flex flex-wrap gap-4 text-sm'>
                            <div className='flex items-center gap-2'>
                              <ClipboardDocumentCheckIcon className='w-4 h-4 text-latte' />
                              <span className='text-latte font-medium'>
                                Total Visits:
                              </span>
                              <span className='font-bold text-ink'>
                                {stats.visitCount}
                              </span>
                            </div>

                            {/* Machine Status */}
                            {branch.usesOurMachines && (
                              <div className='flex items-center gap-2'>
                                <WrenchScrewdriverIcon className='w-4 h-4 text-latte' />
                                <span className='text-latte font-medium'>
                                  Machines:
                                </span>
                                <span
                                  className={`font-bold ${branch.machineOwnershipType === "leased" ? "text-amber-500" : "text-leaf-500"}`}
                                >
                                  {branch.machineOwnershipType === "leased"
                                    ? "Leased"
                                    : "Bought"}
                                </span>
                              </div>
                            )}

                            {branch.dailyLeaseCost && (
                              <div className='flex items-center gap-2'>
                                <BanknotesIcon className='w-4 h-4 text-latte' />
                                <span className='text-latte font-medium'>
                                  Daily Lease:
                                </span>
                                <span className='font-bold text-ink'>
                                  {branch.dailyLeaseCost} EGP
                                </span>
                              </div>
                            )}
                            {Object.keys(stats.partsMap).length > 0 && (
                              <div className='flex items-start gap-2 w-full pt-2 border-t border-hairline'>
                                <CubeIcon className='w-4 h-4 text-latte mt-0.5' />
                                <div className='flex flex-wrap gap-x-3 gap-y-1'>
                                  <span className='text-latte font-medium'>
                                    Parts Summary:
                                  </span>
                                  {Object.entries(stats.partsMap).map(
                                    ([name, count]) => (
                                      <span
                                        key={name}
                                        className='inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-cream-2 border border-hairline text-ink'
                                      >
                                        <span className='font-bold mr-1'>
                                          {count}x
                                        </span>{" "}
                                        {name}
                                      </span>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {branch.baristas && branch.baristas.length > 0 && (
                            <div>
                              <h4 className='text-xs font-bold uppercase text-latte mb-2 flex items-center gap-1'>
                                <UserGroupIcon className='w-4 h-4' /> Baristas
                              </h4>
                              <div className='flex flex-wrap gap-2'>
                                {branch.baristas.map((b) => (
                                  <span
                                    key={b.id}
                                    className='inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream-2 text-ink'
                                  >
                                    {b.name} ({b.rating}★)
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div>
                            <h4 className='text-sm font-bold text-ink mb-3 flex items-center gap-2 border-t pt-3 border-hairline'>
                              <WrenchScrewdriverIcon className='w-4 h-4' />{" "}
                              Maintenance History
                            </h4>
                            {filteredBranchHistory.length > 0 ? (
                              filteredBranchHistory.map((r) => (
                                <MaintenanceRecordView key={r.id} record={r} />
                              ))
                            ) : (
                              <p className='text-sm text-latte italic'>
                                No maintenance records match filter.
                              </p>
                            )}
                          </div>
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
    </div>
  );
};

export default SubmissionDetails;
