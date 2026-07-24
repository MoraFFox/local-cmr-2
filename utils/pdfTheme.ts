/** @format */

import jsPDF from "jspdf";
import { reshapeArabic } from "./arabicText";
import { LogoAssets } from "./pdfGenerator";
import { formatPdfCurrency, formatEnNumber } from "./costAggregation";

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

const rtl = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return "";
  return reshapeArabic(String(text), true);
};

// ── Layout constants ──
const MARGIN = 10; // PDF internal margin
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// ── Small icon helper: colored circle with a glyph ──
const drawIcon = (
  doc: jsPDF,
  x: number,
  y: number,
  glyph: string,
  color: [number, number, number] = BRAND.primary,
  size: number = 3.5,
): void => {
  doc.setFillColor(...color);
  doc.circle(x, y, size, "F");
  doc.setFont("Amiri", "bold");
  doc.setFontSize(size * 2.2);
  doc.setTextColor(...BRAND.white);
  doc.text(glyph, x, y + 1, { align: "center" });
};

// ── Header ──
export const drawInternalHeader = (
  doc: jsPDF,
  companyName: string,
  branchName?: string,
  assets?: LogoAssets | null,
  period?: string,
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerH = 38; // mm

  // Corporate header bar
  doc.setFillColor(...BRAND.header);
  doc.rect(0, 0, pageWidth, headerH, "F");

  // Subtle accent line below header
  doc.setFillColor(...BRAND.headerLight);
  doc.rect(0, headerH, pageWidth, 1.2, "F");

  // Logo image (or fallback to company name text)
  const fallbackLogoText = companyName || "Mido's for Distribution";
  let logoRendered = false;

  if (assets?.logo) {
    try {
      // Cap the rendered width so a very wide logo does not overlap
      // the right-side title block. Preserve aspect ratio.
      const targetH = 16;
      const maxLogoW = 45;
      let logoW = 0;
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

  if (!logoRendered) {
    doc.setFont("Amiri", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...BRAND.white);
    doc.text(rtl(fallbackLogoText), MARGIN, 16, { align: "left" });
  }

  // Title block (right side for RTL)
  const titleX = pageWidth - MARGIN;
  doc.setFont("Amiri", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND.white);
  const displayName = branchName ? `${companyName} — ${branchName}` : companyName;
  doc.text(rtl(displayName), titleX, 13, { align: "right" });

  doc.setFont("Amiri", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.white);
  doc.text(rtl("تقرير صيانة"), titleX, 21, { align: "right" });

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
  const dateStr = `${String(today.getDate()).padStart(2, "0")} ${today.toLocaleDateString("ar-EG", { month: "long" })} ${String(today.getFullYear())}`;

  // Distributed evenly: report | date | period | company
  const colW = pageWidth / 4;
  const metaItems = [
    { label: "رقم التقرير:", value: reportNum },
    { label: "تاريخ الإصدار:", value: dateStr },
    { label: period ? "الفترة:" : "", value: period || "" },
  ];

  // Right section: report number + date + period (spread across right 3/4)
  let metaX = pageWidth - MARGIN;
  for (let i = metaItems.length - 1; i >= 0; i--) {
    const item = metaItems[i];
    if (!item.label) continue;
    doc.text(rtl(`${item.label} ${item.value}`), metaX, metaY, { align: "right" });
    metaX -= colW;
  }

  // Left: company name
  doc.text(rtl(companyName || "Mido's for Distribution"), MARGIN, metaY, { align: "left" });

  return headerH + 18;
};

// ── Footer ──
export const drawInternalFooter = (
  doc: jsPDF,
  pageCount: number,
  currentPage: number,
  generatedBy = "نظام CMR",
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
  doc.text(rtl(footerCompany), MARGIN, pageHeight - 4.5, { align: "left" });
  doc.text(rtl(`صفحة ${formatEnNumber(currentPage)} من ${formatEnNumber(pageCount)}`), pageWidth / 2, pageHeight - 4.5, { align: "center" });
  doc.text(rtl(`${generatedBy} — تم إنشاؤه`), pageWidth - MARGIN, pageHeight - 4.5, { align: "right" });
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
export const drawSectionHeader = (
  doc: jsPDF,
  title: string,
  y: number,
  options?: { x?: number; width?: number },
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const x = options?.x ?? MARGIN;
  const width = options?.width ?? pageWidth - MARGIN * 2;

  doc.setFillColor(...BRAND.cream2);
  doc.setDrawColor(...BRAND.hairline);
  doc.roundedRect(x, y, width, 9, 1.5, 1.5, "FD");

  doc.setFillColor(...BRAND.primary);
  doc.rect(x, y, 2.5, 9, "F");

  doc.setFont("Amiri", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.text);
  doc.text(rtl(title), x + width - 4, y + 5.5, { align: "right" });

  return y + 12;
};

// ── KPI Card ──
export interface KPICard {
  icon: string;
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

export const drawKPICards = (doc: jsPDF, cards: KPICard[], y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardCount = cards.length;
  const gap = 3;
  const availableWidth = pageWidth - MARGIN * 2 - gap * (cardCount - 1);
  const cardW = availableWidth / cardCount;
  const cardH = 25;

  cards.forEach((card, i) => {
    const x = MARGIN + i * (cardW + gap);
    const borderColor = variantColor(card.variant);

    doc.setFillColor(...BRAND.white);
    doc.setDrawColor(...BRAND.hairline);
    doc.roundedRect(x, y, cardW, cardH, 2, 2, "FD");

    doc.setFillColor(...borderColor);
    doc.rect(x, y, cardW, 2.5, "F");

    // Value (already formatted; do NOT reshape currency strings)
    doc.setFont("Amiri", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...BRAND.text);
    doc.text(card.value, x + cardW - 5, y + 13, { align: "right" });

    // Label
    doc.setFont("Amiri", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.textMuted);
    doc.text(rtl(card.label), x + cardW - 5, y + 18, { align: "right" });

    // Sublabel
    if (card.sublabel) {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(6.5);
      const subColor = card.variant === "good" ? BRAND.success : card.variant === "warn" ? BRAND.warning : BRAND.textMuted;
      doc.setTextColor(...subColor);
      doc.text(rtl(card.sublabel), x + cardW - 5, y + 22, { align: "right" });
    }
  });

  return y + cardH + 8;
};

// ── Financial Summary (3-column table matching HTML preview) ──
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
}

export const drawFinancialSummary = (
  doc: jsPDF,
  categories: FinancialCategory[],
  grandTotal: number,
  clientTotal: number,
  y: number,
): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableW = pageWidth / 2 - MARGIN - 6;
  const x = pageWidth / 2 + 3;
  const rowH = 5.5;
  // RTL columns (right→left): item | detail | amount
  const colAmountW = tableW * 0.30;
  const colDetailW = tableW * 0.26;
  const colItemW = tableW - colAmountW - colDetailW;

  let totalRows = 2;
  categories.forEach((c) => (totalRows += 1 + c.lines.length));
  if (clientTotal > 0) totalRows += 1;
  const totalH = Math.max(totalRows * rowH + 14, 60);

  doc.setFillColor(...BRAND.cream);
  doc.setDrawColor(...BRAND.hairline);
  doc.roundedRect(x, y, tableW, totalH, 2, 2, "FD");

  let rowY = y + 5;

  // Table headers (RTL: item | detail | amount)
  doc.setFillColor(...BRAND.primary);
  doc.rect(x, rowY, tableW, rowH, "F");
  doc.setFont("Amiri", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.white);
  doc.text(rtl("البند"), x + tableW - 4, rowY + 4, { align: "right" });
  doc.text(rtl("التفاصيل"), x + tableW - colItemW - 4, rowY + 4, { align: "right" });
  doc.text(rtl("المبلغ"), x + colAmountW - 2, rowY + 4, { align: "right" });
  rowY += rowH;

  categories.forEach((category) => {
    // Category header row
    doc.setFillColor(...BRAND.cream2);
    doc.rect(x, rowY, tableW, rowH, "F");
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.text);
    doc.text(rtl(category.title), x + tableW - 4, rowY + 4, { align: "right" });
    doc.text(formatPdfCurrency(category.total), x + colAmountW - 2, rowY + 4, { align: "right" });
    rowY += rowH;

    // Lines
    category.lines.forEach((line, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(...BRAND.white);
        doc.rect(x, rowY, tableW, rowH, "F");
      }
      doc.setFont("Amiri", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.text);

      const indent = (line.indent || 0) * 3;
      doc.text(rtl(line.name), x + tableW - 6 - indent, rowY + 4, { align: "right" });
      if (line.detail) {
        doc.setTextColor(...BRAND.textMuted);
        doc.text(rtl(line.detail), x + tableW - colItemW - 6 - indent, rowY + 4, { align: "right" });
        doc.setTextColor(...BRAND.text);
      }
      doc.text(formatPdfCurrency(line.total), x + colAmountW - 2, rowY + 4, { align: "right" });
      rowY += rowH;
    });
  });

  // Grand total
  doc.setDrawColor(...BRAND.primary);
  doc.line(x + 2, rowY + 1, x + tableW - 2, rowY + 1);
  rowY += 3;
  doc.setFont("Amiri", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.primary);
  doc.text(rtl("صافي التكلفة على الشركة"), x + tableW - 4, rowY + 4, { align: "right" });
  doc.text(formatPdfCurrency(grandTotal), x + colAmountW - 2, rowY + 4, { align: "right" });
  rowY += rowH + 2;

  // Client total
  if (clientTotal > 0) {
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.warning);
    doc.text(rtl("إجمالي فاتورة العميل"), x + tableW - 4, rowY + 4, { align: "right" });
    doc.text(formatPdfCurrency(clientTotal), x + colAmountW - 2, rowY + 4, { align: "right" });
    rowY += rowH;
  }

  return Math.max(y + totalH, rowY + 4);
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
  const headers = ["المنطقة", "الرسوم", "الزيارات", "الإجمالي"];
  const colW = tableW / 4;
  headers.forEach((h, i) => {
    doc.text(rtl(h), x + tableW - (i + 0.5) * colW, y + 4, { align: "center" });
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
    const cells = [label, formatPdfCurrency(z.rate), formatEnNumber(z.visits), formatPdfCurrency(z.total)];
    cells.forEach((cell, idx) => {
      doc.text(cell, x + tableW - (idx + 0.5) * colW, rowY + 4, { align: "center" });
    });
    rowY += rowH;
  });

  // Total row
  doc.setDrawColor(...BRAND.hairlineDark);
  doc.line(x, rowY, x + tableW, rowY);
  doc.setFont("Amiri", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BRAND.text);
  doc.text(rtl("إجمالي رسوم الزيارات"), x + 2, rowY + 4, { align: "left" });
  doc.text(formatPdfCurrency(total), x + tableW - 2, rowY + 4, { align: "right" });

  return rowY + rowH + 3;
};

// ── Info Box ──
export interface InfoItem {
  label: string;
  value: string;
  icon?: string;
}

export const drawInfoBox = (doc: jsPDF, items: InfoItem[], y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableW = pageWidth / 2 - MARGIN - 6;
  const x = MARGIN;
  const rowH = 5.5;
  const totalH = items.length * rowH + 8;

  doc.setFillColor(...BRAND.cream);
  doc.setDrawColor(...BRAND.hairline);
  doc.roundedRect(x, y, tableW, totalH, 2, 2, "FD");

  let rowY = y + 6;
  items.forEach((item) => {
    const icon = item.icon || "";
    if (icon) {
      drawIcon(doc, x + tableW - 6, rowY + 2.5, icon, BRAND.textMuted, 2);
    }

    // Label on right (RTL), value on left — with safe gap
    const labelX = icon ? x + tableW - 10 : x + tableW - 4;
    doc.setFont("Amiri", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.textMuted);
    doc.text(rtl(item.label), labelX, rowY + 3, { align: "right" });

    // Value left-aligned — info-box values are typically short (email, address, "—")
    // and won't overflow the ~89mm column at 7pt, so no truncation needed.
    doc.setFont("Amiri", "normal");
    doc.setTextColor(...BRAND.text);
    doc.text(rtl(item.value), x + 4, rowY + 3, { align: "left" });
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

export const drawContactCards = (doc: jsPDF, contacts: ContactInfo[], y: number): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const containerW = pageWidth / 2 - MARGIN - 6;
  const x = MARGIN;
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

    drawIcon(doc, cardX + cardW - 5, cardY + 4, "✆", BRAND.primary, 2.2);

    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.text);
    doc.text(rtl(contact.name), cardX + cardW - 8, cardY + 4, { align: "right" });

    doc.setFont("Amiri", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...BRAND.textMuted);
    doc.text(rtl(contact.role), cardX + cardW - 8, cardY + 8, { align: "right" });

    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.textSecondary);
    doc.text(contact.phone, cardX + 4, cardY + 12, { align: "left" });
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
  icon?: string;
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
    doc.rect(cardX + cardW - 2, cardY, 2, cardH, "F");

    drawIcon(doc, cardX + cardW - 6, cardY + 4, m.icon || "M", BRAND.primary, 2.5);

    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.text);
    doc.text(rtl(m.name), cardX + cardW - 9, cardY + 5, { align: "right" });

    const details: Array<{ label: string; value: string; isTotal?: boolean }> = [
      { label: "نوع العقد:", value: m.type },
      { label: "الإيجار اليومي:", value: formatPdfCurrency(m.dailyRate) },
      { label: "الأيام النشطة:", value: m.metric },
      { label: "الإجمالي:", value: formatPdfCurrency(m.total), isTotal: true },
    ];

    details.forEach((d, idx) => {
      doc.setFont("Amiri", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(...BRAND.textMuted);
      doc.text(rtl(d.label), cardX + cardW - 5, cardY + 9 + idx * 4, { align: "right" });
      doc.setFont("Amiri", "bold");
      doc.setTextColor(...(d.isTotal ? BRAND.primary : BRAND.text));
      doc.text(d.value, cardX + 4, cardY + 9 + idx * 4, { align: "left" });
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

  let cx = x + tableWidth;
  headers.forEach((header, i) => {
    const w = colWidths[i];
    doc.setFont("Amiri", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.white);
    doc.text(rtl(header), cx - 2, y + 5, { align: "right" });
    cx -= w;
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

  let cx = x + tableWidth;
  cells.forEach((cell, i) => {
    const w = colWidths[i];
    const align = alignments?.[i] || "right";
    doc.setFont("Amiri", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.text);

    const textX = align === "right" ? cx - 2 : align === "center" ? cx - w / 2 : cx - w + 2;
    doc.text(rtl(cell), textX, y + 4.5, { align });
    cx -= w;
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

// ── Legacy exports (kept for compatibility) ──
export interface FinancialRow {
  label: string;
  amount: number;
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
  indent?: boolean;
}
