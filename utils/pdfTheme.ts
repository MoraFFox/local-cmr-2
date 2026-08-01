/** @format */

import jsPDF, { TextOptionsLight } from "jspdf";
import type { LogoAssets } from "./pdfGenerator";
import { logger } from "./logger";
import { formatPdfCurrencyEn, formatEnNumber } from "./costAggregation";
import { LogisticsOperation } from "../types";
import {
  LOGISTICS_TYPE_LABELS_EN,
  formatMachineDescription,
  getLogisticsWorkItemDisplay,
  MAINTENANCE_SECTION_LABELS_EN,
} from "./logisticsLabels";

// ── White / Black / Crimson Red Palette (matches company logo) ──
export const BRAND = {
  // Primary: Crimson red — used for accents, key emphasis, and brand elements
  primary: [180, 30, 40] as [number, number, number],
  primaryLight: [200, 60, 65] as [number, number, number],
  accent: [180, 30, 40] as [number, number, number],

  // Header/Footer: Dark gray — used for the top/bottom report bars
  header: [40, 40, 40] as [number, number, number],
  headerLight: [60, 60, 60] as [number, number, number],

  // Surfaces
  white: [255, 255, 255] as [number, number, number],
  offWhite: [255, 255, 255] as [number, number, number],
  surface: [255, 255, 255] as [number, number, number],
  cream: [248, 248, 248] as [number, number, number],
  cream2: [238, 238, 238] as [number, number, number],

  // Borders
  hairline: [220, 220, 220] as [number, number, number],
  hairlineDark: [180, 180, 180] as [number, number, number],

  // Text
  text: [20, 20, 20] as [number, number, number],
  textMuted: [120, 120, 120] as [number, number, number],
  textSecondary: [100, 100, 100] as [number, number, number],

  // Yellow highlight — used for the "Midos In House Maintenance" cost group
  // so in-house logistics costs stand out from maintenance-visit rows.
  highlight: [255, 233, 133] as [number, number, number],
  highlightDark: [150, 110, 20] as [number, number, number],

  // Semantic variants (all within the white/black/crimson theme)
  success: [20, 20, 20] as [number, number, number],
  successBg: [248, 248, 248] as [number, number, number],
  warning: [180, 30, 40] as [number, number, number],
  warningBg: [255, 245, 245] as [number, number, number],
  error: [180, 30, 40] as [number, number, number],
  errorBg: [255, 245, 245] as [number, number, number],
  info: [60, 60, 60] as [number, number, number],
  infoBg: [248, 248, 248] as [number, number, number],
};

/**
 * Keep dynamic values in logical Unicode order until jsPDF draws them. The
 * document-level Arabic hook below performs shaping and bidi exactly once;
 * pre-shaping here would make jsPDF process presentation forms a second time.
 */
const rtl = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return "";
  return String(text);
};

const ARABIC_OR_PRESENTATION = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;
const LATIN_OR_DIGIT = /[A-Za-z0-9]/;
const configuredArabicDocs = new WeakSet<object>();

const firstStrongIsRtl = (text: string): boolean => {
  for (const char of text) {
    if (ARABIC_OR_PRESENTATION.test(char)) return true;
    if (LATIN_OR_DIGIT.test(char)) return false;
  }
  return false;
};

const textFromPayload = (text: unknown): string => {
  if (typeof text === "string") return text;
  if (!Array.isArray(text)) return "";
  return text
    .map((part) => (Array.isArray(part) ? part[0] : part))
    .filter((part): part is string => typeof part === "string")
    .join("\n");
};

/**
 * Configure jsPDF's built-in Arabic parser/bidi engine for logical Unicode
 * input. jsPDF 2.5 already shapes Arabic in `preProcessText` and reorders it
 * in `postProcessText`; the old pipeline pre-shaped/reversed first, so jsPDF
 * reversed the presentation forms again and produced the malformed screenshot
 * output. This hook makes jsPDF the single owner of shaping and bidi.
 *
 * It is installed once per document and also covers jspdf-autotable, whose
 * internal calls to doc.text() cannot receive our helper's options directly.
 */
export const configureArabicBidi = (doc: jsPDF): void => {
  if (configuredArabicDocs.has(doc)) return;
  configuredArabicDocs.add(doc);
  doc.internal.events.subscribe("preProcessText", (payload: any) => {
    const text = textFromPayload(payload.text);
    if (!ARABIC_OR_PRESENTATION.test(text)) return;
    payload.options = {
      ...(payload.options || {}),
      isInputVisual: false,
      isInputRtl: firstStrongIsRtl(text),
      isOutputVisual: true,
      isOutputRtl: false,
    };
  });
};

/** Draw logical Unicode text; jsPDF performs shaping and bidi exactly once. */
export const pdfText = (
  doc: jsPDF,
  text: string | string[],
  x: number,
  y: number,
  options?: TextOptionsLight,
): jsPDF => {
  configureArabicBidi(doc);
  return doc.text(text, x, y, options);
};

// ── Layout constants ──
const MARGIN = 10; // PDF internal margin
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// ── Icon library (Font Awesome 6 Free Solid glyphs) ──
//
// jsPDF cannot reliably render emoji or icon fonts by name, but it CAN embed
// a real icon font exactly like the Amiri text fonts: fa-solid-900.ttf is
// fetched alongside Amiri in loadFonts and registered as "FA". Every icon is
// therefore a crisp, professionally-designed text glyph (not hand-drawn
// geometry) centered on (cx, cy). If the font is unavailable for any reason
// the export still succeeds — a small filled dot stands in for the icon.

export type PdfIconName =
  | "phone"
  | "mail"
  | "location"
  | "calendar"
  | "money"
  | "wrench"
  | "cog"
  | "package"
  | "alert"
  | "user"
  | "truck"
  | "coffee"
  | "star"
  | "check"
  | "cross"
  | "doc"
  | "chart"
  | "home"
  | "clock";

/** jsPDF font name for the embedded Font Awesome Solid font. */
export const FA_FONT_NAME = "FA";

// Glyph ink metrics measured from the FA 6.7.2 Free Solid TTF (see the
// measurements in the drawPdfIcon docstring). These drive icon sizing and
// centering; if the font file is ever replaced, re-measure and update them.
const FA_MM_PER_PT = 0.3528; // 1pt = 0.3528mm
const FA_MAX_INK_EM = 1.01; // tallest solid glyph ink height (star/phone)
const FA_INK_CENTER_EM = 0.375; // ink center sits this far above the baseline
const FA_ICON_FILL = 0.8; // target: tallest glyph ink ≈ 0.80 × size mm

/**
 * Font Awesome 6 Free (Solid) codepoint for every icon in the vocabulary.
 * Font version pinned to 6.7.2 — if fa-solid-900.ttf is ever replaced, keep
 * these codepoints in sync with the new font's cmap (the icon audit test
 * renders every glyph at runtime; a one-off cmap check validates presence).
 */
const FA_GLYPHS: Record<PdfIconName, string> = {
  phone: "\uF095", // fa-phone
  mail: "\uF0E0", // fa-envelope
  location: "\uF3C5", // fa-location-dot
  calendar: "\uF073", // fa-calendar-days
  money: "\uF0D6", // fa-money-bill
  wrench: "\uF0AD", // fa-wrench
  cog: "\uF013", // fa-gear
  package: "\uF466", // fa-box
  alert: "\uF071", // fa-triangle-exclamation
  user: "\uF007", // fa-user
  truck: "\uF0D1", // fa-truck
  coffee: "\uF7B6", // fa-mug-hot
  star: "\uF005", // fa-star
  check: "\uF00C", // fa-check
  cross: "\uF00D", // fa-xmark
  doc: "\uF15C", // fa-file-lines
  chart: "\uF0E3", // fa-chart-column
  home: "\uF015", // fa-house
  clock: "\uF017", // fa-clock
};

/**
 * Draw a Font Awesome glyph centered at (cx, cy). `size` is the requested
 * visual height in PDF mm — the tallest glyph (ink ratio ≈ 1.01 em) renders
 * ≈ 0.80 × size mm tall, so icons sit comfortably inside their badge circles.
 * Glyphs are drawn in `color`. Degrades to a small filled dot when the "FA"
 * font is not registered, so a missing font can never crash the export.
 *
 * Sizing is derived from the font's measured ink boxes (FA 6.7.2 Free Solid):
 * solid glyphs fill up to ~1.01 em tall, so fontSize = size × 0.80 / 1.01 /
 * 0.3528(mm/pt) ≈ size × 2.25. (The old factor 3.4 rendered icons at ~1.21×
 * size — noticeably oversized for their badge circles.)
 */
export const drawPdfIcon = (
  doc: jsPDF,
  name: PdfIconName,
  cx: number,
  cy: number,
  size: number,
  color: [number, number, number] = BRAND.text,
): void => {
  // The tallest glyph (star/phone ~1.01 em ink) renders at ≈ 0.80 × size mm:
  // fontSize(pt) = size(mm) × FA_ICON_FILL / (FA_MAX_INK_EM × FA_MM_PER_PT) ≈ size × 2.245.
  const fontSize = size * (FA_ICON_FILL / FA_MAX_INK_EM / FA_MM_PER_PT);

  if (!doc.getFontList()[FA_FONT_NAME]) {
    // Should never happen in reports (loadFonts registers FA first) — but if
    // the font failed to load, degrade to a dot instead of crashing. Log each
    // occurrence (reports are generated on demand, so this only fires on a
    // genuine load failure) so a silent production problem is diagnosable.
    logger.warn(
      `Font Awesome font "${FA_FONT_NAME}" not registered — icon "${name}" rendered as a dot.`,
      undefined,
      "pdf",
    );
    doc.saveGraphicsState();
    doc.setFillColor(...color);
    doc.circle(cx, cy, size * 0.24, "F");
    doc.restoreGraphicsState();
    return;
  }

  doc.saveGraphicsState();
  doc.setFont(FA_FONT_NAME, "normal");
  doc.setFontSize(fontSize);
  doc.setTextColor(...color);
  // Baseline placed below cy so each glyph's measured ink center (FA_INK_CENTER_EM
  // above the baseline, consistent across all glyphs) lands exactly on (cx, cy) —
  // precise vertical centering without relying on jsPDF's line-box baseline math
  // (baseline:"middle" centers the full line box instead).
  pdfText(doc, FA_GLYPHS[name], cx, cy + FA_INK_CENTER_EM * fontSize * FA_MM_PER_PT, { align: "center" });
  doc.restoreGraphicsState();
};

/**
 * Colored circular badge with a white vector icon inside. Used for contact
 * cards, machine cards, info fields, section headers and KPI cards.
 */
export const drawIconBadge = (
  doc: jsPDF,
  x: number,
  y: number,
  icon: PdfIconName,
  color: [number, number, number] = BRAND.primary,
  radius: number = 3.5,
): void => {
  doc.setFillColor(...color);
  doc.circle(x, y, radius, "F");
  drawPdfIcon(doc, icon, x, y, radius * 1.4, BRAND.white);
};

// ── Header ──
export const drawInternalHeader = (
  doc: jsPDF,
  companyName: string,
  branchName?: string,
  assets?: LogoAssets | null,
  period?: string,
  /** Optional subtitle shown under the company name (e.g. "Maintenance Cost Report"). */
  subtitle?: string,
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerH = 38; // mm

  // Corporate header bar
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageWidth, headerH, "F");

  // Subtle accent line below header
  doc.setFillColor(...BRAND.headerLight);
  doc.rect(0, headerH, pageWidth, 1.2, "F");

  // Logo image. When no logo is available the title block below already
  // shows the company name at the same position, so nothing extra is drawn.
  let logoRendered = false;
  let logoW = 0;

  if (assets?.logo) {
    try {
      // Cap the rendered width so a very wide logo does not overlap
      // the title block. Preserve aspect ratio.
      const targetH = 16;
      const maxLogoW = 45;
      let logoH = targetH;
      if (assets.naturalWidth > 0 && assets.naturalHeight > 0) {
        const aspect = assets.naturalWidth / assets.naturalHeight;
        logoW = targetH * aspect;
        if (logoW > maxLogoW) {
          logoW = maxLogoW;
          logoH = logoW / aspect;
        }
      }
      doc.addImage(assets.logo, assets.logoFormat, MARGIN, 5, logoW, logoH);
      logoRendered = true;
    } catch {
      // Fall back to company name text below
    }
  }

  // Title block (left side for LTR)
  const titleX = MARGIN + (logoRendered ? logoW + 8 : 0);
  doc.setFont("Amiri", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND.white);
  const displayName = branchName ? `${companyName} — ${branchName}` : companyName;
  pdfText(doc, displayName, titleX, 13, { align: "left" });

  doc.setFont("Amiri", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.white);
  pdfText(doc, subtitle ?? "Maintenance Report", titleX, 21, { align: "left" });

  // Meta row — 4 items: report number | date | period | company
  const metaY = headerH + 6;
  doc.setFillColor(...BRAND.header);
  doc.rect(0, headerH + 2, pageWidth, 10, "F");
  doc.setFont("Amiri", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.white);
  const now = new Date();
  const reportNum = `IR-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")} ${today.toLocaleDateString("en-US", { month: "long" })} ${String(today.getFullYear())}`;

  // Distributed evenly: report | date | period | company
  const colW = pageWidth / 4;
  const metaItems = [
    { label: "Report No.:", value: reportNum },
    { label: "Issue Date:", value: dateStr },
    { label: period ? "Period:" : "", value: period || "" },
  ];

  // Left section: report number + date + period (spread across left 3/4)
  let metaX = MARGIN;
  for (const item of metaItems) {
    if (!item.label) continue;
    pdfText(doc, `${item.label} ${item.value}`, metaX, metaY, { align: "left" });
    metaX += colW;
  }

  // Right: company name
  pdfText(doc, companyName || "Mido's for Distribution", pageWidth - MARGIN, metaY, { align: "right" });

  return headerH + 18;
};

// ── Footer ──
export const drawInternalFooter = (
  doc: jsPDF,
  pageCount: number,
  currentPage: number,
  generatedBy = "CMR System",
  companyName?: string,
): void => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFillColor(...BRAND.primary);
  doc.rect(0, pageHeight - 11, pageWidth, 11, "F");

  doc.setFont("Amiri", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.white);
  const footerCompany = companyName || "Mido's for Distribution";
  pdfText(doc, footerCompany, MARGIN, pageHeight - 4.5, { align: "left" });
  pdfText(doc, `Page ${formatEnNumber(currentPage)} of ${formatEnNumber(pageCount)}`, pageWidth / 2, pageHeight - 4.5, { align: "center" });
  pdfText(doc, `${generatedBy} — Generated`, pageWidth - MARGIN, pageHeight - 4.5, { align: "right" });
};

// ── Apply footers to all pages ──
export const applyFooters = (doc: jsPDF, generatedBy?: string, companyName?: string): void => {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawInternalFooter(doc, pageCount, i, generatedBy, companyName);
  }
};

// ── Section Header ──

/**
 * Default icon per known report section title, so the layout engine's
 * addSection sections (which call drawSectionHeader with only (doc, title,
 * y)) still get a scannable icon badge automatically. An explicit
 * `options.icon` always wins over this map.
 */
const SECTION_ICON_BY_TITLE: Record<string, PdfIconName> = {
  "Cost Breakdown": "money",
  "Visit Fees by Zone": "location",
  "Machine Fleet": "coffee",
  "Branch Information": "home",
  "Company Information": "home",
  Contacts: "phone",
  "Detailed Maintenance Log": "doc",
  "Maintenance Log": "doc",
  "Technician Performance": "user",
  "Branch Comparison": "chart",
  "Logistics — Machine Transport & Replacement": "truck",
};

export const drawSectionHeader = (
  doc: jsPDF,
  title: string,
  y: number,
  options?: { x?: number; width?: number; icon?: PdfIconName },
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const x = options?.x ?? MARGIN;
  const width = options?.width ?? pageWidth - MARGIN * 2;
  const icon = options?.icon ?? SECTION_ICON_BY_TITLE[title];

  doc.setFillColor(...BRAND.cream2);
  doc.setDrawColor(...BRAND.hairline);
  doc.roundedRect(x, y, width, 9, 1.5, 1.5, "FD");

  doc.setFillColor(...BRAND.primary);
  doc.rect(x, y, 2.5, 9, "F");

  if (icon) {
    drawIconBadge(doc, x + 6, y + 4.5, icon, BRAND.primary, 2.1);
  }

  doc.setFont("Amiri", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  pdfText(doc, title, x + (icon ? 10.5 : 4), y + 5.5, { align: "left" });

  return y + 12;
};

// ── KPI Card ──
export interface KPICard {
  icon: PdfIconName;
  label: string;
  value: string;
  sublabel?: string;
  variant?: "default" | "good" | "warn" | "info";
}

const variantColor = (variant: KPICard["variant"]): [number, number, number] => {
  switch (variant) {
    case "good":
      return BRAND.success;
    case "warn":
      return BRAND.warning;
    case "info":
      return BRAND.info;
    default:
      return BRAND.primary;
  }
};

export const drawKPICards = (
  doc: jsPDF,
  cards: KPICard[],
  y: number,
  options?: { width?: number; columns?: number },
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardCount = cards.length;
  const gap = 3;
  // Default: one full-width row. With `columns` (and a narrower `width`) the
  // cards render as a compact grid — used when they live in the half-width
  // sidebar under the company info instead of the top full-width strip.
  const columns = Math.min(options?.columns ?? cardCount, cardCount);
  const containerW = options?.width ?? pageWidth - MARGIN * 2;
  const cardH = 25;
  const gridRows = Math.ceil(cardCount / columns);
  const cardW = (containerW - gap * (columns - 1)) / columns;

  cards.forEach((card, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = MARGIN + col * (cardW + gap);
    const yPos = y + row * (cardH + gap);
    const borderColor = variantColor(card.variant);

    doc.setFillColor(...BRAND.white);
    doc.setDrawColor(...BRAND.hairline);
    doc.roundedRect(x, yPos, cardW, cardH, 2, 2, "FD");

    doc.setFillColor(...borderColor);
    doc.rect(x, yPos, cardW, 2.5, "F");

    // Icon badge (top-right corner) so the card is scannable at a glance
    drawIconBadge(doc, x + cardW - 7, yPos + 9, card.icon, borderColor, 2.6);

    // Value (already formatted; do NOT reshape currency strings). Shrink the
    // font until it fits left of the badge so long values like a large Net
    // Cost never collide with it.
    doc.setFont("Amiri", "bold");
    doc.setTextColor(...BRAND.text);
    let valueSize = 14;
    doc.setFontSize(valueSize);
    const maxValueW = cardW - 15;
    while (valueSize > 8 && doc.getTextWidth(card.value) > maxValueW) {
      valueSize -= 1;
      doc.setFontSize(valueSize);
    }
    pdfText(doc, card.value, x + 5, yPos + 13, { align: "left" });

    // Label
    doc.setFont("Amiri", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.textMuted);
    pdfText(doc, card.label, x + 5, yPos + 18, { align: "left" });

    // Sublabel
    if (card.sublabel) {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(6.5);
      const subColor = card.variant === "good" ? BRAND.success : card.variant === "warn" ? BRAND.warning : BRAND.textMuted;
      doc.setTextColor(...subColor);
      pdfText(doc, card.sublabel, x + 5, yPos + 22, { align: "left" });
    }
  });

  return y + gridRows * (cardH + gap) - gap + 8;
};

// ── Financial Summary (3-column table) ──
export interface FinancialLine {
  name: string;
  detail?: string;
  total: number;
  tag?: "company" | "client" | "category" | "total" | "subtotal";
  indent?: number;
}

export interface FinancialCategory {
  title: string;
  total: number;
  lines: FinancialLine[];
  /**
   * Optional group header label shown above the category (e.g. "Maintenance
   * Visits" vs "Midos In House Maintenance"). When a category's group differs
   * from the previous one, a bold group row is drawn before the category.
   */
  group?: string;
  /** When true, the group header row is highlighted in yellow (logistics). */
  groupHighlight?: boolean;
}

export const drawFinancialSummary = (
  doc: jsPDF,
  categories: FinancialCategory[],
  grandTotal: number,
  clientTotal: number,
  y: number,
  options?: { x?: number; width?: number; grandTotalLabel?: string },
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableW = options?.width ?? pageWidth / 2 - MARGIN - 6;
  const x = options?.x ?? pageWidth / 2 + 3;
  const rowH = 5.5;
  // LTR columns (left→right): item | detail | amount
  const colAmountW = tableW * 0.30;
  const colDetailW = tableW * 0.26;
  const colItemW = tableW - colAmountW - colDetailW;

  // Count one extra row per distinct group header (e.g. "Maintenance Visits"
  // and the yellow "Midos In House Maintenance" logistics group).
  const groupHeaders = new Set(categories.map((c) => c.group).filter(Boolean));
  let totalRows = 2 + groupHeaders.size;
  categories.forEach((c) => (totalRows += 1 + c.lines.length));
  if (clientTotal > 0) totalRows += 1;
  const totalH = Math.max(totalRows * rowH + 14, 60);

  // ── Pagination ──
  // The breakdown can be much taller than one page (e.g. once the in-house
  // logistics group itemizes parts/services), so the cream box is drawn as one
  // segment per page, the "Item | Details | Amount" column header repeats
  // after a page break (the same treatment the maintenance-log table uses),
  // and every row paints its own cream band so the box background survives
  // page splits. Rows never run past the bottom margin.
  const drawHeaderRow = (hy: number): number => {
    doc.setFillColor(...BRAND.primary);
    doc.rect(x, hy, tableW, rowH, "F");
    doc.setFont("Amiri", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.white);
    pdfText(doc, "Item", x + 4, hy + 4, { align: "left" });
    pdfText(doc, "Details", x + colItemW + 4, hy + 4, { align: "left" });
    pdfText(doc, "Amount", x + tableW - 4, hy + 4, { align: "right" });
    return hy + rowH;
  };

  // Cream band behind a row — keeps the box background continuous even though
  // the single rounded box can no longer span multiple pages.
  const paintRowBand = (ry: number): void => {
    doc.setFillColor(...BRAND.cream);
    doc.rect(x, ry, tableW, rowH, "F");
  };

  // Box border for one page segment (stroke only; the fill is painted per row).
  const strokeSegment = (top: number, bottom: number): void => {
    if (bottom - top <= 0) return;
    doc.setDrawColor(...BRAND.hairline);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, top, tableW, bottom - top, 2, 2, "S");
  };

  let segTop = y; // box top on the current page
  let rowY = y + 5;
  let paginated = false;

  // Advance to the next row; when it would cross the bottom margin, close the
  // box segment on the current page, open a fresh one and repeat the header.
  const nextRow = (needed: number = rowH + 2): void => {
    const prevY = rowY;
    rowY = checkPageBreak(doc, rowY, needed);
    if (rowY < prevY) {
      strokeSegment(segTop, prevY);
      paginated = true;
      segTop = rowY;
      // Repeat the column header at the top of the fresh segment.
      paintRowBand(segTop);
      rowY = drawHeaderRow(segTop + 5);
    }
  };

  // Page 1: cream box strip above the header, then the column header row.
  paintRowBand(y);
  rowY = drawHeaderRow(y + 5);

  let currentGroup: string | undefined;
  categories.forEach((category) => {
    // Group header row — drawn when the group changes so the breakdown reads
    // as: "Maintenance Visits" … then "Midos In House Maintenance" (yellow).
    if (category.group && category.group !== currentGroup) {
      const groupTotal = categories
        .filter((c) => c.group === category.group)
        .reduce((s, c) => s + c.total, 0);
      nextRow();
      paintRowBand(rowY);
      doc.setFillColor(...(category.groupHighlight ? BRAND.highlight : BRAND.cream2));
      doc.setDrawColor(...(category.groupHighlight ? BRAND.highlightDark : BRAND.hairlineDark));
      doc.setLineWidth(0.3);
      doc.rect(x, rowY, tableW, rowH, "FD");
      doc.setFont("Amiri", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.text);
      pdfText(doc, category.group, x + 4, rowY + 4, { align: "left" });
      pdfText(doc, formatPdfCurrencyEn(groupTotal), x + tableW - 4, rowY + 4, { align: "right" });
      rowY += rowH;
      currentGroup = category.group;
    }

    // Category header row
    nextRow();
    paintRowBand(rowY);
    doc.setFillColor(...BRAND.cream2);
    doc.rect(x, rowY, tableW, rowH, "F");
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.text);
    pdfText(doc, category.title, x + 4, rowY + 4, { align: "left" });
    pdfText(doc, formatPdfCurrencyEn(category.total), x + tableW - 4, rowY + 4, { align: "right" });
    rowY += rowH;

    // Lines
    category.lines.forEach((line, idx) => {
      nextRow();
      paintRowBand(rowY);
      if (idx % 2 === 1) {
        doc.setFillColor(...BRAND.white);
        doc.rect(x, rowY, tableW, rowH, "F");
      }
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.text);

      const indent = (line.indent || 0) * 3;
      pdfText(doc, line.name, x + 6 + indent, rowY + 4, { align: "left" });
      if (line.detail) {
        doc.setTextColor(...BRAND.textMuted);
        pdfText(doc, line.detail, x + colItemW + 6 + indent, rowY + 4, { align: "left" });
        doc.setTextColor(...BRAND.text);
      }
      pdfText(doc, formatPdfCurrencyEn(line.total), x + tableW - 4, rowY + 4, { align: "right" });
      rowY += rowH;
    });
  });

  // Grand total
  nextRow(rowH + 6);
  doc.setFillColor(...BRAND.cream);
  doc.rect(x, rowY, tableW, rowH + 5, "F");
  doc.setDrawColor(...BRAND.primary);
  doc.line(x + 2, rowY + 1, x + tableW - 2, rowY + 1);
  rowY += 3;
  doc.setFont("Amiri", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.primary);
  pdfText(doc, options?.grandTotalLabel ?? "Net Cost to Company", x + 4, rowY + 4, { align: "left" });
  pdfText(doc, formatPdfCurrencyEn(grandTotal), x + tableW - 4, rowY + 4, { align: "right" });
  rowY += rowH + 2;

  // Client total
  if (clientTotal > 0) {
    nextRow();
    paintRowBand(rowY);
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.warning);
    pdfText(doc, "Client Invoice Total", x + 4, rowY + 4, { align: "left" });
    pdfText(doc, formatPdfCurrencyEn(clientTotal), x + tableW - 4, rowY + 4, { align: "right" });
    rowY += rowH;
  }

  // Close the box on the final page. When everything fit on one page, keep
  // the legacy minimum box height; after pagination the box ends at the last
  // row of the final page (the returned Y lives on that page).
  const finalBottom = paginated ? rowY + 4 : Math.max(y + totalH, rowY + 4);
  if (finalBottom > rowY) {
    doc.setFillColor(...BRAND.cream);
    doc.rect(x, rowY, tableW, finalBottom - rowY, "F");
  }
  strokeSegment(segTop, finalBottom);
  return finalBottom;
};

// ── Visit Zone Table ──
export interface ZoneRow {
  label: string;
  rate: number;
  visits: number;
  total: number;
  icon?: string;
}

export const drawZoneTable = (doc: jsPDF, zones: ZoneRow[], total: number, y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableW = pageWidth / 2 - MARGIN - 6;
  const x = MARGIN;
  const rowH = 6;

  // Header
  doc.setFillColor(...BRAND.cream2);
  doc.setDrawColor(...BRAND.hairlineDark);
  doc.rect(x, y, tableW, rowH, "FD");
  doc.setFont("Amiri", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.textMuted);
  const headers = ["Zone", "Fee", "Visits", "Total"];
  const colW = tableW / 4;
  headers.forEach((h, i) => {
    pdfText(doc, h, x + (i + 0.5) * colW, y + 4, { align: "center" });
  });

  let rowY = y + rowH;
  zones.forEach((z, i) => {
    if (i % 2 === 1) {
      doc.setFillColor(...BRAND.cream);
      doc.rect(x, rowY, tableW, rowH, "F");
    }
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.text);
    const label = z.icon ? `${z.icon} ${z.label}` : z.label;
    const cells = [label, formatPdfCurrencyEn(z.rate), formatEnNumber(z.visits), formatPdfCurrencyEn(z.total)];
    cells.forEach((cell, idx) => {
      pdfText(doc, cell, x + (idx + 0.5) * colW, rowY + 4, { align: "center" });
    });
    rowY += rowH;
  });

  // Total row
  doc.setDrawColor(...BRAND.hairlineDark);
  doc.line(x, rowY, x + tableW, rowY);
  doc.setFont("Amiri", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.text);
  pdfText(doc, "Total Visit Fees", x + 2, rowY + 4, { align: "left" });
  pdfText(doc, formatPdfCurrencyEn(total), x + tableW - 2, rowY + 4, { align: "right" });

  return rowY + rowH + 3;
};

// ── Info Box ──
export interface InfoItem {
  label: string;
  value: string;
  icon?: PdfIconName;
}

export const drawInfoBox = (
  doc: jsPDF,
  items: InfoItem[],
  y: number,
  options?: { x?: number; width?: number },
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableW = options?.width ?? pageWidth / 2 - MARGIN - 6;
  const x = options?.x ?? MARGIN;
  const rowH = 5.5;
  const totalH = items.length * rowH + 8;

  doc.setFillColor(...BRAND.cream);
  doc.setDrawColor(...BRAND.hairline);
  doc.roundedRect(x, y, tableW, totalH, 2, 2, "FD");

  let rowY = y + 6;
  items.forEach((item) => {
    const icon: PdfIconName | undefined = item.icon;
    if (icon) {
      drawIconBadge(doc, x + 6, rowY + 2.5, icon, BRAND.textMuted, 2);
    }

    // Label on left (LTR), value on right — with safe gap
    const labelX = icon ? x + 10 : x + 4;
    doc.setFont("Amiri", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.textMuted);
    pdfText(doc, item.label, labelX, rowY + 3, { align: "left" });

    // Value right-aligned — info-box values are typically short (email, address, "—")
    // and won't overflow the ~89mm column at 7pt, so no truncation needed.
    doc.setFont("Amiri", "normal");
    doc.setTextColor(...BRAND.text);
    pdfText(doc, item.value, x + tableW - 4, rowY + 3, { align: "right" });
    rowY += rowH;
  });

  return y + totalH + 6;
};

// ── Contact Cards ──
export interface ContactInfo {
  name: string;
  role: string;
  phone: string;
}

export const drawContactCards = (
  doc: jsPDF,
  contacts: ContactInfo[],
  y: number,
  options?: { x?: number; width?: number },
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const containerW = options?.width ?? pageWidth / 2 - MARGIN - 6;
  const x = options?.x ?? MARGIN;
  const cardW = (containerW - 6) / 2;
  const cardH = 16;
  let rowY = y;

  contacts.forEach((contact, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cardX = x + col * (cardW + 3);
    const cardY = rowY + row * (cardH + 3);

    doc.setFillColor(...BRAND.white);
    doc.setDrawColor(...BRAND.hairline);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, "FD");

    drawIconBadge(doc, cardX + 5, cardY + 4, "phone", BRAND.primary, 2.2);

    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.text);
    pdfText(doc, contact.name, cardX + 8, cardY + 4, { align: "left" });

    doc.setFont("Amiri", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.textMuted);
    pdfText(doc, contact.role, cardX + 8, cardY + 8, { align: "left" });

    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.textSecondary);
    pdfText(doc, contact.phone, cardX + cardW - 4, cardY + 12, { align: "right" });
  });

  const rows = Math.ceil(contacts.length / 2);
  return y + rows * (cardH + 3) + 3;
};

// ── Machine Cards ──
export interface MachineInfo {
  name: string;
  type: string;
  dailyRate: number;
  metric: string;
  total: number;
  icon?: PdfIconName;
}

export const drawMachineCards = (doc: jsPDF, machines: MachineInfo[], y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const containerW = pageWidth / 2 - MARGIN - 6;
  const x = MARGIN;
  const cardW = (containerW - 6) / 2;
  const cardH = 26;

  machines.forEach((m, i) => {
    const cardX = x + (i % 2) * (cardW + 3);
    const cardY = y + Math.floor(i / 2) * (cardH + 3);

    doc.setFillColor(...BRAND.white);
    doc.setDrawColor(...BRAND.hairline);
    doc.roundedRect(cardX, cardY, cardW, cardH, 2, 2, "FD");

    doc.setFillColor(...BRAND.primary);
    doc.rect(cardX, cardY, 2, cardH, "F");

    drawIconBadge(doc, cardX + 6, cardY + 4, m.icon || "coffee", BRAND.primary, 2.5);

    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.text);
    pdfText(doc, m.name, cardX + 9, cardY + 5, { align: "left" });

    const details: Array<{ label: string; value: string; isTotal?: boolean }> = [
      { label: "Contract Type:", value: m.type },
      { label: "Daily Lease:", value: formatPdfCurrencyEn(m.dailyRate) },
      { label: "Active Days:", value: m.metric },
      { label: "Total:", value: formatPdfCurrencyEn(m.total), isTotal: true },
    ];

    details.forEach((d, idx) => {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...BRAND.textMuted);
      pdfText(doc, d.label, cardX + 5, cardY + 9 + idx * 4, { align: "left" });
      doc.setFont("Amiri", "bold");
      doc.setTextColor(...(d.isTotal ? BRAND.primary : BRAND.text));
      pdfText(doc, d.value, cardX + cardW - 4, cardY + 9 + idx * 4, { align: "right" });
    });
  });

  const rows = Math.ceil(machines.length / 2);
  return y + rows * (cardH + 3) + 3;
};

// ── Generic Table ──
export const drawTableHeader = (
  doc: jsPDF,
  headers: string[],
  colWidths: number[],
  x: number,
  y: number,
  tableWidth: number,
): number => {
  doc.setFillColor(...BRAND.primary);
  doc.rect(x, y, tableWidth, 8, "F");

  let cx = x;
  headers.forEach((header, i) => {
    const w = colWidths[i];
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.white);
    pdfText(doc, header, cx + 2, y + 5, { align: "left" });
    cx += w;
  });

  return y + 8;
};

export const drawTableRow = (
  doc: jsPDF,
  cells: string[],
  colWidths: number[],
  x: number,
  y: number,
  tableWidth: number,
  isAlternate: boolean,
  alignments?: Array<"left" | "right" | "center">,
): number => {
  const rowH = 6.5;

  if (isAlternate) {
    doc.setFillColor(...BRAND.cream);
    doc.rect(x, y, tableWidth, rowH, "F");
  }

  let cx = x;
  cells.forEach((cell, i) => {
    const w = colWidths[i];
    const align = alignments?.[i] || "left";
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.text);

    const textX = align === "left" ? cx + 2 : align === "center" ? cx + w / 2 : cx + w - 2;
    pdfText(doc, cell, textX, y + 4.5, { align });
    cx += w;
  });

  return y + rowH;
};

// ── Page utilities ──
export const checkPageBreak = (doc: jsPDF, y: number, needed: number = 30): number => {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 14) {
    doc.addPage();
    return 14;
  }
  return y;
};

// ── Date formatting (shared) ──

export const EN_SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const formatDateEn = (date: string | Date): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = EN_SHORT_MONTHS[d.getMonth()];
  const year = String(d.getFullYear());
  return `${day} ${month} ${year}`;
};

// ── Bold grid (matches the maintenance-log table style) ──
// The maintenance log table (renderMaintenanceHistoryTable in
// internalReportPdf.ts) uses a darker, heavier grid so every column and row
// boundary reads clearly. The logistics tables below share the same
// treatment: rows are boxed (left/right edges), column boundaries are heavy,
// and the header gets white dividers aligned to the grid underneath.

const LOGISTICS_GRID_COLOR = BRAND.hairlineDark;
const LOGISTICS_GRID_WIDTH = 0.35;

/** Draw the bold grid lines for one table row (boxed + column boundaries). */
const drawBoldGridRow = (
  doc: jsPDF,
  x: number,
  y: number,
  rowH: number,
  tableW: number,
  colWidths: number[],
): void => {
  doc.setDrawColor(...LOGISTICS_GRID_COLOR);
  doc.setLineWidth(LOGISTICS_GRID_WIDTH);
  // Box the row: left edge, every column boundary, right edge. Boundaries
  // that would coincide with the right edge are skipped — the right edge is
  // drawn once at the end (filtered columns don't span the full width).
  doc.line(x, y, x, y + rowH);
  let cx = x;
  for (let i = 0; i < colWidths.length; i++) {
    cx += colWidths[i];
    if (cx < x + tableW) {
      doc.line(cx, y, cx, y + rowH);
    }
  }
  doc.line(x + tableW, y, x + tableW, y + rowH);
};

/** White header dividers + bold bottom rule, aligned to the grid below. */
const drawBoldHeaderGrid = (
  doc: jsPDF,
  x: number,
  y: number,
  headerH: number,
  tableW: number,
  colWidths: number[],
): void => {
  doc.setDrawColor(...LOGISTICS_GRID_COLOR);
  doc.setLineWidth(LOGISTICS_GRID_WIDTH);
  doc.line(x, y + headerH, x + tableW, y + headerH);
  let hx = x;
  for (let i = 0; i < colWidths.length; i++) {
    hx += colWidths[i];
    if (hx < x + tableW) {
      doc.setDrawColor(...BRAND.white);
      doc.setLineWidth(0.2);
      doc.line(hx, y + 1.2, hx, y + headerH - 1.2);
    }
  }
};

// ── Logistics Details sub-row (shared between internal & client reports) ──

/**
 * Draw the "Details" sub-row for one logistics operation: a compact band under
 * the operation row where each column is one work section (Issues | Parts |
 * Services). Sections are side-by-side instead of stacked, so the report stays
 * compact and each section is easy to scan.
 *
 * @param showCosts When true, services/parts include their per-item cost
 *   breakdown (unit × count = total). Internal reports pass true; client-facing
 *   reports pass false (maintenance costs are internal-only).
 * @returns The next Y position after the band (unchanged when nothing to draw).
 */
export const drawLogisticsDetailsRow = (
  doc: jsPDF,
  op: LogisticsOperation,
  x: number,
  y: number,
  width: number,
  options?: { showCosts?: boolean },
): number => {
  const showCosts = options?.showCosts ?? true;
  const issues = op.maintenance_issues ?? [];
  const services = op.maintenance_services ?? [];
  const parts = op.maintenance_parts ?? [];

  type DetailItem = {
    name: string;
    count: number;
    unitCost?: number;
    totalCost?: number;
  };
  const sections: Array<{ key: "issues" | "services" | "parts"; items: DetailItem[] }> = [];
  if (issues.length > 0) {
    sections.push({
      key: "issues",
      items: issues.map((name) => ({ name, count: 1 })),
    });
  }
  if (services.length > 0) {
    sections.push({
      key: "services",
      items: services
        .map((s) => getLogisticsWorkItemDisplay(s.name, s.count, s.cost, "service"))
        .sort((a, b) => b.count - a.count),
    });
  }
  if (parts.length > 0) {
    sections.push({
      key: "parts",
      items: parts
        .map((p) => getLogisticsWorkItemDisplay(p.name, p.count, p.cost, "part"))
        .sort((a, b) => b.count - a.count),
    });
  }
  const hasLegacy = sections.length === 0 && Boolean(op.work_done);
  if (sections.length === 0 && !hasLegacy) return y;

  const labelW = 16;
  const colGap = 2;
  const colsW = width - labelW - colGap * Math.max(0, sections.length - 1);
  const colW = sections.length > 0 ? colsW / sections.length : width - 20;
  const lineH = 3.1;
  const headerH = 4.5;
  const padY = 2;
  // Keep each item as a real visual block: subtitle, breathing room, rule,
  // then breathing room before the next item's main row. The previous 0.8mm
  // gap put the rule almost on top of wrapped Arabic subtitles.
  // `itemY` is advanced to the next hypothetical baseline after each text
  // line. Place the separator halfway between the last baseline and the next
  // baseline; placing it after `itemY` makes it cross the next item's glyphs.
  const separatorOffset = lineH / 2;
  // Extra baseline-space after the separator keeps the next item's ascenders
  // clear of the rule while remaining compact.
  const itemGap = 1.8;
  const mainFontSize = 5.5;
  const subtitleFontSize = 4.8;
  const costColW = showCosts ? 14 : 0;
  const leftW = Math.max(8, colW - 9 - costColW);

  type RenderItem = {
    item: DetailItem;
    mainLines: string[];
    /** Arabic item-name lines rendered separately from the LTR price. */
    subtitleNameLines: string[];
    /** LTR price fragment (e.g. "= 350 EGP") rendered at the right edge. */
    subtitleCostText?: string;
    totalText?: string;
    hasSubtitle: boolean;
  };
  const renderedSections: RenderItem[][] = sections.map((section) =>
    section.items.map((item) => {
      const main = `${formatEnNumber(item.count)} ${item.name}`;
      const hasSubtitle = item.unitCost !== undefined && showCosts;

      // Measure each line using the same font size used when it is drawn. Do
      // not measure or draw the Arabic name and Latin price as one mixed RTL
      // string: jsPDF's bidi pass can legitimately move the price to the front
      // (or split EGP onto another line). They are separate visual fragments:
      // Arabic name on the left, "= 350 EGP" on the right.
      doc.setFont("Amiri", "normal");
      doc.setFontSize(mainFontSize);
      const mainLines = doc.splitTextToSize(rtl(main), leftW);
      doc.setFontSize(subtitleFontSize);
      const subtitleNameLines = hasSubtitle
        ? doc.splitTextToSize(rtl(item.name), leftW)
        : [];

      return {
        item,
        mainLines,
        subtitleNameLines,
        subtitleCostText: hasSubtitle ? `= ${formatPdfCurrencyEn(item.unitCost)}` : undefined,
        totalText: item.totalCost !== undefined && showCosts
          ? formatPdfCurrencyEn(item.totalCost)
          : undefined,
        hasSubtitle,
      };
    }),
  );
  const legacyLines = hasLegacy ? doc.splitTextToSize(rtl(op.work_done as string), width - 20) : [];

  const maxSectionH = Math.max(
    0,
    ...renderedSections.map((items) =>
      items.reduce((acc, rendered) => {
        const itemHeight = rendered.mainLines.length * lineH
          + (rendered.hasSubtitle ? rendered.subtitleNameLines.length * lineH : 0);
        return acc + itemHeight;
      }, 0) + Math.max(0, items.length - 1) * itemGap,
    ),
    legacyLines.length * lineH,
  );
  const rowH = Math.max(9, padY + headerH + 1 + maxSectionH + 1);

  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + rowH > pageHeight - 14) {
    doc.addPage();
    y = 14;
  }

  doc.setFillColor(...BRAND.cream);
  doc.setDrawColor(...LOGISTICS_GRID_COLOR);
  doc.setLineWidth(LOGISTICS_GRID_WIDTH);
  doc.rect(x, y, width, rowH, "FD");

  doc.setFont("Amiri", "bold");
  doc.setFontSize(5.5);
  doc.setTextColor(...BRAND.textMuted);
  pdfText(doc, "Details", x + 3, y + padY + 3, { align: "left" });
  doc.setDrawColor(...LOGISTICS_GRID_COLOR);
  doc.setLineWidth(LOGISTICS_GRID_WIDTH);
  doc.line(x + labelW, y, x + labelW, y + rowH);

  sections.forEach((section, si) => {
    const cx = x + labelW + si * (colW + colGap);
    const sectionIcon: PdfIconName = section.key === "issues" ? "alert" : section.key === "services" ? "wrench" : "package";
    drawIconBadge(doc, cx + 3, y + padY + 2.8, sectionIcon, BRAND.primary, 1.5);
    doc.setFont("Amiri", "bold");
    doc.setFontSize(5.8);
    doc.setTextColor(...BRAND.primary);
    pdfText(doc, `${MAINTENANCE_SECTION_LABELS_EN[section.key]}:`, cx + 7, y + padY + 2.5, { align: "left" });
    if (showCosts && section.key !== "issues") {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(4.2);
      doc.setTextColor(...BRAND.textMuted);
      pdfText(doc, "Cost", cx + colW - 3, y + padY + 2.5, { align: "right" });
    }

    if (si < sections.length - 1) {
      doc.setDrawColor(...LOGISTICS_GRID_COLOR);
      doc.setLineWidth(LOGISTICS_GRID_WIDTH);
      doc.line(cx + colW + colGap / 2, y, cx + colW + colGap / 2, y + rowH);
    }

    doc.setFont("Amiri", "normal");
    doc.setFontSize(mainFontSize);
    doc.setTextColor(...BRAND.textSecondary);
    let itemY = y + padY + headerH + 1;
    renderedSections[si].forEach((rendered, itemIndex) => {
      // Re-apply the main-row font after every subtitle. Without this reset,
      // the next item inherited the subtitle's smaller font and its baseline
      // appeared visually too close to the separator.
      doc.setFont("Amiri", "normal");
      doc.setFontSize(mainFontSize);
      doc.setTextColor(...BRAND.textSecondary);
      rendered.mainLines.forEach((line, lineIndex) => {
        pdfText(doc, line, cx + 7, itemY, { align: "left" });
        if (lineIndex === 0 && rendered.totalText) {
          pdfText(doc, rendered.totalText, cx + colW - 3, itemY, { align: "right" });
        }
        itemY += lineH;
      });
      rendered.subtitleNameLines.forEach((line, subtitleIndex) => {
        doc.setFont("Amiri", "normal");
        doc.setFontSize(subtitleFontSize);
        doc.setTextColor(...BRAND.textMuted);
        pdfText(doc, line, cx + 7, itemY, { align: "left" });
        // Keep the price on the same baseline as the first subtitle line and
        // render it as an LTR-only fragment, avoiding Arabic/Latin bidi mixing.
        if (subtitleIndex === 0 && rendered.subtitleCostText) {
          pdfText(doc, rendered.subtitleCostText, cx + colW - 3, itemY, { align: "right" });
        }
        itemY += lineH;
      });
      if (itemIndex < renderedSections[si].length - 1) {
        doc.setDrawColor(...BRAND.hairline);
        doc.setLineWidth(0.12);
        // `itemY` now points one line-height below the last rendered baseline.
        // Draw the rule back inside the gap, then advance to the next item's
        // baseline. This guarantees the rule cannot cross the next item.
        doc.line(cx + 7, itemY - lineH + separatorOffset, cx + colW - 3, itemY - lineH + separatorOffset);
        itemY += itemGap;
      }
    });
  });

  if (legacyLines.length > 0) {
    doc.setFont("Amiri", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...BRAND.textSecondary);
    legacyLines.forEach((line, index) => {
      pdfText(doc, line, x + labelW + 2, y + padY + headerH + 1 + index * lineH, { align: "left" });
    });
  }

  return y + rowH + 2;
};

// ── Logistics Operations Table (shared between internal reports) ──

/**
 * Draw a logistics operations table with full cost columns (internal report).
 * Returns the Y position after the table.
 */
export const drawLogisticsOperationsTable = (
  doc: jsPDF,
  operations: LogisticsOperation[],
  y: number,
  margin: number,
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableW = pageWidth - margin * 2;
  const colWidths = [
    tableW * 0.13, tableW * 0.17, tableW * 0.14, tableW * 0.10,
    tableW * 0.10, tableW * 0.11, tableW * 0.11, tableW * 0.14,
  ];
  const x = margin;
  const lineH = 3.1;
  const minRowH = 9;

  // Header + bold grid, redrawn after a page break so boxed rows on later
  // pages keep their column labels (same as the maintenance-log renderer).
  const drawHeaderAt = (hy: number): number => {
    const ny = drawTableHeader(
      doc,
      ["Operation", "Category", "Status", "Open Date", "Close Date", "Rental", "Maintenance", "Total Cost"],
      colWidths, x, hy, tableW,
    );
    drawBoldHeaderGrid(doc, x, hy, 8, tableW, colWidths);
    return ny;
  };
  let nextY = drawHeaderAt(y);

  operations.forEach((op, i) => {
    const clientMachine = formatMachineDescription(op.machine_category, op.machine_type, op.machine_name) || "—";
    const givenMachine = formatMachineDescription(op.given_machine_category, op.given_machine_type, op.given_machine_name);

    // Wrap machine descriptions within the category column so long labels
    // don't bleed into adjacent columns (doc.text does not wrap). Shape each
    // value through rtl() first — custom Arabic categories/types must render
    // with joined letters, not raw codepoints.
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    const catWidth = colWidths[1];
    const clientLines: string[] = doc.splitTextToSize(rtl(clientMachine), catWidth - 2);
    const givenLines: string[] = givenMachine
      ? doc.splitTextToSize(rtl(`Given: ${givenMachine}`), catWidth - 2)
      : [];

    // Summary row height: client + given machine lines only. The work
    // performed (issues/services/parts) is shown in its own Details band
    // below the row, so each row stays compact.
    const contentLines = clientLines.length + givenLines.length;
    const rowH = Math.max(minRowH, contentLines * lineH + 4);

    const prevY = nextY;
    nextY = checkPageBreak(doc, nextY, rowH + 2);
    if (nextY < prevY) nextY = drawHeaderAt(nextY);
    if (i % 2 === 1) {
      doc.setFillColor(...BRAND.cream);
      doc.rect(x, nextY, tableW, rowH, "F");
    }
    // Bold boxed grid around the summary row.
    drawBoldGridRow(doc, x, nextY, rowH, tableW, colWidths);

    const cells = [
      LOGISTICS_TYPE_LABELS_EN[op.operation_type] || op.operation_type,
      clientMachine,
      op.status === "open" ? "Open" : "Closed",
      op.open_date ? formatDateEn(op.open_date) : "—",
      op.close_date ? formatDateEn(op.close_date) : "—",
      op.total_rental_cost != null ? formatPdfCurrencyEn(op.total_rental_cost) : "—",
      op.maintenance_cost != null ? formatPdfCurrencyEn(op.maintenance_cost) : "—",
      op.total_logistics_cost != null ? formatPdfCurrencyEn(op.total_logistics_cost) : "—",
    ];
    const aligns: Array<"left" | "right" | "center"> = ["left", "left", "center", "left", "left", "right", "right", "right"];
    const catLeftX = x + colWidths[0];

    let baseline = nextY + 3.5;

    // Category column (client machine) — wrapped lines
    clientLines.forEach((line, li) => {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.text);
      pdfText(doc, line, catLeftX + 2, baseline, { align: "left" });

      // All other columns only on the first baseline
      if (li === 0) {
        let cx = x;
        cells.forEach((cell, idx) => {
          if (idx === 1) {
            cx += colWidths[idx];
            return;
          }
          const w = colWidths[idx];
          const align = aligns[idx];
          doc.setFont("Amiri", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...BRAND.text);
          const textX = align === "left" ? cx + 2 : align === "center" ? cx + w / 2 : cx + w - 2;
          pdfText(doc, cell, textX, baseline, { align });
          cx += w;
        });

        // Operation number — small and muted, below the type label, aligned
        // to the left edge of column 0 (catLeftX is the col 0/1 boundary).
        doc.setFont("Amiri", "normal");
        doc.setFontSize(5.5);
        doc.setTextColor(...BRAND.textMuted);
        pdfText(doc, `#${formatEnNumber(i + 1)}`, x + 2, baseline + lineH, { align: "left" });
      }
      baseline += lineH;
    });

    // Given-machine lines (smaller, muted)
    doc.setFont("Amiri", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...BRAND.textMuted);
    givenLines.forEach((line) => {
      pdfText(doc, line, catLeftX + 2, baseline, { align: "left" });
      baseline += lineH;
    });

    // Details band below the row — Issues | Parts | Services as side-by-side
    // boxed columns with per-item cost breakdowns (internal report).
    nextY = drawLogisticsDetailsRow(doc, op, x, nextY + rowH, tableW, { showCosts: true });
  });

  return nextY + 10;
};

// ── Client-facing Logistics Operations Table ──

/**
 * Draw a client-facing logistics operations table: one compact summary row
 * per operation (operation type + number, client/given machine, status,
 * dates, rental cost, client total) followed by a "Details" band where the
 * work performed is shown as side-by-side columns (Issues | Parts |
 * Services). Maintenance costs are internal-only and are excluded from the
 * client-facing "Total Logistics" figure and from the details items.
 *
 * @returns The Y position after the table.
 */
export const drawClientLogisticsTable = (
  doc: jsPDF,
  operations: LogisticsOperation[],
  y: number,
  margin: number,
  options?: { includeCosts?: boolean; headerColor?: [number, number, number] },
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableW = pageWidth - margin * 2;
  const includeCosts = options?.includeCosts ?? false;
  const headerColor = options?.headerColor ?? BRAND.primary;
  const x = margin;
  const lineH = 3.1;
  const minRowH = 9;

  const headers = ["Operation", "Client Machine", "Given Machine", "Status", "Open Date", "Close Date"];
  if (includeCosts) {
    headers.push("Rental Cost", "Total Logistics");
  }
  const colWidths = includeCosts
    ? [tableW * 0.14, tableW * 0.17, tableW * 0.15, tableW * 0.09, tableW * 0.12, tableW * 0.12, tableW * 0.10, tableW * 0.11]
    : [tableW * 0.16, tableW * 0.21, tableW * 0.19, tableW * 0.10, tableW * 0.17, tableW * 0.17];

  // Header row (client theme color, e.g. teal for the client PDFs), redrawn
  // after a page break so boxed rows on later pages keep their column labels.
  const drawHeaderAt = (hy: number): number => {
    doc.setFillColor(...headerColor);
    doc.rect(x, hy, tableW, 8, "F");
    let hx = x;
    headers.forEach((header, i) => {
      doc.setFont("Amiri", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.white);
      pdfText(doc, header, hx + 2, hy + 5, { align: "left" });
      hx += colWidths[i];
    });
    // Bold grid under the header (white dividers + heavy bottom rule).
    drawBoldHeaderGrid(doc, x, hy, 8, tableW, colWidths);
    return hy + 8;
  };
  let nextY = drawHeaderAt(y);

  operations.forEach((op, i) => {
    const clientMachine = formatMachineDescription(op.machine_category, op.machine_type, op.machine_name) || "—";
    const givenMachine = formatMachineDescription(op.given_machine_category, op.given_machine_type, op.given_machine_name);

    // Wrap machine descriptions within their columns (doc.text does not wrap).
    // Shape each value through rtl() first — custom Arabic categories/types
    // must render with joined letters, not raw codepoints.
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    const clientLines: string[] = doc.splitTextToSize(rtl(clientMachine), colWidths[1] - 2);
    const givenLines: string[] = givenMachine
      ? doc.splitTextToSize(rtl(givenMachine), colWidths[2] - 2)
      : [];

    // Column 0: operation type (bold) + number (muted, below). Wrap the type
    // so long labels like "Pickup + Deliver" never bleed into column 1.
    const typeLabel = LOGISTICS_TYPE_LABELS_EN[op.operation_type] || op.operation_type;
    doc.setFont("Amiri", "bold");
    doc.setFontSize(7);
    const typeLines: string[] = doc.splitTextToSize(rtl(typeLabel), colWidths[0] - 2);

    const contentLines = Math.max(clientLines.length, givenLines.length, typeLines.length);
    const rowH = Math.max(minRowH, contentLines * lineH + 4);

    const prevY = nextY;
    nextY = checkPageBreak(doc, nextY, rowH + 2);
    if (nextY < prevY) nextY = drawHeaderAt(nextY);
    if (i % 2 === 1) {
      doc.setFillColor(...BRAND.cream);
      doc.rect(x, nextY, tableW, rowH, "F");
    }
    // Bold boxed grid around the summary row.
    drawBoldGridRow(doc, x, nextY, rowH, tableW, colWidths);

    // Column 0 lines (operation type, bold, wrapped). The #N number is drawn
    // below ALL type lines (after the loop) so it never collides with a
    // wrapped second line of a long/custom operation type.
    let baseline = nextY + 3.5;
    typeLines.forEach((line) => {
      doc.setFont("Amiri", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.text);
      pdfText(doc, line, x + 2, baseline, { align: "left" });
      baseline += lineH;
    });
    doc.setFont("Amiri", "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...BRAND.textMuted);
    pdfText(doc, `#${formatEnNumber(i + 1)}`, x + 2, baseline, { align: "left" });

    // Client machine lines (column 1)
    baseline = nextY + 3.5;
    clientLines.forEach((line) => {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.text);
      pdfText(doc, line, x + colWidths[0] + 2, baseline, { align: "left" });
      baseline += lineH;
    });

    // Given machine lines (column 2)
    baseline = nextY + 3.5;
    givenLines.forEach((line) => {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.text);
      pdfText(doc, line, x + colWidths[0] + colWidths[1] + 2, baseline, { align: "left" });
      baseline += lineH;
    });

    // Remaining columns on the first baseline: status | open | close [| rental | total]
    const tailCells: string[] = [
      op.status === "open" ? "Open" : "Closed",
      op.open_date || "—",
      op.close_date || "—",
    ];
    if (includeCosts) {
      tailCells.push(op.total_rental_cost != null ? formatPdfCurrencyEn(op.total_rental_cost) : "—");
      // Maintenance cost is internal-only — exclude it from client-facing totals
      const clientTotal =
        op.total_logistics_cost != null
          ? Math.max(0, op.total_logistics_cost - (op.maintenance_cost ?? 0))
          : null;
      tailCells.push(clientTotal != null ? formatPdfCurrencyEn(clientTotal) : "—");
    }
    let cx = x + colWidths[0] + colWidths[1] + colWidths[2];
    const tailAligns: Array<"left" | "center" | "right"> = includeCosts
      ? ["center", "left", "left", "right", "right"]
      : ["center", "left", "left"];
    tailCells.forEach((cell, idx) => {
      const w = colWidths[idx + 3];
      const align = tailAligns[idx];
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.text);
      const textX = align === "left" ? cx + 2 : align === "center" ? cx + w / 2 : cx + w - 2;
      pdfText(doc, cell, textX, nextY + 3.5, { align });
      cx += w;
    });

    // Details band below the row — Issues | Parts | Services (no maintenance
    // costs shown to the client).
    nextY = drawLogisticsDetailsRow(doc, op, x, nextY + rowH, tableW, { showCosts: false });
  });

  return nextY + 10;
};

// ── Legacy exports (kept for compatibility) ──
export interface FinancialRow {
  label: string;
  amount: number;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  indent?: boolean;
}
