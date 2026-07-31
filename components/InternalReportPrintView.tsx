/** @format */

import React, { useMemo } from "react";
import {
  FormData,
  Branch,
  MaintenanceRecord,
  LogisticsOperation,
} from "../types";
import {
  aggregateCosts,
  aggregateBranchCosts,
  getVisitZoneBreakdown,
  getTechnicianSummary,
  getOperationalKPIs,
  getProblemFrequency,
  formatCurrencyEn,
  aggregateLogisticsCosts,
  type AggregatedItem,
} from "../utils/costAggregation";
import LogisticsReportSection from "./LogisticsReportSection";
import ReportIcon from "./ReportIcon";
import type { PdfIconName } from "../utils/pdfTheme";
import { partsList, servicesList } from "../constants";
import { getReportRecords } from "../utils/dateRangeFilter";

// ── Helpers ──

const getPaidByLabel = (val: string) =>
  val === "company" ? "Mido's" : "Client";

const formatDate = (date = new Date()) =>
  date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

interface FinancialCardProps {
  label: string;
  value: string | number;
  accent?: "crimson" | "blue" | "amber" | "green";
  icon?: PdfIconName;
}

const FinancialCard: React.FC<FinancialCardProps> = ({ label, value, accent = "crimson", icon }) => {
  const borderColors: Record<string, string> = {
    crimson: "border-primary",
    blue: "border-blue-600",
    amber: "border-amber-500",
    green: "border-green-600",
  };

  return (
    <div
      className={`bg-white border-t-4 ${borderColors[accent]} border border-hairline rounded-lg p-3 shadow-sm`}
    >
      <div className='text-xs text-latte uppercase font-semibold mb-1 flex items-center gap-1'>
        {icon && <ReportIcon name={icon} className='w-3.5 h-3.5' />}
        <span>{label}</span>
      </div>
      <div className='text-lg font-bold text-text'>{value}</div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode; icon?: PdfIconName }> = ({ children, icon }) => (
  <h3 className='text-sm font-bold uppercase tracking-wider text-text border-s-4 border-primary ps-3 mb-3 mt-6 flex items-center gap-1.5'>
    {icon && <ReportIcon name={icon} className='w-4 h-4 text-primary' />}
    <span>{children}</span>
  </h3>
);

const computeRecordCostSummary = (record: MaintenanceRecord) => {
  let partsCost = 0;
  let servicesCost = 0;
  (record.partsReplaced || []).forEach((p) => {
    partsCost += (p.count || 0) * (p.cost || 0);
  });
  (record.servicesPerformed || []).forEach((s) => {
    servicesCost += (s.count || 0) * (s.cost || 0);
  });
  const leaseCost = record.dailyLeaseCost || 0;
  return { partsCost, servicesCost, leaseCost, total: partsCost + servicesCost + leaseCost };
};

// ── Maintenance record card for print ──

const PrintRecordCard: React.FC<{ record: MaintenanceRecord }> = ({ record }) => {
  const recCosts = computeRecordCostSummary(record);

  return (
    <div className='border border-hairline rounded-lg overflow-hidden mb-4 bg-white break-inside-avoid'>
      <div className='bg-cream px-4 py-2 border-b border-hairline flex flex-wrap justify-between items-center gap-2'>
        <div className='flex items-center gap-2'>
          <span className='font-bold text-text'>{record.maintenanceDate}</span>
          <span className='text-[10px] uppercase font-semibold text-latte bg-white border border-hairline px-2 py-0.5 rounded-full'>
            {record.type}
          </span>
        </div>
        <div className='text-xs font-bold text-primary'>
          {formatCurrencyEn(recCosts.total)}
        </div>
      </div>

      <div className='p-4 text-xs space-y-2'>
        <div className='grid grid-cols-3 gap-2 mb-2'>
          <div>
            <span className='text-latte font-semibold block'>Technician</span>
            <span className='text-text font-medium'>{record.baristaName || "-"}</span>
          </div>
          <div>
            <span className='text-latte font-semibold block'>Paid By</span>
            <span className='text-text font-medium'>{getPaidByLabel(record.paidBy)}</span>
          </div>
          <div>
            <span className='text-latte font-semibold block'>Resolved</span>
            <span className='text-text font-medium'>{record.problemSolved ? "Yes" : "No"}</span>
          </div>
        </div>

        {record.machines && record.machines.length > 0 && (
          <div className='flex gap-1 flex-wrap'>
            <span className='font-semibold text-text'>Machines:</span>
            {record.machines.map((m, i) => (
              <span key={i} className='bg-cream-2 border border-hairline px-1.5 py-0.5 rounded text-text'>
                {m.count}x {m.name}
              </span>
            ))}
          </div>
        )}

        {record.problems && record.problems.length > 0 && (
          <div className='flex gap-1 flex-wrap'>
            <span className='font-semibold text-ember-700'>Issues:</span>
            {record.problems.map((p, i) => (
              <span key={i} className='bg-ember-50 text-ember-700 border border-ember-100 px-1.5 py-0.5 rounded text-[10px]'>
                {p}
              </span>
            ))}
          </div>
        )}

        {record.partsReplaced && record.partsReplaced.length > 0 && (
          <div>
            <span className='font-semibold text-text block mb-1'>Replaced Parts</span>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {record.partsReplaced.map((p, i) => (
                <div key={i} className='bg-cream-2 border border-hairline rounded p-2 flex justify-between items-center'>
                  <div>
                    <div className='font-semibold text-text text-[11px]'>{p.name}</div>
                    <div className='text-[10px] text-latte'>{p.count} × {formatCurrencyEn(p.cost || 0)}</div>
                  </div>
                  {p.paidByClient && (
                    <span className='text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1 rounded'>
                      Client
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {record.servicesPerformed && record.servicesPerformed.length > 0 && (
          <div>
            <span className='font-semibold text-text block mb-1'>Services Performed</span>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {record.servicesPerformed.map((s, i) => (
                <div key={i} className='bg-cream-2 border border-hairline rounded p-2 flex justify-between items-center'>
                  <div>
                    <div className='font-semibold text-text text-[11px]'>{s.name}</div>
                    <div className='text-[10px] text-latte'>{s.count} × {formatCurrencyEn(s.cost || 0)}</div>
                  </div>
                  {s.paidByClient && (
                    <span className='text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1 rounded'>
                      Client
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {record.notes && (
          <div className='mt-2 p-2 bg-cream-2 rounded border border-hairline italic text-text text-[11px]'>
            {record.notes}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Branch internal report ──

interface BranchInternalReportProps {
  companyName: string;
  branch: Branch;
  logisticsOperations?: LogisticsOperation[];
}

const BranchInternalReport: React.FC<BranchInternalReportProps> = ({ companyName, branch, logisticsOperations }) => {
  const reportBranch = useMemo<Branch>(
    () => ({ ...branch, maintenanceHistory: getReportRecords(branch.maintenanceHistory) }),
    [branch],
  );
  const costs = useMemo(
    () => aggregateBranchCosts(reportBranch, partsList, servicesList),
    [reportBranch],
  );
  const kpis = useMemo(() => getOperationalKPIs(reportBranch.maintenanceHistory), [reportBranch.maintenanceHistory]);
  const zones = useMemo(() => getVisitZoneBreakdown(reportBranch.maintenanceHistory), [reportBranch.maintenanceHistory]);
  const techs = useMemo(() => getTechnicianSummary(reportBranch.maintenanceHistory), [reportBranch.maintenanceHistory]);
  const problems = useMemo(() => getProblemFrequency(reportBranch.maintenanceHistory), [reportBranch.maintenanceHistory]);

  const parts = useMemo(() => Array.from<AggregatedItem>(costs.parts.values()), [costs.parts]);
  const services = useMemo(() => Array.from<AggregatedItem>(costs.services.values()), [costs.services]);

  return (
    <div dir="ltr" className='internal-report-page font-sans text-text bg-white w-full max-w-[210mm] mx-auto p-8'>
      {/* Header */}
      <div className='flex justify-between items-start mb-6 pb-6 border-b-4 border-primary'>
        <div className='flex items-center gap-4'>
          <img src='/logo.svg' alt='Logo' className='h-16 w-auto object-contain' />
          <div>
            <h1 className='text-2xl font-bold text-text leading-tight'>{companyName}</h1>
            <h2 className='text-lg font-medium text-latte mt-1'>{branch.branchName || "Branch Report"}</h2>
          </div>
        </div>
        <div className='text-end'>
          <div className='inline-block bg-primary text-white text-xs font-bold uppercase px-3 py-1.5 rounded mb-2'>
            Internal Report
          </div>
          <p className='text-xs text-latte'>{formatDate()}</p>
          <p className='text-xs text-latte'>{branch.location}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-5 gap-3 mb-6'>
        <FinancialCard label='Total Visits' icon='chart' value={kpis.totalVisits} accent='blue' />
        <FinancialCard label='Resolution Rate' icon='check' value={`${kpis.resolutionRate}%`} accent='green' />
        <FinancialCard label='Spare Parts' icon='package' value={kpis.totalPartsUsed} accent='amber' />
        <FinancialCard label='Avg Rating' icon='star' value={kpis.avgVisitRating > 0 ? `${kpis.avgVisitRating}/5` : "-"} accent='blue' />
        <FinancialCard label='Net Cost' icon='money' value={formatCurrencyEn(costs.grandTotalCompanyCost)} accent='crimson' />
      </div>

      {/* Financial Summary */}
      <SectionTitle icon='money'>Financial Summary</SectionTitle>
      <div className='bg-cream border border-hairline rounded-lg p-4 mb-6'>
        <div className='grid grid-cols-3 gap-4 mb-4'>
          <FinancialCard label='Visit Fees' icon='location' value={formatCurrencyEn(costs.totalVisitFees)} accent='amber' />
          <FinancialCard label='Parts (Company)' icon='package' value={formatCurrencyEn(costs.totalPartsCost)} accent='crimson' />
          <FinancialCard label='Services (Company)' icon='wrench' value={formatCurrencyEn(costs.totalServicesCost)} accent='crimson' />
        </div>
        {(costs.totalClientPartsCost > 0 || costs.totalClientServicesCost > 0) && (
          <div className='grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-hairline'>
            <FinancialCard label='Parts (Client)' icon='package' value={formatCurrencyEn(costs.totalClientPartsCost)} accent='blue' />
            <FinancialCard label='Services (Client)' icon='wrench' value={formatCurrencyEn(costs.totalClientServicesCost)} accent='blue' />
          </div>
        )}
        <div className='grid grid-cols-2 gap-4 pt-4 border-t-2 border-primary mt-4'>
          <FinancialCard label='Rental Revenue' icon='coffee' value={formatCurrencyEn(costs.totalLeaseRevenue)} accent='green' />
          <FinancialCard label='Company Net Cost' icon='money' value={formatCurrencyEn(costs.grandTotalCompanyCost)} accent='crimson' />
        </div>
      </div>

      {/* Parts & Services breakdowns */}
      {parts.length > 0 && (
        <>
          <SectionTitle icon='package'>Parts — Company Paid</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-start px-3 py-2'>Item</th>
                <th className='text-end px-3 py-2 w-24'>Qty</th>
                <th className='text-end px-3 py-2 w-28'>Unit Price</th>
                <th className='text-end px-3 py-2 w-28'>Total</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-end'>{item.count}</td>
                  <td className='px-3 py-2 text-end'>{formatCurrencyEn(item.unitCost)}</td>
                  <td className='px-3 py-2 text-end font-bold'>{formatCurrencyEn(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {services.length > 0 && (
        <>
          <SectionTitle icon='wrench'>Services — Company Paid</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-start px-3 py-2'>Service</th>
                <th className='text-end px-3 py-2 w-24'>Qty</th>
                <th className='text-end px-3 py-2 w-28'>Unit Price</th>
                <th className='text-end px-3 py-2 w-28'>Total</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-end'>{item.count}</td>
                  <td className='px-3 py-2 text-end'>{formatCurrencyEn(item.unitCost)}</td>
                  <td className='px-3 py-2 text-end font-bold'>{formatCurrencyEn(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Visit zones */}
      <SectionTitle icon='location'>Visit Zone Fees</SectionTitle>
      <div className='grid grid-cols-3 gap-3 mb-6'>
        {zones.map((z) => (
          <div key={z.zone} className='bg-white border border-hairline rounded-lg p-3 text-center'>
            <div className='text-xs text-latte uppercase font-semibold'>{z.label}</div>
            <div className='text-sm font-bold text-text mt-1'>{z.visits} visits</div>
            <div className='text-xs text-latte'>{formatCurrencyEn(z.total)}</div>
          </div>
        ))}
      </div>

      {/* Technicians */}
      <SectionTitle icon='user'>Technician Performance</SectionTitle>
      <table className='w-full text-xs border border-hairline mb-6'>
        <thead className='bg-cream text-latte uppercase'>
          <tr>
            <th className='text-start px-3 py-2'>Technician</th>
            <th className='text-end px-3 py-2'>Visits</th>
            <th className='text-end px-3 py-2'>Rating</th>
            <th className='text-end px-3 py-2'>Parts Used</th>
            <th className='text-end px-3 py-2'>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {techs.map((t) => (
            <tr key={t.name} className='border-b border-hairline'>
              <td className='px-3 py-2 text-text font-medium'>{t.name}</td>
              <td className='px-3 py-2 text-end'>{t.visits}</td>
              <td className='px-3 py-2 text-end'>{t.avgRating > 0 ? `${t.avgRating}/5` : "-"}</td>
              <td className='px-3 py-2 text-end'>{t.partsUsed}</td>
              <td className='px-3 py-2 text-end'>{t.problemsResolved}/{t.totalProblems}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Top problems */}
      {problems.length > 0 && (
        <>
          <SectionTitle icon='alert'>Common Problems</SectionTitle>
          <div className='flex flex-wrap gap-2 mb-6'>
            {problems.slice(0, 10).map((p) => (
              <span key={p.name} className='bg-ember-50 text-ember-700 border border-ember-100 px-2 py-1 rounded text-xs font-medium'>
                {p.name} ({p.count})
              </span>
            ))}
          </div>
        </>
      )}

      {/* Logistics Operations */}
      <LogisticsReportSection operations={logisticsOperations ?? []} />

      {/* Maintenance history */}
      <SectionTitle icon='doc'>Maintenance Log</SectionTitle>
      {reportBranch.maintenanceHistory.map((record) => (
        <PrintRecordCard key={record.id} record={record} />
      ))}

      {/* Footer */}
      <div className='mt-12 pt-4 border-t border-hairline text-center text-[10px] text-latte'>
        <p>Confidential — For internal use only • Mido's for Distribution</p>
      </div>
    </div>
  );
};

// ── Company internal report ──

interface CompanyInternalReportProps {
  data: FormData & { created_at?: string };
  logisticsOperations?: LogisticsOperation[];
}

const CompanyInternalReport: React.FC<CompanyInternalReportProps> = ({ data, logisticsOperations }) => {
  const reportData = useMemo<FormData>(
    () => ({
      ...data,
      maintenanceHistory: getReportRecords(data.maintenanceHistory),
      branches: data.branches.map((b) => ({
        ...b,
        maintenanceHistory: getReportRecords(b.maintenanceHistory),
      })),
    }),
    [data],
  );
  const costs = useMemo(() => aggregateCosts(reportData, partsList, servicesList), [reportData]);
  const kpis = useMemo(() => getOperationalKPIs(reportData.maintenanceHistory), [reportData.maintenanceHistory]);
  const zones = useMemo(() => getVisitZoneBreakdown(reportData.maintenanceHistory), [reportData.maintenanceHistory]);
  const techs = useMemo(() => getTechnicianSummary(reportData.maintenanceHistory), [reportData.maintenanceHistory]);
  const problems = useMemo(() => getProblemFrequency(reportData.maintenanceHistory), [reportData.maintenanceHistory]);
  const branchSummaries = useMemo(
    () =>
      reportData.branches.map((b) => ({
        branch: b,
        costs: aggregateBranchCosts(b, partsList, servicesList),
        kpis: getOperationalKPIs(b.maintenanceHistory),
      })),
    [reportData.branches],
  );

  const companyParts = useMemo(() => Array.from<AggregatedItem>(costs.parts.values()), [costs.parts]);
  const companyServices = useMemo(() => Array.from<AggregatedItem>(costs.services.values()), [costs.services]);

  return (
    <div dir="ltr" className='internal-report-page font-sans text-text bg-white w-full max-w-[210mm] mx-auto p-8'>
      {/* Header */}
      <div className='flex justify-between items-start mb-6 pb-6 border-b-4 border-primary'>
        <div className='flex items-center gap-4'>
          <img src='/logo.svg' alt='Logo' className='h-20 w-auto object-contain' />
          <div>
            <h1 className='text-3xl font-bold text-text leading-tight'>{data.companyName}</h1>
            <p className='text-sm text-latte mt-1'>Comprehensive Internal Maintenance Report</p>
          </div>
        </div>
        <div className='text-end'>
          <div className='inline-block bg-primary text-white text-xs font-bold uppercase px-3 py-1.5 rounded mb-2'>
            Internal Report
          </div>
          <p className='text-xs text-latte'>{formatDate()}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-5 gap-3 mb-6'>
        <FinancialCard label='Total Visits' icon='chart' value={kpis.totalVisits} accent='blue' />
        <FinancialCard label='Resolution Rate' icon='check' value={`${kpis.resolutionRate}%`} accent='green' />
        <FinancialCard label='Spare Parts' icon='package' value={kpis.totalPartsUsed} accent='amber' />
        <FinancialCard label='Avg Rating' icon='star' value={kpis.avgVisitRating > 0 ? `${kpis.avgVisitRating}/5` : "-"} accent='blue' />
        <FinancialCard label='Net Cost' icon='money' value={formatCurrencyEn(costs.grandTotalCompanyCost)} accent='crimson' />
      </div>

      {/* Financial Summary */}
      <SectionTitle icon='money'>Financial Summary</SectionTitle>
      <div className='bg-cream border border-hairline rounded-lg p-4 mb-6'>
        <div className='grid grid-cols-3 gap-4 mb-4'>
          <FinancialCard label='Visit Fees' icon='location' value={formatCurrencyEn(costs.totalVisitFees)} accent='amber' />
          <FinancialCard label='Parts (Company)' icon='package' value={formatCurrencyEn(costs.totalPartsCost)} accent='crimson' />
          <FinancialCard label='Services (Company)' icon='wrench' value={formatCurrencyEn(costs.totalServicesCost)} accent='crimson' />
        </div>
        {(costs.totalClientPartsCost > 0 || costs.totalClientServicesCost > 0) && (
          <div className='grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-hairline'>
            <FinancialCard label='Parts (Client)' icon='package' value={formatCurrencyEn(costs.totalClientPartsCost)} accent='blue' />
            <FinancialCard label='Services (Client)' icon='wrench' value={formatCurrencyEn(costs.totalClientServicesCost)} accent='blue' />
          </div>
        )}
        <div className='grid grid-cols-2 gap-4 pt-4 border-t-2 border-primary mt-4'>
          <FinancialCard label='Rental Revenue' icon='coffee' value={formatCurrencyEn(costs.totalLeaseRevenue)} accent='green' />
          <FinancialCard label='Company Net Cost' icon='money' value={formatCurrencyEn(costs.grandTotalCompanyCost)} accent='crimson' />
        </div>
      </div>

      {/* Parts & Services breakdowns */}
      {companyParts.length > 0 && (
        <>
          <SectionTitle icon='package'>Parts — Company Paid</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-start px-3 py-2'>Item</th>
                <th className='text-end px-3 py-2 w-24'>Qty</th>
                <th className='text-end px-3 py-2 w-28'>Unit Price</th>
                <th className='text-end px-3 py-2 w-28'>Total</th>
              </tr>
            </thead>
            <tbody>
              {companyParts.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-end'>{item.count}</td>
                  <td className='px-3 py-2 text-end'>{formatCurrencyEn(item.unitCost)}</td>
                  <td className='px-3 py-2 text-end font-bold'>{formatCurrencyEn(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {companyServices.length > 0 && (
        <>
          <SectionTitle icon='wrench'>Services — Company Paid</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-start px-3 py-2'>Service</th>
                <th className='text-end px-3 py-2 w-24'>Qty</th>
                <th className='text-end px-3 py-2 w-28'>Unit Price</th>
                <th className='text-end px-3 py-2 w-28'>Total</th>
              </tr>
            </thead>
            <tbody>
              {companyServices.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-end'>{item.count}</td>
                  <td className='px-3 py-2 text-end'>{formatCurrencyEn(item.unitCost)}</td>
                  <td className='px-3 py-2 text-end font-bold'>{formatCurrencyEn(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Branch cost comparison */}
      {data.hasBranches && branchSummaries.length > 0 && (
        <>
          <SectionTitle icon='chart'>Branch Comparison</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-6'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-start px-3 py-2'>Branch</th>
                <th className='text-end px-3 py-2'>Visits</th>
                <th className='text-end px-3 py-2'>Visit Fees</th>
                <th className='text-end px-3 py-2'>Parts</th>
                <th className='text-end px-3 py-2'>Services</th>
                <th className='text-end px-3 py-2'>Net Cost</th>
                <th className='text-end px-3 py-2'>Logistics</th>
              </tr>
            </thead>
            <tbody>
              {branchSummaries.map(({ branch, costs: bc, kpis: bk }) => (
                <tr key={branch.id} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{branch.branchName}</td>
                  <td className='px-3 py-2 text-end'>{bk.totalVisits}</td>
                  <td className='px-3 py-2 text-end'>{formatCurrencyEn(bc.totalVisitFees)}</td>
                  <td className='px-3 py-2 text-end'>{formatCurrencyEn(bc.totalPartsCost)}</td>
                  <td className='px-3 py-2 text-end'>{formatCurrencyEn(bc.totalServicesCost)}</td>
                  <td className='px-3 py-2 text-end font-bold'>{formatCurrencyEn(bc.grandTotalCompanyCost)}</td>
                  <td className='px-3 py-2 text-end text-latte'>—</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className='bg-cream border-t-2 border-primary font-bold'>
                <td className='px-3 py-2 text-text'>Total</td>
                <td className='px-3 py-2 text-end'>{kpis.totalVisits}</td>
                <td className='px-3 py-2 text-end'>{formatCurrencyEn(costs.totalVisitFees)}</td>
                <td className='px-3 py-2 text-end'>{formatCurrencyEn(costs.totalPartsCost)}</td>
                <td className='px-3 py-2 text-end'>{formatCurrencyEn(costs.totalServicesCost)}</td>
                <td className='px-3 py-2 text-end'>{formatCurrencyEn(costs.grandTotalCompanyCost)}</td>
                <td className='px-3 py-2 text-end text-primary'>
                  {(() => {
                    const logC = aggregateLogisticsCosts(logisticsOperations ?? []);
                    return logC.totalLogisticsCost > 0 ? formatCurrencyEn(logC.totalLogisticsCost) : '—';
                  })()}
                </td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {/* Visit zones */}
      <SectionTitle icon='location'>Visit Zone Fees</SectionTitle>
      <div className='grid grid-cols-3 gap-3 mb-6'>
        {zones.map((z) => (
          <div key={z.zone} className='bg-white border border-hairline rounded-lg p-3 text-center'>
            <div className='text-xs text-latte uppercase font-semibold'>{z.label}</div>
            <div className='text-sm font-bold text-text mt-1'>{z.visits} visits</div>
            <div className='text-xs text-latte'>{formatCurrencyEn(z.total)}</div>
          </div>
        ))}
      </div>

      {/* Technicians */}
      <SectionTitle icon='user'>Technician Performance</SectionTitle>
      <table className='w-full text-xs border border-hairline mb-6'>
        <thead className='bg-cream text-latte uppercase'>
          <tr>
            <th className='text-start px-3 py-2'>Technician</th>
            <th className='text-end px-3 py-2'>Visits</th>
            <th className='text-end px-3 py-2'>Rating</th>
            <th className='text-end px-3 py-2'>Parts Used</th>
            <th className='text-end px-3 py-2'>Resolved</th>
          </tr>
        </thead>
        <tbody>
          {techs.map((t) => (
            <tr key={t.name} className='border-b border-hairline'>
              <td className='px-3 py-2 text-text font-medium'>{t.name}</td>
              <td className='px-3 py-2 text-end'>{t.visits}</td>
              <td className='px-3 py-2 text-end'>{t.avgRating > 0 ? `${t.avgRating}/5` : "-"}</td>
              <td className='px-3 py-2 text-end'>{t.partsUsed}</td>
              <td className='px-3 py-2 text-end'>{t.problemsResolved}/{t.totalProblems}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Top problems */}
      {problems.length > 0 && (
        <>
          <SectionTitle icon='alert'>Common Problems</SectionTitle>
          <div className='flex flex-wrap gap-2 mb-6'>
            {problems.slice(0, 10).map((p) => (
              <span key={p.name} className='bg-ember-50 text-ember-700 border border-ember-100 px-2 py-1 rounded text-xs font-medium'>
                {p.name} ({p.count})
              </span>
            ))}
          </div>
        </>
      )}

      {/* Logistics Operations */}
      <LogisticsReportSection operations={logisticsOperations ?? []} />

      {/* Branch details */}
      {reportData.hasBranches && reportData.branches.map((branch) => (
        <React.Fragment key={branch.id}>
          <div className='break-before-page' />
          <BranchInternalReport companyName={reportData.companyName} branch={branch} />
        </React.Fragment>
      ))}

      {!reportData.hasBranches && reportData.maintenanceHistory.length > 0 && (
        <>
          <SectionTitle icon='doc'>Maintenance Log</SectionTitle>
          {reportData.maintenanceHistory.map((record) => (
            <PrintRecordCard key={record.id} record={record} />
          ))}
        </>
      )}

      {/* Footer */}
      <div className='mt-12 pt-4 border-t border-hairline text-center text-[10px] text-latte'>
        <p>Confidential — For internal use only • Mido's for Distribution</p>
      </div>
    </div>
  );
};

// ── Public entry point ──

interface InternalReportPrintViewProps {
  data: FormData & { created_at?: string };
  branch?: Branch | null;
  logisticsOperations?: LogisticsOperation[];
}

const InternalReportPrintView: React.FC<InternalReportPrintViewProps> = ({ data, branch, logisticsOperations }) => {
  if (branch) {
    return <BranchInternalReport companyName={data.companyName} branch={branch} logisticsOperations={logisticsOperations} />;
  }
  return <CompanyInternalReport data={data} logisticsOperations={logisticsOperations} />;
};

export default InternalReportPrintView;

// Helper to clean up the hidden print view after the user finishes printing.
export const AfterPrintCleanup: React.FC<{ onAfterPrint: () => void; children: React.ReactNode }> = ({
  onAfterPrint,
  children,
}) => {
  React.useEffect(() => {
    const handler = () => onAfterPrint();
    window.addEventListener("afterprint", handler);
    return () => window.removeEventListener("afterprint", handler);
  }, [onAfterPrint]);
  return <>{children}</>;
};
