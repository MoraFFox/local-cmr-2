/** @format */

import { FormData, MaintenanceRecord, Branch, MaintenancePhoto } from "../types";
import { logger } from "./logger";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { reshapeArabic } from "./arabicText";

/** Helper to reshape dynamic Arabic text for LTR jsPDF rendering. */
const rtl = (text: string | number | null | undefined): string => {
  if (text === null || text === undefined) return "";
  return reshapeArabic(String(text), false);
};

/** Format maintenance record details as clean bullet-point text for PDF tables. */
export const formatMaintenanceDetails = (r: MaintenanceRecord): string => {
  const sections: string[] = [];

  if (r.machines && r.machines.length > 0) {
    const items = r.machines
      .map((m) => `  • ${m.count || 1}x ${rtl(m.name)}`)
      .join("\n");
    sections.push(`Machines:\n${items}`);
  }

  if (r.hadProblem && r.problems && r.problems.length > 0) {
    const items = r.problems.map((p) => `  • ${rtl(p)}`).join("\n");
    sections.push(`Issues:\n${items}`);
  }

  if (r.partsReplaced && r.partsReplaced.length > 0) {
    const items = r.partsReplaced
      .map((p) => {
        const paidBy =
          p.paidByClient === true ? "Client" : p.paidByClient === false ? "Mido's" : "-";
        return `  • ${p.count || 1}x ${rtl(p.name)} (${paidBy})`;
      })
      .join("\n");
    sections.push(`Parts:\n${items}`);
  }

  if (r.servicesPerformed && r.servicesPerformed.length > 0) {
    const items = r.servicesPerformed
      .map((s) => `  • ${s.count || 1}x ${rtl(s.name)}`)
      .join("\n");
    sections.push(`Services:\n${items}`);
  }

  return sections.join("\n");
};

interface PDFOptions {
  includeCosts: boolean;
}

// Fix 4.3: Add font caching to avoid re-fetching on every PDF generation
const fontCache: {
  regular: string | null;
  bold: string | null;
  logo: string | null;
  logoFormat: "PNG" | "JPEG";
  logoWidth: number;
  logoHeight: number;
} = {
  regular: null,
  bold: null,
  logo: null,
  logoFormat: "PNG",
  logoWidth: 0,
  logoHeight: 0,
};

// Cache for loaded images to avoid re-fetching
const imageCache = new Map<string, string>();

/**
 * Load an image and return its natural dimensions.
 * Returns 0x0 when the image fails to load or data is null.
 */
function getImageDimensions(data: string | null): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (!data) {
      resolve({ width: 0, height: 0 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth || 0, height: img.naturalHeight || 0 });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = data;
  });
}

/**
 * Rasterize an SVG file to a transparent PNG data URL.
 * jsPDF cannot embed SVG directly, so we draw it to a canvas
 * and export as PNG. The canvas preserves the SVG's alpha channel.
 * Returns the data URL plus the natural image dimensions so callers
 * don't have to load the image again.
 */
async function svgToPngDataUrl(svgUrl: string): Promise<LogoImageData | null> {
  try {
    const response = await fetch(svgUrl);
    if (!response.ok) return null;

    const svgText = await response.text();
    if (!/<svg/i.test(svgText)) return null;

    const blob = new Blob([svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Use the SVG's intrinsic size, but cap at a reasonable resolution
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.naturalWidth);
        const width = Math.max(1, Math.floor(img.naturalWidth * scale));
        const height = Math.max(1, Math.floor(img.naturalHeight * scale));
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve(null);
          return;
        }

        // Clear canvas so background stays transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);

        resolve({ dataUrl: canvas.toDataURL("image/png"), width, height });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (error) {
    logger.warn("Failed to rasterize SVG logo", error, "pdf");
    return null;
  }
}

/**
 * Load a remote image and convert to base64 data URL
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
  // Check cache first
  if (imageCache.has(url)) {
    return imageCache.get(url)!;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    // Convert to base64 via canvas for PDF compatibility
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        imageCache.set(url, result);
        resolve(result);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    logger.warn('Failed to load image: ' + url, error, 'pdf');
    return null;
  }
}

/**
 * Render maintenance photos in PDF
 */
export async function renderPhotosInPDF(
  doc: jsPDF,
  photos: MaintenancePhoto[],
  startY: number,
  pageWidth: number,
  margin: number
): Promise<number> {
  if (!photos || photos.length === 0) return startY;

  const types: Array<"before" | "after" | "legacy"> = ["before", "after", "legacy"];
  let currentY = startY;

  for (const type of types) {
    const filtered = photos.filter(p => p.type === type);
    if (filtered.length === 0) continue;

    // Add group heading
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Photos:`, margin, currentY);
    currentY += 5;

    // Render thumbnails
    const thumbSize = 30; // 30mm thumbnails
    const spacing = 5;
    let currentX = margin;

    for (const photo of filtered) {
      // Check if we need a new page
      if (currentY + thumbSize > doc.internal.pageSize.height - margin) {
        doc.addPage();
        currentY = margin;
      }

      // Try to load and embed image
      const imageData = await loadImageAsBase64(photo.url);
      
      if (imageData) {
        try {
          doc.addImage(imageData, 'JPEG', currentX, currentY, thumbSize, thumbSize);
        } catch (e) {
          // If image fails, draw placeholder
          doc.setDrawColor(200);
          doc.setFillColor(240, 240, 240);
          doc.rect(currentX, currentY, thumbSize, thumbSize, 'FD');
          doc.setFontSize(6);
          doc.text('Image failed', currentX + 2, currentY + thumbSize / 2);
        }
      } else {
        // Draw placeholder for failed load
        doc.setDrawColor(200);
        doc.setFillColor(240, 240, 240);
        doc.rect(currentX, currentY, thumbSize, thumbSize, 'FD');
        doc.setFontSize(6);
        doc.text('No image', currentX + 2, currentY + thumbSize / 2);
      }

      // Add URL text below thumbnail
      doc.setFontSize(6);
      doc.setTextColor(100);
      const shortUrl = photo.url.length > 30 ? photo.url.substring(0, 30) + '...' : photo.url;
      doc.text(shortUrl, currentX, currentY + thumbSize + 3);
      doc.setTextColor(0);

      currentX += thumbSize + spacing;
      
      // Wrap to next line if needed
      if (currentX + thumbSize > pageWidth - margin) {
        currentX = margin;
        currentY += thumbSize + 10; // Extra space for URL text
      }
    }

    // Move to next section
    if (currentX !== margin) {
      currentY += thumbSize + 10;
    }
    currentY += 5; // Space between groups
  }

  return currentY;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "EGP",
    minimumFractionDigits: 0,
  }).format(value);

const getPaidByLabel = (val: string) =>
  val === "company" ? "Mido's" : "Client";

const getMachineStatus = (
  entity: {
    usesOurMachines: boolean | null;
    machineOwnershipType?: "leased" | "consumption" | "bought";
    dailyLeaseCost?: number;
  },
  hideCosts = false,
) => {
  if (!entity.usesOurMachines) return "No";

  const type =
    entity.machineOwnershipType === "leased"
      ? "Leased"
      : entity.machineOwnershipType === "consumption"
      ? "Consumption"
      : entity.machineOwnershipType === "bought"
      ? "Bought"
      : "-";

  if (
    !hideCosts &&
    (entity.machineOwnershipType === "leased" ||
      entity.machineOwnershipType === "consumption") &&
    entity.dailyLeaseCost != null
  ) {
    return `${type} (${formatCurrency(entity.dailyLeaseCost)}/day)`;
  }

  return type;
};

export const flattenMaintenanceRecords = (
  records: MaintenanceRecord[],
): MaintenanceRecord[] => {
  const result: MaintenanceRecord[] = [];
  const traverse = (recs: MaintenanceRecord[]) => {
    recs.forEach((r) => {
      result.push(r);
      if (r.followUpVisits && r.followUpVisits.length > 0) {
        traverse(r.followUpVisits);
      }
    });
  };
  traverse(records);
  return result;
};

export interface LogoImageData {
  dataUrl: string;
  width: number;
  height: number;
}

export interface LogoAssets {
  logo: string | null;
  logoFormat: "PNG" | "JPEG";
  /** Natural width in pixels (when logo is available). */
  naturalWidth: number;
  /** Natural height in pixels (when logo is available). */
  naturalHeight: number;
}

export const loadFonts = async (doc: jsPDF): Promise<LogoAssets> => {
  const toBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  // Fix 4.3: Use cached fonts if available
  if (fontCache.regular && fontCache.bold) {
    doc.addFileToVFS("Amiri-Regular.ttf", fontCache.regular);
    doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    doc.addFileToVFS("Amiri-Bold.ttf", fontCache.bold);
    doc.addFont("Amiri-Bold.ttf", "Amiri", "bold");
    
    return {
      logo: fontCache.logo,
      logoFormat: fontCache.logoFormat,
      naturalWidth: fontCache.logoWidth,
      naturalHeight: fontCache.logoHeight,
    };
  }

  const fetchAsset = async (path: string) => {
    try {
      const res = await fetch(path);
      if (!res.ok) return null;

      const contentType = res.headers.get("Content-Type");
      if (
        contentType &&
        !contentType.startsWith("image/") &&
        path.endsWith(".png")
      ) {
        return null;
      }

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength < 10) return null;
      return buffer;
    } catch (e) {
      return null;
    }
  };

  try {
    const [regular, bold, svgLogo] = await Promise.all([
      fetchAsset("/fonts/Amiri-Regular.ttf"),
      fetchAsset("/fonts/Amiri-Bold.ttf"),
      svgToPngDataUrl("/logo.svg"),
    ]);

    if (regular) {
      const regularBase64 = toBase64(regular);
      // Fix 4.3: Cache the font
      fontCache.regular = regularBase64;
      doc.addFileToVFS("Amiri-Regular.ttf", regularBase64);
      doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
    }

    if (bold) {
      const boldBase64 = toBase64(bold);
      // Fix 4.3: Cache the font
      fontCache.bold = boldBase64;
      doc.addFileToVFS("Amiri-Bold.ttf", boldBase64);
      doc.addFont("Amiri-Bold.ttf", "Amiri", "bold");
    }

    let logoData: string | null = null;
    let logoFormat: "PNG" | "JPEG" = "PNG";
    let logoWidth = 0;
    let logoHeight = 0;

    // Prefer the SVG logo because it has a transparent background.
    // jsPDF cannot embed SVG directly, so we rasterize it to PNG.
    if (svgLogo) {
      logoData = svgLogo.dataUrl;
      logoFormat = "PNG";
      logoWidth = svgLogo.width;
      logoHeight = svgLogo.height;
    } else {
      // Fallback to the raster logo if SVG conversion fails.
      const pngLogo = await fetchAsset("/logo.png");
      if (pngLogo) {
        const uint8 = new Uint8Array(pngLogo);
        if (
          uint8[0] === 0x89 &&
          uint8[1] === 0x50 &&
          uint8[2] === 0x4e &&
          uint8[3] === 0x47
        ) {
          logoFormat = "PNG";
        } else if (
          uint8[0] === 0xff &&
          uint8[1] === 0xd8 &&
          uint8[2] === 0xff
        ) {
          logoFormat = "JPEG";
        } else {
          return { logo: null, logoFormat: "PNG", naturalWidth: 0, naturalHeight: 0 };
        }
        logoData = `data:image/${logoFormat.toLowerCase()};base64,${toBase64(pngLogo)}`;
        const dims = await getImageDimensions(logoData);
        logoWidth = dims.width;
        logoHeight = dims.height;
      }
    }

    // Fix 4.3: Cache the logo and its dimensions
    fontCache.logo = logoData;
    fontCache.logoFormat = logoFormat;
    fontCache.logoWidth = logoWidth;
    fontCache.logoHeight = logoHeight;

    return {
      logo: logoData,
      logoFormat,
      naturalWidth: logoWidth,
      naturalHeight: logoHeight,
    };
  } catch (error) {
    return { logo: null, logoFormat: "PNG", naturalWidth: 0, naturalHeight: 0 };
  }
};

export const generateCompanyPDF = async (
  data: FormData & { created_at?: string },
  options: PDFOptions,
) => {
  const doc = new jsPDF();
  const assets = await loadFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 25;

  if (assets?.logo) {
    try {
      doc.addImage(assets.logo, assets.logoFormat, 14, 10, 50, 0);
      yPos = 40; // Move text down more for the wider logo
    } catch (e) {
      logger.error("Error adding logo to PDF", e, "pdf");
    }
  }

  doc.setFontSize(20);
  doc.setFont("Amiri", "bold");
  doc.text(rtl(data.companyName), pageWidth / 2, yPos, { align: "center" });

  yPos += 10;
  doc.setFontSize(10);
  doc.setFont("Amiri", "normal");
  doc.text("Comprehensive Maintenance Report", pageWidth / 2, yPos, {
    align: "center",
  });

  yPos += 5;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    yPos,
    { align: "center" },
  );

  yPos += 15;

  // Company Info
  doc.setFontSize(12);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(0);
  doc.text("Company Profile", 14, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont("Amiri", "normal");
  const getDashboardStats = (data: FormData) => {
    let totalVisits = 0;
    let totalPartsCount = 0;
    let totalIssuesCount = 0;

    // Financials
    let totalLeaseCost = 0;
    let totalPartsCost = 0;
    let totalServicesCost = 0;

    // Insights
    const issueCounts: Record<string, number> = {};
    const partCounts: Record<string, number> = {};
    const branchVisitSummary: Array<{
      name: string;
      requested: number;
      scheduled: number;
    }> = [];

    const processRecords = (records: MaintenanceRecord[]) => {
      records.forEach((r) => {
        totalVisits++;

        // Financials
        if (r.dailyLeaseCost) totalLeaseCost += Number(r.dailyLeaseCost);

        // Issues
        if (r.problems && r.problems.length > 0) {
          totalIssuesCount += r.problems.length;
          r.problems.forEach((p) => {
            issueCounts[p] = (issueCounts[p] || 0) + 1;
          });
        }

        // Parts
        if (r.partsReplaced) {
          r.partsReplaced.forEach((p) => {
            const count = Number(p.count || 0);
            totalPartsCount += count;
            if (p.cost) totalPartsCost += Number(p.cost) * count;
            partCounts[p.name] = (partCounts[p.name] || 0) + count;
          });
        }

        // Services
        if (r.servicesPerformed) {
          r.servicesPerformed.forEach((s) => {
            const count = Number(s.count || 0);
            if (s.cost) totalServicesCost += Number(s.cost) * count;
          });
        }

        if (r.followUpVisits) processRecords(r.followUpVisits);
      });
    };

    // Main Office
    processRecords(data.maintenanceHistory || []);

    // Branches
    data.branches?.forEach((b, index) => {
      const branchName = b.branchName || `Branch ${index + 1}`;
      const summary = { requested: 0, scheduled: 0 };
      const countVisitTypes = (records: MaintenanceRecord[]) => {
        records.forEach((r) => {
          if (r.type === "requested") {
            summary.requested++;
          } else {
            summary.scheduled++;
          }
          if (r.followUpVisits) countVisitTypes(r.followUpVisits);
        });
      };
      countVisitTypes(b.maintenanceHistory || []);
      branchVisitSummary.push({ name: branchName, ...summary });
      processRecords(b.maintenanceHistory || []);
    });

    // Top Computation
    const getTop = (record: Record<string, number>) => {
      let max = 0;
      let name = "-";
      Object.entries(record).forEach(([key, val]) => {
        if (val > max) {
          max = val;
          name = key;
        }
      });
      return { name, count: max };
    };

    const sortBreakdown = (record: Record<string, number>) =>
      Object.entries(record)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);

    return {
      totalVisits,
      totalPartsCount,
      totalIssuesCount,
      financials: {
        totalLeaseCost,
        totalPartsCost,
        totalServicesCost,
        grandTotal: totalLeaseCost + totalPartsCost + totalServicesCost,
      },
      insights: {
        topIssue: getTop(issueCounts),
        topPart: getTop(partCounts),
      },
      breakdown: {
        issues: sortBreakdown(issueCounts),
        parts: sortBreakdown(partCounts),
      },
      branchVisitSummary,
    };
  };

  const stats = getDashboardStats(data);
  const locationUrl = data.location;
  const isLocationUrl =
    locationUrl?.startsWith("http") || locationUrl?.startsWith("www");

  const companyInfo = [
    ["Location", isLocationUrl ? "View Location" : rtl(locationUrl) || "-"],
    ["Email", rtl(data.email) || "-"],
    ["Tax Number", rtl(data.taxNumber) || "-"],
    ["Total Visits", stats.totalVisits.toString()],
    ["Total Issues", stats.totalIssuesCount.toString()],
    ["Parts Changed", stats.totalPartsCount.toString()],
  ];

  if (!data.hasBranches) {
    companyInfo.push([
      "Machine Ownership",
      getMachineStatus(data, !options.includeCosts),
    ]);
  }

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: companyInfo,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2, font: "Amiri" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
    didDrawCell: (data: any) => {
      if (
        isLocationUrl &&
        data.section === "body" &&
        data.column.index === 1 &&
        data.row.index === 0
      ) {
        doc.setTextColor(37, 99, 235); // Blue color for link
        doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
          url: locationUrl,
        });
      }
    },
  } as any);

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // --- Operational Insights ---
  doc.setFontSize(12);
  doc.setFont("Amiri", "bold");
  doc.text("Operational Insights", 14, yPos);
  yPos += 6;

  const insightsData = [
    [
      "Total Issues",
      stats.totalIssuesCount.toString(),
    ],
    [
      "Total Parts Consumed",
      stats.totalPartsCount.toString(),
    ],
    [
      "Most Frequent Issue",
      `${rtl(stats.insights.topIssue.name)} (${stats.insights.topIssue.count})`,
    ],
    [
      "Most Consumed Part",
      `${rtl(stats.insights.topPart.name)} (${stats.insights.topPart.count})`,
    ],

  ];

  autoTable(doc, {
    startY: yPos,
    head: [["Metric", "Result"]],
    body: insightsData,
    theme: "striped",
    styles: { fontSize: 9, font: "Amiri", halign: "left" },
    headStyles: { fillColor: [50, 60, 70] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // --- Visit Summary by Branch ---
  if (stats.branchVisitSummary.length > 0) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("Amiri", "bold");
    doc.text("Visit Summary by Branch", 14, yPos);
    yPos += 6;

    const summaryRows = stats.branchVisitSummary.map((b) => [
      rtl(b.name),
      b.requested.toString(),
      b.scheduled.toString(),
      (b.requested + b.scheduled).toString(),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Branch", "Requested", "Scheduled", "Total"]],
      body: summaryRows,
      theme: "striped",
      styles: { fontSize: 8, font: "Amiri", halign: "left" },
      headStyles: { fillColor: [50, 60, 70] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 30, halign: "center" },
        2: { cellWidth: 30, halign: "center" },
        3: { cellWidth: 30, halign: "center" },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- Issues & Parts Breakdown ---
  if (
    stats.breakdown.issues.length > 0 ||
    stats.breakdown.parts.length > 0
  ) {
    if (yPos > 220) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("Amiri", "bold");
    doc.text("Issues & Parts Breakdown", 14, yPos);
    yPos += 6;

    const breakdownRows: (string | number)[][] = [];
    const maxRows = Math.max(
      stats.breakdown.issues.length,
      stats.breakdown.parts.length,
    );

    for (let i = 0; i < maxRows; i++) {
      const issue = stats.breakdown.issues[i];
      const part = stats.breakdown.parts[i];
      breakdownRows.push([
        issue ? rtl(issue.name) : "",
        issue ? issue.count : "",
        part ? rtl(part.name) : "",
        part ? part.count : "",
      ]);
    }

    autoTable(doc, {
      startY: yPos,
      head: [["Issue", "Count", "Part", "Qty"]],
      body: breakdownRows,
      theme: "striped",
      styles: { fontSize: 8, font: "Amiri", halign: "left" },
      headStyles: { fillColor: [50, 60, 70] },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 20, halign: "center" },
        2: { cellWidth: "auto" },
        3: { cellWidth: 20, halign: "center" },
      },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  // Managers' Contacts
  const managerPositions = new Set([
    "manager",
    "chief",
    "ops_manager",
    "purchasing_manager",
    "purchasing_officer",
    "accounting",
  ]);
  const managerContacts = (data.contacts || []).filter(
    (c) => c.position === "manager" || managerPositions.has(c.position),
  );

  if (managerContacts.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(10);
    doc.setFont("Amiri", "bold");
    doc.text("Managers' Contacts", 14, yPos);
    yPos += 6;

    const contactRows = managerContacts.map((c) => [
      rtl(c.name),
      rtl(
        c.position === "custom" ? c.customPosition || c.position : c.position,
      ),
      rtl(c.email) || "-",
      c.phoneNumbers?.map((p) => p.number).join(", ") || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Position", "Email", "Phone"]],
      body: contactRows,
      theme: "striped",
      styles: { fontSize: 8, font: "Amiri" },
      headStyles: { fillColor: [20, 184, 166] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  if (!data.hasBranches && data.maintenanceHistory.length > 0) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(12);
    doc.setFont("Amiri", "bold");
    doc.text("Main Office Maintenance History", 14, yPos);
    yPos += 6;

    const maintenanceRows = flattenMaintenanceRecords(
      data.maintenanceHistory,
    ).map((r) => {
      const row: any[] = [
        r.maintenanceDate,
        r.type === "requested" ? "Requested" : "Scheduled",
        r.type === "requested" ? rtl(r.clientBaristaName) || "-" : "-",
        rtl(r.baristaName) || "-",
        getPaidByLabel(r.paidBy),
      ];

      row.push(formatMaintenanceDetails(r));

      if (options.includeCosts && r.dailyLeaseCost) {
        row.push(formatCurrency(r.dailyLeaseCost));
      }

      return row;
    });

    const headers = ["Date", "Type", "Requested By", "Staff", "Paid By", "Details"];
    if (options.includeCosts) headers.push("Lease Cost");

    autoTable(doc, {
      startY: yPos,
      head: [headers],
      body: maintenanceRows,
      theme: "grid",
      styles: {
        fontSize: 7,
        cellPadding: 3,
        font: "Amiri",
        halign: "left",
      },
      headStyles: { fillColor: [20, 184, 166], fontStyle: "bold" },
      columnStyles: { 5: { cellWidth: "auto" } },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Render photos for main office maintenance records
    const allMainOfficeRecords = flattenMaintenanceRecords(data.maintenanceHistory);
    for (const record of allMainOfficeRecords) {
      if (record.photos && record.photos.length > 0) {
        if (yPos > 240) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont("Amiri", "bold");
        doc.text(`Photos for ${record.maintenanceDate}:`, 14, yPos);
        yPos += 6;

        yPos = await renderPhotosInPDF(doc, record.photos, yPos, pageWidth, 14);
        yPos += 5;
      }
    }
  }

  if (data.hasBranches && data.branches.length > 0) {
    for (let idx = 0; idx < data.branches.length; idx++) {
      const branch = data.branches[idx];
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(12);
      doc.setFont("Amiri", "bold");
      doc.text(rtl(branch.branchName || `Branch ${idx + 1}`), 14, yPos);
      yPos += 5;

      doc.setFontSize(9);
      doc.setFont("Amiri", "normal");
      const locationUrl = branch.location;
      const isLocationUrl =
        locationUrl?.startsWith("http") || locationUrl?.startsWith("www");

      const branchInfo = [
        [
          "Location",
          isLocationUrl ? "View Location" : rtl(locationUrl) || "-",
          "Email",
          rtl(branch.email) || "-",
        ],
        [
          "Tax ID",
          rtl(branch.taxNumber) || "-",
          "Machine Ownership",
          getMachineStatus(branch, !options.includeCosts),
        ],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: branchInfo,
        theme: "plain",
        styles: { fontSize: 8, cellPadding: 2, font: "Amiri" }, // Reduced font size slightly for density
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 25 }, // Label 1
          1: { cellWidth: 65 }, // Value 1
          2: { fontStyle: "bold", cellWidth: 25 }, // Label 2
          3: { cellWidth: 65 }, // Value 2
        },
        didDrawCell: (data: any) => {
          if (
            isLocationUrl &&
            data.section === "body" &&
            data.column.index === 1 &&
            data.row.index === 0
          ) {
            doc.setTextColor(37, 99, 235);
            doc.link(
              data.cell.x,
              data.cell.y,
              data.cell.width,
              data.cell.height,
              { url: locationUrl },
            );
          }
        },
      } as any);

      yPos = (doc as any).lastAutoTable.finalY + 5;

      if (branch.contacts.length > 0) {
        doc.setFontSize(9);
        doc.setFont("Amiri", "bold");
        doc.text("Contacts", 14, yPos);
        yPos += 5;

        const contactRows = branch.contacts.map((c) => [
          rtl(c.name),
          c.phoneNumbers[0]?.number || "-",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Name", "Phone"]],
          body: contactRows,
          theme: "plain",
          styles: { fontSize: 7, font: "Amiri" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      if (branch.baristas && branch.baristas.length > 0) {
        doc.setFontSize(9);
        doc.setFont("Amiri", "bold");
        doc.text("Assigned Staff", 14, yPos);
        yPos += 5;

        const baristaRows = branch.baristas.map((b) => [
          rtl(b.name),
          b.phone || "-",
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["Name", "Phone"]],
          body: baristaRows,
          theme: "plain",
          styles: { fontSize: 7, font: "Amiri" },
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      if (branch.maintenanceHistory.length > 0) {
        doc.setFontSize(10);
        doc.setFont("Amiri", "bold");
        doc.text("Maintenance History", 14, yPos);
        yPos += 5;

        const maintenanceRows = flattenMaintenanceRecords(
          branch.maintenanceHistory,
        ).map((r) => {
          const row: any[] = [
            r.maintenanceDate,
            r.type === "requested" ? "Requested" : "Scheduled",
            r.type === "requested" ? rtl(r.clientBaristaName) || "-" : "-",
            rtl(r.baristaName) || "-",
            getPaidByLabel(r.paidBy),
          ];

          row.push(formatMaintenanceDetails(r));

          return row;
        });

        const headers = ["Date", "Type", "Requested By", "Staff", "Paid By", "Details"];

        autoTable(doc, {
          startY: yPos,
          head: [headers],
          body: maintenanceRows,
          theme: "grid",
          styles: {
            fontSize: 7,
            cellPadding: 2,
            font: "Amiri",
            halign: "left",
          },
          headStyles: { fillColor: [20, 184, 166], fontStyle: "bold" },
          columnStyles: { 5: { cellWidth: "auto" } },
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;

        // Render photos for branch maintenance records
        const allBranchRecords = flattenMaintenanceRecords(branch.maintenanceHistory);
        for (const record of allBranchRecords) {
          if (record.photos && record.photos.length > 0) {
            if (yPos > 240) {
              doc.addPage();
              yPos = 20;
            }

            doc.setFontSize(10);
            doc.setFont("Amiri", "bold");
            doc.text(`Photos for ${record.maintenanceDate}:`, 14, yPos);
            yPos += 6;

            yPos = await renderPhotosInPDF(doc, record.photos, yPos, pageWidth, 14);
            yPos += 5;
          }
        }
      }
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);

    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 20,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" },
    );
  }

  return doc;
};

export const generateBranchPDF = async (
  companyName: string,
  branch: Branch,
  options: PDFOptions,
) => {
  const doc = new jsPDF();
  const assets = await loadFonts(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPos = 25;

  if (assets?.logo) {
    try {
      doc.addImage(assets.logo, assets.logoFormat, 14, 10, 50, 0);
      yPos = 40; // Move text down more for the wider logo
    } catch (e) {
      logger.error("Error adding logo to PDF", e, "pdf");
    }
  }

  doc.setFontSize(18);
  doc.setFont("Amiri", "bold");
  doc.text(rtl(companyName), pageWidth / 2, yPos, { align: "center" });

  yPos += 8;
  doc.setFontSize(14);
  doc.text(rtl(branch.branchName || "Branch Report"), pageWidth / 2, yPos, {
    align: "center",
  });

  yPos += 6;
  doc.setFontSize(8);
  doc.setFont("Amiri", "normal");
  doc.setTextColor(100);
  doc.text(
    `Generated: ${new Date().toLocaleDateString()}`,
    pageWidth / 2,
    yPos,
    { align: "center" },
  );

  yPos += 15;

  doc.setFontSize(12);
  doc.setFont("Amiri", "bold");
  doc.setTextColor(0);
  doc.text("Branch Information", 14, yPos);
  yPos += 8;

  const locationUrl = branch.location;
  const isLocationUrl =
    locationUrl?.startsWith("http") || locationUrl?.startsWith("www");    const branchInfo = [
    ["Location", isLocationUrl ? "View Location" : rtl(locationUrl) || "-"],
    ["Email", rtl(branch.email) || "-"],
    ["Tax ID", rtl(branch.taxNumber) || "-"],
    ["Machine Ownership", getMachineStatus(branch, !options.includeCosts)],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [],
    body: branchInfo,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2, font: "Amiri" },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    didDrawCell: (data: any) => {
      if (
        isLocationUrl &&
        data.section === "body" &&
        data.column.index === 1 &&
        data.row.index === 0
      ) {
        doc.setTextColor(37, 99, 235);
        doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, {
          url: locationUrl,
        });
      }
    },
  } as any);

  yPos = (doc as any).lastAutoTable.finalY + 10;

  if (branch.contacts.length > 0) {
    doc.setFontSize(10);
    doc.setFont("Amiri", "bold");
    doc.text("Key Contacts", 14, yPos);
    yPos += 6;

    const contactRows = branch.contacts.map((c) => [
      rtl(c.name),
      rtl(c.position === "custom" ? c.customPosition || c.position : c.position),
      c.phoneNumbers.map((p) => p.number).join(", "),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Position", "Phone"]],
      body: contactRows,
      theme: "striped",
      styles: { fontSize: 8, font: "Amiri" },
      headStyles: { fillColor: [20, 184, 166] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  if (branch.baristas && branch.baristas.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(10);
    doc.setFont("Amiri", "bold");
    doc.text("Assigned Staff", 14, yPos);
    yPos += 6;

    const baristaRows = branch.baristas.map((b) => [
      rtl(b.name),
      b.phone || "-",
      rtl(b.notes) || "-",
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Name", "Phone", "Notes"]],
      body: baristaRows,
      theme: "striped",
      styles: { fontSize: 8, font: "Amiri" },
      headStyles: { fillColor: [20, 184, 166] },
      columnStyles: { 2: { cellWidth: 60 } },
    });

    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  if (branch.maintenanceHistory.length > 0) {
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    doc.setFontSize(14);
    doc.setFont("Amiri", "bold");
    doc.text("Detailed Maintenance History", 14, yPos);
    yPos += 10;

    const allRecords = flattenMaintenanceRecords(branch.maintenanceHistory);

    for (const r of allRecords) {
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Separator line
      doc.setDrawColor(200);
      doc.line(14, yPos, pageWidth - 14, yPos);
      yPos += 5;

      // Header: Date - Type
      doc.setFontSize(11);
      doc.setFont("Amiri", "bold");
      doc.setTextColor(0);
      const typeLabel = r.type === "requested" ? "Requested" : "Scheduled";
      doc.text(`${r.maintenanceDate} (${typeLabel})`, 14, yPos);

      // Problem Solved Status
      const statusText = r.problemSolved ? "Resolved" : "Unresolved";
      doc.setTextColor(r.problemSolved ? 0 : 200, r.problemSolved ? 128 : 0, 0);
      doc.text(statusText, pageWidth - 14, yPos, { align: "right" });
      doc.setTextColor(0);

      yPos += 6;

      // Staff & Supervisor
      doc.setFontSize(9);
      doc.setFont("Amiri", "normal");
      const staffText = `Staff: ${rtl(r.baristaName)}`;
      doc.text(staffText, 14, yPos);
      yPos += 6;

      // Requested By
      if (r.type === "requested") {
        const requestedByText = `Requested By: ${rtl(r.clientBaristaName) || "-"}`;
        doc.text(requestedByText, 14, yPos);
        yPos += 6;
      }

      // Paid By & Lease Cost
      const paidByText = `Paid By: ${getPaidByLabel(r.paidBy)}`;
      doc.text(paidByText, 14, yPos);

      if (options.includeCosts && r.dailyLeaseCost) {
        doc.text(
          `Daily Lease Cost: ${formatCurrency(r.dailyLeaseCost)}`,
          pageWidth / 2,
          yPos,
        );
      }
      yPos += 8;

      // Machines
      if (r.machines && r.machines.length > 0) {
        doc.setFont("Amiri", "bold");
        doc.text("Machines:", 14, yPos);
        doc.setFont("Amiri", "normal");
        const machinesText = r.machines
          .map((m) => `${m.count || 1}x ${rtl(m.name)}`)
          .join(", ");
        const splitMachines = doc.splitTextToSize(machinesText, pageWidth - 40);
        doc.text(splitMachines, 35, yPos);
        yPos += splitMachines.length * 5 + 2;
      }

      // Issues
      if (r.problems && r.problems.length > 0) {
        doc.setFont("Amiri", "bold");
        doc.text("Issues:", 14, yPos);
        doc.setFont("Amiri", "normal");
        const issuesText = r.problems.map((p) => rtl(p)).join(", ");
        const splitIssues = doc.splitTextToSize(issuesText, pageWidth - 40);
        doc.text(splitIssues, 35, yPos);
        yPos += splitIssues.length * 5 + 2;
      }

      // Parts Replaced Table
      if (r.partsReplaced && r.partsReplaced.length > 0) {
        const partsBody = r.partsReplaced.map((p) => {
          const row = [rtl(p.name), p.count.toString()];
          if (options.includeCosts) {
            row.push(formatCurrency(p.cost || 0));
          }
          return row;
        });
        const partsHeader = ["Part", "Qty"];
        if (options.includeCosts) partsHeader.push("Cost");

        doc.setFont("Amiri", "bold");
        doc.text("Parts Replaced:", 14, yPos);
        yPos += 2;

        autoTable(doc, {
          startY: yPos,
          head: [partsHeader],
          body: partsBody,
          theme: "plain",
          styles: { fontSize: 8, font: "Amiri", cellPadding: 1 },
          headStyles: { fillColor: [240, 240, 240], textColor: 50 },
          margin: { left: 14, right: 14 },
          columnStyles: { 0: { cellWidth: "auto" } },
        } as any);
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Services Performed Table
      if (r.servicesPerformed && r.servicesPerformed.length > 0) {
        const servicesBody = r.servicesPerformed.map((s) => {
          const row = [rtl(s.name), s.count.toString()];
          if (options.includeCosts) {
            row.push(formatCurrency(s.cost || 0));
          }
          return row;
        });
        const servicesHeader = ["Service", "Qty"];
        if (options.includeCosts) servicesHeader.push("Cost");

        doc.setFont("Amiri", "bold");
        doc.text("Services Performed:", 14, yPos);
        yPos += 2;

        autoTable(doc, {
          startY: yPos,
          head: [servicesHeader],
          body: servicesBody,
          theme: "plain",
          styles: { fontSize: 8, font: "Amiri", cellPadding: 1 },
          headStyles: { fillColor: [240, 240, 240], textColor: 50 },
          margin: { left: 14, right: 14 },
          columnStyles: { 0: { cellWidth: "auto" } },
        } as any);
        yPos = (doc as any).lastAutoTable.finalY + 5;
      }

      // Notes
      if (r.notes) {
        doc.setFont("Amiri", "bold");
        doc.text("Notes:", 14, yPos);
        doc.setFont("Amiri", "normal");
        const splitNotes = doc.splitTextToSize(rtl(r.notes), pageWidth - 30);
        doc.text(splitNotes, 14, yPos + 5);
        yPos += splitNotes.length * 5 + 5;
      }

      // Recommendations
      if (r.recommendations) {
        doc.setFont("Amiri", "bold");
        doc.text("Recommendations:", 14, yPos);
        doc.setFont("Amiri", "normal");
        const splitRecs = doc.splitTextToSize(
          rtl(r.recommendations),
          pageWidth - 30,
        );
        doc.text(splitRecs, 14, yPos + 5);
        yPos += splitRecs.length * 5 + 5;
      }

      // Photos
      if (r.photos && r.photos.length > 0) {
        if (yPos > 220) {
          doc.addPage();
          yPos = 20;
        }

        doc.setFontSize(10);
        doc.setFont("Amiri", "bold");
        doc.text("Photos:", 14, yPos);
        yPos += 6;

        yPos = await renderPhotosInPDF(doc, r.photos, yPos, pageWidth, 14);
        yPos += 5;
      }

      yPos += 5;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("Amiri", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - 20,
      doc.internal.pageSize.getHeight() - 10,
      { align: "right" },
    );
  }

  return doc;
};
