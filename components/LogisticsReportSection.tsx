/** @format */

import React, { useMemo } from "react";
import { LogisticsOperation } from "../types";
import { aggregateLogisticsCosts, formatCurrencyEn } from "../utils/costAggregation";
import {
  LOGISTICS_TYPE_LABELS_EN,
  formatMachineDescription,
  getLogisticsWorkItemDisplay,
  MAINTENANCE_SECTION_LABELS_EN,
} from "../utils/logisticsLabels";
import ReportIcon from "./ReportIcon";
import type { PdfIconName } from "../utils/pdfTheme";

// ── Self-contained card / section helpers (no dependency on InternalReportPrintView) ──

interface FinancialCardProps {
  label: string;
  value: string | number;
  accent?: "crimson" | "blue" | "amber" | "green" | "purple";
  icon?: PdfIconName;
}

const FinancialCard: React.FC<FinancialCardProps> = ({ label, value, accent = "crimson", icon }) => {
  const borderColors: Record<string, string> = {
    crimson: "border-primary",
    blue: "border-blue-600",
    amber: "border-amber-500",
    green: "border-green-600",
    purple: "border-purple-600",
  };
  return (
    <div className={`bg-white border-t-4 ${borderColors[accent]} border border-hairline rounded-lg p-3 shadow-sm`}>
      <div className="text-xs text-latte uppercase font-semibold mb-1 flex items-center gap-1">
        {icon && <ReportIcon name={icon} className="w-3.5 h-3.5" />}
        <span>{label}</span>
      </div>
      <div className="text-lg font-bold text-text">{value}</div>
    </div>
  );
};

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-sm font-bold uppercase tracking-wider text-text border-s-4 border-primary ps-3 mb-3 mt-6">
    {children}
  </h3>
);

interface LogisticsDetailItemProps {
  name: string;
  count: number;
  unitCost?: number;
  totalCost?: number;
  hideCosts: boolean;
}

/** One readable quantity/cost block used inside the logistics Details row. */
const LogisticsDetailItem: React.FC<LogisticsDetailItemProps> = ({
  name,
  count,
  unitCost,
  totalCost,
  hideCosts,
}) => (
  <div className="border-b border-hairline last:border-b-0 py-1.5 first:pt-0 last:pb-0">
    <div className="flex items-baseline justify-between gap-2 text-[10px] leading-snug">
      <span className="font-medium text-text min-w-0 break-words">{count} {name}</span>
      {!hideCosts && totalCost !== undefined && (
        <span className="font-bold text-text whitespace-nowrap">{formatCurrencyEn(totalCost)}</span>
      )}
    </div>
    {!hideCosts && unitCost !== undefined && (
      <div className="text-[9px] text-latte mt-0.5 break-words">{name} = {formatCurrencyEn(unitCost)}</div>
    )}
  </div>
);

interface LogisticsDetailColumnProps {
  kind: "services" | "parts";
  items: Array<{ name: string; count: number; cost?: number }>;
  hideCosts: boolean;
}

const LogisticsDetailColumn: React.FC<LogisticsDetailColumnProps> = ({ kind, items, hideCosts }) => {
  const displayItems = items
    .map((item) => getLogisticsWorkItemDisplay(item.name, item.count, item.cost, kind === "parts" ? "part" : "service"))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  if (displayItems.length === 0) return null;

  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase text-primary mb-1 flex items-center gap-1">
        <ReportIcon name={kind === "parts" ? "package" : "wrench"} className="w-3 h-3" />
        <span>{MAINTENANCE_SECTION_LABELS_EN[kind]}</span>
      </div>
      <div>
        {displayItems.map((item, index) => (
          <LogisticsDetailItem key={`${item.name}-${index}`} {...item} hideCosts={hideCosts} />
        ))}
      </div>
    </div>
  );
};

// ── Main component ──

interface LogisticsReportSectionProps {
  operations: LogisticsOperation[];
  /** Section heading. Defaults to English. */
  title?: string;
  /** If true, hides the cost summary cards and shows only the operations table. */
  hideCosts?: boolean;
}

/**
 * Reusable logistics section for HTML/internal print reports.
 *
 * Renders:
 *   1. Five cost summary cards (rental, pickup transport, return transport, maintenance, total)
 *   2. An operations table (type, client/given machine, status, dates, rental, maintenance, transport, total)
 *
 * Used by InternalReportPrintView and can be dropped into any React report view.
 */
const LogisticsReportSection: React.FC<LogisticsReportSectionProps> = ({
  operations,
  title = "Logistics — Machine Transport & Replacement",
  hideCosts = false,
}) => {
  const logCosts = useMemo(() => aggregateLogisticsCosts(operations), [operations]);

  if (!operations || operations.length === 0) return null;

  return (
    <>
      <SectionTitle>{title}</SectionTitle>

      {/* Cost summary cards */}
      {!hideCosts && logCosts.totalLogisticsCost > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
          <FinancialCard label="Replacement Machine Rental" value={formatCurrencyEn(logCosts.totalRentalCost)} accent="amber" icon="calendar" />
          <FinancialCard label="Transport — Pickup" value={formatCurrencyEn(logCosts.totalPickupCost)} accent="blue" icon="truck" />
          <FinancialCard label="Transport — Return" value={formatCurrencyEn(logCosts.totalReturnCost)} accent="green" icon="truck" />
          <FinancialCard label="Maintenance Cost" value={formatCurrencyEn(logCosts.totalMaintenanceCost)} accent="purple" icon="wrench" />
          <FinancialCard label="Logistics Total" value={formatCurrencyEn(logCosts.totalLogisticsCost)} accent="crimson" icon="money" />
        </div>
      )}

      {/* Operations table */}
      <table className="w-full text-xs border border-hairline mb-6">
        <thead className="bg-primary text-white">
          <tr>
            <th className="text-start px-3 py-2">Operation</th>
            <th className="text-start px-3 py-2">Category</th>
            <th className="text-start px-3 py-2">Status</th>
            <th className="text-start px-3 py-2">Open Date</th>
            <th className="text-start px-3 py-2">Close Date</th>
            {!hideCosts && <th className="text-end px-3 py-2">Rental</th>}
            {!hideCosts && <th className="text-end px-3 py-2">Maintenance</th>}
            {!hideCosts && <th className="text-end px-3 py-2">Transport Cost</th>}
            {!hideCosts && <th className="text-end px-3 py-2">Total</th>}
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => {
            const transportTotal = (op.pickup_cost || 0) + (op.return_cost || 0);
            const opTotal = (op.total_rental_cost || 0) + transportTotal + (op.maintenance_cost || 0);
            const issues = op.maintenance_issues || [];
            const services = op.maintenance_services || [];
            const parts = op.maintenance_parts || [];
            const hasStructured = issues.length > 0 || services.length > 0 || parts.length > 0;
            const showDetails = hasStructured || Boolean(op.work_done);
            const colCount = hideCosts ? 5 : 9;
            return (
              <React.Fragment key={op.id}>
                <tr className="border-b border-hairline">
                  <td className="px-3 py-2 text-text font-medium">
                    {LOGISTICS_TYPE_LABELS_EN[op.operation_type] || op.operation_type}
                  </td>
                  <td className="px-3 py-2 text-text">
                    <div>{formatMachineDescription(op.machine_category, op.machine_type, op.machine_name) || "-"}</div>
                    {(op.given_machine_category || op.given_machine_type || op.given_machine_name) && (
                      <div className="text-[10px] text-latte mt-0.5">
                        Given: {formatMachineDescription(op.given_machine_category, op.given_machine_type, op.given_machine_name)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={op.status === "open" ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                      {op.status === "open" ? "Open" : "Closed"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text">{op.open_date || "-"}</td>
                  <td className="px-3 py-2 text-text">{op.close_date || "-"}</td>
                  {!hideCosts && <td className="px-3 py-2 text-end font-bold">{formatCurrencyEn(op.total_rental_cost || 0)}</td>}
                  {!hideCosts && <td className="px-3 py-2 text-end">{formatCurrencyEn(op.maintenance_cost || 0)}</td>}
                  {!hideCosts && <td className="px-3 py-2 text-end">{formatCurrencyEn(transportTotal)}</td>}
                  {!hideCosts && <td className="px-3 py-2 text-end font-bold">{formatCurrencyEn(opTotal)}</td>}
                </tr>
                {showDetails && (
                  <tr className="bg-cream border-b border-hairline">
                    <td colSpan={colCount} className="px-3 py-2">
                      <div className="grid grid-cols-[64px_1fr_1fr_1fr] gap-3 items-start">
                        <div className="text-[10px] font-bold uppercase tracking-wide text-latte pt-0.5 flex items-center gap-1">
                          <ReportIcon name="doc" className="w-3 h-3" />
                          <span>Details</span>
                        </div>
                        <div className="min-w-0">
                          {issues.length > 0 && (
                            <>
                              <div className="text-[10px] font-bold uppercase text-primary mb-0.5 flex items-center gap-1">
                                <ReportIcon name="alert" className="w-3 h-3" />
                                <span>{MAINTENANCE_SECTION_LABELS_EN.issues}</span>
                              </div>
                              <ul className="list-disc list-inside text-[10px] text-text leading-snug space-y-0.5">
                                {issues.map((issue, i) => <li key={i}>{issue}</li>)}
                              </ul>
                            </>
                          )}
                        </div>
                        <LogisticsDetailColumn kind="services" items={services} hideCosts={hideCosts} />
                        <LogisticsDetailColumn kind="parts" items={parts} hideCosts={hideCosts} />
                        {!hasStructured && op.work_done && (
                          <div className="text-[10px] text-text leading-snug col-span-3">{op.work_done}</div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </>
  );
};

export default LogisticsReportSection;
