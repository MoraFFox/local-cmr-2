/** @format */

import React, { useMemo } from "react";
import {
  FormData,
  Branch,
  MaintenanceRecord,
} from "../types";
import {
  aggregateCosts,
  aggregateBranchCosts,
  getVisitZoneBreakdown,
  getTechnicianSummary,
  getOperationalKPIs,
  getProblemFrequency,
  formatCurrency,
  type AggregatedItem,
} from "../utils/costAggregation";
import { partsList, servicesList } from "../constants";

// ── Helpers ──

const getPaidByLabel = (val: string) =>
  val === "company" ? "ميدوز" : "العميل";

const formatDate = (date = new Date()) =>
  date.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

interface FinancialCardProps {
  label: string;
  value: string | number;
  accent?: "crimson" | "blue" | "amber" | "green";
}

const FinancialCard: React.FC<FinancialCardProps> = ({ label, value, accent = "crimson" }) => {
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
      <div className='text-xs text-latte uppercase font-semibold mb-1'>
        {label}
      </div>
      <div className='text-lg font-bold text-text'>{value}</div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className='text-sm font-bold uppercase tracking-wider text-text border-l-4 border-primary pl-3 mb-3 mt-6'>
    {children}
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
          {formatCurrency(recCosts.total)}
        </div>
      </div>

      <div className='p-4 text-xs space-y-2'>
        <div className='grid grid-cols-3 gap-2 mb-2'>
          <div>
            <span className='text-latte font-semibold block'>الفني</span>
            <span className='text-text font-medium'>{record.baristaName || "-"}</span>
          </div>
          <div>
            <span className='text-latte font-semibold block'>جهة الدفع</span>
            <span className='text-text font-medium'>{getPaidByLabel(record.paidBy)}</span>
          </div>
          <div>
            <span className='text-latte font-semibold block'>تم الحل</span>
            <span className='text-text font-medium'>{record.problemSolved ? "نعم" : "لا"}</span>
          </div>
        </div>

        {record.machines && record.machines.length > 0 && (
          <div className='flex gap-1 flex-wrap'>
            <span className='font-semibold text-text'>الماكينات:</span>
            {record.machines.map((m, i) => (
              <span key={i} className='bg-cream-2 border border-hairline px-1.5 py-0.5 rounded text-text'>
                {m.count}x {m.name}
              </span>
            ))}
          </div>
        )}

        {record.problems && record.problems.length > 0 && (
          <div className='flex gap-1 flex-wrap'>
            <span className='font-semibold text-ember-700'>المشاكل:</span>
            {record.problems.map((p, i) => (
              <span key={i} className='bg-ember-50 text-ember-700 border border-ember-100 px-1.5 py-0.5 rounded text-[10px]'>
                {p}
              </span>
            ))}
          </div>
        )}

        {record.partsReplaced && record.partsReplaced.length > 0 && (
          <div>
            <span className='font-semibold text-text block mb-1'>قطع الغيار المستبدلة</span>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {record.partsReplaced.map((p, i) => (
                <div key={i} className='bg-cream-2 border border-hairline rounded p-2 flex justify-between items-center'>
                  <div>
                    <div className='font-semibold text-text text-[11px]'>{p.name}</div>
                    <div className='text-[10px] text-latte'>{p.count} × {formatCurrency(p.cost || 0)}</div>
                  </div>
                  {p.paidByClient && (
                    <span className='text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1 rounded'>
                      العميل
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {record.servicesPerformed && record.servicesPerformed.length > 0 && (
          <div>
            <span className='font-semibold text-text block mb-1'>الخدمات المنفذة</span>
            <div className='grid grid-cols-2 sm:grid-cols-3 gap-2'>
              {record.servicesPerformed.map((s, i) => (
                <div key={i} className='bg-cream-2 border border-hairline rounded p-2 flex justify-between items-center'>
                  <div>
                    <div className='font-semibold text-text text-[11px]'>{s.name}</div>
                    <div className='text-[10px] text-latte'>{s.count} × {formatCurrency(s.cost || 0)}</div>
                  </div>
                  {s.paidByClient && (
                    <span className='text-[9px] bg-blue-50 text-blue-700 border border-blue-100 px-1 rounded'>
                      العميل
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
}

const BranchInternalReport: React.FC<BranchInternalReportProps> = ({ companyName, branch }) => {
  const costs = useMemo(
    () => aggregateBranchCosts(branch, partsList, servicesList),
    [branch],
  );
  const kpis = useMemo(() => getOperationalKPIs(branch.maintenanceHistory), [branch.maintenanceHistory]);
  const zones = useMemo(() => getVisitZoneBreakdown(branch.maintenanceHistory), [branch.maintenanceHistory]);
  const techs = useMemo(() => getTechnicianSummary(branch.maintenanceHistory), [branch.maintenanceHistory]);
  const problems = useMemo(() => getProblemFrequency(branch.maintenanceHistory), [branch.maintenanceHistory]);

  const parts = useMemo(() => Array.from<AggregatedItem>(costs.parts.values()), [costs.parts]);
  const services = useMemo(() => Array.from<AggregatedItem>(costs.services.values()), [costs.services]);

  return (
    <div className='internal-report-page font-sans text-text bg-white w-full max-w-[210mm] mx-auto p-8'>
      {/* Header */}
      <div className='flex justify-between items-start mb-6 pb-6 border-b-4 border-primary'>
        <div className='flex items-center gap-4'>
          <img src='/logo.svg' alt='Logo' className='h-16 w-auto object-contain' />
          <div>
            <h1 className='text-2xl font-bold text-text leading-tight'>{companyName}</h1>
            <h2 className='text-lg font-medium text-latte mt-1'>{branch.branchName || "تقرير الفرع"}</h2>
          </div>
        </div>
        <div className='text-right'>
          <div className='inline-block bg-primary text-white text-xs font-bold uppercase px-3 py-1.5 rounded mb-2'>
            تقرير داخلي
          </div>
          <p className='text-xs text-latte'>{formatDate()}</p>
          <p className='text-xs text-latte'>{branch.location}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-5 gap-3 mb-6'>
        <FinancialCard label='إجمالي الزيارات' value={kpis.totalVisits} accent='blue' />
        <FinancialCard label='نسبة الحل' value={`${kpis.resolutionRate}%`} accent='green' />
        <FinancialCard label='قطع الغيار' value={kpis.totalPartsUsed} accent='amber' />
        <FinancialCard label='متوسط التقييم' value={kpis.avgVisitRating > 0 ? `${kpis.avgVisitRating}/5` : "-"} accent='blue' />
        <FinancialCard label='صافي التكلفة' value={formatCurrency(costs.grandTotalCompanyCost)} accent='crimson' />
      </div>

      {/* Financial Summary */}
      <SectionTitle>الملخص المالي</SectionTitle>
      <div className='bg-cream border border-hairline rounded-lg p-4 mb-6'>
        <div className='grid grid-cols-3 gap-4 mb-4'>
          <FinancialCard label='رسوم الزيارات' value={formatCurrency(costs.totalVisitFees)} accent='amber' />
          <FinancialCard label='قطع الغيار (علينا)' value={formatCurrency(costs.totalPartsCost)} accent='crimson' />
          <FinancialCard label='الخدمات (علينا)' value={formatCurrency(costs.totalServicesCost)} accent='crimson' />
        </div>
        {(costs.totalClientPartsCost > 0 || costs.totalClientServicesCost > 0) && (
          <div className='grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-hairline'>
            <FinancialCard label='قطع الغيار (العميل)' value={formatCurrency(costs.totalClientPartsCost)} accent='blue' />
            <FinancialCard label='الخدمات (العميل)' value={formatCurrency(costs.totalClientServicesCost)} accent='blue' />
          </div>
        )}
        <div className='grid grid-cols-2 gap-4 pt-4 border-t-2 border-primary mt-4'>
          <FinancialCard label='إيرادات التأجير' value={formatCurrency(costs.totalLeaseRevenue)} accent='green' />
          <FinancialCard label='صافي تكلفة الشركة' value={formatCurrency(costs.grandTotalCompanyCost)} accent='crimson' />
        </div>
      </div>

      {/* Parts & Services breakdowns */}
      {parts.length > 0 && (
        <>
          <SectionTitle>قطع الغيار — على حساب الشركة</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-right px-3 py-2'>الصنف</th>
                <th className='text-right px-3 py-2 w-24'>الكمية</th>
                <th className='text-right px-3 py-2 w-28'>سعر الوحدة</th>
                <th className='text-right px-3 py-2 w-28'>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-right'>{item.count}</td>
                  <td className='px-3 py-2 text-right'>{formatCurrency(item.unitCost)}</td>
                  <td className='px-3 py-2 text-right font-bold'>{formatCurrency(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {services.length > 0 && (
        <>
          <SectionTitle>الخدمات — على حساب الشركة</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-right px-3 py-2'>الخدمة</th>
                <th className='text-right px-3 py-2 w-24'>العدد</th>
                <th className='text-right px-3 py-2 w-28'>سعر الوحدة</th>
                <th className='text-right px-3 py-2 w-28'>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {services.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-right'>{item.count}</td>
                  <td className='px-3 py-2 text-right'>{formatCurrency(item.unitCost)}</td>
                  <td className='px-3 py-2 text-right font-bold'>{formatCurrency(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Visit zones */}
      <SectionTitle>رسوم مناطق الزيارات</SectionTitle>
      <div className='grid grid-cols-3 gap-3 mb-6'>
        {zones.map((z) => (
          <div key={z.zone} className='bg-white border border-hairline rounded-lg p-3 text-center'>
            <div className='text-xs text-latte uppercase font-semibold'>{z.label}</div>
            <div className='text-sm font-bold text-text mt-1'>{z.visits} زيارة</div>
            <div className='text-xs text-latte'>{formatCurrency(z.total)}</div>
          </div>
        ))}
      </div>

      {/* Technicians */}
      <SectionTitle>أداء الفنيين</SectionTitle>
      <table className='w-full text-xs border border-hairline mb-6'>
        <thead className='bg-cream text-latte uppercase'>
          <tr>
            <th className='text-right px-3 py-2'>الفني</th>
            <th className='text-right px-3 py-2'>الزيارات</th>
            <th className='text-right px-3 py-2'>التقييم</th>
            <th className='text-right px-3 py-2'>قطع الغيار</th>
            <th className='text-right px-3 py-2'>الحل</th>
          </tr>
        </thead>
        <tbody>
          {techs.map((t) => (
            <tr key={t.name} className='border-b border-hairline'>
              <td className='px-3 py-2 text-text font-medium'>{t.name}</td>
              <td className='px-3 py-2 text-right'>{t.visits}</td>
              <td className='px-3 py-2 text-right'>{t.avgRating > 0 ? `${t.avgRating}/5` : "-"}</td>
              <td className='px-3 py-2 text-right'>{t.partsUsed}</td>
              <td className='px-3 py-2 text-right'>{t.problemsResolved}/{t.totalProblems}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Top problems */}
      {problems.length > 0 && (
        <>
          <SectionTitle>المشاكل الشائعة</SectionTitle>
          <div className='flex flex-wrap gap-2 mb-6'>
            {problems.slice(0, 10).map((p) => (
              <span key={p.name} className='bg-ember-50 text-ember-700 border border-ember-100 px-2 py-1 rounded text-xs font-medium'>
                {p.name} ({p.count})
              </span>
            ))}
          </div>
        </>
      )}

      {/* Maintenance history */}
      <SectionTitle>سجل الصيانة</SectionTitle>
      {branch.maintenanceHistory.map((record) => (
        <PrintRecordCard key={record.id} record={record} />
      ))}

      {/* Footer */}
      <div className='mt-12 pt-4 border-t border-hairline text-center text-[10px] text-latte'>
        <p>سري — للاستخدام الداخلي فقط • ميدوز للتوزيع</p>
      </div>
    </div>
  );
};

// ── Company internal report ──

interface CompanyInternalReportProps {
  data: FormData & { created_at?: string };
}

const CompanyInternalReport: React.FC<CompanyInternalReportProps> = ({ data }) => {
  const costs = useMemo(() => aggregateCosts(data, partsList, servicesList), [data]);
  const kpis = useMemo(() => getOperationalKPIs(data.maintenanceHistory), [data.maintenanceHistory]);
  const zones = useMemo(() => getVisitZoneBreakdown(data.maintenanceHistory), [data.maintenanceHistory]);
  const techs = useMemo(() => getTechnicianSummary(data.maintenanceHistory), [data.maintenanceHistory]);
  const problems = useMemo(() => getProblemFrequency(data.maintenanceHistory), [data.maintenanceHistory]);
  const branchSummaries = useMemo(
    () =>
      data.branches.map((b) => ({
        branch: b,
        costs: aggregateBranchCosts(b, partsList, servicesList),
        kpis: getOperationalKPIs(b.maintenanceHistory),
      })),
    [data.branches],
  );

  const companyParts = useMemo(() => Array.from<AggregatedItem>(costs.parts.values()), [costs.parts]);
  const companyServices = useMemo(() => Array.from<AggregatedItem>(costs.services.values()), [costs.services]);

  return (
    <div className='internal-report-page font-sans text-text bg-white w-full max-w-[210mm] mx-auto p-8'>
      {/* Header */}
      <div className='flex justify-between items-start mb-6 pb-6 border-b-4 border-primary'>
        <div className='flex items-center gap-4'>
          <img src='/logo.svg' alt='Logo' className='h-20 w-auto object-contain' />
          <div>
            <h1 className='text-3xl font-bold text-text leading-tight'>{data.companyName}</h1>
            <p className='text-sm text-latte mt-1'>تقرير الصيانة الداخلي الشامل</p>
          </div>
        </div>
        <div className='text-right'>
          <div className='inline-block bg-primary text-white text-xs font-bold uppercase px-3 py-1.5 rounded mb-2'>
            تقرير داخلي
          </div>
          <p className='text-xs text-latte'>{formatDate()}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className='grid grid-cols-5 gap-3 mb-6'>
        <FinancialCard label='إجمالي الزيارات' value={kpis.totalVisits} accent='blue' />
        <FinancialCard label='نسبة الحل' value={`${kpis.resolutionRate}%`} accent='green' />
        <FinancialCard label='قطع الغيار' value={kpis.totalPartsUsed} accent='amber' />
        <FinancialCard label='متوسط التقييم' value={kpis.avgVisitRating > 0 ? `${kpis.avgVisitRating}/5` : "-"} accent='blue' />
        <FinancialCard label='صافي التكلفة' value={formatCurrency(costs.grandTotalCompanyCost)} accent='crimson' />
      </div>

      {/* Financial Summary */}
      <SectionTitle>الملخص المالي</SectionTitle>
      <div className='bg-cream border border-hairline rounded-lg p-4 mb-6'>
        <div className='grid grid-cols-3 gap-4 mb-4'>
          <FinancialCard label='رسوم الزيارات' value={formatCurrency(costs.totalVisitFees)} accent='amber' />
          <FinancialCard label='قطع الغيار (علينا)' value={formatCurrency(costs.totalPartsCost)} accent='crimson' />
          <FinancialCard label='الخدمات (علينا)' value={formatCurrency(costs.totalServicesCost)} accent='crimson' />
        </div>
        {(costs.totalClientPartsCost > 0 || costs.totalClientServicesCost > 0) && (
          <div className='grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-hairline'>
            <FinancialCard label='قطع الغيار (العميل)' value={formatCurrency(costs.totalClientPartsCost)} accent='blue' />
            <FinancialCard label='الخدمات (العميل)' value={formatCurrency(costs.totalClientServicesCost)} accent='blue' />
          </div>
        )}
        <div className='grid grid-cols-2 gap-4 pt-4 border-t-2 border-primary mt-4'>
          <FinancialCard label='إيرادات التأجير' value={formatCurrency(costs.totalLeaseRevenue)} accent='green' />
          <FinancialCard label='صافي تكلفة الشركة' value={formatCurrency(costs.grandTotalCompanyCost)} accent='crimson' />
        </div>
      </div>

      {/* Parts & Services breakdowns */}
      {companyParts.length > 0 && (
        <>
          <SectionTitle>قطع الغيار — على حساب الشركة</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-right px-3 py-2'>الصنف</th>
                <th className='text-right px-3 py-2 w-24'>الكمية</th>
                <th className='text-right px-3 py-2 w-28'>سعر الوحدة</th>
                <th className='text-right px-3 py-2 w-28'>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {companyParts.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-right'>{item.count}</td>
                  <td className='px-3 py-2 text-right'>{formatCurrency(item.unitCost)}</td>
                  <td className='px-3 py-2 text-right font-bold'>{formatCurrency(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {companyServices.length > 0 && (
        <>
          <SectionTitle>الخدمات — على حساب الشركة</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-4'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-right px-3 py-2'>الخدمة</th>
                <th className='text-right px-3 py-2 w-24'>العدد</th>
                <th className='text-right px-3 py-2 w-28'>سعر الوحدة</th>
                <th className='text-right px-3 py-2 w-28'>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {companyServices.map((item) => (
                <tr key={item.name} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{item.name}</td>
                  <td className='px-3 py-2 text-right'>{item.count}</td>
                  <td className='px-3 py-2 text-right'>{formatCurrency(item.unitCost)}</td>
                  <td className='px-3 py-2 text-right font-bold'>{formatCurrency(item.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Branch cost comparison */}
      {data.hasBranches && branchSummaries.length > 0 && (
        <>
          <SectionTitle>مقارنة الفروع</SectionTitle>
          <table className='w-full text-xs border border-hairline mb-6'>
            <thead className='bg-primary text-white'>
              <tr>
                <th className='text-right px-3 py-2'>الفرع</th>
                <th className='text-right px-3 py-2'>الزيارات</th>
                <th className='text-right px-3 py-2'>رسوم الزيارات</th>
                <th className='text-right px-3 py-2'>قطع الغيار</th>
                <th className='text-right px-3 py-2'>الخدمات</th>
                <th className='text-right px-3 py-2'>صافي التكلفة</th>
              </tr>
            </thead>
            <tbody>
              {branchSummaries.map(({ branch, costs: bc, kpis: bk }) => (
                <tr key={branch.id} className='border-b border-hairline'>
                  <td className='px-3 py-2 text-text font-medium'>{branch.branchName}</td>
                  <td className='px-3 py-2 text-right'>{bk.totalVisits}</td>
                  <td className='px-3 py-2 text-right'>{formatCurrency(bc.totalVisitFees)}</td>
                  <td className='px-3 py-2 text-right'>{formatCurrency(bc.totalPartsCost)}</td>
                  <td className='px-3 py-2 text-right'>{formatCurrency(bc.totalServicesCost)}</td>
                  <td className='px-3 py-2 text-right font-bold'>{formatCurrency(bc.grandTotalCompanyCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Visit zones */}
      <SectionTitle>رسوم مناطق الزيارات</SectionTitle>
      <div className='grid grid-cols-3 gap-3 mb-6'>
        {zones.map((z) => (
          <div key={z.zone} className='bg-white border border-hairline rounded-lg p-3 text-center'>
            <div className='text-xs text-latte uppercase font-semibold'>{z.label}</div>
            <div className='text-sm font-bold text-text mt-1'>{z.visits} زيارة</div>
            <div className='text-xs text-latte'>{formatCurrency(z.total)}</div>
          </div>
        ))}
      </div>

      {/* Technicians */}
      <SectionTitle>أداء الفنيين</SectionTitle>
      <table className='w-full text-xs border border-hairline mb-6'>
        <thead className='bg-cream text-latte uppercase'>
          <tr>
            <th className='text-right px-3 py-2'>الفني</th>
            <th className='text-right px-3 py-2'>الزيارات</th>
            <th className='text-right px-3 py-2'>التقييم</th>
            <th className='text-right px-3 py-2'>قطع الغيار</th>
            <th className='text-right px-3 py-2'>الحل</th>
          </tr>
        </thead>
        <tbody>
          {techs.map((t) => (
            <tr key={t.name} className='border-b border-hairline'>
              <td className='px-3 py-2 text-text font-medium'>{t.name}</td>
              <td className='px-3 py-2 text-right'>{t.visits}</td>
              <td className='px-3 py-2 text-right'>{t.avgRating > 0 ? `${t.avgRating}/5` : "-"}</td>
              <td className='px-3 py-2 text-right'>{t.partsUsed}</td>
              <td className='px-3 py-2 text-right'>{t.problemsResolved}/{t.totalProblems}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Top problems */}
      {problems.length > 0 && (
        <>
          <SectionTitle>المشاكل الشائعة</SectionTitle>
          <div className='flex flex-wrap gap-2 mb-6'>
            {problems.slice(0, 10).map((p) => (
              <span key={p.name} className='bg-ember-50 text-ember-700 border border-ember-100 px-2 py-1 rounded text-xs font-medium'>
                {p.name} ({p.count})
              </span>
            ))}
          </div>
        </>
      )}

      {/* Branch details */}
      {data.hasBranches && data.branches.map((branch) => (
        <React.Fragment key={branch.id}>
          <div className='break-before-page' />
          <BranchInternalReport companyName={data.companyName} branch={branch} />
        </React.Fragment>
      ))}

      {!data.hasBranches && data.maintenanceHistory.length > 0 && (
        <>
          <SectionTitle>سجل الصيانة</SectionTitle>
          {data.maintenanceHistory.map((record) => (
            <PrintRecordCard key={record.id} record={record} />
          ))}
        </>
      )}

      {/* Footer */}
      <div className='mt-12 pt-4 border-t border-hairline text-center text-[10px] text-latte'>
        <p>سري — للاستخدام الداخلي فقط • ميدوز للتوزيع</p>
      </div>
    </div>
  );
};

// ── Public entry point ──

interface InternalReportPrintViewProps {
  data: FormData & { created_at?: string };
  branch?: Branch | null;
}

const InternalReportPrintView: React.FC<InternalReportPrintViewProps> = ({ data, branch }) => {
  if (branch) {
    return <BranchInternalReport companyName={data.companyName} branch={branch} />;
  }
  return <CompanyInternalReport data={data} />;
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
