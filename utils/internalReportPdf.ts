/** @format */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FormData, MaintenanceRecord, Branch, LogisticsOperation, MaintenancePhoto } from "../types";
import { DateRange, formatDateRangeLabelEn, getReportRecords } from "./dateRangeFilter";
import { loadFonts, flattenMaintenanceRecords, renderPhotosInPDF, loadImageAsBase64 } from "./pdfGenerator";
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
  resolvePartCost,
  resolveServiceCost,
  formatPdfCurrencyEn,
  formatEnNumber,
  AggregatedCosts,
  AggregatedItem,
  aggregateLogisticsCosts,
} from "./costAggregation";
import { getVisitZoneFee } from "./visitZones";
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
  drawLogisticsOperationsTable,
  drawClientLogisticsTable,
  drawIconBadge,
  pdfText,
  formatDateEn,
  KPICard,
  FinancialCategory,
  ZoneRow,
  ContactInfo,
  MachineInfo,
  InfoItem,
  PdfIconName,
} from "./pdfTheme";
import {
  isValueEmpty,
  PDFLayoutEngine,
  IgnoreCondition,
  NO_DATA_LABEL,
  filterEmptyRows,
} from "./pdfCompactLayout";

// Keep dynamic Arabic in logical Unicode order. jsPDF's configured Arabic
// parser/bidi hook shapes and reorders it once when each draw call is emitted.
const rtl = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return "";
  return String(text);
};

// ── Helpers ──

const getPaidByLabel = (val: string): string => (val === "company" ? "By Midos" : "By Client");

const formatProblemsList = (problems: string[] | undefined): string => {
  if (!problems || problems.length === 0) return NO_DATA_LABEL;
  return problems.map((p) => rtl(p)).join("\n");
};

const formatPartsList = (
  parts: { name: string; count: number; cost?: number; paidByClient?: boolean }[] | undefined,
  showPayer = true,
  showCosts = true,
): string => {
  if (!parts || parts.length === 0) return NO_DATA_LABEL;
  const lines = parts.map((p) => {
    const qty = p.count || 0;
    const payer = showPayer ? ` (${getPaidByLabel(p.paidByClient ? "client" : "company")})` : "";
    if (!showCosts) return `• ${formatEnNumber(qty)}× ${rtl(p.name)}${payer}`;
    const itemCost = qty * resolvePartCost(p, partsList);
    return `• ${formatEnNumber(qty)}× ${rtl(p.name)} — ${formatPdfCurrencyEn(itemCost)}${payer}`;
  });
  if (showCosts) {
    const total = parts.reduce((sum, p) => sum + (p.count || 0) * resolvePartCost(p, partsList), 0);
    lines.push(`Total: ${formatPdfCurrencyEn(total)}`);
  }
  return lines.join("\n");
};

const formatServicesList = (
  services: { name: string; count: number; cost?: number; paidByClient?: boolean }[] | undefined,
  showPayer = true,
  showCosts = true,
): string => {
  if (!services || services.length === 0) return NO_DATA_LABEL;
  const lines = services.map((s) => {
    const qty = s.count || 0;
    const payer = showPayer ? ` (${getPaidByLabel(s.paidByClient ? "client" : "company")})` : "";
    if (!showCosts) return `• ${formatEnNumber(qty)}× ${rtl(s.name)}${payer}`;
    const itemCost = qty * resolveServiceCost(s, servicesList);
    return `• ${formatEnNumber(qty)}× ${rtl(s.name)} — ${formatPdfCurrencyEn(itemCost)}${payer}`;
  });
  if (showCosts) {
    const total = services.reduce((sum, s) => sum + (s.count || 0) * resolveServiceCost(s, servicesList), 0);
    lines.push(`Total: ${formatPdfCurrencyEn(total)}`);
  }
  return lines.join("\n");
};

const getTypeLabel = (type: string): string => (type === "requested" ? "Requested" : "Scheduled");

/** Merge two aggregated item maps by key, summing counts and totals. */
const mergeItemMaps = (
  a: Map<string, AggregatedItem>,
  b: Map<string, AggregatedItem>,
): Map<string, AggregatedItem> => {
  const merged = new Map(a);
  b.forEach((item, key) => {
    const existing = merged.get(key);
    if (existing) {
      existing.count += item.count;
      existing.totalCost += item.totalCost;
    } else {
      merged.set(key, item);
    }
  });
  return merged;
};

const buildFinancialCategories = (costs: AggregatedCosts, costMode = false): FinancialCategory[] => {
  const categories: FinancialCategory[] = [];

  if (costMode) {
    // Cost Report: no payer attribution — merge company + client into plain
    // "Parts" / "Services" buckets.
    const partsAll = mergeItemMaps(costs.parts, costs.clientParts);
    if (partsAll.size > 0) {
      const partsArr = Array.from(partsAll.values())
        .filter((p) => p.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost);
      categories.push({
        title: "Parts",
        total: costs.totalPartsCost + costs.totalClientPartsCost,
        lines: partsArr.map((p) => ({
          name: p.name,
          detail: `${formatEnNumber(p.count)} × ${formatPdfCurrencyEn(p.unitCost)}`,
          total: p.totalCost,
        })),
      });
    }
    const servicesAll = mergeItemMaps(costs.services, costs.clientServices);
    if (servicesAll.size > 0) {
      const servicesArr = Array.from(servicesAll.values())
        .filter((s) => s.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost);
      categories.push({
        title: "Services",
        total: costs.totalServicesCost + costs.totalClientServicesCost,
        lines: servicesArr.map((s) => ({
          name: s.name,
          detail: `${formatEnNumber(s.count)} × ${formatPdfCurrencyEn(s.unitCost)}`,
          total: s.totalCost,
        })),
      });
    }
  } else {
    if (costs.totalPartsCost > 0 || costs.parts.size > 0) {
      const partsArr = Array.from(costs.parts.values())
        .filter((p) => p.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost);
      categories.push({
        title: "Parts — Company Paid",
        total: costs.totalPartsCost,
        lines: partsArr.map((p) => ({
          name: p.name,
          detail: `${formatEnNumber(p.count)} × ${formatPdfCurrencyEn(p.unitCost)}`,
          total: p.totalCost,
        })),
      });
    }

    if (costs.totalClientPartsCost > 0 || costs.clientParts.size > 0) {
      const clientPartsArr = Array.from(costs.clientParts.values())
        .filter((p) => p.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost);
      categories.push({
        title: "Parts — Client Paid",
        total: costs.totalClientPartsCost,
        lines: clientPartsArr.map((p) => ({
          name: p.name,
          detail: `${formatEnNumber(p.count)} × ${formatPdfCurrencyEn(p.unitCost)}`,
          total: p.totalCost,
        })),
      });
    }

    if (costs.totalServicesCost > 0 || costs.services.size > 0) {
      const servicesArr = Array.from(costs.services.values())
        .filter((s) => s.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost);
      categories.push({
        title: "Services — Company Paid",
        total: costs.totalServicesCost,
        lines: servicesArr.map((s) => ({
          name: s.name,
          detail: `${formatEnNumber(s.count)} × ${formatPdfCurrencyEn(s.unitCost)}`,
          total: s.totalCost,
        })),
      });
    }

    if (costs.totalClientServicesCost > 0 || costs.clientServices.size > 0) {
      const clientServicesArr = Array.from(costs.clientServices.values())
        .filter((s) => s.totalCost > 0)
        .sort((a, b) => b.totalCost - a.totalCost);
      categories.push({
        title: "Services — Client Paid",
        total: costs.totalClientServicesCost,
        lines: clientServicesArr.map((s) => ({
          name: s.name,
          detail: `${formatEnNumber(s.count)} × ${formatPdfCurrencyEn(s.unitCost)}`,
          total: s.totalCost,
        })),
      });
    }
  }

  if (costs.totalVisitFees > 0) {
    categories.push({
      title: "Visit Fees",
      total: costs.totalVisitFees,
      lines: [{ name: "Total Visit Fees", total: costs.totalVisitFees }],
    });
  }

  if (costs.totalLeaseRevenue > 0) {
    categories.push({
      title: costMode ? "Machine Rental" : "Machine Rental (Income)",
      total: costs.totalLeaseRevenue,
      lines: [{ name: costMode ? "Total Machine Rental" : "Total Rental Revenue", total: costs.totalLeaseRevenue }],
    });
  }

  return categories;
};


const formatPeriod = (records: MaintenanceRecord[]): string => {
  if (records.length === 0) return NO_DATA_LABEL;
  const dates = records.map((r) => new Date(r.maintenanceDate)).filter((d) => !isNaN(d.getTime()));
  if (dates.length === 0) return NO_DATA_LABEL;
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
  costMode = false,
  logisticsCost = 0,
  clientMode = false,
): KPICard[] => {
  const scheduledCount = records.filter((r) => r.type === "scheduled").length;
  const requestedCount = records.filter((r) => r.type === "requested").length;
  const companyPartCount = Array.from(costs.parts.values()).reduce((s, p) => s + p.count, 0);
  const clientPartCount = Array.from(costs.clientParts.values()).reduce((s, p) => s + p.count, 0);
  const totalPartCount = companyPartCount + clientPartCount;
  const resolutionSub = kpis.totalProblems > 0
    ? `${formatEnNumber(kpis.problemsResolved)} of ${formatEnNumber(kpis.totalProblems)} resolved`
    : "No problems";

  const resolutionVariant: KPICard["variant"] =
    kpis.resolutionRate >= 80 ? "good" : kpis.resolutionRate >= 50 ? "warn" : "default";

  // Total/Net cost KPI includes the logistics section costs (machine rental,
  // pickup/return transport and logistics maintenance) on top of the
  // maintenance-visit costs aggregated in `costs`.
  const totalCost = (costMode ? costs.grandTotal + costs.totalLeaseRevenue : costs.grandTotalCompanyCost) + logisticsCost;

  // Resolution Rate is an internal-report metric — the cost (costMode) and
  // client (clientMode) reports omit it; the client report also drops the
  // cost card entirely so no financial figures ever reach the client.
  const cards: KPICard[] = [
    { icon: "chart", label: "Total Visits", value: formatEnNumber(kpis.totalVisits), sublabel: `${formatEnNumber(scheduledCount)} Scheduled · ${formatEnNumber(requestedCount)} Requested` },
    ...(costMode || clientMode
      ? []
      : [{ icon: "check" as const, label: "Resolution Rate", value: `${formatEnNumber(kpis.resolutionRate)}%`, sublabel: resolutionSub, variant: resolutionVariant }]),
    { icon: "package", label: "Spare Parts", value: formatEnNumber(kpis.totalPartsUsed), sublabel: costMode || clientMode ? `${formatEnNumber(totalPartCount)} total` : `${formatEnNumber(companyPartCount)} Company · ${formatEnNumber(clientPartCount)} Client` },
    ...(clientMode ? [] : [{ icon: "money" as const, label: costMode ? "Total Cost" : "Net Cost", value: formatPdfCurrencyEn(totalCost), sublabel: "All costs included" }]),
  ];
  return cards;
};

// ── Smart info-item builder ──
interface RawInfoField {
  label: string;
  rawValue: unknown;
  ignoreIf: IgnoreCondition;
  icon?: PdfIconName;
  format?: (value: unknown) => string;
}

const buildInfoItems = (fields: RawInfoField[], hideEmpty: boolean): InfoItem[] => {
  return fields
    .filter((field) => !hideEmpty || !isValueEmpty(field.rawValue, field.ignoreIf))
    .map((field) => ({
      label: field.label,
      value: field.format ? field.format(field.rawValue) : String(field.rawValue || NO_DATA_LABEL),
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

const buildMaintenanceTableColumns = (showPayer = true, clientMode = false): MaintenanceTableColumn[] => {
  // In client mode every cost-bearing element is dropped: the Daily Lease and
  // Record Total columns vanish and the Parts/Services bullets render without
  // per-item prices or their "Total:" subtotal line (the widths are widened to
  // keep the table at the same full usable width).
  const showCosts = !clientMode;
  const partsW = clientMode ? 47.5 : 35;
  const servicesW = clientMode ? 47.5 : 35;
  const cols: MaintenanceTableColumn[] = [
    { id: "date", label: "Date", accessor: (r) => r.maintenanceDate, ignoreIf: "never", width: 13, format: (r) => formatDateEn(r.maintenanceDate) },
    { id: "type", label: "Type", accessor: (r) => r.type, ignoreIf: "never", width: 12, format: (r) => r.type === "requested" ? rtl(getTypeLabel("requested")) + " ●" : rtl(getTypeLabel(r.type)) },
    { id: "barista", label: "Technician", accessor: (r) => r.baristaName, ignoreIf: "empty", width: 15, format: (r) => rtl(r.baristaName) || NO_DATA_LABEL },
    { id: "zone", label: "Zone", accessor: (r) => r.visitZone, ignoreIf: "empty", width: 13, format: (r) => rtl(r.visitZone) || NO_DATA_LABEL },
    { id: "problems", label: "Problems", accessor: (r) => (r.problems || []).join(""), ignoreIf: "empty", width: 22, format: (r) => formatProblemsList(r.problems) },
    { id: "solved", label: "Resolved", accessor: () => "always", ignoreIf: "never", width: 10, format: (r) => (r.problemSolved ? "✓ Yes" : "✗ No") },
    // Accessors return the RAW arrays so an all-empty column prunes via
    // isValueEmpty(..., "empty") (D-07) — formatting happens only in `format`.
    { id: "parts", label: "Parts", accessor: (r) => r.partsReplaced, ignoreIf: "empty", width: partsW, format: (r) => formatPartsList(r.partsReplaced, showPayer, showCosts) },
    { id: "services", label: "Services", accessor: (r) => r.servicesPerformed, ignoreIf: "empty", width: servicesW, format: (r) => formatServicesList(r.servicesPerformed, showPayer, showCosts) },
  ];
  if (!clientMode) {
    cols.push(
      { id: "lease", label: "Daily Lease", accessor: (r) => getRecordCostSummary(r, partsList, servicesList).leaseCost, ignoreIf: "zero", width: 11, format: (r) => { const c = getRecordCostSummary(r, partsList, servicesList); return c.leaseCost > 0 ? formatPdfCurrencyEn(c.leaseCost) : NO_DATA_LABEL; } },
      { id: "total", label: "Record Total", accessor: (r) => getRecordCostSummary(r, partsList, servicesList).total, ignoreIf: "never", width: 14, format: (r) => formatPdfCurrencyEn(getRecordCostSummary(r, partsList, servicesList).total) },
    );
  }
  cols.push({ id: "rating", label: "Rating", accessor: (r) => r.visitRating, ignoreIf: "zero", width: 10, format: (r) => (r.visitRating ? `★ ${formatEnNumber(r.visitRating)}` : NO_DATA_LABEL) });
  return cols;
};

const renderMaintenanceHistoryTable = (
  doc: jsPDF,
  records: MaintenanceRecord[],
  y: number,
  hideEmpty: boolean,
  showPayer = true,
  clientMode = false,
): number => {
  const allCols = buildMaintenanceTableColumns(showPayer, clientMode);
  const activeCols = hideEmpty
    ? allCols.filter((col) => {
        if (col.ignoreIf === "never") return true;
        return records.some((r) => !isValueEmpty(col.accessor(r), col.ignoreIf));
      })
    : allCols;

  const headRow = activeCols.map((c) => c.label);
  const rows = records.map((r) => activeCols.map((c) => c.format(r)));
  const columnStyles = Object.fromEntries(activeCols.map((c, i) => [i, { cellWidth: c.width }]));

  autoTable(doc, {
    startY: y,
    head: [headRow],
    body: rows,
    theme: "grid",
    styles: { fontSize: 5.5, cellPadding: 0.8, font: "Amiri", halign: "left", valign: "middle" },
    headStyles: { fillColor: BRAND.primary as [number, number, number], textColor: BRAND.white as [number, number, number], fontStyle: "bold" },
    columnStyles,
    didParseCell: (hookData) => {
      if (hookData.row.section === 'body' && records[hookData.row.index]?.type === 'requested') {
        hookData.cell.styles.textColor = BRAND.error;
      }
    },
  } as any);

  return (doc as any).lastAutoTable.finalY + 8;
};

// ── Client-mode helpers: per-record detail blocks + per-branch overviews ──

/**
 * Preload every maintenance photo referenced by the given records into a
 * url → dataURL map. The layout engine draws synchronously, so client-mode
 * record blocks must read photos from this cache instead of fetching.
 */
const preloadPhotoDataUrls = async (records: MaintenanceRecord[]): Promise<Map<string, string>> => {
  const cache = new Map<string, string>();
  const urls = new Set<string>();
  const collect = (recs: MaintenanceRecord[]) => {
    recs.forEach((r) => {
      (r.photos || []).forEach((p) => urls.add(p.url));
      if (r.followUpVisits) collect(r.followUpVisits);
    });
  };
  collect(records);
  await Promise.all(
    [...urls].map(async (url) => {
      try {
        const data = await loadImageAsBase64(url);
        if (data) cache.set(url, data);
      } catch {
        // Photo failed to load — the sync drawer renders a placeholder.
      }
    }),
  );
  return cache;
};

/**
 * Synchronous photo thumbnails (grouped by before/after/legacy) that read
 * from a preloaded url → dataURL cache. Failed images draw a placeholder box.
 */
const drawPhotosSync = (
  doc: jsPDF,
  photos: MaintenancePhoto[],
  startY: number,
  pageWidth: number,
  margin: number,
  cache: Map<string, string>,
): number => {
  if (!photos || photos.length === 0) return startY;
  const pageHeight = doc.internal.pageSize.getHeight();
  const types: Array<"before" | "after" | "legacy"> = ["before", "after", "legacy"];
  let currentY = startY;

  for (const type of types) {
    const filtered = photos.filter((p) => p.type === type);
    if (filtered.length === 0) continue;

    doc.setFont("Amiri", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.text);
    pdfText(doc, `${type.charAt(0).toUpperCase()}${type.slice(1)} Photos:`, margin, currentY);
    currentY += 4;

    const thumbSize = 20;
    const spacing = 4;
    let currentX = margin;

    for (const photo of filtered) {
      if (currentY + thumbSize > pageHeight - margin) {
        doc.addPage();
        currentY = margin;
      }
      const data = cache.get(photo.url);
      if (data) {
        try {
          // jsPDF's addImage needs an explicit format; derive it from the data
          // URL so a successful photo load embeds (never hits the legacy
          // overload with a non-string format, which would crash). Default to
          // PNG — jsPDF's most reliable decoder — for any unknown type.
          const imgFormat =
            data.startsWith("data:image/jpeg") || data.startsWith("data:image/jpg")
              ? "JPEG"
              : "PNG";
          doc.addImage(data, imgFormat, currentX, currentY, thumbSize, thumbSize);
        } catch {
          doc.setFillColor(240, 240, 240);
          doc.setDrawColor(200, 200, 200);
          doc.rect(currentX, currentY, thumbSize, thumbSize, "FD");
        }
      } else {
        doc.setFillColor(240, 240, 240);
        doc.setDrawColor(200, 200, 200);
        doc.rect(currentX, currentY, thumbSize, thumbSize, "FD");
      }
      currentX += thumbSize + spacing;
      if (currentX + thumbSize > pageWidth - margin) {
        currentX = margin;
        currentY += thumbSize + 3;
      }
    }
    if (currentX !== margin) currentY += thumbSize + 3;
    currentY += 3;
  }
  return currentY;
};

/**
 * Compact record card header — date · type (requested visits in red) with the
 * resolved status right-aligned, in the new brand style.
 */
const drawRecordHeader = (doc: jsPDF, record: MaintenanceRecord, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const tableW = pageWidth - margin * 2;

  doc.setFillColor(...BRAND.white);
  doc.setDrawColor(...BRAND.hairline);
  doc.roundedRect(margin, y, tableW, 9, 2, 2, "FD");
  doc.setFillColor(...BRAND.primary);
  doc.rect(margin, y, 2, 9, "F");

  doc.setFont("Amiri", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...(record.type === "requested" ? BRAND.error : BRAND.text));
  pdfText(doc, `${formatDateEn(record.maintenanceDate)} — ${record.type === "requested" ? "Requested ●" : "Scheduled"}`, margin + 4, y + 4.5);

  doc.setFont("Amiri", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...(record.problemSolved ? ([30, 130, 70] as [number, number, number]) : BRAND.textMuted));
  pdfText(doc, record.hadProblem ? (record.problemSolved ? "✓ Resolved" : "✗ Unresolved") : NO_DATA_LABEL, pageWidth - margin - 4, y + 4.5, { align: "right" });

  return y + 11;
};

/**
 * One maintenance visit rendered as its own detail block — the legacy branch
 * report's per-record treatment (machines, issues, parts, services, notes,
 * recommendations) in the new brand style, cost-free, with photos.
 */
const renderClientRecordBlock = (
  doc: jsPDF,
  record: MaintenanceRecord,
  y: number,
  photoCache: Map<string, string>,
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  let ny = checkPageBreak(doc, y, 14);
  ny = drawRecordHeader(doc, record, ny);
  ny = drawVisitDetails(doc, record, ny, false, false);
  if (record.photos && record.photos.length > 0) {
    ny = checkPageBreak(doc, ny, 24);
    ny = drawSectionHeader(doc, "Photos", ny, { icon: "doc" });
    ny = drawPhotosSync(doc, record.photos, ny + 2, pageWidth, margin, photoCache);
    ny += 4;
  }
  ny += 8;
  return ny;
};

const renderClientRecordBlocks = (
  doc: jsPDF,
  records: MaintenanceRecord[],
  y: number,
  photoCache: Map<string, string>,
): number => records.reduce((ny, r) => renderClientRecordBlock(doc, r, ny, photoCache), y);

/**
 * Company client report: one overview section per branch — branch info box,
 * visit summary (scheduled/requested/total), contacts, assigned staff and the
 * branch's own maintenance log. Cost figures omitted (client mode).
 */
const addClientBranchOverview = (
  engine: PDFLayoutEngine,
  branch: Branch,
  index: number,
  pageWidth: number,
  margin: number,
  hideEmpty: boolean,
): void => {
  const branchName = branch.branchName || `Branch ${index + 1}`;
  const branchRecords = flattenMaintenanceRecords(branch.maintenanceHistory);
  const scheduled = branchRecords.filter((r) => r.type === "scheduled").length;
  const requested = branchRecords.filter((r) => r.type === "requested").length;

  engine.addSection(
    `Branch — ${branchName}`,
    (section) => {
      const branchInfo = buildInfoItems(
        [
          { label: "Location:", rawValue: branch.location, ignoreIf: "empty", icon: "location" },
          { label: "Email:", rawValue: branch.email, ignoreIf: "empty", icon: "mail" },
          { label: "Tax No.:", rawValue: branch.taxNumber, ignoreIf: "empty", icon: "doc" },
          { label: "Coffee consumption:", rawValue: branch.coffeeConsumptionKg, ignoreIf: "zero", icon: "coffee", format: (v) => `${formatEnNumber(Number(v))} kg/month` },
          { label: "Maintenance times:", rawValue: branch.allowedMaintenanceTimes, ignoreIf: "empty", icon: "clock" },
        ],
        hideEmpty,
      );
      if (branchInfo.length > 0) {
        section.addBlock({
          estimatedHeight: 40,
          draw: (doc, y) => {
            let sy = checkPageBreak(doc, y, 40);
            sy = drawSectionHeader(doc, "Branch Information", sy, { icon: "home" });
            sy = drawInfoBox(doc, branchInfo, sy, { x: margin, width: pageWidth - margin * 2 });
            return sy + 4;
          },
        });
      }

      if (branchRecords.length > 0) {
        section.addBlock({
          estimatedHeight: 18,
          draw: (doc, y) => {
            const colW = pageWidth - margin * 2;
            const cw = [colW * 0.33, colW * 0.33, colW * 0.34];
            let sy = drawSectionHeader(doc, "Visit Summary", y, { icon: "chart" });
            sy = drawTableHeader(doc, ["Scheduled", "Requested", "Total"], cw, margin, sy, colW);
            sy = drawTableRow(doc, [formatEnNumber(scheduled), formatEnNumber(requested), formatEnNumber(scheduled + requested)], cw, margin, sy, colW, false, ["center", "center", "center"]);
            return sy + 6;
          },
        });
      }

      // D-07: drop contact rows with no name/phone.
      const contactRows = filterEmptyRows(branch.contacts, [
        { accessor: (c) => c.name, ignoreIf: "empty" },
        { accessor: (c) => c.phoneNumbers.map((p) => p.number).join(" / "), ignoreIf: "empty" },
      ]).rows;
      if (contactRows.length > 0) {
        const contacts: ContactInfo[] = contactRows.map((c) => ({
          name: c.name,
          role: c.customPosition || c.position,
          phone: c.phoneNumbers.map((p) => p.number).join(" / ") || NO_DATA_LABEL,
        }));
        section.addBlock({
          estimatedHeight: 40,
          draw: (doc, y) => {
            let sy = checkPageBreak(doc, y, 40);
            sy = drawSectionHeader(doc, "Contacts", sy, { icon: "phone" });
            sy = drawContactCards(doc, contacts, sy, { x: margin, width: pageWidth - margin * 2 });
            return sy + 4;
          },
        });
      }

      if (branch.baristas && branch.baristas.length > 0) {
        section.addBlock({
          estimatedHeight: 20 + branch.baristas.length * 6,
          draw: (doc, y) => {
            const colW = pageWidth - margin * 2;
            const cw = [colW * 0.5, colW * 0.5];
            let sy = drawSectionHeader(doc, "Assigned Staff", y, { icon: "user" });
            sy = drawTableHeader(doc, ["Name", "Phone"], cw, margin, sy, colW);
            branch.baristas.forEach((b, i) => {
              sy = checkPageBreak(doc, sy, 8);
              sy = drawTableRow(doc, [rtl(b.name), b.phone || NO_DATA_LABEL], cw, margin, sy, colW, i % 2 === 1, ["left", "center"]);
            });
            return sy + 6;
          },
        });
      }

      if (branchRecords.length > 0) {
        section.addBlock({
          estimatedHeight: 40 + Math.min(branchRecords.length, 20) * 8,
          draw: (doc, y) => {
            let sy = checkPageBreak(doc, y, 40);
            sy = drawSectionHeader(doc, "Maintenance Log", sy, { icon: "doc" });
            return renderMaintenanceHistoryTable(doc, branchRecords.slice(-20), sy, hideEmpty, true, true);
          },
        });
      }
    },
    (doc, title, y) => drawSectionHeader(doc, title, y, { icon: "home" }),
  );
};

// ═══════════════════════════════════════════
//  TIER 2: Internal Branch Report (Detailed)
// ═══════════════════════════════════════════

export interface InternalReportOptions {
  /** When true (default), empty fields/sections are hidden and content reflows. */
  hideEmptyComponents?: boolean;
  /** Logistics operations from Supabase (for machine logistics sections). */
  logisticsOperations?: LogisticsOperation[];
  /** Date range filter — sets the period label in the header. */
  dateRange?: DateRange;
  /**
   * Cost Report mode: full costs shown like the internal report, but with no
   * payer attribution anywhere (no Company/Client split, no Net Cost, no
   * Client Invoice Total). The grand total is everything added up — parts,
   * services, visit fees and machine rental. Header reads "Maintenance Cost Report".
   */
  costMode?: boolean;
  /**
   * Client Report mode: the SAME layout, colors and style as the cost report
   * (header bar, KPI cards, section headers, logistics table) but every cost
   * figure is removed — no financial summary, no cost KPI card, no cost
   * columns in the maintenance log / technician / parts tables, no logistics
   * cost cards, and logistics costs are hidden. Header reads "Client Report".
   */
  clientMode?: boolean;
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
  const clientMode = options.clientMode ?? false;
  const costMode = (options.costMode ?? false) && !clientMode;
  const logisticsOps = options.logisticsOperations ?? [];

  // Logistics-only visits are tracked in the app but excluded from reports.
  const reportBranch: Branch = {
    ...branch,
    maintenanceHistory: getReportRecords(branch.maintenanceHistory),
  };

  const allFlatRecords = flattenMaintenanceRecords(reportBranch.maintenanceHistory);
  const period = options.dateRange && (options.dateRange.startDate || options.dateRange.endDate)
    ? formatDateRangeLabelEn(options.dateRange)
    : formatPeriod(allFlatRecords);
  const headerSubtitle = clientMode ? "Client Report" : costMode ? "Maintenance Cost Report" : undefined;
  const startY = drawInternalHeader(doc, companyName, branch.branchName || undefined, assets, period, headerSubtitle);

  const engine = new PDFLayoutEngine(doc, startY, { hideEmptyComponents: hideEmpty });

  // Client mode renders each visit as a detail block with photos. The layout
  // engine draws synchronously, so photos are preloaded before flush and the
  // per-record blocks read them from this cache.
  const photoCache = new Map<string, string>();

  const costs = aggregateBranchCosts(reportBranch, partsList, servicesList);
  const logisticsCosts = aggregateLogisticsCosts(logisticsOps);
  const kpis = getOperationalKPIs(reportBranch.maintenanceHistory);
  const zoneBreakdown = getVisitZoneBreakdown(reportBranch.maintenanceHistory);
  const techSummary = getTechnicianSummary(reportBranch.maintenanceHistory);
  const machineSummary = getMachineLeaseSummary(reportBranch.machines, reportBranch.maintenanceHistory);
  const problemFreq = getProblemFrequency(reportBranch.maintenanceHistory);

  // KPI Cards
  engine.addBlock({
    estimatedHeight: 32,
    draw: (doc, y) => {
      const cards = buildKPICards(allFlatRecords, costs, kpis, costMode, logisticsCosts.totalLogisticsCost, clientMode);
      return drawKPICards(doc, cards, y);
    },
  });

  // Two-column layout: finance + sidebar
  engine.addBlock({
    estimatedHeight: 130,
    draw: (doc, y) => {
      const leftColW = pageWidth / 2 - margin - 6;
      const rightColX = pageWidth / 2 + 3;

      // Right column: financial summary (client report has NO costs at all).
      // D-09: the whole Cost Breakdown section vanishes when every category
      // total is 0 — no header, no shell.
      let financeY = y;
      if (!clientMode) {
        const financialCategories = buildFinancialCategories(costs, costMode);
        if (financialCategories.some((c) => c.total > 0)) {
          const financeHeaderY = drawSectionHeader(doc, "Cost Breakdown", y, {
            x: rightColX,
            width: leftColW,
            icon: "money",
          });
          financeY = drawFinancialSummary(
            doc,
            financialCategories,
            costMode ? costs.grandTotal + costs.totalLeaseRevenue : costs.grandTotalCompanyCost,
            costMode ? 0 : costs.totalClientPartsCost + costs.totalClientServicesCost,
            financeHeaderY,
            costMode ? { grandTotalLabel: "Total Cost" } : undefined,
          );
        }
      }

      // Left column: sidebar. The client report drops the cost-bearing
      // sections (zone fees + machine fleet) and uses the full width.
      let sideY = y;
      const contentW = clientMode ? pageWidth - margin * 2 : leftColW;

      // D-07: drop zone rows with 0 visits / 0 total before drawing.
      const zoneRows = filterEmptyRows(zoneBreakdown, [
        { accessor: (z) => z.visits, ignoreIf: "zero" },
        { accessor: (z) => z.total, ignoreIf: "zero" },
      ]).rows;
      if (!clientMode && zoneRows.length > 0) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "Visit Fees by Zone", sideY, { x: margin, width: leftColW, icon: "location" });
        sideY = drawZoneTable(doc, zoneRows as ZoneRow[], costs.totalVisitFees, sideY);
      }

      // D-07: drop machine-fleet rows with no activity (0 days / 0 revenue).
      const fleetRows = filterEmptyRows(machineSummary, [
        { accessor: (m) => m.daysActive, ignoreIf: "zero" },
        { accessor: (m) => m.revenue, ignoreIf: "zero" },
      ]).rows;
      if (!clientMode && fleetRows.length > 0) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "Machine Fleet", sideY, { x: margin, width: leftColW, icon: "coffee" });
        const machines: MachineInfo[] = fleetRows.map((m) => ({
          name: m.name,
          type: m.type === "leased" ? "Lease" : m.type === "consumption" ? "Consumption" : "Purchase",
          dailyRate: m.dailyRate,
          metric: `${formatEnNumber(m.daysActive)} days`,
          total: m.revenue,
          icon: m.type === "leased" ? "coffee" : m.type === "consumption" ? "cog" : "doc",
        }));
        sideY = drawMachineCards(doc, machines, sideY);
      }

      const branchInfo = buildInfoItems(
        [
          { label: "Location:", rawValue: branch.location, ignoreIf: "empty", icon: "location" },
          { label: "Email:", rawValue: branch.email, ignoreIf: "empty", icon: "mail" },
          { label: "Tax No.:", rawValue: branch.taxNumber, ignoreIf: "empty", icon: "doc" },
          { label: "Coffee consumption:", rawValue: branch.coffeeConsumptionKg, ignoreIf: "zero", icon: "coffee", format: (v) => `${formatEnNumber(Number(v))} kg/month` },
          { label: "Maintenance times:", rawValue: branch.allowedMaintenanceTimes, ignoreIf: "empty", icon: "clock" },
        ],
        hideEmpty,
      );

      if (branchInfo.length > 0) {
        sideY = checkPageBreak(doc, sideY, 40);
        sideY = drawSectionHeader(doc, "Branch Information", sideY, { x: margin, width: contentW, icon: "home" });
        sideY = drawInfoBox(doc, branchInfo, sideY, { x: margin, width: contentW });
      }

      // D-07: drop contact rows with no name/phone.
      const contactRows = filterEmptyRows(branch.contacts, [
        { accessor: (c) => c.name, ignoreIf: "empty" },
        { accessor: (c) => c.phoneNumbers.map((p) => p.number).join(" / "), ignoreIf: "empty" },
      ]).rows;
      if (contactRows.length > 0) {
        const contacts: ContactInfo[] = contactRows.map((c) => ({
          name: c.name,
          role: c.customPosition || c.position,
          phone: c.phoneNumbers.map((p) => p.number).join(" / ") || NO_DATA_LABEL,
        }));
        sideY = checkPageBreak(doc, sideY, 40);
        sideY = drawSectionHeader(doc, "Contacts", sideY, { x: margin, width: contentW, icon: "phone" });
        sideY = drawContactCards(doc, contacts, sideY, { x: margin, width: contentW });
      }

      return Math.max(financeY, sideY) + 8;
    },
  });

  // Maintenance History — client mode renders each visit as its own detail
  // block (Machines/Issues/Parts/Services/Notes/Recommendations + photos);
  // internal/cost modes keep the compact wide table.
  engine.addSection(
    "Detailed Maintenance Log",
    (section) => {
      section.addRepeater(
        allFlatRecords,
        clientMode ? 50 + allFlatRecords.length * 40 : 40 + allFlatRecords.length * 8,
        (doc, y, items) => clientMode
          ? renderClientRecordBlocks(doc, items, y, photoCache)
          : renderMaintenanceHistoryTable(doc, items, y, hideEmpty, !costMode, clientMode),
      );
    },
    drawSectionHeader,
  );

  // Technician Performance — 6 columns (5 in client mode: Total Cost dropped)
  engine.addSection(
    "Technician Performance",
    (section) => {
      // D-07: drop technician rows with 0 visits.
      const techRows = filterEmptyRows(techSummary, [
        { accessor: (t) => t.visits, ignoreIf: "zero" },
      ]).rows;
      section.addRepeater(
        techRows,
        40 + techRows.length * 8,
        (doc, y, items) => {
          const tableW = pageWidth - margin * 2;
          const colWidths = clientMode
            ? [tableW * 0.26, tableW * 0.14, tableW * 0.16, tableW * 0.16, tableW * 0.28]
            : [tableW * 0.22, tableW * 0.12, tableW * 0.14, tableW * 0.14, tableW * 0.16, tableW * 0.22];
          const x = margin;

          let nextY = drawTableHeader(doc, clientMode
            ? ["Technician", "Visits", "Avg Rating", "Parts Used", "Zones"]
            : ["Technician", "Visits", "Avg Rating", "Parts Used", "Total Cost", "Zones"], colWidths, x, y, tableW);

          const techMap = new Map<string, { totalCost: number; zones: Record<string, number> }>();
          allFlatRecords.forEach((r) => {
            const name = r.baristaName || "Unknown";
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
              .join(" · ") || NO_DATA_LABEL;
            nextY = checkPageBreak(doc, nextY, 8);
            const cells = clientMode
              ? [rtl(t.name), formatEnNumber(t.visits), t.avgRating > 0 ? `★ ${formatEnNumber(t.avgRating)}/5` : "-", formatEnNumber(t.partsUsed), zonesStr]
              : [rtl(t.name), formatEnNumber(t.visits), t.avgRating > 0 ? `★ ${formatEnNumber(t.avgRating)}/5` : "-", formatEnNumber(t.partsUsed), formatPdfCurrencyEn(extra.totalCost), zonesStr];
            const aligns: Array<"left" | "center" | "right"> = clientMode
              ? ["left", "center", "center", "center", "right"]
              : ["left", "center", "center", "center", "right", "right"];
            nextY = drawTableRow(
              doc,
              cells,
              colWidths, x, nextY, tableW, i % 2 === 1,
              aligns,
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
  // D-07: keep only parts rows with a non-zero count.
  const allParts = filterEmptyRows(
    Array.from(costs.parts.values()).concat(Array.from(costs.clientParts.values())),
    [{ accessor: (p) => p.count, ignoreIf: "zero" }],
  ).rows
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
    "Most Frequent Problems",
    (section) => {
      if (hideEmpty && topProblems.length === 0) {
        // D-04: an empty section vanishes completely — no header, no message.
        return;
      }
      section.addBlock({
        estimatedHeight: 60,
        draw: (doc, y) => {
          const colW = pageWidth - margin * 2;
          const cw = [colW * 0.5, colW * 0.2, colW * 0.3];
          let py = drawTableHeader(doc, ["Problem", "Count", "Last Seen"], cw, margin, y, colW);
          topProblems.forEach((p, i) => {
            py = checkPageBreak(doc, py, 8);
            py = drawTableRow(doc, [rtl(p.name), formatEnNumber(p.count), (problemLastDate.get(p.name) ? formatDateEn(problemLastDate.get(p.name)!) : NO_DATA_LABEL)], cw, margin, py, colW, i % 2 === 1, ["left", "center", "right"]);
          });
          return py + 10;
        },
      });
    },
    drawSectionHeader,
  );

  // Machine Logistics — independent standalone section (costs shown except in
  // client mode, which reuses the cost-free client table in brand colors)
  if (!hideEmpty || logisticsOps.length > 0) {
    engine.addSection(
      "Logistics — Machine Transport & Replacement",
      (section) => {
        // Cost summary block — internal/cost reports only. In compact mode a
        // zero-cost block vanishes (D-09) so no empty placeholder reaches the page.
        if (!clientMode && (!hideEmpty || logisticsCosts.totalLogisticsCost > 0)) {
          section.addBlock({
            estimatedHeight: 35,
            draw: (doc, y) => {
              const cardW = (pageWidth - margin * 2 - 24) / 5;
              const cardH = 22;
              const cards: Array<{ label: string; value: string; color: [number, number, number]; icon: PdfIconName }> = [
                { label: "Machine Rental", value: formatPdfCurrencyEn(logisticsCosts.totalRentalCost), color: BRAND.primary, icon: "calendar" },
                { label: "Transport — Pickup", value: formatPdfCurrencyEn(logisticsCosts.totalPickupCost), color: BRAND.primaryLight, icon: "truck" },
                { label: "Transport — Return", value: formatPdfCurrencyEn(logisticsCosts.totalReturnCost), color: BRAND.info, icon: "truck" },
                { label: "Maintenance Cost", value: formatPdfCurrencyEn(logisticsCosts.totalMaintenanceCost), color: BRAND.warning, icon: "wrench" },
                { label: "Logistics Total", value: formatPdfCurrencyEn(logisticsCosts.totalLogisticsCost), color: BRAND.header, icon: "money" },
              ];
              cards.forEach((card, i) => {
                const cx = margin + i * (cardW + 6);
                doc.setFillColor(...BRAND.white);
                doc.setDrawColor(...BRAND.hairline);
                doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD");
                doc.setFillColor(...card.color);
                doc.rect(cx, y, cardW, 3, "F");
                drawIconBadge(doc, cx + cardW - 7, y + 10, card.icon, card.color, 2.4);
                doc.setFont("Amiri", "bold");
                doc.setFontSize(12);
                doc.setTextColor(...BRAND.text);
                pdfText(doc, card.value, cx + 4, y + 13, { align: "left" });
                doc.setFont("Amiri", "bold");
                doc.setFontSize(7);
                doc.setTextColor(...BRAND.textMuted);
                pdfText(doc, card.label, cx + 4, y + 18, { align: "left" });
              });
              return y + cardH + 8;
            },
          });
        }

        // Operations table — cost-free client table in brand colors for the
        // client report (same columns/sections, no financial figures)
        section.addRepeater(
          logisticsOps,
          45 + logisticsOps.length * 12,
          (doc, y, items) => clientMode
            ? drawClientLogisticsTable(doc, items, y, margin, { includeCosts: false, headerColor: BRAND.primary })
            : drawLogisticsOperationsTable(doc, items, y, margin),
        );
      },
      drawSectionHeader,
    );
  }

  // Most Used Parts — closes the report (requested to be the last section)
  engine.addSection(
    "Most Used Parts",
    (section) => {
      if (hideEmpty && allParts.length === 0) {
        // D-04: an empty section vanishes completely — no header, no message.
        return;
      }
      section.addBlock({
        estimatedHeight: 60,
        draw: (doc, y) => {
          const colW = pageWidth - margin * 2;
          const cw = clientMode ? [colW * 0.6, colW * 0.4] : [colW * 0.5, colW * 0.25, colW * 0.25];
          let py = drawTableHeader(doc, clientMode ? ["Part", "Qty"] : ["Part", "Qty", "Cost"], cw, margin, y, colW);
          allParts.forEach((p, i) => {
            py = checkPageBreak(doc, py, 8);
            py = drawTableRow(doc, clientMode
              ? [rtl(p.name), formatEnNumber(p.count)]
              : [rtl(p.name), formatEnNumber(p.count), formatPdfCurrencyEn(p.totalCost)], cw, margin, py, colW, i % 2 === 1, clientMode ? ["left", "center"] : ["left", "center", "right"]);
          });
          return py + 10;
        },
      });
    },
    drawSectionHeader,
  );

  if (clientMode) {
    const loaded = await preloadPhotoDataUrls(allFlatRecords);
    loaded.forEach((data, url) => photoCache.set(url, data));
  }

  engine.flush();
  applyFooters(doc, "CMR System", companyName);

  return doc;
};

/**
 * Client Report for ONE branch: the same layout, colors and style as the
 * cost report but with every cost figure removed.
 */
export const generateClientBranchReport = async (
  companyName: string,
  branch: Branch,
  options: InternalReportOptions = {},
): Promise<jsPDF> => generateInternalBranchReport(companyName, branch, { ...options, clientMode: true });

/**
 * Cost Report for ONE branch: full costs like the internal report but with no
 * payer attribution — everything is added up (parts + services + visit fees +
 * machine rental).
 */
export const generateCostBranchReport = async (
  companyName: string,
  branch: Branch,
  options: InternalReportOptions = {},
): Promise<jsPDF> => generateInternalBranchReport(companyName, branch, { ...options, costMode: true });

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
  const clientMode = options.clientMode ?? false;
  const costMode = (options.costMode ?? false) && !clientMode;
  const logisticsOps = options.logisticsOperations ?? [];

  // Logistics-only visits are tracked in the app but excluded from reports.
  const reportData: FormData = {
    ...data,
    maintenanceHistory: getReportRecords(data.maintenanceHistory),
    branches: data.branches.map((b) => ({
      ...b,
      maintenanceHistory: getReportRecords(b.maintenanceHistory),
    })),
  };

  const allFlatRecords = flattenMaintenanceRecords(reportData.maintenanceHistory);
  reportData.branches.forEach((b) => allFlatRecords.push(...flattenMaintenanceRecords(b.maintenanceHistory)));
  const period = options.dateRange && (options.dateRange.startDate || options.dateRange.endDate)
    ? formatDateRangeLabelEn(options.dateRange)
    : formatPeriod(allFlatRecords);
  const headerSubtitle = clientMode ? "Client Report" : costMode ? "Maintenance Cost Report" : undefined;
  const startY = drawInternalHeader(doc, data.companyName, undefined, assets, period, headerSubtitle);

  const engine = new PDFLayoutEngine(doc, startY, { hideEmptyComponents: hideEmpty });

  const costs = aggregateCosts(reportData, partsList, servicesList);
  const logisticsCosts = aggregateLogisticsCosts(logisticsOps);
  const kpis = getOperationalKPIs(reportData.maintenanceHistory);
  const zoneBreakdown = getVisitZoneBreakdown(reportData.maintenanceHistory);
  const techSummary = getTechnicianSummary(reportData.maintenanceHistory);
  const machineSummary = getMachineLeaseSummary(reportData.machines, reportData.maintenanceHistory);
  const branchSummaries = getBranchCostSummary(reportData.branches, partsList, servicesList);
  const problemFreq = getProblemFrequency(reportData.maintenanceHistory);

  // Merge branch-level data
  reportData.branches.forEach((branch) => {
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
      const kpiCards = buildKPICards(allFlatRecords, costs, kpis, costMode, logisticsCosts.totalLogisticsCost, clientMode);
      return drawKPICards(doc, kpiCards, y);
    },
  });

  // Two-column layout: finance + sidebar
  engine.addBlock({
    estimatedHeight: 130,
    draw: (doc, y) => {
      const leftColW = pageWidth / 2 - margin - 6;
      const rightColX = pageWidth / 2 + 3;

      let financeY = y;
      if (!clientMode) {
        const financeHeaderY = drawSectionHeader(doc, "Cost Breakdown", y, {
          x: rightColX,
          width: leftColW,
          icon: "money",
        });
        const financialCategories = buildFinancialCategories(costs, costMode);
        financeY = drawFinancialSummary(
          doc,
          financialCategories,
          costMode ? costs.grandTotal + costs.totalLeaseRevenue : costs.grandTotalCompanyCost,
          costMode ? 0 : costs.totalClientPartsCost + costs.totalClientServicesCost,
          financeHeaderY,
          costMode ? { grandTotalLabel: "Total Cost" } : undefined,
        );
      }

      let sideY = y;
      const contentW = clientMode ? pageWidth - margin * 2 : leftColW;

      // D-07: drop zone rows with 0 visits / 0 total before drawing.
      const zoneRows = filterEmptyRows(zoneBreakdown, [
        { accessor: (z) => z.visits, ignoreIf: "zero" },
        { accessor: (z) => z.total, ignoreIf: "zero" },
      ]).rows;
      if (!clientMode && zoneRows.length > 0) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "Visit Fees by Zone", sideY, { x: margin, width: leftColW, icon: "location" });
        sideY = drawZoneTable(doc, zoneRows as ZoneRow[], costs.totalVisitFees, sideY);
      }

      // D-07: drop machine-fleet rows with no activity (0 days / 0 revenue).
      const fleetRows = filterEmptyRows(machineSummary, [
        { accessor: (m) => m.daysActive, ignoreIf: "zero" },
        { accessor: (m) => m.revenue, ignoreIf: "zero" },
      ]).rows;
      if (!clientMode && fleetRows.length > 0) {
        sideY = checkPageBreak(doc, sideY, 35);
        sideY = drawSectionHeader(doc, "Machine Fleet", sideY, { x: margin, width: leftColW, icon: "coffee" });
        const machines: MachineInfo[] = fleetRows.map((m) => ({
          name: m.name,
          type: m.type === "leased" ? "Lease" : m.type === "consumption" ? "Consumption" : "Purchase",
          dailyRate: m.dailyRate,
          metric: `${formatEnNumber(m.daysActive)} days`,
          total: m.revenue,
          icon: m.type === "leased" ? "coffee" : m.type === "consumption" ? "cog" : "doc",
        }));
        sideY = drawMachineCards(doc, machines, sideY);
      }

      const companyInfo = buildInfoItems(
        [
          { label: "Location:", rawValue: data.location, ignoreIf: "empty", icon: "location" },
          { label: "Email:", rawValue: data.email, ignoreIf: "empty", icon: "mail" },
          { label: "Tax No.:", rawValue: data.taxNumber, ignoreIf: "empty", icon: "doc" },
          { label: "Coffee consumption:", rawValue: data.coffeeConsumptionKg, ignoreIf: "zero", icon: "coffee", format: (v) => `${formatEnNumber(Number(v))} kg/month` },
          { label: "Maintenance times:", rawValue: data.allowedMaintenanceTimes, ignoreIf: "empty", icon: "clock" },
        ],
        hideEmpty,
      );

      if (companyInfo.length > 0) {
        sideY = checkPageBreak(doc, sideY, 40);
        sideY = drawSectionHeader(doc, "Company Information", sideY, { x: margin, width: contentW, icon: "home" });
        sideY = drawInfoBox(doc, companyInfo, sideY, { x: margin, width: contentW });
      }

      return Math.max(financeY, sideY) + 8;
    },
  });

  // Branch Cost Comparison — costs only, so it is omitted entirely for clients
  const branchCostMap = new Map<string, number>();
  reportData.branches.forEach((b) => {
    const c = aggregateBranchCosts(b, partsList, servicesList);
    branchCostMap.set(b.branchName || "Branch", c.grandTotal + c.totalLeaseRevenue);
  });

  if (clientMode) {
    // Client company report: an overview of every branch — what was done at
    // each (info box, visit summary, contacts, staff, and its own maintenance
    // log), in the new brand style and cost-free.
    reportData.branches.forEach((branch, bi) => {
      addClientBranchOverview(engine, branch, bi, pageWidth, margin, hideEmpty);
    });
  } else {
    engine.addSection(
      "Branch Comparison",
      (section) => {
        section.addRepeater(
          branchSummaries,
          40 + branchSummaries.length * 8,
          (doc, y, items) => {
            const tableW = pageWidth - margin * 2;
            const colWidths = [tableW * 0.22, tableW * 0.13, tableW * 0.15, tableW * 0.15, tableW * 0.15, tableW * 0.2];
            const x = margin;

            let nextY = drawTableHeader(doc, ["Branch", "Visits", "Visit Fees", "Parts", "Services", costMode ? "Total Cost" : "Net Cost"], colWidths, x, y, tableW);

            items.forEach((bs, i) => {
              nextY = checkPageBreak(doc, nextY, 8);
              nextY = drawTableRow(
                doc,
                [rtl(bs.branchName), formatEnNumber(bs.visitCount), formatPdfCurrencyEn(bs.visitFees), formatPdfCurrencyEn(bs.partsCost), formatPdfCurrencyEn(bs.servicesCost), formatPdfCurrencyEn(costMode ? (branchCostMap.get(bs.branchName) ?? bs.netCost) : bs.netCost)],
                colWidths, x, nextY, tableW, i % 2 === 1,
                ["left", "center", "right", "right", "right", "right"],
              );
            });

            return nextY + 10;
          },
        );
      },
      drawSectionHeader,
    );
  }

  // Technician Performance — 6 columns (5 in client mode: Total Cost dropped)
  engine.addSection(
    "Technician Performance",
    (section) => {
      // D-07: drop technician rows with 0 visits.
      const techRows = filterEmptyRows(techSummary, [
        { accessor: (t) => t.visits, ignoreIf: "zero" },
      ]).rows;
      section.addRepeater(
        techRows,
        40 + techRows.length * 8,
        (doc, y, items) => {
          const tableW = pageWidth - margin * 2;
          const colWidths = clientMode
            ? [tableW * 0.26, tableW * 0.14, tableW * 0.16, tableW * 0.16, tableW * 0.28]
            : [tableW * 0.22, tableW * 0.12, tableW * 0.14, tableW * 0.14, tableW * 0.16, tableW * 0.22];
          const x = margin;

          let nextY = drawTableHeader(doc, clientMode
            ? ["Technician", "Visits", "Avg Rating", "Parts Used", "Zones"]
            : ["Technician", "Visits", "Avg Rating", "Parts Used", "Total Cost", "Zones"], colWidths, x, y, tableW);

          const techMap = new Map<string, { totalCost: number; zones: Record<string, number> }>();
          allFlatRecords.forEach((r) => {
            const name = r.baristaName || "Unknown";
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
              .join(" · ") || NO_DATA_LABEL;
            nextY = checkPageBreak(doc, nextY, 8);
            const cells = clientMode
              ? [rtl(t.name), formatEnNumber(t.visits), t.avgRating > 0 ? `★ ${formatEnNumber(t.avgRating)}/5` : "-", formatEnNumber(t.partsUsed), zonesStr]
              : [rtl(t.name), formatEnNumber(t.visits), t.avgRating > 0 ? `★ ${formatEnNumber(t.avgRating)}/5` : "-", formatEnNumber(t.partsUsed), formatPdfCurrencyEn(extra.totalCost), zonesStr];
            const aligns: Array<"left" | "center" | "right"> = clientMode
              ? ["left", "center", "center", "center", "right"]
              : ["left", "center", "center", "center", "right", "right"];
            nextY = drawTableRow(
              doc,
              cells,
              colWidths, x, nextY, tableW, i % 2 === 1,
              aligns,
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
  // D-07: keep only parts rows with a non-zero count.
  const allParts = filterEmptyRows(
    Array.from(costs.parts.values()).concat(Array.from(costs.clientParts.values())),
    [{ accessor: (p) => p.count, ignoreIf: "zero" }],
  ).rows
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
    "Most Frequent Problems",
    (section) => {
      if (hideEmpty && topProblems.length === 0) {
        // D-04: an empty section vanishes completely — no header, no message.
        return;
      }
      section.addBlock({
        estimatedHeight: 60,
        draw: (doc, y) => {
          const colW = pageWidth - margin * 2;
          const cw = [colW * 0.5, colW * 0.2, colW * 0.3];
          let py = drawTableHeader(doc, ["Problem", "Count", "Last Seen"], cw, margin, y, colW);
          topProblems.forEach((p, i) => {
            py = checkPageBreak(doc, py, 8);
            py = drawTableRow(doc, [rtl(p.name), formatEnNumber(p.count), (problemLastDate.get(p.name) ? formatDateEn(problemLastDate.get(p.name)!) : NO_DATA_LABEL)], cw, margin, py, colW, i % 2 === 1, ["left", "center", "right"]);
          });
          return py + 10;
        },
      });
    },
    drawSectionHeader,
  );

  // Maintenance History — in client mode each branch carries its own log inside
  // its overview section above, so the flat cross-branch log is skipped there
  // (branch-less companies keep it as the main-office log).
  if (!(clientMode && reportData.branches.length > 0)) {
    engine.addSection(
      "Maintenance Log",
      (section) => {
        section.addRepeater(
          allFlatRecords,
          40 + Math.min(allFlatRecords.length, 20) * 8,
          (doc, y, items) => {
            const recentRecords = items.slice(-20);
            return renderMaintenanceHistoryTable(doc, recentRecords, y, hideEmpty, !costMode, clientMode);
          },
        );
      },
      drawSectionHeader,
    );
  }

  // Machine Logistics — independent standalone section (costs shown except in
  // client mode, which reuses the cost-free client table in brand colors)
  if (!hideEmpty || logisticsOps.length > 0) {
    engine.addSection(
      "Logistics — Machine Transport & Replacement",
      (section) => {
        // Cost summary block — internal/cost reports only. In compact mode a
        // zero-cost block vanishes (D-09) so no empty placeholder reaches the page.
        if (!clientMode && (!hideEmpty || logisticsCosts.totalLogisticsCost > 0)) {
          section.addBlock({
            estimatedHeight: 35,
            draw: (doc, y) => {
              const cardW = (pageWidth - margin * 2 - 24) / 5;
              const cardH = 22;
              const cards: Array<{ label: string; value: string; color: [number, number, number]; icon: PdfIconName }> = [
                { label: "Machine Rental", value: formatPdfCurrencyEn(logisticsCosts.totalRentalCost), color: BRAND.primary, icon: "calendar" },
                { label: "Transport — Pickup", value: formatPdfCurrencyEn(logisticsCosts.totalPickupCost), color: BRAND.primaryLight, icon: "truck" },
                { label: "Transport — Return", value: formatPdfCurrencyEn(logisticsCosts.totalReturnCost), color: BRAND.info, icon: "truck" },
                { label: "Maintenance Cost", value: formatPdfCurrencyEn(logisticsCosts.totalMaintenanceCost), color: BRAND.warning, icon: "wrench" },
                { label: "Logistics Total", value: formatPdfCurrencyEn(logisticsCosts.totalLogisticsCost), color: BRAND.header, icon: "money" },
              ];
              cards.forEach((card, i) => {
                const cx = margin + i * (cardW + 6);
                doc.setFillColor(...BRAND.white);
                doc.setDrawColor(...BRAND.hairline);
                doc.roundedRect(cx, y, cardW, cardH, 2, 2, "FD");
                doc.setFillColor(...card.color);
                doc.rect(cx, y, cardW, 3, "F");
                drawIconBadge(doc, cx + cardW - 7, y + 10, card.icon, card.color, 2.4);
                doc.setFont("Amiri", "bold");
                doc.setFontSize(12);
                doc.setTextColor(...BRAND.text);
                pdfText(doc, card.value, cx + 4, y + 13, { align: "left" });
                doc.setFont("Amiri", "bold");
                doc.setFontSize(7);
                doc.setTextColor(...BRAND.textMuted);
                pdfText(doc, card.label, cx + 4, y + 18, { align: "left" });
              });
              return y + cardH + 8;
            },
          });
        }

        // Operations table — cost-free client table in brand colors for the
        // client report (same columns/sections, no financial figures)
        section.addRepeater(
          logisticsOps,
          45 + logisticsOps.length * 12,
          (doc, y, items) => clientMode
            ? drawClientLogisticsTable(doc, items, y, margin, { includeCosts: false, headerColor: BRAND.primary })
            : drawLogisticsOperationsTable(doc, items, y, margin),
        );
      },
      drawSectionHeader,
    );
  }

  // Most Used Parts — closes the report (requested to be the last section)
  engine.addSection(
    "Most Used Parts",
    (section) => {
      if (hideEmpty && allParts.length === 0) {
        // D-04: an empty section vanishes completely — no header, no message.
        return;
      }
      section.addBlock({
        estimatedHeight: 60,
        draw: (doc, y) => {
          const colW = pageWidth - margin * 2;
          const cw = clientMode ? [colW * 0.6, colW * 0.4] : [colW * 0.5, colW * 0.25, colW * 0.25];
          let py = drawTableHeader(doc, clientMode ? ["Part", "Qty"] : ["Part", "Qty", "Cost"], cw, margin, y, colW);
          allParts.forEach((p, i) => {
            py = checkPageBreak(doc, py, 8);
            py = drawTableRow(doc, clientMode
              ? [rtl(p.name), formatEnNumber(p.count)]
              : [rtl(p.name), formatEnNumber(p.count), formatPdfCurrencyEn(p.totalCost)], cw, margin, py, colW, i % 2 === 1, clientMode ? ["left", "center"] : ["left", "center", "right"]);
          });
          return py + 10;
        },
      });
    },
    drawSectionHeader,
  );

  engine.flush();
  applyFooters(doc, "CMR System", data.companyName);

  return doc;
};

/**
 * Client Report for the whole company: the same layout, colors and style as
 * the cost report but with every cost figure removed.
 */
export const generateClientCompanyReport = async (
  data: FormData & { created_at?: string },
  options: InternalReportOptions = {},
): Promise<jsPDF> => generateInternalCompanyReport(data, { ...options, clientMode: true });

/**
 * Cost Report for the whole company: full costs like the internal report but
 * with no payer attribution — everything is added up (parts + services +
 * visit fees + machine rental).
 */
export const generateCostCompanyReport = async (
  data: FormData & { created_at?: string },
  options: InternalReportOptions = {},
): Promise<jsPDF> => generateInternalCompanyReport(data, { ...options, costMode: true });

// ═══════════════════════════════════════════
//  TIER 4: Per-Visit Report (Internal & Client)
// ═══════════════════════════════════════════

export interface VisitReportEntity {
  /** Branch name for the report header (branch visits). */
  branchName?: string;
  location?: string;
  email?: string;
  taxNumber?: string;
}

export interface VisitReportOptions {
  // Per-visit reports always hide empty sections (sections are drawn only
  // when the record has data), so no options are currently needed.
}

/**
 * Itemized cost categories for ONE maintenance visit. In costMode there is no
 * payer attribution — parts and services are merged into single buckets.
 */
const buildVisitCategories = (record: MaintenanceRecord, costMode = false): FinancialCategory[] => {
  const categories: FinancialCategory[] = [];
  const parts = record.partsReplaced || [];
  const services = record.servicesPerformed || [];

  if (costMode) {
    if (parts.length > 0) {
      categories.push({
        title: "Parts",
        total: parts.reduce((s, p) => s + (p.count || 0) * resolvePartCost(p, partsList), 0),
        lines: parts.map((p) => ({
          name: p.name,
          detail: `${formatEnNumber(p.count || 0)} × ${formatPdfCurrencyEn(resolvePartCost(p, partsList))}`,
          total: (p.count || 0) * resolvePartCost(p, partsList),
        })),
      });
    }
    if (services.length > 0) {
      categories.push({
        title: "Services",
        total: services.reduce((s, sv) => s + (sv.count || 0) * resolveServiceCost(sv, servicesList), 0),
        lines: services.map((sv) => ({
          name: sv.name,
          detail: `${formatEnNumber(sv.count || 0)} × ${formatPdfCurrencyEn(resolveServiceCost(sv, servicesList))}`,
          total: (sv.count || 0) * resolveServiceCost(sv, servicesList),
        })),
      });
    }
  } else {
    const companyParts = parts.filter((p) => !p.paidByClient);
    const clientParts = parts.filter((p) => p.paidByClient);
    const companyServices = services.filter((s) => !s.paidByClient);
    const clientServices = services.filter((s) => s.paidByClient);

    if (companyParts.length > 0) {
      categories.push({
        title: "Parts — Company Paid",
        total: companyParts.reduce((s, p) => s + (p.count || 0) * resolvePartCost(p, partsList), 0),
        lines: companyParts.map((p) => ({
          name: p.name,
          detail: `${formatEnNumber(p.count || 0)} × ${formatPdfCurrencyEn(resolvePartCost(p, partsList))}`,
          total: (p.count || 0) * resolvePartCost(p, partsList),
        })),
      });
    }

    if (clientParts.length > 0) {
      categories.push({
        title: "Parts — Client Paid",
        total: clientParts.reduce((s, p) => s + (p.count || 0) * resolvePartCost(p, partsList), 0),
        lines: clientParts.map((p) => ({
          name: p.name,
          detail: `${formatEnNumber(p.count || 0)} × ${formatPdfCurrencyEn(resolvePartCost(p, partsList))}`,
          total: (p.count || 0) * resolvePartCost(p, partsList),
        })),
      });
    }

    if (companyServices.length > 0) {
      categories.push({
        title: "Services — Company Paid",
        total: companyServices.reduce((s, sv) => s + (sv.count || 0) * resolveServiceCost(sv, servicesList), 0),
        lines: companyServices.map((sv) => ({
          name: sv.name,
          detail: `${formatEnNumber(sv.count || 0)} × ${formatPdfCurrencyEn(resolveServiceCost(sv, servicesList))}`,
          total: (sv.count || 0) * resolveServiceCost(sv, servicesList),
        })),
      });
    }

    if (clientServices.length > 0) {
      categories.push({
        title: "Services — Client Paid",
        total: clientServices.reduce((s, sv) => s + (sv.count || 0) * resolveServiceCost(sv, servicesList), 0),
        lines: clientServices.map((sv) => ({
          name: sv.name,
          detail: `${formatEnNumber(sv.count || 0)} × ${formatPdfCurrencyEn(resolveServiceCost(sv, servicesList))}`,
          total: (sv.count || 0) * resolveServiceCost(sv, servicesList),
        })),
      });
    }
  }

  const lease = record.dailyLeaseCost || 0;
  if (lease > 0) {
    categories.push({
      title: "Daily Lease",
      total: lease,
      lines: [{ name: "Daily lease cost", total: lease }],
    });
  }

  const visitFee = getVisitZoneFee(record.visitZone);
  if (visitFee > 0) {
    categories.push({
      title: "Visit Fee",
      total: visitFee,
      lines: [{ name: "Visit fee", total: visitFee }],
    });
  }

  return categories;
};

/** Draw all details of one visit record (summary, machines, issues, work, costs). */
const drawVisitDetails = (
  doc: jsPDF,
  record: MaintenanceRecord,
  y: number,
  includeCosts: boolean,
  costMode = false,
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const tableW = pageWidth - margin * 2;

  // Visit summary info box (full width, icon per field). "Resolved" only
  // appears when the visit actually had a problem (mirrors the record UI).
  const infoItems: InfoItem[] = [
    { label: "Date:", value: formatDateEn(record.maintenanceDate), icon: "calendar" },
    { label: "Type:", value: record.type === "requested" ? "Requested" : "Scheduled", icon: "doc" },
    { label: "Technician:", value: rtl(record.baristaName) || NO_DATA_LABEL, icon: "user" },
    { label: "Zone:", value: rtl(record.visitZone) || NO_DATA_LABEL, icon: "location" },
  ];
  if (!costMode) {
    infoItems.push({ label: "Paid by:", value: getPaidByLabel(record.paidBy), icon: "money" });
  }
  infoItems.push(
    { label: "Rating:", value: record.visitRating ? `★ ${formatEnNumber(record.visitRating)}/5` : NO_DATA_LABEL, icon: "star" },
    { label: "Next visit:", value: record.nextVisitDate ? formatDateEn(record.nextVisitDate) : NO_DATA_LABEL, icon: "clock" },
  );
  if (record.hadProblem) {
    infoItems.push({
      label: "Resolved:",
      value: record.problemSolved ? "Yes" : "No",
      icon: record.problemSolved ? "check" : "cross",
    });
  }
  y = drawSectionHeader(doc, "Visit Summary", y, { icon: "calendar" });
  y = drawInfoBox(doc, infoItems, y, { x: margin, width: tableW });
  y += 2;

  // Machines
  if (record.machines && record.machines.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "Machines", y, { icon: "coffee" });
    const colW = [tableW * 0.7, tableW * 0.3];
    y = drawTableHeader(doc, ["Machine", "Qty"], colW, margin, y, tableW);
    record.machines.forEach((m, i) => {
      y = checkPageBreak(doc, y, 8);
      y = drawTableRow(doc, [rtl(m.name), formatEnNumber(m.count || 1)], colW, margin, y, tableW, i % 2 === 1, ["left", "center"]);
    });
    y += 4;
  }

  // Issues
  if (record.problems && record.problems.length > 0) {
    y = checkPageBreak(doc, y, 24);
    y = drawSectionHeader(doc, "Issues", y, { icon: "alert" });
    record.problems.forEach((p) => {
      const lines = doc.splitTextToSize(`• ${rtl(p)}`, tableW - 6);
      lines.forEach((ln) => {
        y = checkPageBreak(doc, y, 5);
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...BRAND.text);
        pdfText(doc, ln, margin + 2, y + 1);
        y += 3.4;
      });
    });
    y += 2;
  }

  // Parts replaced
  const parts = record.partsReplaced || [];
  if (parts.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "Parts Replaced", y, { icon: "package" });
    const headers = includeCosts ? ["Part", "Qty", "Unit Cost", "Total"] : ["Part", "Qty"];
    const colW = includeCosts ? [tableW * 0.45, tableW * 0.1, tableW * 0.2, tableW * 0.25] : [tableW * 0.8, tableW * 0.2];
    y = drawTableHeader(doc, headers, colW, margin, y, tableW);
    parts.forEach((p, i) => {
      const qty = p.count || 0;
      const unit = resolvePartCost(p, partsList);
      const cells = includeCosts
        ? [rtl(p.name), formatEnNumber(qty), formatPdfCurrencyEn(unit), formatPdfCurrencyEn(qty * unit)]
        : [rtl(p.name), formatEnNumber(qty)];
      y = checkPageBreak(doc, y, 8);
      y = drawTableRow(doc, cells, colW, margin, y, tableW, i % 2 === 1, ["left", "center", "right", "right"]);
    });
    y += 4;
  }

  // Services performed
  const services = record.servicesPerformed || [];
  if (services.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "Services Performed", y, { icon: "wrench" });
    const headers = includeCosts ? ["Service", "Qty", "Unit Cost", "Total"] : ["Service", "Qty"];
    const colW = includeCosts ? [tableW * 0.45, tableW * 0.1, tableW * 0.2, tableW * 0.25] : [tableW * 0.8, tableW * 0.2];
    y = drawTableHeader(doc, headers, colW, margin, y, tableW);
    services.forEach((sv, i) => {
      const qty = sv.count || 0;
      const unit = resolveServiceCost(sv, servicesList);
      const cells = includeCosts
        ? [rtl(sv.name), formatEnNumber(qty), formatPdfCurrencyEn(unit), formatPdfCurrencyEn(qty * unit)]
        : [rtl(sv.name), formatEnNumber(qty)];
      y = checkPageBreak(doc, y, 8);
      y = drawTableRow(doc, cells, colW, margin, y, tableW, i % 2 === 1, ["left", "center", "right", "right"]);
    });
    y += 4;
  }

  // Cost breakdown (cost reports only)
  if (includeCosts) {
    const categories = buildVisitCategories(record, costMode);
    if (categories.length > 0) {
      y = checkPageBreak(doc, y, 60);
      y = drawSectionHeader(doc, "Cost Breakdown", y, { icon: "money" });
      if (costMode) {
        // Cost Report: everything added up, no payer split.
        const total = categories.reduce((s, c) => s + c.total, 0);
        y = drawFinancialSummary(doc, categories, total, 0, y, {
          x: margin,
          width: tableW,
          grandTotalLabel: "Total Cost",
        });
      } else {
        const companyTotal = categories
          .filter((c) => !c.title.includes("Client"))
          .reduce((s, c) => s + c.total, 0) - (record.dailyLeaseCost || 0);
        const clientTotal = categories
          .filter((c) => c.title.includes("Client"))
          .reduce((s, c) => s + c.total, 0);
        y = drawFinancialSummary(doc, categories, companyTotal, clientTotal, y, { x: margin, width: tableW });
      }
      y += 4;
    }
  }

  // Recommendations
  if (record.recommendations) {
    y = checkPageBreak(doc, y, 20);
    y = drawSectionHeader(doc, "Recommendations", y, { icon: "star" });
    const lines = doc.splitTextToSize(rtl(record.recommendations), tableW - 4);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.textSecondary);
    lines.forEach((ln) => {
      pdfText(doc, ln, margin + 2, y + 1);
      y += 3.4;
    });
    y += 2;
  }

  // Notes
  if (record.notes) {
    y = checkPageBreak(doc, y, 20);
    y = drawSectionHeader(doc, "Notes", y, { icon: "doc" });
    const lines = doc.splitTextToSize(rtl(record.notes), tableW - 4);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.textSecondary);
    lines.forEach((ln) => {
      pdfText(doc, ln, margin + 2, y + 1);
      y += 3.4;
    });
    y += 2;
  }

  // Supervisors
  if (record.supervisors && record.supervisors.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "Supervisors", y, { icon: "user" });
    const contacts: ContactInfo[] = record.supervisors.map((s) => ({
      name: s.name,
      role: "Supervisor",
      phone: s.phone || NO_DATA_LABEL,
    }));
    y = drawContactCards(doc, contacts, y);
    y += 4;
  }

  return y;
};

/**
 * Generate a PDF for ONE maintenance visit. mode "internal" shows full costs
 * with payer attribution, "client" hides all costs, and "cost" shows full
 * costs with no payer split. Includes the visit summary, machines, issues,
 * parts/services with per-item costs (internal/cost), a cost breakdown
 * (internal/cost), notes, supervisors, follow-up visits and photos.
 */
const generateVisitReport = async (
  companyName: string,
  entity: VisitReportEntity,
  record: MaintenanceRecord,
  mode: "internal" | "client" | "cost",
  options: VisitReportOptions = {},
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const tableW = pageWidth - margin * 2;
  const assets = await loadFonts(doc);
  const includeCosts = mode !== "client";
  const costMode = mode === "cost";
  const period = formatDateEn(record.maintenanceDate);
  let y = drawInternalHeader(doc, companyName, entity.branchName, assets, period, costMode ? "Maintenance Cost Report" : undefined);

  y = drawVisitDetails(doc, record, y, includeCosts, costMode);

  // Follow-up visits (compact)
  const followUps = record.followUpVisits || [];
  if (followUps.length > 0) {
    y = checkPageBreak(doc, y, 30);
    y = drawSectionHeader(doc, "Follow-up Visits", y, { icon: "check" });
    for (const fu of followUps) {
      y = checkPageBreak(doc, y, 22);
      doc.setDrawColor(...BRAND.hairline);
      doc.line(margin, y, pageWidth - margin, y);
      y += 4;
      const fuType = fu.type === "requested" ? "Requested" : "Scheduled";
      doc.setFont("Amiri", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.text);
      pdfText(doc, `${formatDateEn(fu.maintenanceDate)} — ${fuType}`, margin + 2, y);
      if (fu.baristaName) {
        doc.setFont("Amiri", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...BRAND.textMuted);
        // pdfText reshapes embedded Arabic internally — pass the raw name.
        pdfText(doc, `Technician: ${fu.baristaName}`, pageWidth - margin - 2, y, { align: "right" });
      }
      y += 4;
      // Each work item on its own row so the reader can scan every issue,
      // part and service as a separate line instead of one comma-run.
      const summary: string[] = [];
      if (fu.problems && fu.problems.length > 0) {
        summary.push("Issues:");
        fu.problems.forEach((p) => summary.push(`  • ${rtl(p)}`));
      }
      if (fu.partsReplaced && fu.partsReplaced.length > 0) {
        summary.push("Parts:");
        fu.partsReplaced.forEach((p) => summary.push(`  • ${formatEnNumber(p.count || 1)}× ${rtl(p.name)}`));
      }
      if (fu.servicesPerformed && fu.servicesPerformed.length > 0) {
        summary.push("Services:");
        fu.servicesPerformed.forEach((s) => summary.push(`  • ${formatEnNumber(s.count || 1)}× ${rtl(s.name)}`));
      }
      const summaryText = summary.join("\n") || NO_DATA_LABEL;
      const lines = doc.splitTextToSize(summaryText, tableW - 4);
      doc.setFont("Amiri", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...BRAND.textSecondary);
      lines.forEach((ln) => {
        y = checkPageBreak(doc, y, 5);
        pdfText(doc, ln, margin + 4, y);
        y += 3.2;
      });
      y += 3;
    }
  }

  // Photos
  if (record.photos && record.photos.length > 0) {
    y = checkPageBreak(doc, y, 24);
    y = drawSectionHeader(doc, "Photos", y, { icon: "doc" });
    y = await renderPhotosInPDF(doc, record.photos, y + 2, pageWidth, margin);
    y += 4;
  }

  applyFooters(doc, "CMR System", companyName);
  return doc;
};

export const generateInternalVisitReport = async (
  companyName: string,
  entity: VisitReportEntity,
  record: MaintenanceRecord,
  options: VisitReportOptions = {},
): Promise<jsPDF> => generateVisitReport(companyName, entity, record, "internal", options);

export const generateClientVisitReport = async (
  companyName: string,
  entity: VisitReportEntity,
  record: MaintenanceRecord,
  options: VisitReportOptions = {},
): Promise<jsPDF> => generateVisitReport(companyName, entity, record, "client", options);

export const generateCostVisitReport = async (
  companyName: string,
  entity: VisitReportEntity,
  record: MaintenanceRecord,
  options: VisitReportOptions = {},
): Promise<jsPDF> => generateVisitReport(companyName, entity, record, "cost", options);

// ═══════════════════════════════════════════
//  TIER 5: Bulk Export (selected records)
// ═══════════════════════════════════════════

export interface BatchExportItem {
  record: MaintenanceRecord;
  companyId: number | string;
  companyName: string;
  branchId: number;
  branchName: string;
}

export interface BatchReportOptions {
  /** client (no costs) | cost (all costs, no payer split) | internal (costs + payer). */
  mode: "client" | "cost" | "internal";
  /** Group the detail blocks under one section per company → branch. */
  grouped?: boolean;
  /** Include a summary table of every selected record on the cover page. */
  includeSummaryTable?: boolean;
  /** Human-readable description of how the records were selected (cover line). */
  filterDescription?: string;
  /** Cover-page title. Defaults to "Bulk Export". */
  batchTitle?: string;
}

/**
 * Bulk export of a user-selected set of records. Reuses the exact building
 * blocks of the other reports: branded header, KPI-free cover summary, an
 * optional summary table, then per-record detail blocks (cost-free in client
 * mode with photos; full costs in cost/internal modes via drawVisitDetails).
 */
export const generateBatchReport = async (
  items: BatchExportItem[],
  options: BatchReportOptions = { mode: "internal" },
): Promise<jsPDF> => {
  const doc = new jsPDF();
  const assets = await loadFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 10;
  const hideEmpty = true;
  const clientMode = options.mode === "client";
  const costMode = options.mode === "cost";

  const records = items.map((i) => i.record);
  const period = formatPeriod(records);
  const batchTitle = options.batchTitle || "Bulk Export";
  const headerSubtitle = clientMode ? "Client Report" : costMode ? "Maintenance Cost Report" : undefined;
  const startY = drawInternalHeader(doc, batchTitle, undefined, assets, period, headerSubtitle);

  const engine = new PDFLayoutEngine(doc, startY, { hideEmptyComponents: hideEmpty });

  const companyCount = new Set(items.map((i) => i.companyName)).size;
  const branchCount = new Set(items.map((i) => `${i.companyId}-${i.branchId}`)).size;
  const totalCost = records.reduce(
    (sum, r) => sum + getRecordCostSummary(r, partsList, servicesList).total,
    0,
  );

  // ── Cover summary (the batch's "what you exported" sheet) ──
  engine.addSection(
    "Batch Summary",
    (section) => {
      section.addBlock({
        estimatedHeight: 50,
        draw: (doc, y) => {
          const infoItems: InfoItem[] = [
            { label: "Records:", value: formatEnNumber(records.length), icon: "doc" },
            { label: "Companies:", value: formatEnNumber(companyCount), icon: "home" },
            { label: "Branches:", value: formatEnNumber(branchCount), icon: "location" },
            { label: "Period:", value: period, icon: "calendar" },
            ...(options.filterDescription
              ? [{ label: "Selection:", value: options.filterDescription, icon: "check" as PdfIconName }]
              : []),
          ];
          if (!clientMode && totalCost > 0) {
            infoItems.push({
              label: costMode ? "Total Cost:" : "Net Cost:",
              value: formatPdfCurrencyEn(totalCost),
              icon: "money",
            });
          }
          let sy = checkPageBreak(doc, y, 40);
          sy = drawSectionHeader(doc, "Batch Summary", sy, { icon: "chart" });
          sy = drawInfoBox(doc, infoItems, sy, { x: margin, width: pageWidth - margin * 2 });
          return sy + 4;
        },
      });
    },
    drawSectionHeader,
  );

  // ── Optional summary table (every selected record at a glance) ──
  if (options.includeSummaryTable) {
    engine.addSection(
      "Records Summary",
      (section) => {
        section.addBlock({
          estimatedHeight: 20 + items.length * 8,
          draw: (doc, y) => {
            const colW = pageWidth - margin * 2;
            const cols = clientMode
              ? ["Date", "Company", "Branch", "Technician", "Type", "Status"]
              : ["Date", "Company", "Branch", "Technician", "Type", "Status", "Cost"];
            const colWidths = clientMode
              ? [colW * 0.13, colW * 0.2, colW * 0.17, colW * 0.16, colW * 0.11, colW * 0.13]
              : [colW * 0.11, colW * 0.18, colW * 0.15, colW * 0.13, colW * 0.1, colW * 0.13, colW * 0.12];
            const aligns: Array<"left" | "center" | "right"> = clientMode
              ? ["left", "left", "left", "left", "center", "center"]
              : ["left", "left", "left", "left", "center", "center", "right"];
            let nextY = drawTableHeader(doc, cols, colWidths, margin, y, colW);
            items.forEach((it, i) => {
              const r = it.record;
              const status = r.hadProblem
                ? r.problemSolved ? "Resolved" : "Unresolved"
                : "Routine";
              const baseCells = [
                formatDateEn(r.maintenanceDate),
                rtl(it.companyName),
                rtl(it.branchName),
                rtl(r.baristaName) || NO_DATA_LABEL,
                getTypeLabel(r.type),
                status,
              ];
              const cells = clientMode
                ? baseCells
                : [...baseCells, formatPdfCurrencyEn(getRecordCostSummary(r, partsList, servicesList).total)];
              nextY = checkPageBreak(doc, nextY, 8);
              nextY = drawTableRow(doc, cells, colWidths, margin, nextY, colW, i % 2 === 1, aligns);
            });
            return nextY + 10;
          },
        });
      },
      drawSectionHeader,
    );
  }

  // Photos must be preloaded before the synchronous layout flush in client mode.
  const photoCache = new Map<string, string>();
  if (clientMode) {
    const loaded = await preloadPhotoDataUrls(records);
    loaded.forEach((data, url) => photoCache.set(url, data));
  }

  const renderDetailBlocks = (doc: jsPDF, y: number, list: BatchExportItem[]): number => {
    if (clientMode) {
      return renderClientRecordBlocks(doc, list.map((i) => i.record), y, photoCache);
    }
    let ny = y;
    list.forEach((it) => {
      ny = checkPageBreak(doc, ny, 14);
      ny = drawRecordHeader(doc, it.record, ny);
      ny = drawVisitDetails(doc, it.record, ny, true, costMode);
      ny += 8;
    });
    return ny;
  };

  // ── Detail blocks: grouped by company → branch, or flat ──
  if (options.grouped) {
    const groups = new Map<string, BatchExportItem[]>();
    items.forEach((it) => {
      const key = `${it.companyId}::${it.branchId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    });
    groups.forEach((groupItems) => {
      const first = groupItems[0];
      engine.addSection(
        `${first.companyName} — ${first.branchName}`,
        (section) => {
          section.addRepeater(
            groupItems,
            clientMode ? 50 + groupItems.length * 40 : 40 + groupItems.length * 12,
            (doc, y, list) => renderDetailBlocks(doc, y, list),
          );
        },
        drawSectionHeader,
      );
    });
  } else {
    engine.addSection(
      "Records",
      (section) => {
        section.addRepeater(
          items,
          clientMode ? 50 + items.length * 40 : 40 + items.length * 12,
          (doc, y, list) => renderDetailBlocks(doc, y, list),
        );
      },
      drawSectionHeader,
    );
  }

  engine.flush();
  applyFooters(doc, "CMR System", batchTitle);
  return doc;
};
