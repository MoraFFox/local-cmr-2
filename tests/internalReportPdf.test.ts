import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import jsPDF from "jspdf";
import { drawLogisticsDetailsRow, drawLogisticsOperationsTable, drawClientLogisticsTable, pdfText, configureArabicBidi } from "../utils/pdfTheme";
import { reshapeArabic } from "../utils/arabicText";
import { Branch, FormData, LogisticsOperation, MaintenanceRecord } from "../types";
import {
  generateInternalCompanyReport,
  generateInternalBranchReport,
  generateClientCompanyReport,
  generateClientBranchReport,
  generateCostCompanyReport,
  generateCostBranchReport,
  generateInternalVisitReport,
  generateClientVisitReport,
  generateCostVisitReport,
  generateBatchReport,
  BatchExportItem,
  buildMaintenanceItemCell,
} from "../utils/internalReportPdf";
import { generateCompanyPDF, generateBranchPDF } from "../utils/pdfGenerator";
import { generateMockWizardData } from "../utils/mockData";
import { isRowEmpty, filterEmptyRows, NO_DATA_LABEL } from "../utils/pdfCompactLayout";

// Capture every string drawn into any jsPDF doc created in this file. The
// reports embed the Amiri font, whose encoding makes the raw PDF bytes NOT
// UTF-8 readable — decoding doc.output() cannot find the labels. jsPDF also
// attaches `text` as an own per-instance property (not on the prototype), so
// the only reliable interception is wrapping the default export with a
// subclass that records each drawn string before forwarding.
const { drawnStrings } = vi.hoisted(() => ({ drawnStrings: [] as string[] }));

vi.mock("jspdf", async (importOriginal) => {
  const mod = (await importOriginal()) as typeof import("jspdf");
  const Real = mod.default as unknown as new (...args: any[]) => any;
  return {
    ...mod,
    default: class CapturingJsPDF extends Real {
      constructor(...args: any[]) {
        super(...args);
        const doc = this as any;
        const originalText = doc.text.bind(doc);
        doc.text = (text: string | string[], ...rest: any[]) => {
          drawnStrings.push(Array.isArray(text) ? text.join("") : String(text));
          return originalText(text, ...rest);
        };
      }
    },
  };
});

// The internal reports embed the Amiri font (fetched from /fonts/*.ttf in the
// browser). Serve the real font files in tests so jsPDF registers Amiri and
// the vector-icon drawing path (which runs inside these reports) executes.
const originalFetch = globalThis.fetch;

beforeAll(() => {
  const root = process.cwd();
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const p = String(input);
    if (p.endsWith(".ttf")) {
      const abs = path.join(root, "public", p.replace(/^\//, ""));
      if (fs.existsSync(abs)) {
        const buf = fs.readFileSync(abs);
        return new Response(new Uint8Array(buf), {
          status: 200,
          headers: { "Content-Type": "font/ttf" },
        }) as unknown as Response;
      }
    }
    return new Response("not found", { status: 404 }) as unknown as Response;
  }) as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = originalFetch;
});

const extractPayloadStrings = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.flatMap(extractPayloadStrings);
};

describe("internal report PDF generation", () => {
  it("generateInternalCompanyReport produces a non-empty PDF without throwing", async () => {
    const data = generateMockWizardData();
    const doc = await generateInternalCompanyReport(data, {});
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("generateInternalBranchReport produces a non-empty PDF without throwing", async () => {
    const data = generateMockWizardData();
    const branch = data.branches[0];
    const doc = await generateInternalBranchReport(data.companyName, branch, {});
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("client company/branch PDFs render without throwing (shared icon library)", async () => {
    const data = generateMockWizardData();
    // Client PDFs draw the same vector-icon library (star Recommendations
    // badge, phone/location/wrench/cog badges), so guard them against the
    // same jsPDF API misuses that crashed the internal report.
    const companyDoc = await generateCompanyPDF(data, { includeCosts: false });
    expect(companyDoc.output("arraybuffer").byteLength).toBeGreaterThan(1000);

    const branchDoc = await generateBranchPDF(data.companyName, data.branches[0], {
      includeCosts: false,
    });
    expect(branchDoc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("reports ignore logistics-only visits (isLogisticsVisit) without throwing", async () => {
    const data = generateMockWizardData();
    // Mark every maintenance record as a logistics-only visit — reports must
    // still generate (their maintenance-log sections are simply empty).
    const logisticsBranch = {
      ...data.branches[0],
      maintenanceHistory: (data.branches[0].maintenanceHistory || []).map((r) => ({
        ...r,
        isLogisticsVisit: true,
      })),
    };
    const branchDoc = await generateInternalBranchReport(data.companyName, logisticsBranch, {});
    expect(branchDoc.output("arraybuffer").byteLength).toBeGreaterThan(1000);

    const logisticsData = {
      ...data,
      maintenanceHistory: (data.maintenanceHistory || []).map((r) => ({ ...r, isLogisticsVisit: true })),
      branches: data.branches.map((b) => ({
        ...b,
        maintenanceHistory: (b.maintenanceHistory || []).map((r) => ({ ...r, isLogisticsVisit: true })),
      })),
    };
    const companyDoc = await generateInternalCompanyReport(logisticsData, {});
    expect(companyDoc.output("arraybuffer").byteLength).toBeGreaterThan(1000);

    const clientDoc = await generateBranchPDF(data.companyName, logisticsBranch, { includeCosts: false });
    expect(clientDoc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("reports render with logistics operations present (details band + cost cards)", async () => {
    const data = generateMockWizardData();
    const logisticsOperations = [
      {
        id: 1,
        customer_id: 1,
        branch_id: 1,
        operation_type: "pickup_and_deliver" as const,
        machine_category: "coffee",
        machine_type: "semi_automatic",
        given_machine_category: "coffee",
        given_machine_type: "automatic",
        status: "closed" as const,
        open_date: "2026-07-01",
        close_date: "2026-07-03",
        total_rental_cost: 300,
        maintenance_cost: 150,
        pickup_cost: 100,
        return_cost: 100,
        total_logistics_cost: 650,
        maintenance_issues: ["تسريب مياه", "صوت عالي"],
        maintenance_services: [{ name: "تغيير جوانات", count: 2, cost: 50 }],
        maintenance_parts: [{ name: "طرمبة ضغط", count: 1, cost: 450 }],
        work_done: "",
        internal_notes: "تم تسليم بديل للعميل.",
      },
    ];
    const doc = await generateInternalBranchReport(data.companyName, data.branches[0], {
      logisticsOperations,
    });
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("pdfText delegates logical Arabic to jsPDF's native bidi hooks exactly once", () => {
    const doc = new jsPDF();
    const finalText: string[] = [];
    doc.internal.events.subscribe("postProcessText", (payload: any) => {
      finalText.push(...extractPayloadStrings(payload.text));
    });

    pdfText(doc, "تغيير جوانات — 400 EGP", 20, 20, { align: "left" });

    expect(finalText).toContain("EGP 400 — ﺕﺎﻧﺍﻮﺟ ﺮﻴﻴﻐﺗ");
  });

  it("keeps an English prefix ahead of an Arabic value", () => {
    const doc = new jsPDF();
    const finalText: string[] = [];
    doc.internal.events.subscribe("postProcessText", (payload: any) => {
      finalText.push(...extractPayloadStrings(payload.text));
    });

    pdfText(doc, "Given: ماكينة مخصصة", 20, 20, { align: "left" });

    expect(finalText).toContain("Given: ﺔﺼﺼﺨﻣ ﺔﻨﻴﻛﺎﻣ");
  });

  it("logistics details band shapes Arabic work items (joined forms + run order)", () => {
    // Regression for the screenshot's "EGP تغيير جوانات — 400" rendering bug:
    // the Details band must keep logical Arabic through wrapping and let the
    // configured jsPDF hooks shape/reorder it once at draw time.
    const doc = new jsPDF();
    // Register Amiri so splitTextToSize can measure the strings.
    const register = (file: string, name: string, style: string) => {
      const abs = path.join(process.cwd(), "public", "fonts", file);
      const b64 = fs.readFileSync(abs).toString("base64");
      doc.addFileToVFS(file, b64);
      doc.addFont(file, name, style);
    };
    register("Amiri-Regular.ttf", "Amiri", "normal");
    register("Amiri-Bold.ttf", "Amiri", "bold");
    // Register the icon font too so the section badges draw real glyphs
    // instead of the fallback-dot + warning path.
    register("fa-solid-900.ttf", "FA", "normal");

    // Capture every string handed to splitTextToSize inside the band. These
    // must remain logical Unicode; jsPDF shapes only at draw time.
    const captured: string[] = [];
    const preProcessText: string[] = [];
    const preProcessOptions: any[] = [];
    const finalText: string[] = [];
    configureArabicBidi(doc);
    doc.internal.events.subscribe("preProcessText", (payload: any) => {
      preProcessText.push(...extractPayloadStrings(payload.text));
      preProcessOptions.push(payload.options);
    });
    doc.internal.events.subscribe("postProcessText", (payload: any) => {
      finalText.push(...extractPayloadStrings(payload.text));
    });
    const originalSplit = doc.splitTextToSize.bind(doc);
    vi.spyOn(doc, "splitTextToSize").mockImplementation(
      ((text: string, maxWidth: number) => {
        captured.push(String(text));
        return originalSplit(text, maxWidth);
      }) as any,
    );

    const op: LogisticsOperation = {
      id: 1,
      customer_id: 1,
      operation_type: "pickup_and_deliver",
      status: "closed",
      machine_category: "coffee",
      machine_type: "semi_automatic",
      total_rental_cost: 300,
      maintenance_cost: 150,
      pickup_cost: 100,
      return_cost: 100,
      total_logistics_cost: 650,
      maintenance_issues: [],
      maintenance_services: [{ name: "تغيير جوانات", count: 1, cost: 400 }],
      maintenance_parts: [],
      work_done: "",
      internal_notes: "",
    };
    drawLogisticsDetailsRow(doc, op, 10, 40, 190, { showCosts: true });

    const mainItem = "1 تغيير جوانات";
    const subtitleName = "تغيير جوانات";
    const subtitleCost = "= 400 EGP";
    // Wrapping receives logical Unicode, not presentation forms. The subtitle
    // is intentionally split into an Arabic name and an LTR price fragment so
    // bidi cannot move the currency before the Arabic text.
    expect(captured).toContain(mainItem);
    expect(captured).toContain(subtitleName);
    expect(captured).not.toContain(reshapeArabic(mainItem, false));
    expect(captured).not.toContain(reshapeArabic(subtitleName, false));
    // The final doc.text payload is shaped and reordered exactly once. The
    // pre-process payload must be joined logical forms, not raw or twice
    // reversed presentation forms.
    expect(preProcessText).toContain("1 ﺗﻐﻴﻴﺮ ﺟﻮﺍﻧﺎﺕ");
    expect(preProcessText).toContain("ﺗﻐﻴﻴﺮ ﺟﻮﺍﻧﺎﺕ");
    expect(preProcessText).toContain(subtitleCost);
    expect(preProcessOptions).toContainEqual(expect.objectContaining({
      isInputVisual: false,
      isInputRtl: true,
      isOutputVisual: true,
      isOutputRtl: false,
    }));
    expect(finalText.length).toBeGreaterThan(0);
  });

  it("keeps separators below the complete item block with breathing room", () => {
    const doc = new jsPDF();
    const register = (file: string, name: string, style: string) => {
      const abs = path.join(process.cwd(), "public", "fonts", file);
      const b64 = fs.readFileSync(abs).toString("base64");
      doc.addFileToVFS(file, b64);
      doc.addFont(file, name, style);
    };
    register("Amiri-Regular.ttf", "Amiri", "normal");
    register("Amiri-Bold.ttf", "Amiri", "bold");
    register("fa-solid-900.ttf", "FA", "normal");

    const drawnText: Array<{ value: string; x: number; y: number }> = [];
    const horizontalLines: number[] = [];
    const bandRects: Array<{ y: number; height: number }> = [];
    const originalText = doc.text.bind(doc);
    vi.spyOn(doc, "text").mockImplementation(((text: string | string[], x: number, y: number, options?: any) => {
      const value = Array.isArray(text) ? text.join("\\n") : text;
      drawnText.push({ value, x, y });
      return originalText(text as any, x, y, options);
    }) as any);
    const originalRect = doc.rect.bind(doc);
    vi.spyOn(doc, "rect").mockImplementation(((x: number, y: number, width: number, height: number, style?: any) => {
      bandRects.push({ y, height });
      return originalRect(x, y, width, height, style);
    }) as any);
    const originalLine = doc.line.bind(doc);
    vi.spyOn(doc, "line").mockImplementation(((x1: number, y1: number, x2: number, y2: number) => {
      if (x2 > x1 && y1 === y2) horizontalLines.push(y1);
      return originalLine(x1, y1, x2, y2);
    }) as any);

    drawLogisticsDetailsRow(doc, {
      id: 1,
      customer_id: 1,
      operation_type: "pickup_only",
      status: "closed",
      maintenance_issues: [],
      maintenance_services: [
        { name: "Long Service ".repeat(24), count: 1, cost: 10 },
        { name: "Service B", count: 1, cost: 20 },
      ],
      maintenance_parts: [],
      work_done: "",
      internal_notes: "",
    }, 10, 40, 190, { showCosts: true });

    const longItemTexts = drawnText.filter(({ value }) => value.includes("Long Service"));
    const nextItemMain = drawnText.find(({ value }) => value === "1 Service B");
    expect(longItemTexts.length).toBeGreaterThan(2); // wrapped main + wrapped subtitle
    expect(nextItemMain).toBeDefined();
    expect(horizontalLines.length).toBe(1);
    const separatorY = horizontalLines[0];
    const lastLongTextY = Math.max(...longItemTexts.map(({ y }) => y));
    // The separator must be below every wrapped line of the long item, and
    // the next item's main row must start well below the separator. The
    // minimum clearance catches a rule that merely misses the baseline while
    // still crossing the glyph ink.
    expect(separatorY).toBeGreaterThan(lastLongTextY);
    expect((nextItemMain as { y: number }).y).toBeGreaterThan(separatorY + 1);
    // The enclosing Details band must also extend below all rendered content.
    expect(bandRects).toHaveLength(1);
    expect(bandRects[0].y + bandRects[0].height).toBeGreaterThan(lastLongTextY + 2);
    expect(bandRects[0].y + bandRects[0].height).toBeGreaterThan((nextItemMain as { y: number }).y);
  });

  it("logistics tables shape Arabic machine descriptions (custom categories/types)", () => {
    // Custom (unmapped) machine categories/types fall through
    // formatMachineDescription as raw Arabic strings. Both logistics tables
    // must preserve those logical values through wrapping and shape them only
    // when jsPDF draws the final line.
    const doc = new jsPDF();
    const register = (file: string, name: string, style: string) => {
      const abs = path.join(process.cwd(), "public", "fonts", file);
      const b64 = fs.readFileSync(abs).toString("base64");
      doc.addFileToVFS(file, b64);
      doc.addFont(file, name, style);
    };
    register("Amiri-Regular.ttf", "Amiri", "normal");
    register("Amiri-Bold.ttf", "Amiri", "bold");
    register("fa-solid-900.ttf", "FA", "normal");

    const captured: string[] = [];
    const preProcessText: string[] = [];
    const preProcessOptions: any[] = [];
    const finalText: string[] = [];
    configureArabicBidi(doc);
    doc.internal.events.subscribe("preProcessText", (payload: any) => {
      preProcessText.push(...extractPayloadStrings(payload.text));
      preProcessOptions.push(payload.options);
    });
    doc.internal.events.subscribe("postProcessText", (payload: any) => {
      finalText.push(...extractPayloadStrings(payload.text));
    });
    const originalSplit = doc.splitTextToSize.bind(doc);
    vi.spyOn(doc, "splitTextToSize").mockImplementation(
      ((text: string, maxWidth: number) => {
        captured.push(String(text));
        return originalSplit(text, maxWidth);
      }) as any,
    );

    const op: LogisticsOperation = {
      id: 1,
      customer_id: 1,
      operation_type: "pickup_and_deliver",
      status: "closed",
      machine_category: "ماكينة مخصصة",
      machine_type: "نظام خاص",
      given_machine_category: "مطحنة بديلة",
      given_machine_type: "يدوية",
      total_rental_cost: 300,
      maintenance_cost: 150,
      pickup_cost: 100,
      return_cost: 100,
      total_logistics_cost: 650,
      maintenance_issues: [],
      maintenance_services: [],
      maintenance_parts: [],
      work_done: "",
      internal_notes: "",
    };
    drawLogisticsOperationsTable(doc, [op], 10, 10);
    // Offset Y so the client table doesn't draw over the internal one (the
    // assertions only care about splitTextToSize inputs, but keep the doc sane).
    drawClientLogisticsTable(doc, [op], 40, 10);

    const clientMachine = "ماكينة مخصصة · نظام خاص";
    const givenMachine = "مطحنة بديلة · يدوية";
    // Wrapping receives the original logical values.
    expect(captured).toContain(clientMachine);
    expect(captured).toContain(`Given: ${givenMachine}`); // internal table
    expect(captured).toContain(givenMachine); // client table
    // Final draw payloads use joined presentation forms, not raw isolated
    // Arabic, for both logistics tables.
    expect(preProcessText.some((text) => text.includes("ﻣﺎﻛﻴﻨﺔ") || text.includes("ﻣﻄﺤﻨﺔ"))).toBe(true);
    expect(preProcessOptions.some((options) => options?.isInputVisual === false && options?.isOutputVisual === true)).toBe(true);
    expect(finalText.length).toBeGreaterThan(0);
  });

  it("generateInternalVisitReport produces a per-visit PDF with costs", async () => {
    const data = generateMockWizardData();
    const record = data.branches[0].maintenanceHistory[0];
    const doc = await generateInternalVisitReport(
      data.companyName,
      { branchName: data.branches[0].branchName },
      record,
    );
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("generateClientVisitReport produces a per-visit PDF without costs", async () => {
    const data = generateMockWizardData();
    const record = data.branches[0].maintenanceHistory[0];
    const doc = await generateClientVisitReport(data.companyName, {}, record);
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("generateCostCompanyReport produces a cost PDF (full costs, no payer split)", async () => {
    const data = generateMockWizardData();
    const doc = await generateCostCompanyReport(data, {});
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("generateCostBranchReport produces a cost PDF (full costs, no payer split)", async () => {
    const data = generateMockWizardData();
    const doc = await generateCostBranchReport(data.companyName, data.branches[0], {});
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("generateCostVisitReport produces a per-visit cost PDF (full costs, no payer split)", async () => {
    const data = generateMockWizardData();
    const record = data.branches[0].maintenanceHistory[0];
    const doc = await generateCostVisitReport(data.companyName, {}, record);
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("cost report: grand total equals sum of category lines and strips all payer labels", async () => {
    // Deterministic dataset (costs are set explicitly on each item so the
    // price-list lookup cannot change them):
    //   parts     2×100 (company) + 1×50 (client)   = 250
    //   services  3×20 (company)  + 1×30 (client)   = 90
    //   visit fee cairo zone                        = 500
    //   machine rental (daily lease)                = 120
    //   grand total (everything added up)           = 960
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "cost-probe-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [
        { name: "Pump A", count: 2, cost: 100 },
        { name: "Gasket B", count: 1, cost: 50, paidByClient: true },
      ],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [
        { name: "Service X", count: 3, cost: 20 },
        { name: "Service Y", count: 1, cost: 30, paidByClient: true },
      ],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 120,
      problems: ["Leak"],
    };
    const costData: FormData = {
      ...base,
      companyName: "Probe Co",
      maintenanceHistory: [],
      branches: [
        {
          ...base.branches[0],
          branchName: "Probe Branch",
          maintenanceHistory: [record],
          machines: [],
        },
      ],
    };

    // Capture every string drawn into the PDF. The report embeds the Amiri
    // font, whose encoding makes the raw file bytes NOT UTF-8 readable, so
    // decoding doc.output() cannot find the labels — the vi.mock("jspdf")
    // subclass above records every doc.text() call, which is the reliable
    // way to assert what actually lands on the page.
    drawnStrings.length = 0;
    const doc = await generateCostCompanyReport(costData, {});
    const drawn = drawnStrings.join("\n");
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);

    // The four category totals render as lines...
    expect(drawn).toContain("250 EGP");
    expect(drawn).toContain("90 EGP");
    expect(drawn).toContain("500 EGP");
    expect(drawn).toContain("120 EGP");
    // ...and the grand total is exactly their sum (250 + 90 + 500 + 120).
    expect(drawn).toContain("960 EGP");
    // The cost-mode grand-total label replaces "Net Cost to Company".
    expect(drawn).toContain("Total Cost");

    // No payer attribution anywhere in cost mode:
    expect(drawn).not.toContain("Company Paid");
    expect(drawn).not.toContain("Client Paid");
    expect(drawn).not.toContain("Client Invoice Total");
    expect(drawn).not.toContain("Net Cost to Company");
    expect(drawn).not.toContain("Paid by");
    expect(drawn).not.toContain("Client");

    // Differential control: the internal report on the SAME data must keep
    // the payer split (proving cost mode is what strips it).
    drawnStrings.length = 0;
    await generateInternalCompanyReport(costData, {});
    const internalDrawn = drawnStrings.join("\n");
    expect(internalDrawn).toContain("Company Paid");
    expect(internalDrawn).toContain("Client Paid");
    expect(internalDrawn).toContain("Client Invoice Total");
    expect(internalDrawn).toContain("Net Cost to Company");
  }, 30000);

  it("maintenance log table boxes Parts/Services items with a cost sub-column and Total line", async () => {
    // Regression: the Parts and Services columns must itemize every entry as a
    // boxed block — breakdown left, item cost in a right sub-column, subtle
    // per-unit subtitle, hairline separators between items, and a Total line.
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "bullet-probe-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [
        { name: "Pump A", count: 2, cost: 100 },
        { name: "Gasket B", count: 1, cost: 50, paidByClient: true },
      ],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [{ name: "Service X", count: 3, cost: 20 }],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 0,
      problems: ["Leak"],
    };
    const branch: Branch = {
      ...base.branches[0],
      branchName: "Bullet Probe",
      maintenanceHistory: [record],
      machines: [],
    };

    drawnStrings.length = 0;
    const doc = await generateInternalBranchReport("Probe Co", branch, {});
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");

    // Each item is a boxed block: breakdown left (qty + name), per-item total
    // cost in the right sub-column, with a per-unit subtitle underneath that
    // names the item and its unit price.
    expect(drawn).toContain("2 Pump A (By Midos)");
    expect(drawn).toContain("200 EGP");
    expect(drawn).toContain("Pump A = 100 EGP");
    expect(drawn).toContain("1 Gasket B (By Client)");
    expect(drawn).toContain("50 EGP");
    expect(drawn).toContain("Gasket B = 50 EGP");
    expect(drawn).toContain("3 Service X (By Midos)");
    expect(drawn).toContain("60 EGP");
    // Each column ends with its subtotal row (left label + right cost).
    expect(drawnStrings.some((s) => s === "Total")).toBe(true);
    expect(drawn).toContain("250 EGP");
    // The standalone cost columns were removed, so the totals live inside the
    // Parts/Services cells rather than in dedicated columns.
    expect(drawn).not.toContain("Parts Cost");
    expect(drawn).not.toContain("Services Cost");
    // The row's grand figure column is relabeled so it isn't confused with the
    // "Total:" lines that now end each Parts/Services cell.
    expect(drawn).toContain("Record Total");

    // costMode strips payer labels from the bullets too (showPayer=false).
    drawnStrings.length = 0;
    await generateCostBranchReport("Probe Co", branch, {});
    const costDrawn = drawnStrings.join("\n");
    expect(costDrawn).toContain("2 Pump A");
    expect(costDrawn).toContain("200 EGP");
    expect(costDrawn).toContain("1 Gasket B");
    expect(costDrawn).not.toContain("(By Midos)");
    expect(costDrawn).not.toContain("(By Client)");
  }, 30000);

  it("buildMaintenanceItemCell boxes items with separators and a cost sub-column", () => {
    const record: MaintenanceRecord = {
      id: "cell-probe",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [
        { name: "Pump A", count: 2, cost: 100 },
        { name: "Gasket B", count: 1, cost: 50, paidByClient: true },
      ],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [{ name: "Service X", count: 3, cost: 20 }],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 0,
      problems: ["Leak", "Noise"],
    };

    // Problems: one bullet per issue, hairline between items, none after the last.
    const problems = buildMaintenanceItemCell(record, "problems", true, true);
    expect(problems.map((r) => r.left)).toEqual(["• Leak", "• Noise"]);
    expect(problems[0].sepBelow).toBe(true);
    expect(problems[1].sepBelow).toBeFalsy();

    // Parts (costs on): main line = qty + name left + item total right, then a
    // muted per-unit subtitle naming the item, separators between items, then
    // a bold Total row with a separator above.
    const parts = buildMaintenanceItemCell(record, "parts", true, true);
    expect(parts[0]).toMatchObject({ left: "2 Pump A (By Midos)", right: "200 EGP" });
    expect(parts[1]).toMatchObject({ left: "Pump A = 100 EGP", style: "muted", sepBelow: true });
    expect(parts[2]).toMatchObject({ left: "1 Gasket B (By Client)", right: "50 EGP" });
    expect(parts[3]).toMatchObject({ left: "Gasket B = 50 EGP", style: "muted", sepBelow: false });
    expect(parts[4]).toMatchObject({ left: "Total", right: "250 EGP", style: "bold", sepAbove: true });

    // costMode: payer labels stripped from the breakdown side.
    const costParts = buildMaintenanceItemCell(record, "parts", false, true);
    expect(costParts[0].left).toBe("2 Pump A");
    expect(costParts[0].right).toBe("200 EGP");

    // Client mode: no costs — no right sub-column, no subtitles, no Total row.
    const clientParts = buildMaintenanceItemCell(record, "parts", true, false);
    expect(clientParts[0]).toMatchObject({ left: "2 Pump A (By Midos)", right: undefined });
    expect(clientParts.some((r) => r.style === "muted" || r.style === "bold")).toBe(false);
    expect(clientParts.every((r) => r.right === undefined)).toBe(true);

    // Non-list columns fall through to the plain formatter (empty result).
    expect(buildMaintenanceItemCell(record, "date", true, true)).toEqual([]);
  });

  it("drops Avg Rating KPI, adds logistics to Total Cost KPI, and no longer renders Most Used Parts", async () => {
    // Deterministic dataset:
    //   parts 2×100 (company) + 1×50 (client) = 250, services 3×20 = 60
    //   visit fee cairo = 500, daily lease = 120
    //   grandTotalCompanyCost = 200 + 60 + 500 - 120 = 640
    //   logistics op total = 300 + 100 + 100 + 150 = 650
    //   ⇒ Total Cost KPI must show 640 + 650 = 1,290 EGP.
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "kpi-probe-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [
        { name: "Pump A", count: 2, cost: 100 },
        { name: "Gasket B", count: 1, cost: 50, paidByClient: true },
      ],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [{ name: "Service X", count: 3, cost: 20 }],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 120,
      problems: ["Leak"],
    };
    const branch: Branch = {
      ...base.branches[0],
      branchName: "KPI Probe",
      maintenanceHistory: [record],
      machines: [],
    };
    const logisticsOperations: LogisticsOperation[] = [
      {
        id: 1,
        customer_id: 1,
        operation_type: "pickup_and_deliver",
        status: "closed",
        machine_category: "coffee",
        total_rental_cost: 300,
        maintenance_cost: 150,
        pickup_cost: 100,
        return_cost: 100,
        total_logistics_cost: 650,
        maintenance_issues: [],
        maintenance_services: [],
        maintenance_parts: [],
        work_done: "",
        internal_notes: "",
      },
    ];

    drawnStrings.length = 0;
    const doc = await generateInternalBranchReport("Probe Co", branch, { logisticsOperations });
    const drawn = drawnStrings.join("\n");
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);

    // 1) Avg Rating KPI removed: the only remaining "Avg Rating" string is
    //    the Technician Performance table header, so it must appear exactly once.
    expect(drawnStrings.filter((s) => s === "Avg Rating").length).toBe(1);

    // 2) Total/Net Cost KPI includes the logistics section costs.
    expect(drawn).toContain("1,290 EGP");

    // 3) The "Most Used Parts" summary section is gone — the same data still
    //    shows up in the maintenance log / cost breakdown instead.
    expect(drawn).not.toContain("Most Used Parts");

    // Same guarantees hold for the company-level report (shared section logic).
    const costData: FormData = {
      ...base,
      companyName: "Probe Co",
      maintenanceHistory: [],
      branches: [branch],
    };
    drawnStrings.length = 0;
    await generateInternalCompanyReport(costData, { logisticsOperations });
    const companyDrawn = drawnStrings.join("\n");
    // (Avg Rating KPI removal is already locked above via the shared
    // buildKPICards through the branch run; the company-level Technician
    // Performance table builds from top-level maintenanceHistory, which is
    // empty here, so its header is absent rather than rendered once.)
    expect(companyDrawn).toContain("1,290 EGP");
    expect(companyDrawn).not.toContain("Most Used Parts");
  }, 30000);

  it("cost breakdown splits logistics under a yellow 'Midos In House Maintenance' group", async () => {
    // Deterministic dataset:
    //   maintenance: parts 2×100 + 1×50 = 250, services 3×20 = 60,
    //   visit fee cairo = 500, daily lease = 120 ⇒ grandTotalCompanyCost = 640
    //   logistics: rental 300 + pickup 100 + return 100 + maintenance 150 = 650
    //     (itemized as Part Z 1×50 + Service Y 2×50, so the 150 maintenance
    //     cost is fully covered by the itemized parts+services)
    //   ⇒ breakdown grand total = 640 + 650 = 1,290 EGP
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "group-probe-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [
        { name: "Pump A", count: 2, cost: 100 },
        { name: "Gasket B", count: 1, cost: 50, paidByClient: true },
      ],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [{ name: "Service X", count: 3, cost: 20 }],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 120,
      problems: ["Leak"],
    };
    const branch: Branch = {
      ...base.branches[0],
      branchName: "Group Probe",
      maintenanceHistory: [record],
      machines: [],
    };
    const logisticsOperations: LogisticsOperation[] = [
      {
        id: 1,
        customer_id: 1,
        operation_type: "pickup_and_deliver",
        status: "closed",
        machine_category: "coffee",
        total_rental_cost: 300,
        maintenance_cost: 150,
        pickup_cost: 100,
        return_cost: 100,
        total_logistics_cost: 650,
        maintenance_issues: [],
        maintenance_services: [{ name: "Service Y", count: 2, cost: 50 }],
        maintenance_parts: [{ name: "Part Z", count: 1, cost: 50 }],
        work_done: "",
        internal_notes: "",
      },
    ];

    drawnStrings.length = 0;
    const doc = await generateInternalBranchReport("Probe Co", branch, { logisticsOperations });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");

    // 1) The maintenance rows sit under their own group header.
    expect(drawn).toContain("Maintenance Visits");
    // 2) The logistics rows sit under the yellow "Midos In House Maintenance" header.
    expect(drawn).toContain("Midos In House Maintenance");
    // 3) The logistics group itemizes transportation, parts and services.
    expect(drawn).toContain("Transportation");
    expect(drawn).toContain("Transport — Pickup");
    expect(drawn).toContain("Transport — Return");
    expect(drawn).toContain("Part Z");
    expect(drawn).toContain("Service Y");
    // 4) The "Maintenance Visits" group header carries its own subtotal row
    //    (parts 250 + services 60 + visit fees 500 + lease 120 = 930 EGP) — a
    //    value only the grouped financial summary renders (the KPI card shows
    //    the net 1,290 figure instead), so this uniquely proves the group rows.
    expect(drawn).toContain("930 EGP");
    // 5) The breakdown grand total covers EVERYTHING (maintenance + logistics).
    expect(drawn).toContain("1,290 EGP");

    // The same grouped breakdown holds for the cost report (company level).
    const costData: FormData = {
      ...base,
      companyName: "Probe Co",
      maintenanceHistory: [],
      branches: [branch],
    };
    drawnStrings.length = 0;
    await generateCostCompanyReport(costData, { logisticsOperations });
    const costDrawn = drawnStrings.join("\n");
    expect(costDrawn).toContain("Maintenance Visits");
    expect(costDrawn).toContain("Midos In House Maintenance");
    expect(costDrawn).toContain("Transportation");
    // Cost mode adds everything up: 250 + 60 + 500 + 120 + 650 = 1,580 EGP.
    expect(costDrawn).toContain("1,580 EGP");

    // Client reports strip every cost figure — no logistics group, no headers.
    drawnStrings.length = 0;
    await generateClientBranchReport("Probe Co", branch, { logisticsOperations });
    const clientDrawn = drawnStrings.join("\n");
    expect(clientDrawn).not.toContain("Midos In House Maintenance");
    expect(clientDrawn).not.toContain("Transportation");
    expect(clientDrawn).not.toContain("EGP");
  }, 30000);

  it("a very tall cost breakdown paginates instead of overflowing the page", async () => {
    // Regression: the Cost Breakdown table grows past one page once the
    // in-house logistics group itemizes many parts/services (a 30+ row group
    // was overflowing past the bottom margin). drawFinancialSummary must now
    // split the table across pages and repeat its "Item | Details | Amount"
    // column header on each segment, exactly like the maintenance-log table.
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "paginate-probe-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: false,
      partsWereReplaced: false,
      problemSolved: false,
      partsReplaced: [],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo", // 500 EGP visit fee keeps the Maintenance Visits group present
      servicesPerformed: [],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 0,
      problems: [],
    };
    const branch: Branch = {
      ...base.branches[0],
      branchName: "Pagination Probe",
      maintenanceHistory: [record],
      machines: [],
    };
    // One closed logistics op whose itemized work fills well over a page:
    // 30 parts + 30 services (50 EGP each) = 3,000 EGP of itemized work,
    // matching maintenance_cost so no legacy remainder line appears.
    const parts = Array.from({ length: 30 }, (_, i) => ({ name: `Part ${i + 1}`, count: 1, cost: 50 }));
    const services = Array.from({ length: 30 }, (_, i) => ({ name: `Service ${i + 1}`, count: 1, cost: 50 }));
    const logisticsOperations: LogisticsOperation[] = [
      {
        id: 1,
        customer_id: 1,
        operation_type: "pickup_and_deliver",
        status: "closed",
        machine_category: "coffee",
        total_rental_cost: 300,
        maintenance_cost: 3000,
        pickup_cost: 100,
        return_cost: 100,
        total_logistics_cost: 3500,
        maintenance_issues: [],
        maintenance_services: services,
        maintenance_parts: parts,
        work_done: "",
        internal_notes: "",
      },
    ];

    drawnStrings.length = 0;
    const doc = await generateInternalBranchReport("Probe Co", branch, { logisticsOperations });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    // The breakdown spans at least two pages.
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);

    const drawn = drawnStrings.join("\n");
    // The "Amount" column header is unique to the financial summary's header
    // row, so it must appear once per page segment — proof the table repeated
    // its header after the page break instead of running off the page.
    expect(drawnStrings.filter((s) => s === "Amount").length).toBeGreaterThanOrEqual(2);
    // All the logistics rows still render, plus the group header and the
    // grand total — nothing lost to the page boundary.
    expect(drawn).toContain("Midos In House Maintenance");
    expect(drawn).toContain("Part 1");
    expect(drawn).toContain("Part 30");
    expect(drawn).toContain("Service 30");
    expect(drawn).toContain("Net Cost to Company");
  }, 30000);

  it("cost PDF reports drop the Resolution Rate KPI (internal report keeps it)", async () => {
    // Deterministic dataset with a resolvable problem so the rate is defined.
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "res-probe-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [{ name: "Pump A", count: 2, cost: 100 }],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 0,
      problems: ["Leak"],
    };
    const branch: Branch = {
      ...base.branches[0],
      branchName: "Res Probe",
      maintenanceHistory: [record],
      machines: [],
    };
    const costData: FormData = {
      ...base,
      companyName: "Probe Co",
      maintenanceHistory: [],
      branches: [branch],
    };

    // Cost reports (branch + company) must NOT draw a Resolution Rate card.
    drawnStrings.length = 0;
    await generateCostBranchReport("Probe Co", branch, {});
    expect(drawnStrings.join("\n")).not.toContain("Resolution Rate");

    drawnStrings.length = 0;
    await generateCostCompanyReport(costData, {});
    expect(drawnStrings.join("\n")).not.toContain("Resolution Rate");

    // Differential control: the regular internal reports on the SAME data
    // must KEEP the Resolution Rate card (proving costMode is what strips it).
    drawnStrings.length = 0;
    await generateInternalBranchReport("Probe Co", branch, {});
    expect(drawnStrings.join("\n")).toContain("Resolution Rate");

    drawnStrings.length = 0;
    await generateInternalCompanyReport(costData, {});
    expect(drawnStrings.join("\n")).toContain("Resolution Rate");
  }, 30000);

  it("client reports use the cost-report style but strip every cost figure", async () => {
    // Deterministic dataset with costs on every item so the differential
    // control (cost report) is unambiguous:
    //   parts 2×100 (company) + 1×50 (client), services 3×20 (company)
    //   daily lease 120, cairo zone fee 500 ⇒ grandTotalCompanyCost = 640
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "client-probe-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [
        { name: "Pump A", count: 2, cost: 100 },
        { name: "Gasket B", count: 1, cost: 50, paidByClient: true },
      ],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [{ name: "Service X", count: 3, cost: 20 }],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 120,
      problems: ["Leak"],
    };
    const branch: Branch = {
      ...base.branches[0],
      branchName: "Client Probe",
      maintenanceHistory: [record],
      machines: [],
    };
    const clientData: FormData = {
      ...base,
      companyName: "Probe Co",
      maintenanceHistory: [],
      branches: [branch],
    };
    const logisticsOperations: LogisticsOperation[] = [
      {
        id: 1,
        customer_id: 1,
        operation_type: "pickup_and_deliver",
        status: "closed",
        machine_category: "coffee",
        total_rental_cost: 300,
        maintenance_cost: 150,
        pickup_cost: 100,
        return_cost: 100,
        total_logistics_cost: 650,
        maintenance_issues: [],
        maintenance_services: [{ name: "Service Y", count: 1, cost: 40 }],
        maintenance_parts: [{ name: "Part Z", count: 1, cost: 30 }],
        work_done: "",
        internal_notes: "",
      },
    ];

    // Branch client report: same sections as the cost report, no costs.
    drawnStrings.length = 0;
    const branchDoc = await generateClientBranchReport("Probe Co", branch, { logisticsOperations });
    expect(branchDoc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const branchDrawn = drawnStrings.join("\n");

    // Style: same brand layout (header subtitle, KPI cards, section headers).
    expect(branchDrawn).toContain("Client Report");
    expect(branchDrawn).toContain("Total Visits");
    expect(branchDrawn).toContain("Spare Parts");
    expect(branchDrawn).toContain("Detailed Maintenance Log");
    expect(branchDrawn).toContain("Technician Performance");
    expect(branchDrawn).not.toContain("Most Frequent Problems");
    expect(branchDrawn).toContain("Logistics — Machine Transport & Replacement");
    expect(branchDrawn).not.toContain("Most Used Parts");

    // Info: client mode renders each visit as its own detail block (Visit
    // Summary, Machines, Issues, Parts Replaced, Services Performed tables),
    // with NO prices or totals anywhere.
    expect(branchDrawn).toContain("Visit Summary");
    expect(branchDrawn).toContain("Parts Replaced");
    expect(branchDrawn).toContain("Services Performed");
    expect(branchDrawn).toContain("Pump A");
    expect(branchDrawn).toContain("Gasket B");
    expect(branchDrawn).toContain("Service X");
    expect(branchDrawn).not.toContain("200 EGP");
    expect(branchDrawn).not.toContain("Total: 250 EGP");

    // No cost figures or cost sections anywhere.
    expect(branchDrawn).not.toContain("EGP");
    expect(branchDrawn).not.toContain("Cost Breakdown");
    expect(branchDrawn).not.toContain("Total Cost");
    expect(branchDrawn).not.toContain("Net Cost");
    expect(branchDrawn).not.toContain("Daily Lease");
    expect(branchDrawn).not.toContain("Record Total");
    expect(branchDrawn).not.toContain("Maintenance Cost Report");
    expect(branchDrawn).not.toContain("Machine Rental");
    expect(branchDrawn).not.toContain("Client Invoice Total");

    // Company client report: same guarantees (Branch Comparison is cost-only
    // and must be absent in client mode).
    drawnStrings.length = 0;
    const companyDoc = await generateClientCompanyReport(clientData, { logisticsOperations });
    expect(companyDoc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const companyDrawn = drawnStrings.join("\n");
    expect(companyDrawn).toContain("Client Report");
    expect(companyDrawn).toContain("Total Visits");
    expect(companyDrawn).not.toContain("EGP");
    expect(companyDrawn).not.toContain("Cost Breakdown");
    expect(companyDrawn).not.toContain("Branch Comparison");
    expect(companyDrawn).not.toContain("Record Total");
    expect(companyDrawn).not.toContain("Daily Lease");

    // Client company report keeps an overview of EACH branch (what was done
    // there) in the new style — info box, visit summary, contacts, staff and
    // the branch's own maintenance log.
    expect(companyDrawn).toContain("Branch — Client Probe");
    expect(companyDrawn).toContain("Branch Information");
    expect(companyDrawn).toContain("Visit Summary");
    expect(companyDrawn).toContain("Maintenance Log");
    expect(companyDrawn).toContain("Assigned Staff");
    expect(companyDrawn).toContain("Contacts");

    // Differential control: the cost report on the SAME data shows all costs.
    drawnStrings.length = 0;
    await generateCostBranchReport("Probe Co", branch, { logisticsOperations });
    const costDrawn = drawnStrings.join("\n");
    expect(costDrawn).toContain("EGP");
    expect(costDrawn).toContain("Cost Breakdown");
    expect(costDrawn).toContain("2 Pump A");
    expect(costDrawn).toContain("200 EGP");
    expect(costDrawn).toContain("Total Cost");
    expect(costDrawn).toContain("Machine Rental");
  }, 30000);

  it("branch client report renders per-record detail blocks and photos", async () => {
    // The client branch report renders each visit as its own detail block
    // (Visit Summary + Machines/Issues/Parts/Services + photos) — the legacy
    // branch PDF's per-record treatment in the new brand style, cost-free.
    const base = generateMockWizardData();
    const record: MaintenanceRecord = {
      id: "client-detail-1",
      maintenanceDate: "2026-07-15",
      type: "scheduled",
      isLogisticsVisit: false,
      hadProblem: true,
      partsWereReplaced: true,
      problemSolved: true,
      partsReplaced: [{ name: "Pump A", count: 2, cost: 100 }],
      paidBy: "company",
      baristaName: "Tech 1",
      visitZone: "cairo",
      servicesPerformed: [{ name: "Service X", count: 3, cost: 20 }],
      followUpVisits: [],
      supervisors: [],
      dailyLeaseCost: 0,
      problems: ["Leak"],
      recommendations: "Replace gasket next visit",
      notes: "Client complained of noise",
      photos: [{ url: "https://placehold.co/600x400?text=Before", type: "before" as const }],
    };
    const branch: Branch = {
      ...base.branches[0],
      branchName: "Detail Probe",
      maintenanceHistory: [record],
      machines: [],
    };

    drawnStrings.length = 0;
    const doc = await generateClientBranchReport("Probe Co", branch, {});
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");

    // Per-record detail blocks in the new style, no costs.
    expect(drawn).toContain("Visit Summary");
    expect(drawn).toContain("Parts Replaced");
    expect(drawn).toContain("Services Performed");
    expect(drawn).toContain("Recommendations");
    expect(drawn).toContain("Notes");
    expect(drawn).toContain("Pump A");
    expect(drawn).not.toContain("EGP");
    expect(drawn).not.toContain("Cost Breakdown");

    // Photos render (placeholder when the image can't be fetched in tests).
    expect(drawn).toContain("Photos");
    expect(drawn).toContain("Before Photos:");
  }, 30000);

  it("visit reports render follow-ups, photos and empty branches without throwing", async () => {
    const data = generateMockWizardData();
    const base = data.branches[0].maintenanceHistory[0];
    const record = {
      ...base,
      followUpVisits: [
        {
          ...base,
          id: "fu-1",
          maintenanceDate: "2026-07-10",
          problems: ["Leak", "Noise"],
          partsReplaced: [{ name: "Pump A", count: 2, cost: 100 }],
          servicesPerformed: [{ name: "Service X", count: 3, cost: 20 }],
        },
      ],
      photos: [{ url: "https://placehold.co/600x400?text=Before", type: "before" as const }],
    };

    drawnStrings.length = 0;
    const doc = await generateInternalVisitReport(data.companyName, {}, record);
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");

    // Follow-up work items render as one row each inside the summary cell —
    // a bullet per issue/part/service, never a comma-run on a single line.
    expect(drawn).toContain("Issues:");
    expect(drawn).toContain("  • Leak");
    expect(drawn).toContain("  • Noise");
    expect(drawn).toContain("Parts:");
    expect(drawn).toContain("  • 2× Pump A");
    expect(drawn).toContain("Services:");
    expect(drawn).toContain("  • 3× Service X");
    // No comma-joined run of multiple work items remains.
    expect(drawn).not.toContain("Issues: Leak, Noise");
  }, 30000);

  it("generateBatchReport produces a cover, summary table and detail blocks for each mode", async () => {
    const base = generateMockWizardData();
    const recA = { ...base.maintenanceHistory[0], id: "batch-a", type: "requested" as const };
    const recB = { ...base.branches[0].maintenanceHistory[0], id: "batch-b", type: "scheduled" as const };
    const items: BatchExportItem[] = [
      {
        record: recA,
        companyId: 1,
        companyName: "Alpha Co",
        branchId: -1,
        branchName: "Main Office",
      },
      {
        record: recB,
        companyId: 1,
        companyName: "Alpha Co",
        branchId: 5,
        branchName: "Branch Five",
      },
    ];

    // Cost mode: cover summary + summary table + costed detail blocks.
    drawnStrings.length = 0;
    const doc = await generateBatchReport(items, {
      mode: "cost",
      grouped: true,
      includeSummaryTable: true,
      filterDescription: "All requested visits",
    });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    // Cover sheet documents the batch.
    expect(drawn).toContain("Batch Summary");
    expect(drawn).toContain("Records:");
    expect(drawn).toContain("Selection:");
    expect(drawn).toContain("All requested visits");
    // Summary table lists every selected record.
    expect(drawn).toContain("Records Summary");
    expect(drawn).toContain("Alpha Co");
    expect(drawn).toContain("Branch Five");
    // Grouped sections carry company — branch titles.
    expect(drawn).toContain("Alpha Co — Main Office");
    expect(drawn).toContain("Alpha Co — Branch Five");
    // Detail blocks with per-record costs (cost mode has no payer split).
    expect(drawn).toContain("Visit Summary");
    expect(drawn).toContain("Cost Breakdown");
    expect(drawn).toContain("Total Cost");
  }, 30000);

  it("generateBatchReport client mode strips every cost figure", async () => {
    const base = generateMockWizardData();
    const rec = { ...base.branches[0].maintenanceHistory[0], id: "batch-client-1" };
    const items: BatchExportItem[] = [
      {
        record: rec,
        companyId: 1,
        companyName: "Alpha Co",
        branchId: 5,
        branchName: "Branch Five",
      },
    ];

    drawnStrings.length = 0;
    const doc = await generateBatchReport(items, {
      mode: "client",
      includeSummaryTable: true,
    });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    expect(drawn).toContain("Batch Summary");
    expect(drawn).toContain("Records Summary");
    expect(drawn).toContain("Visit Summary");
    // No financial figures anywhere — no cover total, no cost column, no breakdown.
    expect(drawn).not.toContain("EGP");
    expect(drawn).not.toContain("Cost Breakdown");
    expect(drawn).not.toContain("Total Cost");
  }, 30000);
});

describe("empty-state suppression (phase 03)", () => {
  it("isRowEmpty treats 0/null/empty as empty per D-02 and returns true only for all-empty rows", () => {
    const cols = [
      { accessor: (r: { a: unknown; b: unknown }) => r.a, ignoreIf: "empty" as const },
      { accessor: (r: { a: unknown; b: unknown }) => r.b, ignoreIf: "zero" as const },
    ];
    // All-empty row → true
    expect(isRowEmpty({ a: "", b: 0 }, cols)).toBe(true);
    expect(isRowEmpty({ a: null, b: 0 }, cols)).toBe(true);
    expect(isRowEmpty({ a: undefined, b: "" }, cols)).toBe(true);
    // A row with one non-empty cell → false
    expect(isRowEmpty({ a: "x", b: 0 }, cols)).toBe(false);
    expect(isRowEmpty({ a: "", b: 5 }, cols)).toBe(false);
  });

  it("filterEmptyRows drops all-empty rows and never mutates the input", () => {
    const cols = [{ accessor: (r: { n: number }) => r.n, ignoreIf: "zero" as const }];
    const rows = [{ n: 0 }, { n: 3 }, { n: 0 }, { n: 9 }];
    const { rows: kept, removed } = filterEmptyRows(rows, cols);
    expect(removed).toBe(2);
    expect(kept.map((r) => r.n)).toEqual([3, 9]);
    expect(rows).toHaveLength(4); // input untouched
    expect(NO_DATA_LABEL).toBe("no data");
  });

  it("a report with no problems renders no 'Most Frequent Problems' header and no placeholder", async () => {
    const data = generateMockWizardData();
    const noProblems = {
      ...data,
      branches: data.branches.map((b) => ({
        ...b,
        maintenanceHistory: (b.maintenanceHistory || []).map((r) => ({
          ...r,
          problems: [],
          partsReplaced: [],
          servicesPerformed: [],
        })),
      })),
    };
    drawnStrings.length = 0;
    const doc = await generateInternalCompanyReport(noProblems, {});
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    // D-04: the section itself vanishes — no header, no table header.
    expect(drawn).not.toContain("Most Frequent Problems");
    expect(drawn).not.toContain("Problems");
    expect(drawn).not.toContain("Most Used Parts");
    // KPI cards still render at 0 (D-06) — and the Resolution Rate sublabel
    // legitimately reads "No problems", so we must NOT assert its absence.
    expect(drawn).toContain("Spare Parts");
  }, 30000);

  it("a zero-cost report renders no Cost Breakdown section (D-09)", async () => {
    const data = generateMockWizardData();
    // Blank the zone too — the mock's cairo zone has a non-zero visit fee, so
    // a truly zero-cost record must have no zone, no parts, no services, no lease.
    // Top-level records are blanked as well: the company report aggregates them
    // into the Cost Breakdown, so un-blanked top-level cairo records would keep
    // it rendering.
    const blankRecords = (rs: MaintenanceRecord[]) => (rs || []).map((r) => ({
      ...r,
      partsReplaced: [],
      servicesPerformed: [],
      dailyLeaseCost: 0,
      visitZone: "",
    }));
    const zeroCost = {
      ...data,
      maintenanceHistory: blankRecords(data.maintenanceHistory),
      branches: data.branches.map((b) => ({
        ...b,
        maintenanceHistory: blankRecords(b.maintenanceHistory),
      })),
    };
    drawnStrings.length = 0;
    const doc = await generateInternalBranchReport(data.companyName, zeroCost.branches[0], {});
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    expect(drawn).not.toContain("Cost Breakdown");
    expect(drawn).not.toContain("Visit Fees by Zone");

    // The company report must hide the empty Cost Breakdown the same way
    // (D-09 applies to both blocks; this locked in a past asymmetry where the
    // company report drew a shell "Cost Breakdown" header on zero costs).
    drawnStrings.length = 0;
    await generateInternalCompanyReport(zeroCost, {});
    const companyDrawn = drawnStrings.join("\n");
    expect(companyDrawn).not.toContain("Cost Breakdown");
  }, 30000);

  it("derived rows with 0 visits are dropped from the zone table (D-07)", async () => {
    const data = generateMockWizardData();
    // Both mock branches use the cairo zone; force the breakdown to include a
    // zero-visit zone by adding an empty zone to the second branch's records.
    const mixed = {
      ...data,
      branches: data.branches.map((b, bi) => ({
        ...b,
        maintenanceHistory: (b.maintenanceHistory || []).map((r) => ({
          ...r,
          visitZone: bi === 0 ? "cairo" : "alex",
        })),
      })),
    };
    drawnStrings.length = 0;
    const doc = await generateInternalBranchReport(data.companyName, mixed.branches[0], {});
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    // The zone table may render, but it must not contain a row for a zone the
    // branch never visited.
    expect(drawn).not.toContain("alex");
  }, 30000);

  it("maintenance records with only a date still render (D-08)", async () => {
    const data = generateMockWizardData();
    const dateOnly = {
      ...data,
      branches: [
        {
          ...data.branches[0],
          maintenanceHistory: [
            {
              id: "date-only",
              maintenanceDate: "2026-06-15",
              type: "scheduled" as const,
              hadProblem: false,
              problemSolved: false,
              partsWereReplaced: false,
              paidBy: "company" as const,
              supervisors: [],
              baristaName: "",
              visitZone: "",
              problems: [],
              partsReplaced: [],
              servicesPerformed: [],
            },
          ],
        },
      ],
    };
    drawnStrings.length = 0;
    const doc = await generateInternalBranchReport(data.companyName, dateOnly.branches[0], {});
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    expect(drawn).toContain("15 Jun 2026");
  }, 30000);

  it("surviving empty cells render 'no data' instead of the old dash (D-10)", async () => {
    const data = generateMockWizardData();
    // Keep one record with a technician so the Technician column survives, and
    // blank the technician on another so its cell shows "no data".
    const mixed = {
      ...data,
      branches: data.branches.map((b) => ({
        ...b,
        maintenanceHistory: (b.maintenanceHistory || []).map((r, i) => ({
          ...r,
          baristaName: i === 0 ? "" : r.baristaName,
        })),
      })),
    };
    drawnStrings.length = 0;
    const doc = await generateInternalCompanyReport(mixed, {});
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    expect(drawn).toContain(NO_DATA_LABEL);
  }, 30000);

  it("batch cover omits the total-cost line when the total is 0 (D-12)", async () => {
    const base = generateMockWizardData();
    const rec = {
      ...base.branches[0].maintenanceHistory[0],
      id: "batch-zero-1",
      partsReplaced: [],
      servicesPerformed: [],
      dailyLeaseCost: 0,
      // The mock's cairo zone carries a visit fee, so blank it for a true zero total.
      visitZone: "",
    };
    const items: BatchExportItem[] = [
      {
        record: rec,
        companyId: 1,
        companyName: "Alpha Co",
        branchId: 5,
        branchName: "Branch Five",
      },
    ];
    drawnStrings.length = 0;
    const doc = await generateBatchReport(items, { mode: "internal", includeSummaryTable: true });
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    expect(drawn).not.toContain("Net Cost:");
    expect(drawn).not.toContain("Total Cost:");
  }, 30000);

  it("per-visit reports drop zero-count parts/services rows (D-07)", async () => {
    const base = generateMockWizardData();
    const rec = {
      ...base.branches[0].maintenanceHistory[0],
      id: "visit-zero-1",
      partsReplaced: [
        { name: "gasket", count: 2, cost: 50 },
        { name: "filter", count: 0, cost: 100 },
      ],
      servicesPerformed: [
        { name: "cleaning", count: 1, cost: 120 },
        { name: "test run", count: 0, cost: 30 },
      ],
      machines: [
        { id: 1, name: "La Marzocco", count: 1 },
        { id: 2, name: "Ghost Machine", count: 0 },
      ],
    };
    drawnStrings.length = 0;
    const doc = await generateInternalVisitReport(base.companyName, {}, rec);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    // Valid rows render; zero-count rows and the empty machine never appear.
    expect(drawn).toContain("gasket");
    expect(drawn).toContain("cleaning");
    expect(drawn).toContain("La Marzocco");
    expect(drawn).not.toContain("filter");
    expect(drawn).not.toContain("test run");
    expect(drawn).not.toContain("Ghost Machine");
  }, 30000);

  it("sparse per-visit report renders no empty section headings (D-04)", async () => {
    const base = generateMockWizardData();
    const rec = {
      ...base.branches[0].maintenanceHistory[0],
      id: "visit-sparse-1",
      hadProblem: false,
      problems: [],
      partsReplaced: [],
      servicesPerformed: [],
      machines: [],
      supervisors: [],
      recommendations: undefined,
      notes: undefined,
      dailyLeaseCost: 0,
      // The mock's cairo zone carries a visit fee — blank it for a zero-cost visit.
      visitZone: "",
    };
    drawnStrings.length = 0;
    const doc = await generateInternalVisitReport(base.companyName, {}, rec);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(1000);
    const drawn = drawnStrings.join("\n");
    // Only the Visit Summary box renders; every empty section heading is absent.
    expect(drawn).toContain("Visit Summary");
    expect(drawn).not.toContain("Machines");
    expect(drawn).not.toContain("Issues");
    expect(drawn).not.toContain("Parts Replaced");
    expect(drawn).not.toContain("Services Performed");
    expect(drawn).not.toContain("Cost Breakdown");
    expect(drawn).not.toContain("Recommendations");
    expect(drawn).not.toContain("Notes");
    expect(drawn).not.toContain("Supervisors");
  }, 30000);
});
