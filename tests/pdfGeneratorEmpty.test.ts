import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { FormData, MaintenanceRecord } from "../types";
import { generateCompanyPDF, generateBranchPDF } from "../utils/pdfGenerator";
import { NO_DATA_LABEL } from "../utils/pdfCompactLayout";

// Capture every string drawn into any jsPDF doc created in this file (same
// pattern as internalReportPdf.test.ts) so we can assert on what the legacy
// generator actually renders — including surviving "no data" cells.
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

const dateOnlyRecord = (id: number | string, date: string): MaintenanceRecord => ({
  id,
  maintenanceDate: date,
  type: "scheduled",
  hadProblem: false,
  partsWereReplaced: false,
  problemSolved: false,
  partsReplaced: [],
  paidBy: "company",
  baristaName: "",
  problems: [],
  visitZone: null,
  servicesPerformed: [],
  supervisors: [],
});

// A company with two branches:
//  - branch A keeps a date-only maintenance record (D-08: never dropped) but
//    has an entirely-blank contact row that must vanish (D-07).
//  - branch B carries a parts record with NO problems, so the company-level
//    breakdown has a fully-empty Issue/Count column pair that must be pruned
//    (D-11) while the Part/Qty columns survive.
const buildFixture = (): FormData => ({
  companyName: "Test Coffee Co",
  email: "",
  taxNumber: "",
  location: "",
  hasBranches: true,
  usesOurMachines: false,
  machines: [],
  branchCount: 2,
  branches: [
    {
      id: 1,
      branchName: "Branch A",
      email: "",
      taxNumber: "",
      location: "",
      contacts: [
        { id: 1, name: "", position: "", phoneNumbers: [] },
        { id: 2, name: "Ahmed", position: "manager", phoneNumbers: [{ id: 1, number: "0100" }] },
      ],
      baristas: [],
      clientBaristas: [],
      usesOurMachines: false,
      machines: [],
      maintenanceHistory: [dateOnlyRecord("a1", "2026-07-01")],
    },
    {
      id: 2,
      branchName: "Branch B",
      email: "b@test.com",
      taxNumber: "123",
      location: "Cairo",
      contacts: [],
      baristas: [{ id: 1, name: "Sami", phone: "0111" }],
      clientBaristas: [],
      usesOurMachines: false,
      machines: [],
      maintenanceHistory: [
        {
          ...dateOnlyRecord("b1", "2026-07-05"),
          type: "requested",
          hadProblem: false,
          problemSolved: false,
          baristaName: "Sami",
          partsReplaced: [{ name: "gasket", count: 2, cost: 50 }],
        },
      ],
    },
  ],
  warehouse: { location: "", contacts: [] },
  baristas: [],
  maintenanceHistory: [],
  contacts: [],
});

// For the column-pruning scenario: a single branch whose records have issues
// but NO parts — the company breakdown then has a fully-empty Part/Qty pair.
const buildIssuesOnlyFixture = (): FormData => {
  const base = buildFixture();
  base.branches = base.branches.map((b) => ({
    ...b,
    contacts: [],
    baristas: [],
    maintenanceHistory: b.maintenanceHistory.map((r) => ({
      ...r,
      type: "requested",
      hadProblem: true,
      problemSolved: true,
      problems: ["test issue"],
      partsReplaced: [],
      servicesPerformed: [],
    })),
  }));
  return base;
};

describe("legacy pdfGenerator empty-state strictness (plan 03-02)", () => {
  it("drops entirely-blank contact rows but keeps date-only maintenance records", async () => {
    drawnStrings.length = 0;
    const doc = await generateCompanyPDF(buildFixture(), { includeCosts: true });
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);

    const drawn = drawnStrings.join("\n");
    // The surviving contact (Ahmed) renders; the blank contact row is gone.
    expect(drawn).toContain("Ahmed");
    // A date-only maintenance record still renders its date (D-08).
    expect(drawn).toContain("2026-07-01");
    // The branch detail table keeps its date-only record too.
    expect(drawn).toContain("2026-07-05");
  }, 30000);

  it("prunes all-empty columns from the issues/parts breakdown", async () => {
    drawnStrings.length = 0;
    const doc = await generateCompanyPDF(buildIssuesOnlyFixture(), { includeCosts: true });
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);

    const drawn = drawnStrings.join("\n");
    // Every record has an issue and NO parts: the breakdown table keeps the
    // populated Issue/Count columns and prunes the all-empty Part/Qty pair.
    // "Qty" is unique to the breakdown header (unlike "Part", which appears
    // inside other report labels such as "Parts Changed").
    expect(drawn).toContain("test issue");
    expect(drawn).toContain("Count");
    expect(drawn).not.toContain("Qty");
  }, 30000);

  it("renders 'no data' in surviving empty cells of the maintenance log", async () => {
    drawnStrings.length = 0;
    // Single branch, single date-only record: the Requested By / Staff cells
    // have no value, so they render the NO_DATA_LABEL placeholder.
    const data = buildFixture();
    const branch = { ...data.branches[0] };
    const doc = await generateBranchPDF("Test Coffee Co", branch, {
      includeCosts: false,
    });
    const out = doc.output("arraybuffer");
    expect(out.byteLength).toBeGreaterThan(1000);

    const drawn = drawnStrings.join("\n");
    expect(drawn).toContain(NO_DATA_LABEL);
    expect(drawn).toContain("2026-07-01");
  }, 30000);
});
