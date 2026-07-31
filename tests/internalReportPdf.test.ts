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

  it("maintenance log table renders Parts/Services as bullets with per-item cost and a Total line", async () => {
    // Regression: the Parts and Services columns must itemize every entry as a
    // bullet with its own line cost (count × unit) and end with a Total line.
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

    // Each item is a bullet with its own line cost.
    expect(drawn).toContain("• 2× Pump A — 200 EGP (Company)");
    expect(drawn).toContain("• 1× Gasket B — 50 EGP (Client)");
    expect(drawn).toContain("• 3× Service X — 60 EGP (Company)");
    // Each column ends with its subtotal.
    expect(drawn).toContain("Total: 250 EGP");
    expect(drawn).toContain("Total: 60 EGP");
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
    expect(costDrawn).toContain("• 2× Pump A — 200 EGP");
    expect(costDrawn).toContain("• 1× Gasket B — 50 EGP");
    expect(costDrawn).not.toContain("(Company)");
    expect(costDrawn).not.toContain("(Client)");
  }, 30000);

  it("drops Avg Rating KPI, adds logistics to Total Cost KPI, and moves Most Used Parts last", async () => {
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

    // 3) Most Used Parts renders AFTER the logistics section (it closes the report).
    const logisticsIdx = drawnStrings.lastIndexOf("Logistics — Machine Transport & Replacement");
    const partsIdx = drawnStrings.lastIndexOf("Most Used Parts");
    expect(partsIdx).toBeGreaterThan(logisticsIdx);

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
    expect(drawnStrings.lastIndexOf("Most Used Parts")).toBeGreaterThan(
      drawnStrings.lastIndexOf("Logistics — Machine Transport & Replacement"),
    );
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
    expect(branchDrawn).toContain("Most Frequent Problems");
    expect(branchDrawn).toContain("Logistics — Machine Transport & Replacement");
    expect(branchDrawn).toContain("Most Used Parts");

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
    expect(costDrawn).toContain("• 2× Pump A — 200 EGP");
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
        { ...base, id: "fu-1", maintenanceDate: "2026-07-10" },
      ],
      photos: [{ url: "https://placehold.co/600x400?text=Before", type: "before" as const }],
    };
    const doc = await generateInternalVisitReport(data.companyName, {}, record);
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);
  }, 30000);
});
