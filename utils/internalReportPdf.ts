/** @format */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FormData, MaintenanceRecord, Branch } from "../types";
import { reshapeArabic } from "./arabicText";
import { loadFonts, flattenMaintenanceRecords } from "./pdfGenerator";
import { partsList, servicesList } from "../constants";
import {
  aggregateCosts,
  aggregateBranchCosts,
  getVisitZoneBreakdown,
  getTechnicianSummary,
  getMachineLeaseSummary,
  getOperationalKPIs,
  getBranchCostSummary,
  getRecordCostSummary,
  getProblemFrequency,
  formatPdfCurrency,
  formatEnNumber,
  AggregatedCosts,
} from "./costAggregation";
import {
  BRAND,
  drawInternalHeader,
  applyFooters,
  drawSectionHeader,
  drawKPICards,
  drawFinancialSummary,
  drawZoneTable,
  drawInfoBox,
  drawContactCards,
  drawMachineCards,
  drawTableHeader,
  drawTableRow,
  checkPageBreak,
  KPICard,
  FinancialCategory,
  ZoneRow,
  ContactInfo,
  MachineInfo,
  InfoItem,
} from "./pdfTheme";
import {
  isValueEmpty,
  PDFLayoutEngine,
  IgnoreCondition,
} from "./pdfCompactLayout";

const rtl = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return "";
  return reshapeArabic(String(text), true);
};

// ── Helpers ──

const getPaidByLabel = (val: string): string => (val === "company" ? "علينا" : "عميل");

const formatProblemsList = (problems: string[] | undefined): string => {
  if (!problems || problems.length === 0) return "—";
  return problems.map((p) => rtl(p)).join("\n");
};

const formatPartsList = (parts: { name: string; count: number; paidByClient?: boolean }[] | undefined): string => {
  if (!parts || parts.length === 0) return "—";
  return parts
    .map((p) => `${formatEnNumber(p.count)}× ${rtl(p.name)} (${getPaidByLabel(p.paidByClient ? "client" : "company")})`)
    .join("\n");
};

const formatServicesList = (
  services: { name: string; count: number; paidByClient?: boolean }[] | undefined,
): string => {
  if (!services || services.length === 0) return "—";
  return services
    .map((s) => `${formatEnNumber(s.count)}× ${rtl(s.name)} (${getPaidByLabel(s.paidByClient ? "client" : "company")})`)
    .join("\n");
};

const getTypeLabel = (type: string): string => (type === "requested" ? "طارئة" : "مجدولة");

const buildFinancialCategories = (costs: AggregatedCosts): FinancialCategory[] => {
  const categories: FinancialCategory[] = [];

  if (costs.totalPartsCost > 0 || costs.parts.size > 0) {
    const partsArr = Array.from(costs.parts.values())
      .filter((p) => p.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
    categories.push({
      title: "قطع الغيار — على حساب الشركة",
      total: costs.totalPartsCost,
      lines: partsArr.map((p) => ({
        name: p.name,
        detail: `${formatEnNumber(p.count)} قطعة × ${formatPdfCurrency(p.unitCost)}`,
        total: p.totalCost,
      })),
    });
  }

  if (costs.totalClientPartsCost > 0 || costs.clientParts.size > 0) {
    const clientPartsArr = Array.from(costs.clientParts.values())
      .filter((p) => p.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
    categories.push({
      title: "قطع الغيار — على حساب العميل",
      total: costs.totalClientPartsCost,
      lines: clientPartsArr.map((p) => ({
        name: p.name,
        detail: `${formatEnNumber(p.count)} قطعة × ${formatPdfCurrency(p.unitCost)}`,
        total: p.totalCost,
      })),
    });
  }

  if (costs.totalServicesCost > 0 || costs.services.size > 0) {
    const servicesArr = Array.from(costs.services.values())
      .filter((s) => s.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
    categories.push({
      title: "الخدمات — على حساب الشركة",
      total: costs.totalServicesCost,
      lines: servicesArr.map((s) => ({
        name: s.name,
        detail: `${formatEnNumber(s.count)} مرة × ${formatPdfCurrency(s.unitCost)}`,
        total: s.totalCost,
      })),
    });
  }

  if (costs.totalClientServicesCost > 0 || costs.clientServices.size > 0) {
    const clientServicesArr = Array.from(costs.clientServices.values())
      .filter((s) => s.totalCost > 0)
      .sort((a, b) => b.totalCost - a.totalCost);
    categories.push({
      title: "الخدمات — على حساب العميل",
      total: costs.totalClientServicesCost,
      lines: clientServicesArr.map((s) => ({
        name: s.name,
        detail: `${formatEnNumber(s.count)} مرة × ${formatPdfCurrency(s.unitCost)}`,
        total: s.totalCost,
      })),
    });
  }

  if (costs.totalVisitFees > 0) {
    categories.push({
      title: "رسوم الزيارات",
      total: costs.totalVisitFees,
      lines: [{ name: "إجمالي رسوم الزيارات", total: costs.totalVisitFees }],
    });
  }

  if (costs.totalLeaseRevenue > 0) {
    categories.push({
      title: "إيجار الماكينات (وارد)",
      total: costs.totalLeaseRevenue,
      lines: [{ name: "إجمالي إيرادات التأجير", total: costs.totalLeaseRevenue }],
    });
  }

  return categories;
};

// Format date with Arabic text but Latin (English) digits, e.g. "24 Jul 2026"
const ARABIC_SHORT_MONTHS = ["ينا", "فبر", "مار", "أبر", "ماي", "يون", "يول", "أغس", "سبت", "أكت", "نوف", "ديس"];
const formatDateEn = (date: string | Date): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = ARABIC_SHORT_MONTHS[d.getMonth()];
  const year = String(d.getFullYear());
  return `${day} ${month} ${year}`;
};

const formatPeriod = (records: MaintenanceRecord[]): string => {
  if (records.length === 0) return "—";
  const dates = records.map((r) => new Date(r.maintenanceDate)).filter((d) => !isNaN(d.getTime()));
  if (dates.length === 0) return "—";
  dates.sort((a, b) => a.getTime() - b.getTime());
  return `${formatDateEn(dates[0])} — ${formatDateEn(dates[dates.length - 1])}`;
};

// ── Shared KPI card builder ──
interface KPIData {
  totalVisits: number;
  resolutionRate: number;
  totalPartsUsed: number;
  avgVisitRating: number;
  totalProblems: number;
  problemsResolved: number;
}

const buildKPICards = (
  records: MaintenanceRecord[],
  costs: AggregatedCosts,
  kpis: KPIData,
): KPICard[] => {
  const scheduledCount = records.filter((r) => r.type === "scheduled").length;
  const requestedCount = records.filter((r) => r.type === "requested").length;
  const companyPartCount = Array.from(costs.parts.values()).reduce((s, p) => s + p.count, 0);
  const clientPartCount = Array.from(costs.clientParts.values()).reduce((s, p) => s + p.count, 0);
  const resolutionSub = kpis.totalProblems > 0
    ? `${formatEnNumber(kpis.problemsResolved)} من ${formatEnNumber(kpis.totalProblems)} تم حلها`
    : "لا توجد مشاكل";

  const resolutionVariant: KPICard["variant"] =
    kpis.resolutionRate >= 80 ? "good" : kpis.resolutionRate >= 50 ? "warn" : "default";
  const ratingVariant: KPICard["variant"] =
    kpis.avgVisitRating >= 4 ? "good" : kpis.avgVisitRating >= 3 ? "warn" : "default";

  return [
    { icon: "●", label: "إجمالي الزيارات", value: formatEnNumber(kpis.totalVisits), sublabel: `${formatEnNumber(scheduledCount)} مجدولة · ${formatEnNumber(requestedCount)} طارئة` },
    { icon: "✓", label: "نسبة حل المشاكل", value: `${formatEnNumber(kpis.resolutionRate)}%`, sublabel: resolutionSub, variant: resolutionVariant },
    { icon: "◈", label: "قطع الغيار", value: formatEnNumber(kpis.totalPartsUsed), sublabel: `${formatEnNumber(companyPartCount)} علينا · ${formatEnNumber(clientPartCount)} عميل` },
    { icon: "★", label: "متوسط التقييم", value: kpis.avgVisitRating > 0 ? `${formatEnNumber(kpis.avgVisitRating)}/5` : "-", sublabel: kpis.avgVisitRating >= 4 ? "ممتاز" : kpis.avgVisitRating >= 3 ? "جيد" : kpis.avgVisitRating > 0 ? "مقبول" : "لا تقييمات", variant: ratingVariant },
    { icon: "◊", label: "صافي التكلفة", value: formatPdfCurrency(costs.grandTotalCompanyCost), sublabel: "شامل كل المصاريف" },
  ];
};

// Reverse a row and columnStyles for RTL autoTable
const rtlRow = (row: string[]): string[] => [...row].reverse();

// ── Empty-state message helper ──
const drawEmptyMessage = (doc: jsPDF, y: number, message: string, margin: number): number => {
  doc.setFont("Amiri", "italic");
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(rtl(message), doc.internal.pageSize.getWidth() - margin, y + 5, { align: "right" });
  doc.setFont("Amiri", "normal");
  doc.setTextColor(...BRAND.text);
  return y + 10;
};
const rtlStyles = (styles: Record<number, object>): Record<number, object> => {
  const keys = Object.keys(styles).map(Number).sort((a, b) => a - b);
  const result: Record<number, object> = {};
  keys.forEach((k, i) => {
    result[keys.length - 1 - i] = styles[k];
  });
  return result;
};

// ── Smart info-item builder ──
interface RawInfoField {
  label: string;
  rawValue: unknown;
  ignoreIf: IgnoreCondition;
  icon?: string;
  format?: (value: unknown) => string;
}

const buildInfoItems = (fields: RawInfoField[], hideEmpty: boolean): InfoItem[] => {
  return fields
    .filter((field) => !hideEmpty || !isValueEmpty(field.rawValue, field.ignoreIf))
    .map((field) => ({
      label: field.label,
      value: field.format ? field.format(field.rawValue) : String(field.rawValue || "—"),
      icon: field.icon,
    }));
};

// ── Smart maintenance table column model ──
interface MaintenanceTableColumn {
  id: string;
  label: string;
  accessor: (r: MaintenanceRecord) => unknown;
  ignoreIf: IgnoreCondition;
  width: number;
  format: (r: MaintenanceRecord) => string;
}

const buildMaintenanceTableColumns = (): MaintenanceTableColumn[] => [
  { id: "date", label: "التاريخ", accessor: (r) => r.maintenanceDate, ignoreIf: "never", width: 13, format: (r) => formatDateEn(r.maintenanceDate) },
  { id: "type", label: "النوع", accessor: (r) => r.type, ignoreIf: "never", width: 10, format: (r) => rtl(getTypeLabel(r.type)) },
  { id: "barista", label: "الفني", accessor: (r) => r.baristaName, ignoreIf: "empty", width: 15, format: (r) => rtl(r.baristaName) || "—" },
  { id: "zone", label: "المنطقة", accessor: (r) => r.visitZone, ignoreIf: "empty", width: 13, format: (r) => rtl(r.visitZone) || "—" },
  { id: "problems", label: "المشاكل", accessor: (r) => (r.problems || []).join(""), ignoreIf: "empty", width: 22, format: (r) => formatProblemsList(r.problems) },
  { id: "solved", label: "تم الحل", accessor: () => "always", ignoreIf: "never", width: 10, format: (r) => (r.problemSolved ? "✓ نعم" : "✗ لا") },
  { id: "parts", label: "قطع الغيار", accessor: (r) => formatPartsList(r.partsReplaced), ignoreIf: "empty", width: 24, format: (r) => formatPartsList(r.partsReplaced) },
  { id: "partsCost", label: "تكلفة القطع", accessor: (r) => getRecordCostSummary(r, partsList, servicesList).partsCost, ignoreIf: "zero", width: 11, format: (r) => formatPdfCurrency(getRecordCostSummary(r, partsList, servicesList).partsCost) },
  { id: "services", label: "الخدمات", accessor: (r) => formatServicesList(r.servicesPerformed), ignoreIf: "empty", width: 24, format: (r) => formatServicesList(r.servicesPerformed) },
  { id: "servicesCost", label: "تكلفة الخدمات", accessor: (r) => getRecordCostSummary(r, partsList, servicesList).servicesCost, ignoreIf: "zero", width: 11, format: (r) => formatPdfCurrency(getRecordCostSummary(r, partsList, servicesList).servicesCost) },
  { id: "lease", label: "إيجار يومي", accessor: (r) => getRecordCostSummary(r, partsList, servicesList).leaseCost, ignoreIf: "zero", width: 11, format: (r) => { const c = getRecordCostSummary(r, partsList, servicesList); return c.leaseCost > 0 ? formatPdfCurrency(c.leaseCost) : "—"; } },
  { id: "total", label: "الإجمالي", accessor: (r) => getRecordCostSummary(r, partsList, servicesList).total, ignoreIf: "never", width: 12, format: (r) => formatPdfCurrency(getRecordCostSummary(r, partsList, servicesList).total) },
  { id: "rating", label: "التقييم", accessor: (r) => r.visitRating, ignoreIf: "zero", width: 10, format: (r) => (r.visitRating ? `★ ${formatEnNumber(r.visitRating)}` : "—") },
];

const renderMaintenanceHistoryTable = (
  doc: jsPDF,
  records: MaintenanceRecord[],
  y: number,
  hideEmpty: boolean,
): number => {
  const allCols = buildMaintenanceTableColumns();
  const activeCols = hideEmpty
    ? allCols.filter((col) => {
        if (col.ignoreIf === "never") return true;
        return records.some((r) => !isValueEmpty(col.accessor(r), col.ignoreIf));
      })
    : allCols;

  const headRow = rtlRow(activeCols.map((c) => c.label));
  const rows = records.map((r) => rtlRow(activeCols.map((c) => c.format(r))));
  const columnStyles = rtlStyles(
    Object.fromEntries(activeCols.map((c, i) => [i, { cellWidth: c.width }])),
  );

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: rows,
    theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.8, font: "Amiri", halign: "right", valign: "middle" },
    headStyles: { fillColor: BRAND.primary as [number, number, number], textColor: BRAND.white as [number, number, number], fontStyle: "bold" },
    columnStyles,
  });

  return (doc as any).lastAutoTable.finalY + 8;
};

// ═══════════════════════════════════════════
//  TIER 2: Internal Branch Report (Detailed)
// ═══════════════════════════════════════════

export interface InternalReportOptions {
  /** When true (default), empty fields/sections are hidden and content reflows. */
  hideEmptyComponents?: boolean;
}

export const generateInternalBranchReport = async (
  companyName: string,
  branch: Branch,
  options: InternalReportOptions = {},
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const assets = await loadFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const hideEmpty = options.hideEmptyComponents ?? true;

  const allFlatRecords = flattenMaintenanceRecords(branch.maintenanceHistory);
  const period = formatPeriod(allFlatRecords);
  const startY = drawInternalHeader(doc, companyName, branch.branchName || undefined, assets, period);

  const engine = new PDFLayoutEngine(doc, startY, { hideEmptyComponents: hideEmpty });

  const costs = aggregateBranchCosts(branch, partsList, servicesList);
  const kpis = getOperationalKPIs(branch.maintenanceHistory);
  const zoneBreakdown = getVisitZoneBreakdown(branch.maintenanceHistory);
  const techSummary = getTechnicianSummary(branch.maintenanceHistory);
  const machineSummary = getMachineLeaseSummary(branch.machines, branch.maintenanceHistory);
  const problemFreq = getProblemFrequency(branch.maintenanceHistory);

  // KPI Cards
  engine.addBlock({
    estimatedHeight: 32,
    draw: (doc, y) => {
      const cards = buildKPICards(allFlatRecords, costs, kpis);
      return drawKPICards(doc, cards, y);
    },
  });

  // Two-column layout: finance + sidebar
  engine.addBlock({
    estimatedHeight: 130,
    draw: (doc, y) => {
      const leftColW = pageWidth / 2 - margin - 6;
      const rightColX = pageWidth / 2 + 3;

      // Right column: financial summary
      const financeHeaderY = drawSectionHeader(doc, "تفصيل التكاليف", y, {
        x: rightColX,
        width: leftColW,
      });
      const financialCategories = buildFinancialCategories(costs);
      let financeY = drawFinancialSummary(
        doc,
        financialCategories,
        costs.grandTotalCompanyCost,
        costs.totalClientPartsCost + costs.totalClientServicesCost,
        financeHeaderY,
      );

      // Left column: sidebar
      let sideY = y;

      if (zoneBreakdown.some((z) => z.visits > 0)) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "رسوم الزيارات حسب المنطقة", sideY, { x: margin, width: leftColW });
        sideY = drawZoneTable(doc, zoneBreakdown as ZoneRow[], costs.totalVisitFees, sideY);
      }

      if (machineSummary.length > 0) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "أسطول الماكينات", sideY, { x: margin, width: leftColW });
        const machines: MachineInfo[] = machineSummary.map((m) => ({
          name: m.name,
          type: m.type === "leased" ? "إيجار" : m.type === "consumption" ? "استهلاك" : "شراء",
          dailyRate: m.dailyRate,
          metric: `${formatEnNumber(m.daysActive)} يوم`,
          total: m.revenue,
          icon: m.type === "leased" ? "☕" : m.type === "consumption" ? "⚙" : "M",
        }));
        sideY = drawMachineCards(doc, machines, sideY);
      }

      const branchInfo = buildInfoItems(
        [
          { label: "الموقع:", rawValue: branch.location, ignoreIf: "empty", icon: "" },
          { label: "البريد:", rawValue: branch.email, ignoreIf: "empty", icon: "✉" },
          { label: "الرقم الضريبي:", rawValue: branch.taxNumber, ignoreIf: "empty", icon: "#" },
          { label: "استهلاك القهوة:", rawValue: branch.coffeeConsumptionKg, ignoreIf: "zero", icon: "◎", format: (v) => `${formatEnNumber(Number(v))} كجم/شهر` },
          { label: "أوقات الصيانة:", rawValue: branch.allowedMaintenanceTimes, ignoreIf: "empty", icon: "◷" },
        ],
        hideEmpty,
      );

      if (branchInfo.length > 0) {
        sideY = checkPageBreak(doc, sideY, 40);
        sideY = drawSectionHeader(doc, "معلومات الفرع", sideY, { x: margin, width: leftColW });
        sideY = drawInfoBox(doc, branchInfo, sideY);
      }

      if (branch.contacts.length > 0) {
        const contacts: ContactInfo[] = branch.contacts.map((c) => ({
          name: c.name,
          role: c.customPosition || c.position,
          phone: c.phoneNumbers.map((p) => p.number).join(" / ") || "—",
        }));
        sideY = checkPageBreak(doc, sideY, 40);
        sideY = drawSectionHeader(doc, "جهات الاتصال", sideY, { x: margin, width: leftColW });
        sideY = drawContactCards(doc, contacts, sideY);
      }

      return Math.max(financeY, sideY) + 8;
    },
  });

  // Maintenance History — 13 columns matching HTML preview, pruned when empty
  engine.addSection(
    "سجل الصيانة التفصيلي",
    (section) => {
      section.addRepeater(
        allFlatRecords,
        40 + allFlatRecords.length * 8,
        (doc, y) => drawEmptyMessage(doc, y, "لا توجد سجلات صيانة", margin),
        (doc, y, items) => renderMaintenanceHistoryTable(doc, items, y, hideEmpty),
      );
    },
    drawSectionHeader,
  );

  // Technician Performance — 6 columns
  engine.addSection(
    "أداء الفنيين",
    (section) => {
      section.addRepeater(
        techSummary,
        40 + techSummary.length * 8,
        (doc, y) => drawEmptyMessage(doc, y, "لا توجد بيانات فنيين", margin),
        (doc, y, items) => {
          const tableW = pageWidth - margin * 2;
          const colWidths = [tableW * 0.22, tableW * 0.12, tableW * 0.14, tableW * 0.14, tableW * 0.16, tableW * 0.22];
          const x = margin;

          let nextY = drawTableHeader(doc, ["الفني", "الزيارات", "متوسط التقييم", "قطع الغيار", "إجمالي التكلفة", "المناطق"], colWidths, x, y, tableW);

          const techMap = new Map<string, { totalCost: number; zones: Record<string, number> }>();
          allFlatRecords.forEach((r) => {
            const name = r.baristaName || "غير معروف";
            const recCosts = getRecordCostSummary(r, partsList, servicesList);
            const existing = techMap.get(name) || { totalCost: 0, zones: {} };
            existing.totalCost += recCosts.total;
            if (r.visitZone) {
              existing.zones[r.visitZone] = (existing.zones[r.visitZone] || 0) + 1;
            }
            techMap.set(name, existing);
          });

          items.forEach((t, i) => {
            const extra = techMap.get(t.name) || { totalCost: 0, zones: {} };
            const zonesStr = Object.entries(extra.zones)
              .map(([zone, count]) => `${rtl(zone)} (${formatEnNumber(count)})`)
              .join(" · ") || "—";
            nextY = checkPageBreak(doc, nextY, 8);
            nextY = drawTableRow(
              doc,
              [rtl(t.name), formatEnNumber(t.visits), t.avgRating > 0 ? `★ ${formatEnNumber(t.avgRating)}/5` : "-", formatEnNumber(t.partsUsed), formatPdfCurrency(extra.totalCost), zonesStr],
              colWidths, x, nextY, tableW, i % 2 === 1,
              ["right", "center", "center", "center", "right", "right"],
            );
          });

          return nextY + 10;
        },
      );
    },
    drawSectionHeader,
  );

  // Top Problems & Parts
  const topProblems = problemFreq.slice(0, 5);
  const allParts = Array.from(costs.parts.values())
    .concat(Array.from(costs.clientParts.values()))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const problemLastDate = new Map<string, string>();
  allFlatRecords.forEach((r) => {
    (r.problems || []).forEach((p) => {
      const current = problemLastDate.get(p);
      if (!current || new Date(r.maintenanceDate) > new Date(current)) {
        problemLastDate.set(p, r.maintenanceDate);
      }
    });
  });

  engine.addSection(
    "ملخص المشاكل والقطع",
    (section) => {
      section.addBlock({
        estimatedHeight: topProblems.length > 0 || allParts.length > 0 || !hideEmpty ? 80 : 20,
        draw: (doc, y) => {
          if (hideEmpty && topProblems.length === 0 && allParts.length === 0) {
            return drawEmptyMessage(doc, y, "لا توجد مشاكل أو قطع", margin);
          }

          const startY = y;
          const colW = (pageWidth - margin * 2 - 8) / 2;

          if (!hideEmpty || topProblems.length > 0) {
            const x = margin;
            let py = drawSectionHeader(doc, "أكثر المشاكل تكراراً", startY);
            const cw = [colW * 0.5, colW * 0.2, colW * 0.3];
            py = drawTableHeader(doc, ["المشكلة", "عدد المرات", "آخر ظهور"], cw, x, py, colW);
            topProblems.forEach((p, i) => {
              py = checkPageBreak(doc, py, 8);
              py = drawTableRow(doc, [rtl(p.name), formatEnNumber(p.count), formatDateEn(problemLastDate.get(p.name) || "—")], cw, x, py, colW, i % 2 === 1, ["right", "center", "right"]);
            });
          }

          if (!hideEmpty || allParts.length > 0) {
            const x = margin + colW + 8;
            let py = drawSectionHeader(doc, "أكثر القطع استهلاكاً", startY);
            const cw = [colW * 0.5, colW * 0.25, colW * 0.25];
            py = drawTableHeader(doc, ["القطعة", "الكمية", "التكلفة"], cw, x, py, colW);
            allParts.forEach((p, i) => {
              py = checkPageBreak(doc, py, 8);
              py = drawTableRow(doc, [rtl(p.name), formatEnNumber(p.count), formatPdfCurrency(p.totalCost)], cw, x, py, colW, i % 2 === 1, [
                "right",
                "center",
                "right",
              ]);
            });
          }

          return Math.max(y, startY + 60);
        },
      });
    },
    drawSectionHeader,
  );

  engine.flush();
  applyFooters(doc, "نظام CMR", companyName);

  return doc;
};

// ═══════════════════════════════════════════
//  TIER 1: Internal Company Report (Overview)
// ═══════════════════════════════════════════

export const generateInternalCompanyReport = async (
  data: FormData & { created_at?: string },
  options: InternalReportOptions = {},
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const assets = await loadFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const hideEmpty = options.hideEmptyComponents ?? true;

  const allFlatRecords = flattenMaintenanceRecords(data.maintenanceHistory);
  data.branches.forEach((b) => allFlatRecords.push(...flattenMaintenanceRecords(b.maintenanceHistory)));
  const period = formatPeriod(allFlatRecords);
  const startY = drawInternalHeader(doc, data.companyName, undefined, assets, period);

  const engine = new PDFLayoutEngine(doc, startY, { hideEmptyComponents: hideEmpty });

  const costs = aggregateCosts(data, partsList, servicesList);
  const kpis = getOperationalKPIs(data.maintenanceHistory);
  const zoneBreakdown = getVisitZoneBreakdown(data.maintenanceHistory);
  const techSummary = getTechnicianSummary(data.maintenanceHistory);
  const machineSummary = getMachineLeaseSummary(data.machines, data.maintenanceHistory);
  const branchSummaries = getBranchCostSummary(data.branches, partsList, servicesList);
  const problemFreq = getProblemFrequency(data.maintenanceHistory);

  // Merge branch-level data
  data.branches.forEach((branch) => {
    const branchKPIs = getOperationalKPIs(branch.maintenanceHistory);
    kpis.totalVisits += branchKPIs.totalVisits;
    kpis.totalProblems += branchKPIs.totalProblems;
    kpis.problemsResolved += branchKPIs.problemsResolved;
    kpis.totalPartsUsed += branchKPIs.totalPartsUsed;
    if (branchKPIs.totalRatedVisits > 0) {
      kpis.avgVisitRating =
        kpis.totalRatedVisits > 0
          ? Math.round(
              ((kpis.avgVisitRating * kpis.totalRatedVisits + branchKPIs.avgVisitRating * branchKPIs.totalRatedVisits) /
                (kpis.totalRatedVisits + branchKPIs.totalRatedVisits)) * 10,
            ) / 10
          : branchKPIs.avgVisitRating;
      kpis.totalRatedVisits += branchKPIs.totalRatedVisits;
    }

    const branchZones = getVisitZoneBreakdown(branch.maintenanceHistory);
    branchZones.forEach((bz) => {
      const existing = zoneBreakdown.find((z) => z.zone === bz.zone);
      if (existing) {
        existing.visits += bz.visits;
        existing.total += bz.total;
      }
    });

    const branchProblems = getProblemFrequency(branch.maintenanceHistory);
    branchProblems.forEach((bp) => {
      const existing = problemFreq.find((p) => p.name === bp.name);
      if (existing) existing.count += bp.count;
      else problemFreq.push(bp);
    });
    problemFreq.sort((a, b) => b.count - a.count);
  });

  kpis.resolutionRate = kpis.totalProblems > 0 ? Math.round((kpis.problemsResolved / kpis.totalProblems) * 100) : 100;

  // KPI Cards
  engine.addBlock({
    estimatedHeight: 32,
    draw: (doc, y) => {
      const kpiCards = buildKPICards(allFlatRecords, costs, kpis);
      return drawKPICards(doc, kpiCards, y);
    },
  });

  // Two-column layout: finance + sidebar
  engine.addBlock({
    estimatedHeight: 130,
    draw: (doc, y) => {
      const leftColW = pageWidth / 2 - margin - 6;
      const rightColX = pageWidth / 2 + 3;

      const financeHeaderY = drawSectionHeader(doc, "تفصيل التكاليف", y, {
        x: rightColX,
        width: leftColW,
      });
      const financialCategories = buildFinancialCategories(costs);
      let financeY = drawFinancialSummary(
        doc,
        financialCategories,
        costs.grandTotalCompanyCost,
        costs.totalClientPartsCost + costs.totalClientServicesCost,
        financeHeaderY,
      );

      let sideY = y;

      if (zoneBreakdown.some((z) => z.visits > 0)) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "رسوم الزيارات حسب المنطقة", sideY, { x: margin, width: leftColW });
        sideY = drawZoneTable(doc, zoneBreakdown as ZoneRow[], costs.totalVisitFees, sideY);
      }

      if (machineSummary.length > 0) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "أسطول الماكينات", sideY, { x: margin, width: leftColW });
        const machines: MachineInfo[] = machineSummary.map((m) => ({
          name: m.name,
          type: m.type === "leased" ? "إيجار" : m.type === "consumption" ? "استهلاك" : "شراء",
          dailyRate: m.dailyRate,
          metric: `${formatEnNumber(m.daysActive)} يوم`,
          total: m.revenue,
          icon: m.type === "leased" ? "☕" : m.type === "consumption" ? "⚙" : "M",
        }));
        sideY = drawMachineCards(doc, machines, sideY);
      }

      const companyInfo = buildInfoItems(
        [
          { label: "الموقع:", rawValue: data.location, ignoreIf: "empty", icon: "⌖" },
          { label: "البريد:", rawValue: data.email, ignoreIf: "empty", icon: "✉" },
          { label: "الرقم الضريبي:", rawValue: data.taxNumber, ignoreIf: "empty", icon: "#" },
          { label: "استهلاك القهوة:", rawValue: data.coffeeConsumptionKg, ignoreIf: "zero", icon: "◎", format: (v) => `${formatEnNumber(Number(v))} كجم/شهر` },
          { label: "أوقات الصيانة:", rawValue: data.allowedMaintenanceTimes, ignoreIf: "empty", icon: "◷" },
        ],
        hideEmpty,
      );

      if (companyInfo.length > 0) {
        sideY = checkPageBreak(doc, sideY, 40);
        sideY = drawSectionHeader(doc, "معلومات الشركة", sideY, { x: margin, width: leftColW });
        sideY = drawInfoBox(doc, companyInfo, sideY);
      }

      return Math.max(financeY, sideY) + 8;
    },
  });

  // Branch Cost Comparison
  engine.addSection(
    "مقارنة الفروع",
    (section) => {
      section.addRepeater(
        branchSummaries,
        40 + branchSummaries.length * 8,
        (doc, y) => drawEmptyMessage(doc, y, "لا توجد فروع للمقارنة", margin),
        (doc, y, items) => {
          const tableW = pageWidth - margin * 2;
          const colWidths = [tableW * 0.22, tableW * 0.13, tableW * 0.15, tableW * 0.15, tableW * 0.15, tableW * 0.2];
          const x = margin;

          let nextY = drawTableHeader(doc, ["الفرع", "الزيارات", "رسوم الزيارات", "قطع الغيار", "الخدمات", "صافي التكلفة"], colWidths, x, y, tableW);

          items.forEach((bs, i) => {
            nextY = checkPageBreak(doc, nextY, 8);
            nextY = drawTableRow(
              doc,
              [rtl(bs.branchName), formatEnNumber(bs.visitCount), formatPdfCurrency(bs.visitFees), formatPdfCurrency(bs.partsCost), formatPdfCurrency(bs.servicesCost), formatPdfCurrency(bs.netCost)],
              colWidths, x, nextY, tableW, i % 2 === 1,
              ["right", "center", "right", "right", "right", "right"],
            );
          });

          return nextY + 10;
        },
      );
    },
    drawSectionHeader,
  );

  // Technician Performance
  engine.addSection(
    "أداء الفنيين",
    (section) => {
      section.addRepeater(
        techSummary,
        40 + techSummary.length * 8,
        (doc, y) => drawEmptyMessage(doc, y, "لا توجد بيانات فنيين", margin),
        (doc, y, items) => {
          const tableW = pageWidth - margin * 2;
          const colWidths = [tableW * 0.22, tableW * 0.12, tableW * 0.14, tableW * 0.14, tableW * 0.16, tableW * 0.22];
          const x = margin;

          let nextY = drawTableHeader(doc, ["الفني", "الزيارات", "متوسط التقييم", "قطع الغيار", "إجمالي التكلفة", "المناطق"], colWidths, x, y, tableW);

          const techMap = new Map<string, { totalCost: number; zones: Record<string, number> }>();
          allFlatRecords.forEach((r) => {
            const name = r.baristaName || "غير معروف";
            const recCosts = getRecordCostSummary(r, partsList, servicesList);
            const existing = techMap.get(name) || { totalCost: 0, zones: {} };
            existing.totalCost += recCosts.total;
            if (r.visitZone) {
              existing.zones[r.visitZone] = (existing.zones[r.visitZone] || 0) + 1;
            }
            techMap.set(name, existing);
          });

          items.forEach((t, i) => {
            const extra = techMap.get(t.name) || { totalCost: 0, zones: {} };
            const zonesStr = Object.entries(extra.zones)
              .map(([zone, count]) => `${rtl(zone)} (${formatEnNumber(count)})`)
              .join(" · ") || "—";
            nextY = checkPageBreak(doc, nextY, 8);
            nextY = drawTableRow(
              doc,
              [rtl(t.name), formatEnNumber(t.visits), t.avgRating > 0 ? `★ ${formatEnNumber(t.avgRating)}/5` : "-", formatEnNumber(t.partsUsed), formatPdfCurrency(extra.totalCost), zonesStr],
              colWidths, x, nextY, tableW, i % 2 === 1,
              ["right", "center", "center", "center", "right", "right"],
            );
          });

          return nextY + 10;
        },
      );
    },
    drawSectionHeader,
  );

  // Top Problems & Parts
  const topProblems = problemFreq.slice(0, 5);
  const allParts = Array.from(costs.parts.values())
    .concat(Array.from(costs.clientParts.values()))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const problemLastDate = new Map<string, string>();
  allFlatRecords.forEach((r) => {
    (r.problems || []).forEach((p) => {
      const current = problemLastDate.get(p);
      if (!current || new Date(r.maintenanceDate) > new Date(current)) {
        problemLastDate.set(p, r.maintenanceDate);
      }
    });
  });

  engine.addSection(
    "ملخص المشاكل والقطع",
    (section) => {
      section.addBlock({
        estimatedHeight: topProblems.length > 0 || allParts.length > 0 || !hideEmpty ? 80 : 20,
        draw: (doc, y) => {
          if (hideEmpty && topProblems.length === 0 && allParts.length === 0) {
            return drawEmptyMessage(doc, y, "لا توجد مشاكل أو قطع", margin);
          }

          const startY = y;
          const colW = (pageWidth - margin * 2 - 8) / 2;

          if (!hideEmpty || topProblems.length > 0) {
            const x = margin;
            let py = drawSectionHeader(doc, "أكثر المشاكل تكراراً", startY);
            const cw = [colW * 0.5, colW * 0.2, colW * 0.3];
            py = drawTableHeader(doc, ["المشكلة", "عدد المرات", "آخر ظهور"], cw, x, py, colW);
            topProblems.forEach((p, i) => {
              py = checkPageBreak(doc, py, 8);
              py = drawTableRow(doc, [rtl(p.name), formatEnNumber(p.count), formatDateEn(problemLastDate.get(p.name) || "—")], cw, x, py, colW, i % 2 === 1, ["right", "center", "right"]);
            });
          }

          if (!hideEmpty || allParts.length > 0) {
            const x = margin + colW + 8;
            let py = drawSectionHeader(doc, "أكثر القطع استهلاكاً", startY);
            const cw = [colW * 0.5, colW * 0.25, colW * 0.25];
            py = drawTableHeader(doc, ["القطعة", "الكمية", "التكلفة"], cw, x, py, colW);
            allParts.forEach((p, i) => {
              py = checkPageBreak(doc, py, 8);
              py = drawTableRow(doc, [rtl(p.name), formatEnNumber(p.count), formatPdfCurrency(p.totalCost)], cw, x, py, colW, i % 2 === 1, [
                "right",
                "center",
                "right",
              ]);
            });
          }

          return Math.max(y, startY + 60);
        },
      });
    },
    drawSectionHeader,
  );

  // Maintenance History (Main Office + Branches)
  engine.addSection(
    "سجل الصيانة",
    (section) => {
      section.addRepeater(
        allFlatRecords,
        40 + Math.min(allFlatRecords.length, 20) * 8,
        (doc, y) => drawEmptyMessage(doc, y, "لا توجد سجلات صيانة", margin),
        (doc, y, items) => {
          const recentRecords = items.slice(-20);
          return renderMaintenanceHistoryTable(doc, recentRecords, y, hideEmpty);
        },
      );
    },
    drawSectionHeader,
  );

  engine.flush();
  applyFooters(doc, "نظام CMR", data.companyName);

  return doc;
};
