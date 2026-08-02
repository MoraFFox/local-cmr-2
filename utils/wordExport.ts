/** @format */
/**
 * Word (.docx) report export — mirrors the PDF reports (internal / cost /
 * client) in a clean, fully editable Word document. Uses the `docx` package,
 * which works entirely in the browser. The module is lazy-loaded from the UI
 * (dynamic import) so the ~200KB library only ships when a user clicks
 * "Export Word".
 *
 * Content parity with the PDFs:
 *  - internal  → costs with payer attribution (Company/Client split)
 *  - cost      → all costs, no payer split, "Maintenance Cost Report"
 *  - client    → no financial figures at all, photos embedded, "Client Report"
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  TableLayoutType,
  WidthType,
  AlignmentType,
  HeadingLevel,
  ImageRun,
  ShadingType,
  BorderStyle,
  convertMillimetersToTwip,
} from "docx";
import {
  FormData,
  MaintenanceRecord,
  Branch,
  LogisticsOperation,
  MaintenancePhoto,
  Machine,
  Part,
  Service,
} from "../types";
// Type-only imports are erased at build time; getMissingFields is imported
// dynamically inside generateMissingDataWordReport so the work-order export
// (and the /print route) never pulls in the jsPDF/pdf-lib machinery.
import type { MissingField, MissingDataOptions } from "./missingDataPdf";
import {
  loadWordTemplate,
  type WordTemplateConfig,
  type WordLabelLang,
} from "./wordExportTemplate";
import { t } from "./wordExportLabels";
import { DateRange, formatDateRangeLabelEn, getReportRecords } from "./dateRangeFilter";
import { flattenMaintenanceRecords } from "./pdfGenerator";
import { formatDateEn, FinancialCategory, FinancialLine } from "./pdfTheme";
import {
  AggregatedCosts,
  AggregatedLogisticsCosts,
  aggregateCosts,
  aggregateBranchCosts,
  aggregateLogisticsCosts,
  getOperationalKPIs,
  getTechnicianSummary,
  getRecordCostSummary,
  resolvePartCost,
  resolveServiceCost,
  formatPdfCurrencyEn,
  formatEnNumber,
} from "./costAggregation";
import { partsList, servicesList } from "../constants";
import { buildFinancialCategories, buildLogisticsCategories } from "./internalReportPdf";
import type { BatchExportItem, BatchReportOptions } from "./internalReportPdf";

// ── Public types ──

export interface WordReportOptions {
  /** Client Report mode — every cost figure is removed (photos included). */
  clientMode?: boolean;
  /** Cost Report mode — full costs, no payer attribution. */
  costMode?: boolean;
  /** Date range filter — sets the period label under the title. */
  dateRange?: DateRange;
  /** When true (default), empty fields/sections are hidden. */
  hideEmpty?: boolean;
  /** Logistics operations from Supabase (machine transport & replacement). */
  logisticsOperations?: LogisticsOperation[];
  /** Word export template (logo / custom footer / label language). When
   * omitted, the template saved in localStorage is used automatically. */
  template?: WordTemplateConfig;
}

export interface VisitWordEntity {
  branchName?: string;
  location?: string;
  email?: string;
  taxNumber?: string;
}

export interface ResolvedMode {
  clientMode: boolean;
  costMode: boolean;
  showCosts: boolean;
  showPayer: boolean;
}

/**
 * Resolve the mode flags the way the PDF generator does (client wins over
 * cost). Client reports keep the payer labels ("By Midos"/"By Client" — the
 * PDF's visit summary shows them) but drop every amount; cost reports drop
 * payer attribution entirely.
 */
export const resolveWordMode = (o: { clientMode?: boolean; costMode?: boolean }): ResolvedMode => {
  const clientMode = !!o.clientMode;
  const costMode = !!o.costMode && !clientMode;
  return { clientMode, costMode, showCosts: !clientMode, showPayer: !costMode };
};

interface TemplateContext {
  template: WordTemplateConfig;
  lang: WordLabelLang;
}

/**
 * Resolve the template (explicit option wins over the saved localStorage
 * template) and the effective label language (defaults to English).
 */
const resolveTemplate = (template?: WordTemplateConfig): TemplateContext => {
  const tpl = template ?? loadWordTemplate();
  return { template: tpl, lang: tpl.labelLang ?? "en" };
};

// ── Brand constants (match utils/pdfTheme.ts BRAND) ──

const BRAND_PRIMARY = "B41E28";
const BRAND_DARK = "2B1914";
const TEXT_MUTED = "6B7280";
const NO_DATA = "—";

const GRID_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "D8CFC0" };
const TABLE_BORDERS = {
  top: GRID_BORDER,
  bottom: GRID_BORDER,
  left: GRID_BORDER,
  right: GRID_BORDER,
  insideHorizontal: GRID_BORDER,
  insideVertical: GRID_BORDER,
};

const A4_PROPERTIES = {
  page: {
    size: {
      width: convertMillimetersToTwip(210),
      height: convertMillimetersToTwip(297),
    },
    margin: {
      top: convertMillimetersToTwip(18),
      right: convertMillimetersToTwip(15),
      bottom: convertMillimetersToTwip(18),
      left: convertMillimetersToTwip(15),
    },
  },
};

const pct = (size: number) => ({ size, type: WidthType.PERCENTAGE });

// ── Text / run helpers ──

/**
 * A run is treated as RTL only when Arabic clearly dominates it. Mixed lines
 * like "3× جوانات — 300 EGP" stay LTR so Word keeps the digits/currency in
 * the same visual order as the PDF (Word still shapes the Arabic inline).
 */
const isMostlyArabic = (text: string): boolean => {
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  return arabicCount > 0 && arabicCount * 2 > text.length;
};

interface RunOpts {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  rtl?: boolean;
}

const run = (text: string | number | null | undefined, opts: RunOpts = {}): TextRun => {
  const value = text === null || text === undefined ? "" : String(text);
  const useRtl = opts.rtl ?? isMostlyArabic(value);
  return new TextRun({
    text: value,
    bold: opts.bold,
    italics: opts.italics,
    color: opts.color,
    size: opts.size ?? 22, // half-points → 11pt
    rightToLeft: useRtl,
  });
};

const para = (text: string | number, opts: RunOpts = {}): Paragraph =>
  new Paragraph({
    children: [run(text, opts)],
    bidirectional: isMostlyArabic(String(text)),
    spacing: { after: 80 },
  });

/** Small bold section sub-label. */
const sub = (text: string): Paragraph =>
  new Paragraph({
    spacing: { before: 140, after: 40 },
    children: [run(text, { bold: true, size: 20, color: BRAND_PRIMARY })],
  });

const bullet = (text: string): Paragraph =>
  new Paragraph({
    spacing: { after: 40 },
    indent: { left: 360 },
    children: [run("• ", { size: 22, color: BRAND_PRIMARY }), run(text, { size: 22 })],
  });

const sectionTitle = (text: string): Paragraph =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 260, after: 120 },
    // keepNext: sections flow continuously (no forced page breaks), so a
    // heading must never be stranded alone at the bottom of a page.
    keepNext: true,
    children: [run(text, { bold: true, size: 28, color: BRAND_PRIMARY })],
  });

const docTitle = (text: string): Paragraph =>
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 40 },
    children: [run(text, { bold: true, size: 44, color: BRAND_DARK })],
  });

const docTitle2 = (text: string): Paragraph =>
  new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 160, after: 100 },
    // keepNext: branch/group headings stay attached to their content now that
    // reports flow without forced page breaks.
    keepNext: true,
    children: [run(text, { bold: true, size: 32, color: BRAND_PRIMARY })],
  });

const mutedPara = (text: string): Paragraph =>
  new Paragraph({
    spacing: { after: 120 },
    children: [run(text, { size: 18, color: TEXT_MUTED, italics: true })],
  });

/**
 * End-of-document footer note. Returns null (no footer) for internal/cost
 * reports unless the user configured a custom footer — the default
 * "CONFIDENTIAL…" line was removed from internal/cost exports. Client reports
 * keep their "Service Report" label, and a custom template footer always wins.
 */
const footerNote = (clientMode: boolean, template: WordTemplateConfig, lang: WordLabelLang): Paragraph | null => {
  const custom = template.footerText && template.footerText.trim() !== "" ? template.footerText.trim() : "";
  const text = custom !== "" ? custom : clientMode ? t(lang, "serviceReportFooter") : "";
  if (!text) return null;
  return new Paragraph({
    spacing: { before: 400 },
    children: [run(text, { size: 18, color: TEXT_MUTED, italics: true })],
  });
};

// ── Logo embedding ──

const LOGO_MAX_WIDTH = 260;
const LOGO_MAX_HEIGHT = 120;

/** Decode a base64 PNG/JPEG data URL into bytes the docx ImageRun accepts. */
const dataUrlToImage = (dataUrl: string): { bytes: Uint8Array; type: "jpg" | "png" } | null => {
  const match = /^data:image\/(png|jpe?g);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, type: match[1] === "png" ? "png" : "jpg" };
  } catch {
    return null;
  }
};

/** Read natural pixel dimensions straight from the PNG/JPEG headers. */
const readImageDims = (bytes: Uint8Array, type: "jpg" | "png"): { width: number; height: number } | null => {
  if (type === "png") {
    if (bytes.length < 24) return null;
    const width = ((bytes[16] << 24) | (bytes[17] << 16) | (bytes[18] << 8) | bytes[19]) >>> 0;
    const height = ((bytes[20] << 24) | (bytes[21] << 16) | (bytes[22] << 8) | bytes[23]) >>> 0;
    return width > 0 && height > 0 ? { width, height } : null;
  }
  // JPEG: walk the segment list until a SOF marker
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) return null;
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof) {
      const height = ((bytes[offset + 5] << 8) | bytes[offset + 6]) >>> 0;
      const width = ((bytes[offset + 7] << 8) | bytes[offset + 8]) >>> 0;
      return width > 0 && height > 0 ? { width, height } : null;
    }
    offset += 2 + length;
  }
  return null;
};

/** Logo paragraph for the top of a document, when the template has a logo. */
const logoParagraph = (template: WordTemplateConfig): Paragraph | null => {
  if (!template.logoDataUrl) return null;
  const img = dataUrlToImage(template.logoDataUrl);
  if (!img) return null;
  const dims = readImageDims(img.bytes, img.type);
  if (!dims) return null;
  const scale = Math.min(LOGO_MAX_WIDTH / dims.width, LOGO_MAX_HEIGHT / dims.height, 1);
  const width = Math.max(1, Math.round(dims.width * scale));
  const height = Math.max(1, Math.round(dims.height * scale));
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
    children: [new ImageRun({ type: img.type, data: img.bytes, transformation: { width, height } })],
  });
};

/** Prepend the logo (if any) to a document's children. */
const withLogo = (children: (Paragraph | Table)[], template: WordTemplateConfig): (Paragraph | Table)[] => {
  const logo = logoParagraph(template);
  return logo ? [logo, ...children] : children;
};

// ── Table helpers ──

const headerCell = (text: string, widthPct: number): TableCell =>
  new TableCell({
    children: [
      new Paragraph({
        children: [run(text, { bold: true, color: "FFFFFF", size: 20 })],
        spacing: { after: 0 },
      }),
    ],
    width: pct(widthPct),
    shading: { fill: BRAND_PRIMARY, type: ShadingType.CLEAR, color: "auto" },
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });

const cell = (
  content: string | Paragraph[],
  opts: { bold?: boolean; widthPct?: number; shade?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
): TableCell => {
  const children =
    typeof content === "string"
      ? [new Paragraph({ children: [run(content, { bold: opts.bold })], alignment: opts.align, spacing: { after: 0 } })]
      : content;
  return new TableCell({
    children,
    width: opts.widthPct ? pct(opts.widthPct) : undefined,
    shading: opts.shade ? { fill: opts.shade, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
  });
};

/**
 * Two-column fill-in form table (label | blank value). Unlike labelValueTable it
 * keeps rows whose value is empty — those are the blanks the user fills in.
 * Used by the missing-data form and the work order template exports.
 */
export const formTable = (rows: Array<[string, string]>): Table =>
  new Table({
    rows: rows.map(
      ([label, value]) =>
        new TableRow({
          children: [cell(label, { bold: true, widthPct: 38, shade: "F7F3EC" }), cell(value, { widthPct: 62 })],
        }),
    ),
    width: pct(100),
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
  });

/** Value-cell content for a missing-data field (blank = fill-in box). */
const missingFieldValueCell = (field: MissingField): string => {
  const value = (field.value ?? "").trim();
  if (value) return value;
  if (field.type === "checkbox") return "☐";
  if (field.type === "select" && field.options && field.options.length > 0) {
    return `الخيارات: ${field.options.join(" / ")}`;
  }
  return "";
};

/** Two-column label/value table (empty values dropped). */
export const labelValueTable = (pairs: Array<[string, string | number | null | undefined]>): Table | null => {
  const filtered = pairs.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
  if (filtered.length === 0) return null;
  return new Table({
    rows: filtered.map(
      ([label, value]) =>
        new TableRow({
          children: [cell(String(label), { bold: true, widthPct: 32, shade: "F7F3EC" }), cell(String(value), { widthPct: 68 })],
        }),
    ),
    width: pct(100),
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
  });
};

/** Generic grid table with a branded header row. */
export const simpleTable = (headers: string[], rows: string[][], widths?: number[]): Table => {
  const n = headers.length;
  const defaultW = Math.floor(100 / n);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => headerCell(h, widths?.[i] ?? defaultW)),
  });
  const bodyRows = rows.map(
    (r) =>
      new TableRow({
        children: r.map((c, i) => cell(c, { widthPct: widths?.[i] ?? defaultW })),
      }),
  );
  return new Table({
    rows: [headerRow, ...bodyRows],
    width: pct(100),
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
  });
};

// ── Cost categories (reuse the PDF builders so cost logic stays in one place) ──

export interface WordCostLine {
  name: string;
  detail?: string;
  total: number;
}

export interface WordCostCategory {
  title: string;
  total: number;
  lines: WordCostLine[];
}

const mapFinancialCategory = (c: FinancialCategory): WordCostCategory => ({
  title: c.title,
  total: c.total,
  lines: c.lines.map((l: FinancialLine): WordCostLine => ({ name: l.name, detail: l.detail, total: l.total })),
});

/** Financial categories for the maintenance-visit costs (same buckets as the PDF). */
export const buildWordFinancialCategories = (costs: AggregatedCosts, costMode: boolean): WordCostCategory[] =>
  buildFinancialCategories(costs, costMode).map(mapFinancialCategory);

/** Cost categories for the in-house logistics group ("Midos In House Maintenance"). */
export const buildWordLogisticsCategories = (l: AggregatedLogisticsCosts): WordCostCategory[] =>
  buildLogisticsCategories(l).map(mapFinancialCategory);

/** Render cost categories + grand total as a Word section. */
const costBreakdownChildren = (
  categories: WordCostCategory[],
  m: ResolvedMode,
  grandTotal: number,
  lang: WordLabelLang,
): (Paragraph | Table)[] => {
  const out: (Paragraph | Table)[] = [sectionTitle(t(lang, "costBreakdown"))];
  categories.forEach((cat) => {
    out.push(sub(cat.title));
    const rows = cat.lines.map((l) => [l.name, l.detail || NO_DATA, formatPdfCurrencyEn(l.total)]);
    out.push(simpleTable([t(lang, "item"), t(lang, "detail"), t(lang, "total")], rows, [45, 25, 30]));
    out.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 120 },
        children: [run(`${t(lang, "categoryTotal")}: `, { bold: true }), run(formatPdfCurrencyEn(cat.total), { bold: true })],
      }),
    );
  });
  out.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 200 },
      children: [
        run(`${m.costMode ? t(lang, "totalCost") : t(lang, "netCost")}: `, { bold: true, size: 26, color: BRAND_DARK }),
        run(formatPdfCurrencyEn(grandTotal), { bold: true, size: 26, color: BRAND_DARK }),
      ],
    }),
  );
  return out;
};

// ── Period / KPI / tech / logistics builders ──

const formatPeriod = (records: MaintenanceRecord[], dateRange?: DateRange): string => {
  if (dateRange && (dateRange.startDate || dateRange.endDate)) return formatDateRangeLabelEn(dateRange);
  const dates = records.map((r) => new Date(r.maintenanceDate)).filter((d) => !isNaN(d.getTime()));
  if (dates.length === 0) return NO_DATA;
  dates.sort((a, b) => a.getTime() - b.getTime());
  return `${formatDateEn(dates[0])} — ${formatDateEn(dates[dates.length - 1])}`;
};

const kpiSummaryChildren = (
  records: MaintenanceRecord[],
  costs: AggregatedCosts,
  m: ResolvedMode,
  logisticsCost: number,
  lang: WordLabelLang,
): Paragraph[] => {
  const kpis = getOperationalKPIs(records);
  const scheduled = records.filter((r) => r.type === "scheduled").length;
  const requested = records.filter((r) => r.type === "requested").length;
  const companyPartCount = Array.from(costs.parts.values()).reduce((s, p) => s + p.count, 0);
  const clientPartCount = Array.from(costs.clientParts.values()).reduce((s, p) => s + p.count, 0);
  const totalCost = (m.costMode ? costs.grandTotal + costs.totalLeaseRevenue : costs.grandTotalCompanyCost) + logisticsCost;

  const lines: string[] = [];
  lines.push(`${t(lang, "totalVisits")}: ${formatEnNumber(kpis.totalVisits)}  (${formatEnNumber(scheduled)} ${t(lang, "scheduled")} · ${formatEnNumber(requested)} ${t(lang, "requested")})`);
  if (!m.clientMode && !m.costMode) {
    lines.push(`${t(lang, "resolutionRate")}: ${formatEnNumber(kpis.resolutionRate)}%  (${formatEnNumber(kpis.problemsResolved)} ${t(lang, "of")} ${formatEnNumber(kpis.totalProblems)} ${t(lang, "resolved")})`);
  }
  lines.push(
    m.costMode || m.clientMode
      ? `${t(lang, "spareParts")}: ${formatEnNumber(kpis.totalPartsUsed)}  (${formatEnNumber(companyPartCount + clientPartCount)} ${t(lang, "total")})`
      : `${t(lang, "spareParts")}: ${formatEnNumber(kpis.totalPartsUsed)}  (${formatEnNumber(companyPartCount)} ${t(lang, "company")} · ${formatEnNumber(clientPartCount)} ${t(lang, "client")})`,
  );
  if (!m.clientMode) {
    lines.push(`${m.costMode ? t(lang, "totalCost") : t(lang, "netCost")}: ${formatPdfCurrencyEn(totalCost)}  (${t(lang, "allCostsIncluded")})`);
  }
  return lines.map((l) => bullet(l));
};

const techSummaryChildren = (records: MaintenanceRecord[], m: ResolvedMode, lang: WordLabelLang): (Paragraph | Table)[] => {
  const techRows = getTechnicianSummary(records)
    .filter((t) => t.visits > 0)
    .sort((a, b) => b.visits - a.visits);
  if (techRows.length === 0) return [];
  const techMap = new Map<string, { totalCost: number; zones: Record<string, number> }>();
  records.forEach((r) => {
    const name = r.baristaName || "Unknown";
    const recCosts = getRecordCostSummary(r, partsList, servicesList);
    const existing = techMap.get(name) || { totalCost: 0, zones: {} };
    existing.totalCost += recCosts.total;
    if (r.visitZone) existing.zones[r.visitZone] = (existing.zones[r.visitZone] || 0) + 1;
    techMap.set(name, existing);
  });
  const headers = m.clientMode
    ? [t(lang, "technician"), t(lang, "visits"), t(lang, "avgRating"), t(lang, "partsUsed"), t(lang, "zones")]
    : [t(lang, "technician"), t(lang, "visits"), t(lang, "avgRating"), t(lang, "partsUsed"), t(lang, "totalCost"), t(lang, "zones")];
  const rows = techRows.map((t) => {
    const extra = techMap.get(t.name) || { totalCost: 0, zones: {} };
    const zonesStr =
      Object.entries(extra.zones)
        .map(([zone, count]) => `${zone} (${formatEnNumber(count)})`)
        .join(" · ") || NO_DATA;
    const base = [
      t.name,
      formatEnNumber(t.visits),
      t.avgRating > 0 ? `★ ${formatEnNumber(t.avgRating)}/5` : "-",
      formatEnNumber(t.partsUsed),
      zonesStr,
    ];
    return m.clientMode ? base : [base[0], base[1], base[2], base[3], formatPdfCurrencyEn(extra.totalCost), base[4]];
  });
  return [sectionTitle(t(lang, "techPerformance")), simpleTable(headers, rows)];
};

const logisticsTableChildren = (ops: LogisticsOperation[], lang: WordLabelLang): (Paragraph | Table)[] => {
  if (!ops || ops.length === 0) return [];
  const rows = ops.map((op) => [
    op.operation_type === "pickup_and_deliver"
      ? t(lang, "pickupDeliver")
      : op.operation_type === "deliver_only"
        ? t(lang, "deliverOnly")
        : t(lang, "pickupOnly"),
    op.machine_category || NO_DATA,
    op.status,
    op.open_date ? formatDateEn(op.open_date) : NO_DATA,
    op.close_date ? formatDateEn(op.close_date) : NO_DATA,
    (op.total_rental_cost ?? 0) > 0 ? formatPdfCurrencyEn(op.total_rental_cost ?? 0) : NO_DATA,
    (op.maintenance_cost ?? 0) > 0 ? formatPdfCurrencyEn(op.maintenance_cost ?? 0) : NO_DATA,
    (op.total_logistics_cost ?? 0) > 0 ? formatPdfCurrencyEn(op.total_logistics_cost ?? 0) : NO_DATA,
  ]);
  return [
    sectionTitle(t(lang, "logisticsTitle")),
    simpleTable(
      [t(lang, "operation"), t(lang, "category"), t(lang, "status"), t(lang, "openDate"), t(lang, "closeDate"), t(lang, "rental"), t(lang, "maintenance"), t(lang, "totalCost")],
      rows,
      [13, 12, 10, 14, 14, 11, 11, 15],
    ),
  ];
};

/** Machine ownership summary for a company or branch (matches ReviewStep helper). */
export const machineOwnershipText = (
  entity: {
    usesOurMachines?: boolean | null;
    hasMultipleMachines?: boolean | null;
    machines?: Machine[];
    machineOwnershipType?: string;
  },
  lang: WordLabelLang = "en",
): string => {
  const oursWithType = (type?: string): string => {
    if (!type) return t(lang, "ours");
    const label = type.charAt(0).toUpperCase() + type.slice(1);
    return `${t(lang, "ours")} (${label})`;
  };
  if (entity.hasMultipleMachines) {
    if (!entity.machines || entity.machines.length === 0) return t(lang, "mixedFleet");
    return entity.machines.map((m) => (m.machineOwner === "client" ? t(lang, "clientMachine") : oursWithType(m.machineOwnershipType))).join(", ");
  }
  if (entity.usesOurMachines === null || entity.usesOurMachines === undefined) return t(lang, "notSpecified");
  if (entity.usesOurMachines === false) return t(lang, "clientMachine");
  return oursWithType(entity.machineOwnershipType);
};

// ── Maintenance record block ──

/** One maintenance visit rendered as an editable block (all modes). */
export const recordBlockChildren = (
  record: MaintenanceRecord,
  m: ResolvedMode,
  photoCache?: Map<string, { data: Uint8Array; type: "jpg" | "png" }>,
  lang: WordLabelLang = "en",
): (Paragraph | Table)[] => {
  const out: (Paragraph | Table)[] = [];
  const cost = getRecordCostSummary(record, partsList, servicesList);

  const headerRuns: TextRun[] = [
    run(formatDateEn(record.maintenanceDate), { bold: true, size: 24 }),
    run(` — ${record.type === "requested" ? t(lang, "requested") : t(lang, "scheduled")}`, {
      bold: true,
      size: 24,
      color: record.type === "requested" ? "B91C1C" : BRAND_DARK,
    }),
  ];
  if (record.hadProblem) {
    headerRuns.push(
      run(record.problemSolved ? `   ✓ ${t(lang, "resolved")}` : `   ✗ ${t(lang, "unresolved")}`, {
        size: 20,
        color: record.problemSolved ? "1E7A46" : "B91C1C",
      }),
    );
  }
  out.push(new Paragraph({ spacing: { before: 180, after: 80 }, children: headerRuns }));

  const info: Array<[string, string | undefined]> = [
    [t(lang, "technician"), record.baristaName],
    [t(lang, "clientStaff"), record.clientBaristaName],
    [t(lang, "zone"), record.visitZone ?? undefined],
    ...(m.showPayer ? [[t(lang, "paidBy"), record.paidBy === "company" ? t(lang, "midos") : t(lang, "client")] as [string, string]] : []),
    ...(m.showCosts && (record.dailyLeaseCost || 0) > 0
      ? [[t(lang, "dailyLease"), formatPdfCurrencyEn(record.dailyLeaseCost || 0)] as [string, string]]
      : []),
    [t(lang, "nextVisit"), record.nextVisitDate],
  ];
  const infoTable = labelValueTable(info);
  if (infoTable) out.push(infoTable);

  if (record.machines && record.machines.length > 0) {
    out.push(sub(t(lang, "machines")));
    record.machines.forEach((mc) => out.push(bullet(`${formatEnNumber(mc.count)}× ${mc.name}`)));
  }

  if (record.problems && record.problems.length > 0) {
    out.push(sub(t(lang, "issues")));
    record.problems.forEach((p) => out.push(bullet(String(p))));
  }

  const parts = (record.partsReplaced || []).filter((p) => (p.count || 0) > 0);
  if (parts.length > 0) {
    out.push(sub(t(lang, "partsReplaced")));
    parts.forEach((p) => {
      const qty = p.count || 0;
      const unit = resolvePartCost(p, partsList);
      const payer = m.showPayer ? ` (${p.paidByClient ? t(lang, "client") : t(lang, "midos")})` : "";
      out.push(
        bullet(
          m.showCosts
            ? `${formatEnNumber(qty)}× ${p.name} — ${formatPdfCurrencyEn(qty * unit)}${payer}`
            : `${formatEnNumber(qty)}× ${p.name}`,
        ),
      );
    });
  }

  const services = (record.servicesPerformed || []).filter((s) => (s.count || 0) > 0);
  if (services.length > 0) {
    out.push(sub(t(lang, "servicesPerformed")));
    services.forEach((s) => {
      const qty = s.count || 0;
      const unit = resolveServiceCost(s, servicesList);
      const payer = m.showPayer ? ` (${s.paidByClient ? t(lang, "client") : t(lang, "midos")})` : "";
      out.push(
        bullet(
          m.showCosts
            ? `${formatEnNumber(qty)}× ${s.name} — ${formatPdfCurrencyEn(qty * unit)}${payer}`
            : `${formatEnNumber(qty)}× ${s.name}`,
        ),
      );
    });
  }

  if (m.showCosts && cost.total > 0) {
    out.push(
      new Paragraph({
        spacing: { before: 100, after: 60 },
        children: [run(`${t(lang, "recordTotal")}: `, { bold: true, size: 22 }), run(formatPdfCurrencyEn(cost.total), { bold: true, size: 22 })],
      }),
    );
  }

  if (record.recommendations) {
    out.push(sub(t(lang, "recommendations")));
    out.push(para(String(record.recommendations)));
  }
  if (record.notes) {
    out.push(sub(t(lang, "notes")));
    out.push(para(String(record.notes)));
  }

  if (record.supervisors && record.supervisors.length > 0) {
    out.push(sub(t(lang, "supervisors")));
    out.push(simpleTable([t(lang, "name"), t(lang, "phone")], record.supervisors.map((s) => [s.name, s.phone || NO_DATA]), [50, 50]));
  }

  if (record.followUpVisits && record.followUpVisits.length > 0) {
    out.push(sub(t(lang, "followUpVisits")));
    record.followUpVisits.forEach((fu) => out.push(...recordBlockChildren(fu, m, photoCache, lang)));
  }

  if (photoCache && record.photos && record.photos.length > 0) {
    out.push(...photoParagraphs(record.photos, photoCache, lang));
  }

  return out;
};

// ── Photos ──

type PhotoCache = Map<string, { data: Uint8Array; type: "jpg" | "png" }>;

const loadPhotoBytes = async (url: string): Promise<{ data: Uint8Array; type: "jpg" | "png" } | null> => {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const mime = blob.type || "";
    const isJpeg = mime.includes("jpeg") || mime.includes("jpg") || /\.jpe?g($|\?)/i.test(url);
    const isPng = mime.includes("png") || /\.png($|\?)/i.test(url);
    if (!isJpeg && !isPng) return null;
    const buf = await blob.arrayBuffer();
    return { data: new Uint8Array(buf), type: isJpeg ? "jpg" : "png" };
  } catch {
    return null;
  }
};

/** Preload every photo referenced by the records (deep, incl. follow-ups). */
export const preloadPhotos = async (records: MaintenanceRecord[]): Promise<PhotoCache> => {
  const cache: PhotoCache = new Map();
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
      const loaded = await loadPhotoBytes(url);
      if (loaded) cache.set(url, loaded);
    }),
  );
  return cache;
};

const photoParagraphs = (photos: MaintenancePhoto[], cache: PhotoCache, lang: WordLabelLang): Paragraph[] => {
  const out: Paragraph[] = [];
  for (const type of ["before", "after", "legacy"] as const) {
    const group = photos.filter((p) => p.type === type);
    if (group.length === 0) continue;
    const label =
      type === "before" ? t(lang, "beforePhotos") : type === "after" ? t(lang, "afterPhotos") : t(lang, "legacyPhotos");
    out.push(sub(label));
    for (const ph of group) {
      const img = cache.get(ph.url);
      if (!img) continue;
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new ImageRun({ type: img.type, data: img.data, transformation: { width: 300, height: 225 } })],
        }),
      );
    }
  }
  return out;
};

// ── Branch section (shared by company + branch reports) ──

const branchSectionChildren = (
  branch: Branch,
  index: number,
  m: ResolvedMode,
  photoCache?: PhotoCache,
  lang: WordLabelLang = "en",
): (Paragraph | Table)[] => {
  const out: (Paragraph | Table)[] = [];
  const branchRecords = flattenMaintenanceRecords(branch.maintenanceHistory);
  const scheduled = branchRecords.filter((r) => r.type === "scheduled").length;
  const requested = branchRecords.filter((r) => r.type === "requested").length;

  const info = labelValueTable([
    [t(lang, "location"), branch.location],
    [t(lang, "email"), branch.email],
    [t(lang, "taxNo"), branch.taxNumber],
    [t(lang, "coffeeConsumption"), branch.coffeeConsumptionKg ? `${formatEnNumber(branch.coffeeConsumptionKg)} kg/month` : undefined],
    [t(lang, "maintenanceTimes"), branch.allowedMaintenanceTimes],
    [t(lang, "visitSummary"), `${formatEnNumber(scheduled)} ${t(lang, "scheduled")} · ${formatEnNumber(requested)} ${t(lang, "requested")} · ${formatEnNumber(scheduled + requested)} ${t(lang, "total")}`],
  ]);
  if (info) out.push(info);

  if (branch.contacts.length > 0) {
    out.push(sub(t(lang, "contacts")));
    out.push(
      simpleTable(
        [t(lang, "name"), t(lang, "position"), t(lang, "phone")],
        branch.contacts.map((c) => [c.name, c.customPosition || c.position, c.phoneNumbers.map((p) => p.number).join(" / ") || NO_DATA]),
        [34, 33, 33],
      ),
    );
  }

  if (branch.baristas.length > 0) {
    out.push(sub(t(lang, "assignedStaff")));
    out.push(simpleTable([t(lang, "name"), t(lang, "phone")], branch.baristas.map((b) => [b.name, b.phone || NO_DATA]), [50, 50]));
  }

  if (branchRecords.length > 0) {
    out.push(sectionTitle(t(lang, "maintenanceLog")));
    branchRecords.forEach((r) => out.push(...recordBlockChildren(r, m, photoCache, lang)));
  }
  return out;
};

// ── Document builders ──

const makeDocument = (title: string, children: (Paragraph | Table)[]): Document =>
  new Document({
    creator: "CMR System",
    title,
    sections: [{ properties: A4_PROPERTIES, children }],
  });

export const generateCompanyWordReport = async (
  data: FormData & { created_at?: string },
  options: WordReportOptions = {},
): Promise<Document> => {
  const m = resolveWordMode(options);
  const { template, lang } = resolveTemplate(options.template);
  const reportData: FormData = {
    ...data,
    maintenanceHistory: getReportRecords(data.maintenanceHistory || []),
    branches: (data.branches || []).map((b) => ({
      ...b,
      maintenanceHistory: getReportRecords(b.maintenanceHistory || []),
    })),
  };
  const allRecords = flattenMaintenanceRecords([
    ...reportData.maintenanceHistory,
    ...reportData.branches.flatMap((b) => b.maintenanceHistory),
  ]);
  const logisticsOps = options.logisticsOperations ?? [];
  const costs = aggregateCosts(reportData, partsList, servicesList);
  const logisticsCosts = aggregateLogisticsCosts(logisticsOps);
  const period = formatPeriod(allRecords, options.dateRange);

  const children: (Paragraph | Table)[] = [];
  children.push(docTitle(reportData.companyName || t(lang, "companyReport")));
  if (m.clientMode || m.costMode) {
    children.push(
      new Paragraph({
        children: [run(m.clientMode ? t(lang, "clientReport") : t(lang, "costReport"), { bold: true, size: 26, color: BRAND_PRIMARY })],
        spacing: { after: 60 },
      }),
    );
  }
  children.push(mutedPara(`${t(lang, "generated")}: ${new Date().toISOString().slice(0, 10)}  ·  ${t(lang, "period")}: ${period}`));

  children.push(sectionTitle(t(lang, "companyProfile")));
  const profile = labelValueTable([
    [t(lang, "taxNo"), reportData.taxNumber],
    [t(lang, "email"), reportData.email],
    [t(lang, "location"), reportData.location],
    [t(lang, "machineOwnership"), machineOwnershipText(reportData, lang)],
    [t(lang, "coffeeConsumption"), reportData.coffeeConsumptionKg ? `${formatEnNumber(reportData.coffeeConsumptionKg)} kg/month` : undefined],
    [t(lang, "maintenanceTimes"), reportData.allowedMaintenanceTimes],
  ]);
  if (profile) children.push(profile);

  if (reportData.contacts.length > 0) {
    children.push(sectionTitle(t(lang, "keyContacts")));
    children.push(
      simpleTable(
        [t(lang, "name"), t(lang, "position"), t(lang, "phone")],
        reportData.contacts.map((c) => [c.name, c.customPosition || c.position, c.phoneNumbers.map((p) => p.number).join(" / ") || NO_DATA]),
        [34, 33, 33],
      ),
    );
  }

  if (allRecords.length > 0) {
    children.push(sectionTitle(t(lang, "performanceSummary")));
    children.push(...kpiSummaryChildren(allRecords, costs, m, logisticsCosts.totalLogisticsCost, lang));
  }

  if (reportData.hasBranches && reportData.branches.length > 0) {
    const photoCache = m.clientMode ? await preloadPhotos(allRecords) : undefined;
    reportData.branches.forEach((branch, idx) => {
      // No forced page break between branches — dropped empty sections must
      // let the remaining content reflow to fill the page (Word paginates
      // automatically when content is long, like the PDF layout engine).
      children.push(docTitle2(`${reportData.companyName} — ${branch.branchName || `${t(lang, "branch")} ${idx + 1}`}`));
      children.push(...branchSectionChildren(branch, idx, m, photoCache, lang));
    });
  } else {
    const mainRecords = flattenMaintenanceRecords(reportData.maintenanceHistory);
    if (mainRecords.length > 0) {
      const photoCache = m.clientMode ? await preloadPhotos(mainRecords) : undefined;
      children.push(sectionTitle(t(lang, "mainOfficeMaintenance")));
      mainRecords.forEach((r) => children.push(...recordBlockChildren(r, m, photoCache, lang)));
    }
  }

  if (!m.clientMode) {
    const cats = [...buildWordFinancialCategories(costs, m.costMode), ...buildWordLogisticsCategories(logisticsCosts)].filter(
      (c) => c.total > 0,
    );
    if (cats.length > 0) {
      const grandTotal =
        (m.costMode ? costs.grandTotal + costs.totalLeaseRevenue : costs.grandTotalCompanyCost) + logisticsCosts.totalLogisticsCost;
      children.push(...costBreakdownChildren(cats, m, grandTotal, lang));
    }
  }

  if (allRecords.length > 0) {
    children.push(...techSummaryChildren(allRecords, m, lang));
  }

  if (logisticsOps.length > 0) {
    children.push(...logisticsTableChildren(logisticsOps, lang));
  }

  const footer = footerNote(m.clientMode, template, lang);
  if (footer) children.push(footer);

  const modeLabel = m.clientMode ? "Client" : m.costMode ? "Cost" : "Internal";
  return makeDocument(`${reportData.companyName} — ${modeLabel} Report`, withLogo(children, template));
};

export const generateBranchWordReport = async (
  companyName: string,
  branch: Branch,
  options: WordReportOptions = {},
): Promise<Document> => {
  const m = resolveWordMode(options);
  const { template, lang } = resolveTemplate(options.template);
  const reportBranch: Branch = {
    ...branch,
    maintenanceHistory: getReportRecords(branch.maintenanceHistory),
  };
  const records = flattenMaintenanceRecords(reportBranch.maintenanceHistory);
  const logisticsOps = options.logisticsOperations ?? [];
  const costs = aggregateBranchCosts(reportBranch, partsList, servicesList);
  const logisticsCosts = aggregateLogisticsCosts(logisticsOps);
  const period = formatPeriod(records, options.dateRange);
  const photoCache = m.clientMode ? await preloadPhotos(records) : undefined;

  const children: (Paragraph | Table)[] = [];
  children.push(docTitle(reportBranch.branchName || t(lang, "branchReport")));
  children.push(new Paragraph({ children: [run(companyName, { bold: true, size: 26 })], spacing: { after: 40 } }));
  if (m.clientMode || m.costMode) {
    children.push(
      new Paragraph({
        children: [run(m.clientMode ? t(lang, "clientReport") : t(lang, "costReport"), { bold: true, size: 26, color: BRAND_PRIMARY })],
        spacing: { after: 60 },
      }),
    );
  }
  children.push(mutedPara(`${t(lang, "generated")}: ${new Date().toISOString().slice(0, 10)}  ·  ${t(lang, "period")}: ${period}`));
  children.push(...branchSectionChildren(reportBranch, 0, m, photoCache, lang));

  if (!m.clientMode) {
    const cats = [...buildWordFinancialCategories(costs, m.costMode), ...buildWordLogisticsCategories(logisticsCosts)].filter(
      (c) => c.total > 0,
    );
    if (cats.length > 0) {
      const grandTotal =
        (m.costMode ? costs.grandTotal + costs.totalLeaseRevenue : costs.grandTotalCompanyCost) + logisticsCosts.totalLogisticsCost;
      children.push(...costBreakdownChildren(cats, m, grandTotal, lang));
    }
  }

  if (records.length > 0) {
    children.push(...techSummaryChildren(records, m, lang));
  }

  if (logisticsOps.length > 0) {
    children.push(...logisticsTableChildren(logisticsOps, lang));
  }

  const footer = footerNote(m.clientMode, template, lang);
  if (footer) children.push(footer);

  const modeLabel = m.clientMode ? "Client" : m.costMode ? "Cost" : "Internal";
  return makeDocument(`${reportBranch.branchName || "Branch"} — ${modeLabel} Report`, withLogo(children, template));
};

export const generateVisitWordReport = async (
  companyName: string,
  entity: VisitWordEntity,
  record: MaintenanceRecord,
  options: WordReportOptions = {},
): Promise<Document> => {
  const m = resolveWordMode(options);
  const { template, lang } = resolveTemplate(options.template);
  const photoCache = await preloadPhotos([record]);

  const children: (Paragraph | Table)[] = [];
  children.push(docTitle(companyName));
  children.push(new Paragraph({ children: [run(entity.branchName || t(lang, "mainOffice"), { bold: true, size: 26 })], spacing: { after: 40 } }));
  if (m.clientMode || m.costMode) {
    children.push(
      new Paragraph({
        children: [run(m.clientMode ? t(lang, "clientReport") : t(lang, "costReport"), { bold: true, size: 26, color: BRAND_PRIMARY })],
        spacing: { after: 60 },
      }),
    );
  }
  children.push(mutedPara(`${t(lang, "generated")}: ${new Date().toISOString().slice(0, 10)}  ·  ${t(lang, "visitDate")}: ${formatDateEn(record.maintenanceDate)}`));

  const info = labelValueTable([
    [t(lang, "location"), entity.location],
    [t(lang, "email"), entity.email],
    [t(lang, "taxNo"), entity.taxNumber],
  ]);
  if (info) children.push(info);

  children.push(...recordBlockChildren(record, m, photoCache, lang));
  const footer = footerNote(m.clientMode, template, lang);
  if (footer) children.push(footer);

  const modeLabel = m.clientMode ? "Client" : m.costMode ? "Cost" : "Internal";
  return makeDocument(`${companyName} — Visit ${modeLabel} Report`, withLogo(children, template));
};

export const generateBatchWordReport = async (
  items: BatchExportItem[],
  options: BatchReportOptions = { mode: "internal" },
  template?: WordTemplateConfig,
): Promise<Document> => {
  const m = resolveWordMode({ clientMode: options.mode === "client", costMode: options.mode === "cost" });
  const { template: tpl, lang } = resolveTemplate(template);
  const records = items.map((i) => i.record);
  const period = formatPeriod(records);
  const batchTitle = options.batchTitle || t(lang, "bulkExport");
  const photoCache = m.clientMode ? await preloadPhotos(records) : undefined;

  const companyCount = new Set(items.map((i) => i.companyName)).size;
  const branchCount = new Set(items.map((i) => `${i.companyId}-${i.branchId}`)).size;
  const totalCost = records.reduce((sum, r) => sum + getRecordCostSummary(r, partsList, servicesList).total, 0);

  const children: (Paragraph | Table)[] = [];
  children.push(docTitle(batchTitle));
  if (m.clientMode || m.costMode) {
    children.push(
      new Paragraph({
        children: [run(m.clientMode ? t(lang, "clientReport") : t(lang, "costReport"), { bold: true, size: 26, color: BRAND_PRIMARY })],
        spacing: { after: 60 },
      }),
    );
  }
  children.push(mutedPara(`${t(lang, "generated")}: ${new Date().toISOString().slice(0, 10)}  ·  ${t(lang, "period")}: ${period}`));

  children.push(sectionTitle(t(lang, "batchSummary")));
  const summaryPairs: Array<[string, string]> = [
    [t(lang, "records"), formatEnNumber(records.length)],
    [t(lang, "companies"), formatEnNumber(companyCount)],
    [t(lang, "branches"), formatEnNumber(branchCount)],
    [t(lang, "period"), period],
    ...(options.filterDescription ? [[t(lang, "selection"), options.filterDescription] as [string, string]] : []),
    ...(!m.clientMode && totalCost > 0 ? [[(m.costMode ? t(lang, "totalCost") : t(lang, "netCost")) as string, formatPdfCurrencyEn(totalCost)] as [string, string]] : []),
  ];
  const summaryTable = labelValueTable(summaryPairs);
  if (summaryTable) children.push(summaryTable);

  if (options.includeSummaryTable) {
    children.push(sectionTitle(t(lang, "recordsSummary")));
    const headers = m.clientMode
      ? [t(lang, "date"), t(lang, "company"), t(lang, "branch"), t(lang, "technician"), t(lang, "type"), t(lang, "status")]
      : [t(lang, "date"), t(lang, "company"), t(lang, "branch"), t(lang, "technician"), t(lang, "type"), t(lang, "status"), t(lang, "cost")];
    const rows = items.map((it) => {
      const r = it.record;
      const status = r.hadProblem ? (r.problemSolved ? t(lang, "resolved") : t(lang, "unresolved")) : t(lang, "routine");
      const base = [
        formatDateEn(r.maintenanceDate),
        it.companyName,
        it.branchName,
        r.baristaName || NO_DATA,
        r.type === "requested" ? t(lang, "requested") : t(lang, "scheduled"),
        status,
      ];
      return m.clientMode ? base : [...base, formatPdfCurrencyEn(getRecordCostSummary(r, partsList, servicesList).total)];
    });
    children.push(simpleTable(headers, rows));
  }

  if (options.grouped) {
    const groups = new Map<string, BatchExportItem[]>();
    items.forEach((it) => {
      const key = `${it.companyId}::${it.branchId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    });
    groups.forEach((groupItems) => {
      const first = groupItems[0];
      // No forced page break between groups — content reflows so a sparse
      // group never leaves the rest of the page empty.
      children.push(docTitle2(`${first.companyName} — ${first.branchName}`));
      groupItems.forEach((it) => children.push(...recordBlockChildren(it.record, m, photoCache, lang)));
    });
  } else {
    children.push(sectionTitle(t(lang, "records")));
    items.forEach((it) => children.push(...recordBlockChildren(it.record, m, photoCache, lang)));
  }

  const footer = footerNote(m.clientMode, tpl, lang);
  if (footer) children.push(footer);

  return makeDocument(`${batchTitle} — ${options.mode} Report`, withLogo(children, tpl));
};

// ── Missing-data fill-in form ──

/**
 * Word version of the fill-in missing-data form (mirrors generateMissingDataPDF
 * from utils/missingDataPdf.ts). Each missing field becomes a label | blank
 * table row the user can type into. Returns null when nothing is missing.
 */
export const generateMissingDataWordReport = async (
  data: FormData,
  options: MissingDataOptions,
  template?: WordTemplateConfig,
): Promise<Document | null> => {
  const { getMissingFields } = await import("./missingDataPdf");
  const missing = getMissingFields(data, options);
  if (!missing.hasMissing) return null;
  const { template: tpl, lang } = resolveTemplate(template);

  const children: (Paragraph | Table)[] = [];
  children.push(docTitle(data.companyName || t(lang, "missingDataForm")));
  children.push(
    new Paragraph({
      children: [run(t(lang, "missingDataForm"), { bold: true, size: 26, color: BRAND_PRIMARY })],
      spacing: { after: 60 },
    }),
  );
  children.push(mutedPara(t(lang, "missingDataInstructions")));
  children.push(mutedPara(`${t(lang, "generated")}: ${new Date().toISOString().slice(0, 10)}`));

  if (missing.company.length > 0) {
    children.push(sectionTitle(t(lang, "companyInfo")));
    children.push(formTable(missing.company.map((f) => [f.label, missingFieldValueCell(f)])));
  }

  Object.entries(missing.branches).forEach(([branchIndex, fields]) => {
    if (fields.length === 0) return;
    const branchName = data.branches[Number(branchIndex)]?.branchName || `${t(lang, "branch")} ${Number(branchIndex) + 1}`;
    // No forced page break per branch — sparse branches (one missing field)
    // flow right after the previous content instead of wasting a full page.
    children.push(docTitle2(`${t(lang, "branchInfo")} — ${branchName}`));
    children.push(formTable(fields.map((f) => [f.label, missingFieldValueCell(f)])));
  });

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [run(t(lang, "endOfMissingDataForm"), { size: 18, color: TEXT_MUTED, italics: true })],
    }),
  );

  return makeDocument(`${data.companyName || "Company"} — Missing Data Form`, withLogo(children, tpl));
};

// ── Blank work order template (mirrors PrintableWorkOrder at /print) ──

/**
 * Word version of the blank work order template shown at the /print route:
 * lined client/visit fields, the service & parts lists grouped by category
 * (each row with an empty Qty and a "Client Paid" checkbox), a custom-items
 * grid and a notes area — all left blank for hand/typed completion.
 */
export const generateWorkOrderWordReport = async (
  partsListIn: Part[],
  servicesListIn: Service[],
  template?: WordTemplateConfig,
): Promise<Document> => {
  const { template: tpl, lang } = resolveTemplate(template);
  const serviceGroups = servicesListIn.reduce<Record<string, Service[]>>((acc, service) => {
    const category = service.category || "General";
    (acc[category] ||= []).push(service);
    return acc;
  }, {});
  const partGroups = partsListIn.reduce<Record<string, Part[]>>((acc, part) => {
    const category = part.isFrequentlyReplaced ? t(lang, "frequentlyReplaced") : t(lang, "otherParts");
    (acc[category] ||= []).push(part);
    return acc;
  }, {});

  const itemTable = (items: Array<{ label: string }>): Table =>
    simpleTable(
      [t(lang, "item"), t(lang, "qty"), t(lang, "clientPaid")],
      items.map((i) => [i.label, "", "☐"]),
      [60, 15, 25],
    );

  const children: (Paragraph | Table)[] = [];
  children.push(docTitle(t(lang, "maintenanceVisitReport")));
  children.push(
    new Paragraph({
      children: [run(t(lang, "internalUseDocument"), { size: 18, color: TEXT_MUTED, italics: true })],
      spacing: { after: 60 },
    }),
  );
  // Brand text is only shown when no logo is configured (the logo replaces it).
  if (!tpl.logoDataUrl) {
    children.push(new Paragraph({ children: [run("Mido for distribution", { bold: true, size: 24 })], spacing: { after: 200 } }));
  }

  children.push(sectionTitle(t(lang, "clientAndVisitInfo")));
  children.push(
    formTable([
      [t(lang, "companyName"), ""],
      [t(lang, "visitDate"), ""],
      [t(lang, "technician"), ""],
      [t(lang, "contactName"), ""],
      [t(lang, "contactPhone"), ""],
    ]),
  );

  children.push(sectionTitle(t(lang, "workPerformed")));
  children.push(sub(t(lang, "servicesDone")));
  Object.entries(serviceGroups).forEach(([category, items]) => {
    children.push(
      new Paragraph({
        children: [run(category, { bold: true, size: 20, color: TEXT_MUTED })],
        spacing: { before: 80, after: 40 },
      }),
    );
    children.push(itemTable(items));
  });
  children.push(sub(t(lang, "partsUsed")));
  Object.entries(partGroups).forEach(([category, items]) => {
    children.push(
      new Paragraph({
        children: [run(category, { bold: true, size: 20, color: TEXT_MUTED })],
        spacing: { before: 80, after: 40 },
      }),
    );
    children.push(itemTable(items));
  });
  children.push(sub(t(lang, "customPartsTitle")));
  children.push(itemTable(Array.from({ length: 4 }, () => ({ label: "" }))));

  children.push(sectionTitle(t(lang, "issuesNotes")));
  children.push(simpleTable([t(lang, "notes")], Array.from({ length: 6 }, () => [""]), [100]));

  children.push(
    new Paragraph({
      spacing: { before: 400 },
      children: [run(t(lang, "endOfWorkOrder"), { size: 18, color: TEXT_MUTED, italics: true })],
    }),
  );

  return makeDocument("Maintenance Visit Report — Work Order", withLogo(children, tpl));
};

// ── Download helper ──

/** Pack the Document and trigger a browser download of the .docx file. */
export const downloadWordDoc = async (doc: Document, fileName: string): Promise<void> => {
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
