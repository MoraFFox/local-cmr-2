import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import jsPDF from "jspdf";
import { drawLogisticsDetailsRow, drawLogisticsOperationsTable, drawClientLogisticsTable, pdfText, configureArabicBidi } from "../utils/pdfTheme";
import { reshapeArabic } from "../utils/arabicText";
import { FormData, LogisticsOperation, MaintenanceRecord } from "../types";
import {
  generateInternalCompanyReport,
  generateInternalBranchReport,
  generateCostCompanyReport,
  generateCostBranchReport,
  generateInternalVisitReport,
  generateClientVisitReport,
  generateCostVisitReport,
} from "../utils/internalReportPdf";
import { generateCompanyPDF, generateBranchPDF } from "../utils/pdfGenerator";
import { generateMockWizardData } from "../utils/mockData";

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

    const item = "تغيير جوانات — 400 EGP";
    // Wrapping receives logical Unicode, not presentation forms.
    expect(captured).toContain(item);
    expect(captured).not.toContain(reshapeArabic(item, false));
    // The final doc.text payload is shaped and reordered exactly once. The
    // pre-process payload must be joined logical forms, not raw or twice
    // reversed presentation forms.
    expect(preProcessText).toContain("ﺗﻐﻴﻴﺮ ﺟﻮﺍﻧﺎﺕ — 400 EGP");
    expect(preProcessOptions).toContainEqual(expect.objectContaining({
      isInputVisual: false,
      isInputRtl: true,
      isOutputVisual: true,
      isOutputRtl: false,
    }));
    expect(finalText.length).toBeGreaterThan(0);
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

  it("visit reports render follow-ups, photos and empty branches without throwing", async () => {
    const data = generateMockWizardData();
    const base = data.branches[0].maintenanceHistory[0];
    const record = {
      ...base,
      followUpVisits: [
        { ...base, id: "fu-1", maintenanceDate: "2026-07-10" },
      ],
      photos: [{ url: "https://placehold.co/600x400?text=Before", type: "before" as const }],
    };
    const doc = await generateInternalVisitReport(data.companyName, {}, record);
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);
});
