/** @format */

import { FormData, Branch, Contact, Barista, ClientBarista } from "../types";
import { logger } from "./logger";
import jsPDF from "jspdf";
import { loadFonts } from "./pdfGenerator";
import ArabicReshaper from "arabic-persian-reshaper";
import {
  PDFDocument,
  PDFTextField,
  PDFDropdown,
  PDFCheckBox,
} from "pdf-lib";

// Brand colors from DESIGN.md (Brass & Cream)
const COLORS = {
  espresso: [36, 27, 22] as [number, number, number],
  espressoLight: [61, 44, 36] as [number, number, number],
  cream: [241, 234, 219] as [number, number, number],
  cream2: [232, 223, 204] as [number, number, number],
  paper: [250, 246, 239] as [number, number, number],
  copper: [184, 115, 51] as [number, number, number],
  brass: [201, 168, 106] as [number, number, number],
  ink: [61, 44, 36] as [number, number, number],
  latte: [138, 116, 104] as [number, number, number],
  hairline: [217, 207, 184] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export interface MissingDataOptions {
  /** Scope of the PDF: whole company or a single branch */
  scope: "company" | "branch";
  /** When scope is "branch", the branch id to focus on */
  branchId?: number;
  /** When "dynamic", only the 12 specified fields are checked */
  mode?: "dynamic" | "full";
  /** Include contacts section */
  includeContacts?: boolean;
  /** Include baristas section */
  includeBaristas?: boolean;
  /** Include client baristas section */
  includeClientBaristas?: boolean;
}

export interface MissingField {
  key: string;
  label: string;
  value?: string;
  type: "text" | "select" | "checkbox" | "number";
  options?: string[];
  required?: boolean;
}

export interface MissingFieldsResult {
  company: MissingField[];
  branches: Record<number, MissingField[]>;
  hasMissing: boolean;
}

/** Prepare Arabic text for jsPDF by applying shaping and RTL reversal */
const reshapeArabic = (text: string): string => {
  try {
    const reshaped = ArabicReshaper.convertArabic(text);
    return reshaped.split("").reverse().join("");
  } catch {
    return text;
  }
};

const isMissing = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
};

interface FieldLayout {
  x: number;
  y: number;
  width: number;
}

const addTextField = (
  doc: jsPDF,
  key: string,
  label: string,
  layout: FieldLayout,
  value?: string,
  required = false
): number => {
  const labelY = layout.y;
  doc.setFontSize(8);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...COLORS.latte);
  doc.text(reshapeArabic(label), layout.x, labelY);

  if (required) {
    const labelWidth = doc.getTextWidth(reshapeArabic(label));
    doc.setTextColor(220, 53, 69);
    doc.text("*", layout.x + labelWidth + 1, labelY);
    doc.setTextColor(...COLORS.latte);
  }

  const fieldY = layout.y + 4;
  const fieldHeight = 9;

  doc.setDrawColor(...COLORS.hairline);
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(layout.x, fieldY, layout.width, fieldHeight, 2, 2, "FD");

  const textField = new jsPDF.AcroForm.TextField();
  textField.x = layout.x + 1;
  textField.y = fieldY + 1;
  textField.width = layout.width - 2;
  textField.height = fieldHeight - 2;
  textField.fieldName = key;
  textField.defaultValue = value || "";
  textField.value = value || "";
  textField.multiline = false;
  textField.fontName = "Amiri";
  doc.addField(textField);

  return fieldY + fieldHeight + 4;
};

const addBinaryCheckboxField = (
  doc: jsPDF,
  key: string,
  label: string,
  options: string[],
  layout: FieldLayout
): number => {
  const labelY = layout.y;
  doc.setFontSize(8);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...COLORS.latte);
  doc.text(reshapeArabic(label), layout.x, labelY);

  const boxSize = 5;
  const startY = layout.y + 4;
  const optionSpacing = Math.min(45, layout.width / 2);

  options.forEach((option, index) => {
    const x = layout.x + index * optionSpacing;
    const checkBox = new jsPDF.AcroForm.CheckBox();
    checkBox.x = x;
    checkBox.y = startY;
    checkBox.width = boxSize;
    checkBox.height = boxSize;
    checkBox.fieldName = `${key}_${index}`;
    doc.addField(checkBox);

    doc.setDrawColor(...COLORS.hairline);
    doc.setFillColor(...COLORS.white);
    doc.roundedRect(x, startY, boxSize, boxSize, 1, 1, "FD");

    doc.setFont("Amiri", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    doc.text(reshapeArabic(option), x + boxSize + 2, startY + boxSize - 0.5);
  });

  return startY + boxSize + 4;
};

const addNumberField = (
  doc: jsPDF,
  key: string,
  label: string,
  layout: FieldLayout,
  value?: number
): number => {
  const labelY = layout.y;
  doc.setFontSize(8);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...COLORS.latte);
  doc.text(reshapeArabic(label), layout.x, labelY);

  const fieldY = layout.y + 4;
  const fieldHeight = 9;

  doc.setDrawColor(...COLORS.hairline);
  doc.setFillColor(...COLORS.white);
  doc.roundedRect(layout.x, fieldY, layout.width, fieldHeight, 2, 2, "FD");

  const textField = new jsPDF.AcroForm.TextField();
  textField.x = layout.x + 1;
  textField.y = fieldY + 1;
  textField.width = layout.width - 2;
  textField.height = fieldHeight - 2;
  textField.fieldName = key;
  textField.defaultValue = value !== undefined && value !== null ? String(value) : "";
  textField.value = value !== undefined && value !== null ? String(value) : "";
  textField.multiline = false;
  textField.fontName = "Amiri";
  doc.addField(textField);

  return fieldY + fieldHeight + 4;
};

const checkPageBreak = (doc: jsPDF, y: number, margin: number): number => {
  if (y > doc.internal.pageSize.height - margin - 20) {
    doc.addPage();
    return margin;
  }
  return y;
};

interface LogoAssets {
  logo: string | null;
  logoFormat: "PNG" | "JPEG";
}

export const getInitials = (companyName: string): string => {
  if (!companyName) return "?";
  const words = companyName.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const getLogoDimensions = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
};

const drawHeader = async (doc: jsPDF, data: FormData, pageWidth: number, margin: number, assets?: LogoAssets): Promise<number> => {
  const headerHeight = 42;
  const maxLogoWidth = 40;
  const targetLogoHeight = 18;
  let logoWidth = 0;
  let logoHeight = 0;

  if (assets?.logo) {
    const dims = await getLogoDimensions(assets.logo);
    if (dims.width > 0 && dims.height > 0) {
      const aspectRatio = dims.width / dims.height;
      logoHeight = targetLogoHeight;
      logoWidth = logoHeight * aspectRatio;
      if (logoWidth > maxLogoWidth) {
        logoWidth = maxLogoWidth;
        logoHeight = logoWidth / aspectRatio;
      }
    }
  }

  // Espresso background bar
  doc.setFillColor(...COLORS.espresso);
  doc.rect(0, 0, pageWidth, headerHeight, "F");

  // Brass accent line
  doc.setFillColor(...COLORS.brass);
  doc.rect(0, headerHeight, pageWidth, 2, "F");

  // Logo or initials badge on the right side of the header (RTL convention)
  const badgeSize = 20;
  const badgeX = pageWidth - margin - badgeSize;
  const badgeY = 11;

  if (assets?.logo && logoWidth > 0 && logoHeight > 0) {
    try {
      const logoX = pageWidth - margin - logoWidth;
      const logoY = 8 + (22 - logoHeight) / 2;
      doc.addImage(assets.logo, assets.logoFormat, logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      logger.warn("Failed to add logo to missing-data PDF", e, "pdf");
      // Fall through to initials badge
      drawInitialsBadge(doc, data, badgeX, badgeY, badgeSize);
    }
  } else {
    drawInitialsBadge(doc, data, badgeX, badgeY, badgeSize);
  }

  // Title block (right-aligned within the left side of the header for proper RTL)
  const textBlockRightEdge = pageWidth - margin - logoWidth - 6;
  doc.setFontSize(16);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...COLORS.cream);
  doc.text(reshapeArabic("طلب استكمال بيانات"), textBlockRightEdge, 18, { align: "right" });

  // Company name
  doc.setFontSize(10);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(...COLORS.cream);
  doc.text(reshapeArabic(`الشركة: ${data.companyName || "غير مسماة"}`), textBlockRightEdge, 27, { align: "right" });

  // Date
  const createdAt = new Date().toLocaleDateString("fr-FR");
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.latte);
  const dateLabel = reshapeArabic("تاريخ الإنشاء:");
  doc.text(dateLabel, textBlockRightEdge, 34, { align: "right" });
  const dateLabelWidth = doc.getTextWidth(dateLabel);
  doc.setTextColor(...COLORS.cream);
  doc.text(createdAt, textBlockRightEdge - dateLabelWidth - 2, 34, { align: "right" });

  return headerHeight + 8;
};

const drawInitialsBadge = (
  doc: jsPDF,
  data: FormData,
  x: number,
  y: number,
  size: number
) => {
  const initials = getInitials(data.companyName);

  // Circular badge background
  doc.setFillColor(...COLORS.cream);
  doc.setDrawColor(...COLORS.brass);
  doc.ellipse(x + size / 2, y + size / 2, size / 2, size / 2, "FD");

  // Initials text (vertically centered)
  doc.setFont("Amiri", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.espresso);
  const textWidth = doc.getTextWidth(initials);
  const textHeight = doc.getTextDimensions(initials).h;
  const textX = x + size / 2 - textWidth / 2;
  // Slight upward nudge because jsPDF text baseline sits lower than the visual center
  const textY = y + size / 2 + textHeight / 2 - 1;
  doc.text(initials, textX, textY);
};

const drawSectionHeader = (doc: jsPDF, title: string, x: number, y: number, pageWidth: number): number => {
  doc.setFillColor(...COLORS.cream2);
  doc.setDrawColor(...COLORS.hairline);
  doc.roundedRect(x, y, pageWidth - x * 2, 10, 2, 2, "FD");

  doc.setFontSize(11);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...COLORS.espresso);
  doc.text(reshapeArabic(title), x + 4, y + 6.5);

  return y + 14;
};

const drawInstructionsBox = (doc: jsPDF, x: number, y: number, pageWidth: number): number => {
  const margin = x;
  const boxWidth = pageWidth - margin * 2;
  const lineHeight = 5;
  const instructions = [
    "يرجى ملء الحقول التالية بالبيانات المطلوبة.",
    "يمكنك ملء هذا الملف مباشرة إذا كان برنامج قراءة PDF يدعم الحقول التفاعلية.",
    "للأسئلة ذات الخيارين، يرجى تحديد خيار واحد فقط.",
    "بعد الانتهاء، يرجى إرسال الملف مرة أخرى.",
  ];

  doc.setFontSize(8);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(...COLORS.espresso);
  const title = reshapeArabic("تعليمات:");
  const titleWidth = doc.getTextWidth(title);

  const boxHeight = 14 + instructions.length * lineHeight;

  doc.setFillColor(...COLORS.cream);
  doc.setDrawColor(...COLORS.brass);
  doc.roundedRect(margin, y, boxWidth, boxHeight, 3, 3, "FD");

  doc.text(title, margin + 4, y + 6);

  doc.setFont("Amiri", "normal");
  doc.setTextColor(...COLORS.ink);
  instructions.forEach((line, index) => {
    doc.text(reshapeArabic(line), margin + 8 + titleWidth, y + 6 + index * lineHeight);
  });

  return y + boxHeight + 6;
};

/** Find the first contact with a specific position, or return undefined */
const findContactByPosition = (
  contacts: Contact[],
  position: string
): Contact | undefined => {
  return contacts.find((c) => c.position === position);
};

/** Get the first non-empty phone number from a contact */
const getContactPhone = (contact?: Contact): string | undefined => {
  if (!contact) return undefined;
  const phone = contact.phoneNumbers.find((p) => !isMissing(p.number))?.number;
  return phone;
};

/** Build missing fields for a contact role (name, email, phone) */
const getRoleContactFields = (
  contacts: Contact[],
  position: string,
  roleTitle: string,
  prefix: string
): MissingField[] => {
  const fields: MissingField[] = [];
  const contact = findContactByPosition(contacts, position);

  if (!contact || isMissing(contact.name)) {
    fields.push({
      key: `${prefix}.${position}.name`,
      label: `اسم ${roleTitle}`,
      type: "text",
      required: true,
    });
  }
  if (!contact || isMissing(contact.email)) {
    fields.push({
      key: `${prefix}.${position}.email`,
      label: `بريد ${roleTitle}`,
      type: "text",
      required: true,
    });
  }
  if (!contact || isMissing(getContactPhone(contact))) {
    fields.push({
      key: `${prefix}.${position}.phone`,
      label: `موبايل ${roleTitle}`,
      type: "text",
      required: true,
    });
  }

  return fields;
};

/** Build exactly 3 barista slots; first 2 required, 3rd optional */
const getBaristaDynamicFields = (
  baristas: Barista[],
  prefix: string
): MissingField[] => {
  const fields: MissingField[] = [];

  for (let i = 0; i < 3; i++) {
    const barista = baristas[i];
    const required = i < 2;

    if (!barista || isMissing(barista.name)) {
      fields.push({
        key: `${prefix}.${i}.name`,
        label: `باريستا ${i + 1} - الاسم`,
        type: "text",
        required,
      });
    }
    if (!barista || isMissing(barista.phone)) {
      fields.push({
        key: `${prefix}.${i}.phone`,
        label: `باريستا ${i + 1} - رقم الموبايل`,
        type: "text",
        required,
      });
    }
  }

  return fields;
};

/** Build dynamic missing fields for the company level */
const getDynamicCompanyFields = (data: FormData): MissingField[] => {
  const fields: MissingField[] = [];

  // 1. Company head (CEO)
  fields.push(...getRoleContactFields(data.contacts, "chief", "مدير الشركه", "company.contacts"));

  // 2. Company location
  if (isMissing(data.location)) {
    fields.push({
      key: "company.location",
      label: "لوكشن الشركة",
      type: "text",
      required: true,
    });
  }

  // 3. Head of sales
  fields.push(...getRoleContactFields(data.contacts, "sales", "مدير المبيعات", "company.contacts"));

  // 4. Head of accounting
  fields.push(...getRoleContactFields(data.contacts, "accounting", "مدير الحسابات", "company.contacts"));

  // 5. Ops manager
  fields.push(...getRoleContactFields(data.contacts, "ops_manager", "مدير التشغيل", "company.contacts"));

  // 6. Branches
  if (data.hasBranches === null || data.hasBranches === undefined) {
    fields.push({
      key: "company.hasBranches",
      label: "هل لدى الشركة فروع؟",
      type: "select",
      options: ["نعم", "لا"],
      required: true,
    });
  }

  // 12. Allowed maintenance times (company level)
  if (isMissing(data.allowedMaintenanceTimes)) {
    fields.push({
      key: "company.allowedMaintenanceTimes",
      label: "مواعيد الصيانة المسموح بها",
      type: "text",
      required: false,
    });
  }

  // 13. Coffee consumption
  if (data.coffeeConsumptionKg === undefined || data.coffeeConsumptionKg === null) {
    fields.push({
      key: "company.coffeeConsumptionKg",
      label: "استهلاك القهوة بالكيلو",
      type: "number",
      required: false,
    });
  }

  // Baristas for single-location companies
  if (data.hasBranches === false) {
    fields.push(...getBaristaDynamicFields(data.baristas, "company.baristas"));
  }

  return fields;
};

/** Build dynamic missing fields for a single branch */
const getDynamicBranchFields = (branch: Branch, prefix: string): MissingField[] => {
  const fields: MissingField[] = [];

  // Branch name
  if (isMissing(branch.branchName)) {
    fields.push({
      key: `${prefix}.branchName`,
      label: "اسم الفرع",
      type: "text",
      required: true,
    });
  }

  // Branch location
  if (isMissing(branch.location)) {
    fields.push({
      key: `${prefix}.location`,
      label: "لوكشن الفرع",
      type: "text",
      required: true,
    });
  }

  // Branch manager
  fields.push(...getRoleContactFields(branch.contacts, "manager", "مدير الفرع", `${prefix}.contacts`));

  // Baristas (always 3 slots)
  fields.push(...getBaristaDynamicFields(branch.baristas, `${prefix}.baristas`));

  // Allowed maintenance times
  if (isMissing(branch.allowedMaintenanceTimes)) {
    fields.push({
      key: `${prefix}.allowedMaintenanceTimes`,
      label: "مواعيد الصيانة المسموح بها",
      type: "text",
      required: false,
    });
  }

  // Coffee consumption
  if (branch.coffeeConsumptionKg === undefined || branch.coffeeConsumptionKg === null) {
    fields.push({
      key: `${prefix}.coffeeConsumptionKg`,
      label: "استهلاك القهوة بالكيلو",
      type: "number",
      required: false,
    });
  }

  return fields;
};

const getCompanyProfileFields = (data: FormData): MissingField[] => {
  const fields: MissingField[] = [];

  if (isMissing(data.email))
    fields.push({ key: "company.email", label: "البريد الإلكتروني للشركة", type: "text" });
  if (isMissing(data.taxNumber))
    fields.push({ key: "company.taxNumber", label: "الرقم الضريبي للشركة", type: "text" });
  if (isMissing(data.location))
    fields.push({ key: "company.location", label: "موقع الشركة", type: "text" });

  if (data.hasBranches === null || data.hasBranches === undefined) {
    fields.push({
      key: "company.hasBranches",
      label: "هل لدى الشركة فروع؟",
      type: "select",
      options: ["نعم", "لا"],
    });
  }

  if (!data.hasBranches) {
    if (data.usesOurMachines === null || data.usesOurMachines === undefined) {
      fields.push({
        key: "company.usesOurMachines",
        label: "هل يستخدمون ماكيناتنا؟",
        type: "select",
        options: ["نعم", "لا"],
      });
    }

    if (data.usesOurMachines === true) {
      if (isMissing(data.machineOwnershipType)) {
        fields.push({
          key: "company.machineOwnershipType",
          label: "كيف تم الحصول على الماكينة؟",
          type: "select",
          options: ["شراء", "إيجار"],
        });
      }
      if (data.machineOwnershipType === "leased" && isMissing(data.dailyLeaseCost)) {
        fields.push({
          key: "company.dailyLeaseCost",
          label: "قيمة الإيجار اليومي (ج.م)",
          type: "number",
        });
      }
    }
  }

  return fields;
};

const getBranchProfileFields = (branch: Branch, prefix: string): MissingField[] => {
  const fields: MissingField[] = [];

  if (isMissing(branch.branchName))
    fields.push({ key: `${prefix}.branchName`, label: "اسم الفرع", type: "text" });
  if (isMissing(branch.email))
    fields.push({ key: `${prefix}.email`, label: "البريد الإلكتروني للفرع", type: "text" });
  if (isMissing(branch.taxNumber))
    fields.push({ key: `${prefix}.taxNumber`, label: "الرقم الضريبي للفرع", type: "text" });
  if (isMissing(branch.location))
    fields.push({ key: `${prefix}.location`, label: "موقع الفرع", type: "text" });

  if (branch.usesOurMachines === null || branch.usesOurMachines === undefined) {
    fields.push({
      key: `${prefix}.usesOurMachines`,
      label: "هل يستخدمون ماكيناتنا؟",
      type: "select",
      options: ["نعم", "لا"],
    });
  }

  if (branch.usesOurMachines === true) {
    if (isMissing(branch.machineOwnershipType)) {
      fields.push({
        key: `${prefix}.machineOwnershipType`,
        label: "كيف تم الحصول على الماكينة؟",
        type: "select",
        options: ["شراء", "إيجار"],
      });
    }
    if (branch.machineOwnershipType === "leased" && isMissing(branch.dailyLeaseCost)) {
      fields.push({
        key: `${prefix}.dailyLeaseCost`,
        label: "قيمة الإيجار اليومي (ج.م)",
        type: "number",
      });
    }
  }

  return fields;
};

const getContactMissingFields = (
  contacts: Contact[],
  prefix: string
): MissingField[] => {
  const fields: MissingField[] = [];

  if (contacts.length === 0) {
    for (let i = 0; i < 2; i++) {
      fields.push({ key: `${prefix}.${i}.name`, label: `اسم جهة الاتصال ${i + 1}`, type: "text" });
      fields.push({ key: `${prefix}.${i}.phone`, label: `رقم الهاتف ${i + 1}`, type: "text" });
      fields.push({ key: `${prefix}.${i}.position`, label: `المنصب ${i + 1}`, type: "text" });
    }
  } else {
    contacts.forEach((contact, index) => {
      if (isMissing(contact.name))
        fields.push({ key: `${prefix}.${index}.name`, label: `اسم جهة الاتصال ${index + 1}`, type: "text" });
      if (contact.phoneNumbers.length === 0 || contact.phoneNumbers.every((p) => isMissing(p.number))) {
        fields.push({ key: `${prefix}.${index}.phone`, label: `رقم الهاتف ${index + 1}`, type: "text" });
      }
      if (isMissing(contact.position))
        fields.push({ key: `${prefix}.${index}.position`, label: `المنصب ${index + 1}`, type: "text" });
    });
  }

  return fields;
};

const getBaristaMissingFields = (
  baristas: Barista[],
  prefix: string,
  labelPrefix: string
): MissingField[] => {
  const fields: MissingField[] = [];

  if (baristas.length === 0) {
    for (let i = 0; i < 2; i++) {
      fields.push({ key: `${prefix}.${i}.name`, label: `${labelPrefix} ${i + 1} - الاسم`, type: "text" });
      fields.push({ key: `${prefix}.${i}.phone`, label: `${labelPrefix} ${i + 1} - رقم الهاتف`, type: "text" });
    }
  } else {
    baristas.forEach((barista, index) => {
      if (isMissing(barista.name))
        fields.push({ key: `${prefix}.${index}.name`, label: `${labelPrefix} ${index + 1} - الاسم`, type: "text" });
      if (isMissing(barista.phone))
        fields.push({ key: `${prefix}.${index}.phone`, label: `${labelPrefix} ${index + 1} - رقم الهاتف`, type: "text" });
    });
  }

  return fields;
};

export const getMissingFields = (
  data: FormData,
  options: MissingDataOptions
): MissingFieldsResult => {
  const result: MissingFieldsResult = { company: [], branches: {}, hasMissing: false };
  const isDynamic = options.mode === "dynamic";

  if (options.scope === "company") {
    if (isDynamic) {
      result.company = getDynamicCompanyFields(data);
    } else {
      result.company = getCompanyProfileFields(data);
      result.company.push(...getContactMissingFields(data.contacts, "company.contacts"));

      if (!data.hasBranches) {
        result.company.push(...getBaristaMissingFields(data.baristas, "company.baristas", "باريستا"));
        result.company.push(...getBaristaMissingFields((data.clientBaristas || []) as Barista[], "company.clientBaristas", "باريستا العميل"));
      }
    }

    data.branches.forEach((branch, index) => {
      let branchFields: MissingField[];
      if (isDynamic) {
        branchFields = getDynamicBranchFields(branch, `branch.${index}`);
      } else {
        branchFields = getBranchProfileFields(branch, `branch.${index}`);
        branchFields.push(...getContactMissingFields(branch.contacts, `branch.${index}.contacts`));
        branchFields.push(...getBaristaMissingFields(branch.baristas, `branch.${index}.baristas`, "باريستا"));
        branchFields.push(...getBaristaMissingFields((branch.clientBaristas || []) as Barista[], `branch.${index}.clientBaristas`, "باريستا العميل"));
      }
      result.branches[index] = branchFields;
    });
  } else if (options.branchId !== undefined) {
    const branchIndex = data.branches.findIndex((b) => b.id === options.branchId);
    if (branchIndex >= 0) {
      const branch = data.branches[branchIndex];
      let branchFields: MissingField[];
      if (isDynamic) {
        branchFields = getDynamicBranchFields(branch, `branch.${branchIndex}`);
      } else {
        branchFields = getBranchProfileFields(branch, `branch.${branchIndex}`);
        branchFields.push(...getContactMissingFields(branch.contacts, `branch.${branchIndex}.contacts`));
        branchFields.push(...getBaristaMissingFields(branch.baristas, `branch.${branchIndex}.baristas`, "باريستا"));
        branchFields.push(...getBaristaMissingFields((branch.clientBaristas || []) as Barista[], `branch.${branchIndex}.clientBaristas`, "باريستا العميل"));
      }
      result.branches[branchIndex] = branchFields;
    }
  }

  result.hasMissing =
    result.company.length > 0 || Object.values(result.branches).some((f) => f.length > 0);

  return result;
};

/** Check if two fields are a name+phone pair that should sit on the same row */
const arePairedFields = (a: MissingField, b: MissingField): boolean => {
  const aParts = a.key.split(".");
  const bParts = b.key.split(".");
  if (aParts.length !== bParts.length) return false;
  if (aParts[aParts.length - 1] !== "name") return false;
  if (bParts[bParts.length - 1] !== "phone") return false;
  return aParts.slice(0, -1).join(".") === bParts.slice(0, -1).join(".");
};

interface FieldRow {
  fields: MissingField[];
}

const buildFieldRows = (fields: MissingField[]): FieldRow[] => {
  const rows: FieldRow[] = [];
  let i = 0;

  while (i < fields.length) {
    const current = fields[i];

    // Binary select fields are always full-width
    if (current.type === "select" && current.options) {
      rows.push({ fields: [current] });
      i++;
      continue;
    }

    // Try to pair current field with the next one if they are name+phone
    const next = fields[i + 1];
    if (next && arePairedFields(current, next)) {
      rows.push({ fields: [current, next] });
      i += 2;
      continue;
    }

    // Default: single field (full-width or will occupy one column)
    rows.push({ fields: [current] });
    i++;
  }

  return rows;
};

const renderFieldsGrid = (
  doc: jsPDF,
  fields: MissingField[],
  startY: number,
  pageWidth: number,
  margin: number
): number => {
  const gap = 8;
  const colWidth = (pageWidth - margin * 2 - gap) / 2;
  const rows = buildFieldRows(fields);
  let yPos = startY;

  for (const row of rows) {
    const isPaired = row.fields.length === 2;
    const rowStartY = yPos;
    let leftBottom = rowStartY;
    let rightBottom = rowStartY;

    // Render left field
    const leftLayout: FieldLayout = {
      x: margin,
      y: rowStartY,
      width: isPaired ? colWidth : colWidth * 2 + gap,
    };

    const leftField = row.fields[0];
    if (leftField.type === "select" && leftField.options) {
      leftBottom = addBinaryCheckboxField(doc, leftField.key, leftField.label, leftField.options, leftLayout);
    } else if (leftField.type === "number") {
      leftBottom = addNumberField(doc, leftField.key, leftField.label, leftLayout, leftField.required);
    } else {
      leftBottom = addTextField(doc, leftField.key, leftField.label, leftLayout, leftField.value, leftField.required);
    }

    // Render right field if paired
    if (isPaired && row.fields[1]) {
      const rightField = row.fields[1];
      const rightLayout: FieldLayout = {
        x: margin + colWidth + gap,
        y: rowStartY,
        width: colWidth,
      };

      if (rightField.type === "number") {
        rightBottom = addNumberField(doc, rightField.key, rightField.label, rightLayout, rightField.required);
      } else {
        rightBottom = addTextField(doc, rightField.key, rightField.label, rightLayout, rightField.value, rightField.required);
      }
    }

    yPos = Math.max(leftBottom, rightBottom);

    // Page break when running out of space
    if (yPos > doc.internal.pageSize.height - margin - 20) {
      doc.addPage();
      yPos = margin;
    }
  }

  return yPos;
};

export const generateMissingDataPDF = async (
  data: FormData,
  options: MissingDataOptions
): Promise<jsPDF | null> => {
  const missing = getMissingFields(data, options);

  if (!missing.hasMissing) {
    return null;
  }

  const doc = new jsPDF();

  if (!jsPDF.AcroForm?.TextField || !jsPDF.AcroForm?.CheckBox) {
    throw new Error("AcroForm support is not available in this jsPDF build.");
  }

  // Ensure Amiri font is registered so AcroForm fields can render Arabic text
  const assets = await loadFonts(doc);
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

  // Header
  let yPos = await drawHeader(doc, data, pageWidth, margin, assets);

  // Instructions box
  yPos = drawInstructionsBox(doc, margin, yPos, pageWidth);

  // Company fields
  if (missing.company.length > 0) {
    yPos = checkPageBreak(doc, yPos, margin);
    yPos = drawSectionHeader(doc, "بيانات الشركة", margin, yPos, pageWidth);
    yPos = renderFieldsGrid(doc, missing.company, yPos, pageWidth, margin);
  }

  // Branch fields
  Object.entries(missing.branches).forEach(([branchIndex, fields]) => {
    if (fields.length === 0) return;

    yPos = checkPageBreak(doc, yPos, margin);
    yPos += 4;
    const branchName = data.branches[Number(branchIndex)]?.branchName || `فرع ${Number(branchIndex) + 1}`;
    yPos = drawSectionHeader(doc, `بيانات ${branchName}`, margin, yPos, pageWidth);
    yPos = renderFieldsGrid(doc, fields, yPos, pageWidth, margin);
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Espresso footer bar
    doc.setFillColor(...COLORS.espresso);
    doc.rect(0, doc.internal.pageSize.getHeight() - 14, pageWidth, 14, "F");

    // Brass accent line
    doc.setFillColor(...COLORS.brass);
    doc.rect(0, doc.internal.pageSize.getHeight() - 16, pageWidth, 2, "F");

    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.cream);
    doc.text(
      reshapeArabic(`صفحة ${i} من ${pageCount}`),
      pageWidth - margin,
      doc.internal.pageSize.getHeight() - 8,
      { align: "right" }
    );
  }

  return doc;
};

export interface ParsedMissingData {
  [key: string]: string;
}

export const parseMissingDataPDF = async (
  arrayBuffer: ArrayBuffer
): Promise<ParsedMissingData> => {
  try {
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    let form;
    try {
      form = pdfDoc.getForm();
    } catch {
      throw new Error("لا يحتوي ملف PDF على حقول قابلة للملء.");
    }

    const fields = form.getFields();

    const result: ParsedMissingData = {};

    fields.forEach((field) => {
      const name = field.getName();
      try {
        if (field instanceof PDFTextField) {
          result[name] = field.getText() || "";
        } else if (field instanceof PDFDropdown) {
          const selected = field.getSelected();
          result[name] = Array.isArray(selected) ? selected[0] || "" : selected || "";
        } else if (field instanceof PDFCheckBox) {
          // Binary checkbox fields are named like "company.hasBranches_0".
          // Map checked checkbox back to the original field name with its option value.
          if (field.isChecked()) {
            const lastUnderscore = name.lastIndexOf("_");
            if (lastUnderscore > 0) {
              const baseName = name.slice(0, lastUnderscore);
              const optionIndex = Number(name.slice(lastUnderscore + 1));
              const isOwnershipType = baseName.endsWith("machineOwnershipType");
              const optionValue = isOwnershipType
                ? optionIndex === 0
                  ? "شراء"
                  : "إيجار"
                : optionIndex === 0
                  ? "نعم"
                  : "لا";
              result[baseName] = optionValue;
            } else {
              result[name] = "true";
            }
          }
        } else {
          // Fallback: try to get text
          try {
            result[name] = (field as any).getText() || "";
          } catch {
            result[name] = "";
          }
        }
      } catch (err) {
        logger.warn(`Failed to parse PDF field ${name}`, err, "pdf");
        result[name] = "";
      }
    });

    return result;
  } catch (error) {
    logger.error("Error parsing missing data PDF", error, "pdf");
    throw new Error(
      error instanceof Error
        ? error.message
        : "فشل في قراءة ملف PDF. يرجى التأكد من أن الملف صالح."
    );
  }
};

/** Find or create a contact by position; returns its index */
const findOrCreateContactByPosition = (
  contacts: Contact[],
  position: string
): number => {
  const index = contacts.findIndex((c) => c.position === position);
  if (index >= 0) return index;
  contacts.push({
    id: Date.now() + contacts.length,
    name: "",
    position,
    phoneNumbers: [{ id: Date.now(), number: "" }],
  });
  return contacts.length - 1;
};

export const applyParsedMissingData = (
  data: FormData,
  parsed: ParsedMissingData
): FormData => {
  const updated = structuredClone(data) as FormData;

  Object.entries(parsed).forEach(([key, value]) => {
    if (!value || value.trim() === "") return;

    const parts = key.split(".");

    try {
      if (parts[0] === "company") {
        if (parts[1] === "contacts") {
          const positionOrIndex = parts[2];
          const field = parts[3];
          const isPosition = Number.isNaN(Number(positionOrIndex));
          const index = isPosition
            ? findOrCreateContactByPosition(updated.contacts, positionOrIndex)
            : Number(positionOrIndex);

          if (!updated.contacts[index]) {
            updated.contacts[index] = {
              id: Date.now() + index,
              name: "",
              position: "",
              phoneNumbers: [{ id: Date.now(), number: "" }],
            };
          }
          if (field === "name") updated.contacts[index].name = value;
          if (field === "position") updated.contacts[index].position = value;
          if (field === "email") updated.contacts[index].email = value;
          if (field === "phone") {
            updated.contacts[index].phoneNumbers[0] = {
              id: updated.contacts[index].phoneNumbers[0]?.id || Date.now(),
              number: value,
            };
          }
        } else if (parts[1] === "baristas") {
          const index = Number(parts[2]);
          const field = parts[3];
          if (!updated.baristas[index]) {
            updated.baristas[index] = { id: Date.now() + index, name: "", phone: "" };
          }
          if (field === "name") updated.baristas[index].name = value;
          if (field === "phone") updated.baristas[index].phone = value;
        } else if (parts[1] === "clientBaristas") {
          const index = Number(parts[2]);
          const field = parts[3];
          if (!updated.clientBaristas) updated.clientBaristas = [];
          if (!updated.clientBaristas[index]) {
            updated.clientBaristas[index] = { id: Date.now() + index, name: "", phone: "" };
          }
          if (field === "name") updated.clientBaristas[index].name = value;
          if (field === "phone") updated.clientBaristas[index].phone = value;
        } else {
          const field = parts[1];
          if (field === "hasBranches") {
            (updated as any)[field] = value === "نعم";
          } else if (field === "usesOurMachines") {
            (updated as any)[field] = value === "نعم";
          } else if (field === "machineOwnershipType") {
            (updated as any)[field] = value === "شراء" ? "bought" : value === "إيجار" ? "leased" : undefined;
          } else if (field === "dailyLeaseCost") {
            (updated as any)[field] = Number(value) || undefined;
          } else if (field === "coffeeConsumptionKg") {
            (updated as any)[field] = Number(value) || undefined;
          } else {
            (updated as any)[field] = value;
          }
        }
      } else if (parts[0] === "branch") {
        const branchIndex = Number(parts[1]);
        if (!updated.branches[branchIndex]) return;

        const branch = updated.branches[branchIndex];

        if (parts[2] === "contacts") {
          const positionOrIndex = parts[3];
          const field = parts[4];
          const isPosition = Number.isNaN(Number(positionOrIndex));
          const index = isPosition
            ? findOrCreateContactByPosition(branch.contacts, positionOrIndex)
            : Number(positionOrIndex);

          if (!branch.contacts[index]) {
            branch.contacts[index] = {
              id: Date.now() + index,
              name: "",
              position: "",
              phoneNumbers: [{ id: Date.now(), number: "" }],
            };
          }
          if (field === "name") branch.contacts[index].name = value;
          if (field === "position") branch.contacts[index].position = value;
          if (field === "email") branch.contacts[index].email = value;
          if (field === "phone") {
            branch.contacts[index].phoneNumbers[0] = {
              id: branch.contacts[index].phoneNumbers[0]?.id || Date.now(),
              number: value,
            };
          }
        } else if (parts[2] === "baristas") {
          const index = Number(parts[3]);
          const field = parts[4];
          if (!branch.baristas[index]) {
            branch.baristas[index] = { id: Date.now() + index, name: "", phone: "" };
          }
          if (field === "name") branch.baristas[index].name = value;
          if (field === "phone") branch.baristas[index].phone = value;
        } else if (parts[2] === "clientBaristas") {
          const index = Number(parts[3]);
          const field = parts[4];
          if (!branch.clientBaristas) branch.clientBaristas = [];
          if (!branch.clientBaristas[index]) {
            branch.clientBaristas[index] = { id: Date.now() + index, name: "", phone: "" };
          }
          if (field === "name") branch.clientBaristas[index].name = value;
          if (field === "phone") branch.clientBaristas[index].phone = value;
        } else {
          const field = parts[2];
          if (field === "usesOurMachines") {
            branch.usesOurMachines = value === "نعم";
          } else if (field === "machineOwnershipType") {
            branch.machineOwnershipType = value === "شراء" ? "bought" : value === "إيجار" ? "leased" : undefined;
          } else if (field === "dailyLeaseCost") {
            branch.dailyLeaseCost = Number(value) || undefined;
          } else if (field === "coffeeConsumptionKg") {
            branch.coffeeConsumptionKg = Number(value) || undefined;
          } else {
            (branch as any)[field] = value;
          }
        }
      }
    } catch (err) {
      logger.warn(`Failed to apply field ${key}`, err, "pdf");
    }
  });

  return updated;
};
