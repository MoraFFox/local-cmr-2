/** @format */

import React, { useMemo } from "react";
import { LogisticsOperation } from "../types";
import { aggregateLogisticsCosts, formatCurrency } from "../utils/costAggregation";
import { LOGISTICS_TYPE_LABELS_AR } from "../utils/logisticsLabels";

// ── Self-contained card / section helpers (no dependency on InternalReportPrintView) ──

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
    <div className={`bg-white border-t-4 ${borderColors[accent]} border border-hairline rounded-lg p-3 shadow-sm`}>
      <div className="text-xs text-latte uppercase font-semibold mb-1">{label}</div>
      <div className="text-lg font-bold text-text">{value}</div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold uppercase tracking-wider text-text border-s-4 border-primary ps-3 mb-3 mt-6">
    {children}
  </h3>
);

// ── Main component ──

interface LogisticsReportSectionProps {
  operations: LogisticsOperation[];
  /** Section heading. Defaults to Arabic. */
  title?: string;
  /** If true, hides the cost summary cards and shows only the operations table. */
  hideCosts?: boolean;
}

/**
 * Reusable logistics section for HTML/internal print reports.
 *
 * Renders:
 *   1. Four cost summary cards (rental, pickup transport, return transport, total)
 *   2. An 8-column operations table (type, category, status, dates, rental, transport, total)
 *
 * Used by InternalReportPrintView and can be dropped into any React report view.
 */
const LogisticsReportSection: React.FC<LogisticsReportSectionProps> = ({
  operations,
  title = "اللوجستيات — نقل واستبدال الماكينات",
  hideCosts = false,
}) => {
  const logCosts = useMemo(() => aggregateLogisticsCosts(operations), [operations]);

  if (!operations || operations.length === 0) return null;

  return (
    <>
      <SectionTitle>{title}</SectionTitle>

      {/* Cost summary cards */}
      {!hideCosts && logCosts.totalLogisticsCost > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <FinancialCard label="إيجار الماكينات البديلة" value={formatCurrency(logCosts.totalRentalCost)} accent="amber" />
          <FinancialCard label="النقل — استلام" value={formatCurrency(logCosts.totalPickupCost)} accent="blue" />
          <FinancialCard label="النقل — إرجاع" value={formatCurrency(logCosts.totalReturnCost)} accent="green" />
          <FinancialCard label="إجمالي اللوجستيات" value={formatCurrency(logCosts.totalLogisticsCost)} accent="crimson" />
        </div>
      )}

      {/* Operations table */}
      <table className="w-full text-xs border border-hairline mb-6">
        <thead className="bg-primary text-white">
          <tr>
            <th className="text-end px-3 py-2">نوع العملية</th>
            <th className="text-end px-3 py-2">الفئة</th>
            <th className="text-end px-3 py-2">الحالة</th>
            <th className="text-end px-3 py-2">تاريخ الفتح</th>
            <th className="text-end px-3 py-2">تاريخ الإغلاق</th>
            {!hideCosts && <th className="text-end px-3 py-2">الإيجار</th>}
            {!hideCosts && <th className="text-end px-3 py-2">تكلفة النقل</th>}
            {!hideCosts && <th className="text-end px-3 py-2">الإجمالي</th>}
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => {
            const transportTotal = (op.pickup_cost || 0) + (op.return_cost || 0);
            const opTotal = (op.total_rental_cost || 0) + transportTotal;
            return (
              <tr key={op.id} className="border-b border-hairline">
                <td className="px-3 py-2 text-text">
                  {LOGISTICS_TYPE_LABELS_AR[op.operation_type] || op.operation_type}
                </td>
                <td className="px-3 py-2 text-text">{op.machine_category || "-"}</td>
                <td className="px-3 py-2">
                  <span className={op.status === "open" ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                    {op.status === "open" ? "مفتوحة" : "مغلقة"}
                  </span>
                </td>
                <td className="px-3 py-2 text-text">{op.open_date || "-"}</td>
                <td className="px-3 py-2 text-text">{op.close_date || "-"}</td>
                {!hideCosts && <td className="px-3 py-2 text-end font-bold">{formatCurrency(op.total_rental_cost || 0)}</td>}
                {!hideCosts && <td className="px-3 py-2 text-end">{formatCurrency(transportTotal)}</td>}
                {!hideCosts && <td className="px-3 py-2 text-end font-bold">{formatCurrency(opTotal)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default LogisticsReportSection;
