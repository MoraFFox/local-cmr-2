import { describe, it, expect, afterEach } from "vitest";
import { Packer, Table } from "docx";
import JSZip from "jszip";
import { FormData, MaintenanceRecord, Branch, Contact } from "../types";
import { saveWordTemplate, clearWordTemplate } from "../utils/wordExportTemplate";
import {
  generateVisitWordReport,
  generateCompanyWordReport,
  generateBranchWordReport,
  generateBatchWordReport,
  generateMissingDataWordReport,
  generateWorkOrderWordReport,
  formTable,
  resolveWordMode,
  machineOwnershipText,
  buildWordFinancialCategories,
  buildWordLogisticsCategories,
  recordBlockChildren,
} from "../utils/wordExport";
import { aggregateBranchCosts } from "../utils/costAggregation";
import { partsList, servicesList } from "../constants";
import { BatchExportItem } from "../utils/internalReportPdf";

// ── Fixtures ──

const makeRecord = (overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord =>
  ({
    id: "r1",
    maintenanceDate: "2026-07-15",
    type: "scheduled",
    isLogisticsVisit: false,
    hadProblem: true,
    partsWereReplaced: true,
    problemSolved: true,
    partsReplaced: [{ name: "Gasket", count: 2, paidByClient: false }],
    servicesPerformed: [{ name: "Cleaning", count: 1, paidByClient: false }],
    paidBy: "company",
    baristaName: "Ahmed",
    visitZone: "cairo",
    followUpVisits: [],
    supervisors: [],
    problems: ["Leak"],
    dailyLeaseCost: 50,
    notes: "Check again in a month",
    ...overrides,
  }) as MaintenanceRecord;

const makeBranch = (overrides: Partial<Branch> = {}): Branch =>
  ({
    id: 1,
    branchName: "Downtown",
    email: "branch@example.com",
    taxNumber: "456",
    location: "Nasr City",
    contacts: [{ id: 1, name: "Omar", position: "manager", phoneNumbers: [{ id: 1, number: "0100" }] }],
    baristas: [{ id: 1, name: "Ahmed", phone: "0111" }],
    clientBaristas: [],
    usesOurMachines: true,
    machines: [],
    maintenanceHistory: [makeRecord()],
    ...overrides,
  }) as Branch;

const makeFormData = (overrides: Partial<FormData> = {}): FormData =>
  ({
    id: 1,
    companyName: "Acme Coffee",
    email: "acme@example.com",
    taxNumber: "123",
    location: "Cairo",
    hasBranches: false,
    usesOurMachines: true,
    machines: [],
    branchCount: 0,
    branches: [],
    warehouse: { location: "Cairo", contacts: [] },
    baristas: [],
    maintenanceHistory: [makeRecord()],
    contacts: [{ id: 1, name: "Omar", position: "manager", phoneNumbers: [{ id: 1, number: "0100" }] }],
    ...overrides,
  }) as FormData;

const makeBatchItem = (record: MaintenanceRecord = makeRecord()): BatchExportItem => ({
  record,
  companyId: 1,
  companyName: "Acme Coffee",
  branchId: -1,
  branchName: "Main Office",
});

// ── Helpers ──

const assertValidDocxBlob = async (doc: Awaited<ReturnType<typeof generateVisitWordReport>>) => {
  const blob = await Packer.toBlob(doc);
  expect(blob).toBeInstanceOf(Blob);
  expect(blob.size).toBeGreaterThan(1000);
  // A .docx is a ZIP archive → starts with "PK"
  const bytes = new Uint8Array(await blob.arrayBuffer());
  expect(bytes[0]).toBe(0x50); // P
  expect(bytes[1]).toBe(0x4b); // K
};

/** Unpack the .docx and return word/document.xml (shared by XML assertions). */
const docXml = async (doc: Awaited<ReturnType<typeof generateVisitWordReport>>): Promise<string> => {
  const buffer = await Packer.toBuffer(doc);
  const zip = await JSZip.loadAsync(buffer);
  return (await zip.file("word/document.xml")?.async("string")) ?? "";
};

// ── Mode resolution ──

describe("resolveWordMode", () => {
  it("defaults to internal (costs + payer split)", () => {
    expect(resolveWordMode({})).toEqual({ clientMode: false, costMode: false, showCosts: true, showPayer: true });
  });

  it("client mode removes costs but keeps payer labels (matches the PDF visit summary)", () => {
    expect(resolveWordMode({ clientMode: true })).toEqual({
      clientMode: true,
      costMode: false,
      showCosts: false,
      showPayer: true,
    });
  });

  it("cost mode keeps costs but drops payer split", () => {
    expect(resolveWordMode({ costMode: true })).toEqual({
      clientMode: false,
      costMode: true,
      showCosts: true,
      showPayer: false,
    });
  });

  it("client wins over cost", () => {
    expect(resolveWordMode({ clientMode: true, costMode: true }).showCosts).toBe(false);
  });
});

// ── Machine ownership text ──

describe("machineOwnershipText", () => {
  it("handles mixed fleets", () => {
    expect(
      machineOwnershipText({
        hasMultipleMachines: true,
        machines: [
          { id: 1, machineOwner: "client" },
          { id: 2, machineOwner: "ours", machineOwnershipType: "leased" },
        ],
      }),
    ).toBe("Client Machine, Ours (Leased)");
  });

  it("handles single-machine ownership", () => {
    expect(machineOwnershipText({ usesOurMachines: false })).toBe("Client Machine");
    expect(machineOwnershipText({ usesOurMachines: true, machineOwnershipType: "bought" })).toBe("Ours (Bought)");
    expect(machineOwnershipText({ usesOurMachines: null })).toBe("Not specified");
  });
});

// ── Cost category builders ──

describe("buildWordFinancialCategories", () => {
  const data = makeFormData();
  const costs = aggregateBranchCosts(makeBranch(), partsList, servicesList);

  it("splits company vs client buckets in internal mode", () => {
    const cats = buildWordFinancialCategories(costs, false);
    expect(cats.some((c) => c.title.includes("Company Paid"))).toBe(true);
    expect(cats.some((c) => c.title.includes("Client Paid"))).toBe(false);
  });

  it("merges all costs in cost mode (no payer attribution)", () => {
    const data2 = makeFormData({
      maintenanceHistory: [
        makeRecord({
          partsReplaced: [{ name: "Custom Part", count: 2, cost: 100, paidByClient: false }],
          servicesPerformed: [{ name: "Custom Service", count: 1, cost: 50, paidByClient: true }],
        }),
      ],
    });
    const costs2 = aggregateBranchCosts(
      makeBranch({ maintenanceHistory: data2.maintenanceHistory }),
      partsList,
      servicesList,
    );
    const cats = buildWordFinancialCategories(costs2, true);
    const partsCat = cats.find((c) => c.title === "Parts");
    const servicesCat = cats.find((c) => c.title === "Services");
    // Client-paid service is folded into the merged Services bucket
    expect(servicesCat?.total).toBeGreaterThan(0);
    expect(partsCat?.total).toBeGreaterThan(0);
    expect(cats.some((c) => c.title.includes("Client"))).toBe(false);
  });

  it("logistics categories expose transportation + rental lines", () => {
    const cats = buildWordLogisticsCategories({
      totalPickupCost: 100,
      totalReturnCost: 50,
      totalPartsCost: 30,
      totalServicesCost: 20,
      totalMaintenanceCost: 60,
      totalRentalCost: 200,
      totalLogisticsCost: 350,
      parts: new Map(),
      services: new Map(),
    } as never);
    expect(cats.some((c) => c.title === "Transportation" && c.total === 150)).toBe(true);
    expect(cats.some((c) => c.title === "Machine Rental" && c.total === 200)).toBe(true);
  });
});

// ── Record block ──

describe("recordBlockChildren", () => {
  it("renders a record with costs in internal mode", () => {
    const m = resolveWordMode({});
    const children = recordBlockChildren(makeRecord(), m);
    expect(children.length).toBeGreaterThan(0);
  });

  it("drops cost rows in client mode (fewer content blocks than internal)", () => {
    const internal = recordBlockChildren(makeRecord(), resolveWordMode({}));
    const client = recordBlockChildren(makeRecord(), resolveWordMode({ clientMode: true }));
    // Internal adds the Paid By + Daily Lease info rows and the Record Total line.
    expect(internal.length).toBeGreaterThan(client.length);
    expect(client.length).toBeGreaterThan(0);
  });
});

// ── Missing-data fill-in form + blank work order template ──

describe("Missing-data Word form", () => {
  const roleContact = (id: number, position: string): Contact => ({
    id,
    name: `Contact ${id}`,
    position,
    email: `c${id}@example.com`,
    phoneNumbers: [{ id, number: `0100${id}` }],
  });

  it("returns null when there is no missing data", async () => {
    const complete: FormData = makeFormData({
      allowedMaintenanceTimes: "9 AM - 5 PM",
      coffeeConsumptionKg: 25,
      contacts: [
        roleContact(1, "chief"),
        roleContact(2, "purchasing_manager"),
        roleContact(3, "purchasing_officer"),
        roleContact(4, "accounting"),
        roleContact(5, "ops_manager"),
      ],
      baristas: [
        { id: 1, name: "Ahmed", phone: "0111" },
        { id: 2, name: "Omar", phone: "0112" },
        { id: 3, name: "Sara", phone: "0113" },
      ],
    });
    const doc = await generateMissingDataWordReport(complete, { scope: "company", mode: "dynamic" });
    expect(doc).toBeNull();
  });

  it("generates a docx with company + branch fill-in sections", async () => {
    const data = makeFormData({
      hasBranches: true,
      branchCount: 1,
      branches: [makeBranch({ branchName: "", location: "", contacts: [], baristas: [] })],
      maintenanceHistory: [],
    });
    const doc = await generateMissingDataWordReport(data, { scope: "company", mode: "dynamic" });
    expect(doc).not.toBeNull();
    await assertValidDocxBlob(doc as Awaited<ReturnType<typeof generateVisitWordReport>>);
  });

  it("keeps empty rows in the fill-in form table (blanks stay blank)", () => {
    const t = formTable([
      ["اسم الشركة", ""],
      ["Visit Date", ""],
    ]);
    expect(t).toBeInstanceOf(Table);
  });
});

describe("Work order Word template", () => {
  it("generates a docx template mirroring the /print view", async () => {
    const doc = await generateWorkOrderWordReport(
      [{ label: "Gasket", value: "gasket", cost: 50, isFrequentlyReplaced: true }],
      [{ label: "Cleaning", value: "cleaning", cost: 30, category: "Maintenance" }],
    );
    await assertValidDocxBlob(doc);
  });

  it("handles empty parts/services lists", async () => {
    const doc = await generateWorkOrderWordReport([], []);
    await assertValidDocxBlob(doc);
  });
});

// ── Configurable Word export template (logo / footer / label language) ──

describe("Word export template support", () => {
  const PNG_1PX =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  const recordWithCosts = (): MaintenanceRecord =>
    makeRecord({
      partsReplaced: [{ name: "Gasket", count: 2, cost: 50, paidByClient: false }],
      servicesPerformed: [{ name: "Cleaning", count: 1, cost: 30, paidByClient: false }],
    });

  afterEach(() => clearWordTemplate());

  it("renders Arabic labels when labelLang is ar", async () => {
    const doc = await generateCompanyWordReport(makeFormData({ maintenanceHistory: [recordWithCosts()] }), {
      costMode: true,
      template: { labelLang: "ar" },
    });
    await assertValidDocxBlob(doc);
    const xml = await docXml(doc);
    expect(xml).toContain("تفاصيل التكاليف"); // Cost Breakdown
    expect(xml).toContain("إجمالي التكلفة"); // Total Cost
    expect(xml).toContain("تاريخ الإنشاء"); // Generated
  });

  it("keeps English labels by default", async () => {
    const doc = await generateCompanyWordReport(makeFormData({ maintenanceHistory: [recordWithCosts()] }), {
      costMode: true,
    });
    const xml = await docXml(doc);
    expect(xml).toContain("Cost Breakdown");
    expect(xml).toContain("Total Cost");
    expect(xml).toContain("Generated");
    expect(xml).not.toContain("تفاصيل التكاليف");
  });

  it("uses the custom footer text when configured", async () => {
    const doc = await generateVisitWordReport("Acme Coffee", {}, makeRecord(), {
      template: { footerText: "Custom footer line" },
    });
    const xml = await docXml(doc);
    expect(xml).toContain("Custom footer line");
    expect(xml).not.toContain("CONFIDENTIAL — Internal Use Only");
  });

  it("internal and cost reports have no confidential footer by default", async () => {
    // The default "CONFIDENTIAL — Internal Use Only" footer was removed from
    // internal/cost Word reports (only a configured custom footer or the
    // client-mode "Service Report" label may appear).
    for (const opts of [{}, { costMode: true }]) {
      const doc = await generateVisitWordReport("Acme Coffee", {}, makeRecord(), opts);
      const xml = await docXml(doc);
      expect(xml).not.toContain("CONFIDENTIAL — Internal Use Only");
      expect(xml).not.toContain("سري — للاستخدام الداخلي فقط");
      expect(xml).not.toContain("Service Report");
    }
  });

  it("client reports keep the Service Report footer", async () => {
    const doc = await generateVisitWordReport("Acme Coffee", {}, makeRecord(), { clientMode: true });
    const xml = await docXml(doc);
    expect(xml).toContain("Service Report");
    expect(xml).not.toContain("CONFIDENTIAL — Internal Use Only");
  });

  it("company and batch internal reports have no confidential footer", async () => {
    const companyDoc = await generateCompanyWordReport(makeFormData());
    expect(await docXml(companyDoc)).not.toContain("CONFIDENTIAL — Internal Use Only");

    const batchDoc = await generateBatchWordReport([makeBatchItem()], { mode: "internal" });
    expect(await docXml(batchDoc)).not.toContain("CONFIDENTIAL — Internal Use Only");
  });

  it("embeds a PNG logo as a media part in the work order", async () => {
    const doc = await generateWorkOrderWordReport([], [], { logoDataUrl: PNG_1PX });
    await assertValidDocxBlob(doc);
    const buffer = await Packer.toBuffer(doc);
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file(/word\/media\//).length).toBeGreaterThan(0);
  });

  it("applies the saved localStorage template automatically", async () => {
    saveWordTemplate({ labelLang: "ar", footerText: "Saved footer" });
    const doc = await generateVisitWordReport("Acme Coffee", {}, makeRecord());
    const xml = await docXml(doc);
    expect(xml).toContain("Saved footer");
    expect(xml).toContain("الفني"); // Technician label, Arabic
  });

  it("translates machine ownership labels to Arabic", () => {
    expect(machineOwnershipText({ usesOurMachines: false }, "ar")).toBe("ماكينة العميل");
    expect(machineOwnershipText({}, "ar")).toBe("غير محدد");
    expect(machineOwnershipText({ usesOurMachines: true, machineOwnershipType: "bought" }, "ar")).toBe("خاصة بنا (Bought)");
  });
});

// ── Blob smoke tests (all report types × modes) ──

describe("Word document generation", () => {
  it("generates a valid visit report docx for all three modes", async () => {
    for (const opts of [{}, { costMode: true }, { clientMode: true }]) {
      const doc = await generateVisitWordReport("Acme Coffee", { location: "Cairo" }, makeRecord(), opts);
      await assertValidDocxBlob(doc);
    }
  });

  it("generates a valid company report docx (no branches)", async () => {
    const doc = await generateCompanyWordReport(makeFormData());
    await assertValidDocxBlob(doc);
  });

  it("generates a valid company report docx (with branches)", async () => {
    const doc = await generateCompanyWordReport(
      makeFormData({ hasBranches: true, branchCount: 1, branches: [makeBranch()], maintenanceHistory: [] }),
    );
    await assertValidDocxBlob(doc);
  });

  it("generates a valid client-mode company report (no costs, no photos = no fetch)", async () => {
    const doc = await generateCompanyWordReport(makeFormData({ hasBranches: true, branches: [makeBranch()] }), {
      clientMode: true,
    });
    await assertValidDocxBlob(doc);
  });

  it("generates a valid branch report docx", async () => {
    const doc = await generateBranchWordReport("Acme Coffee", makeBranch());
    await assertValidDocxBlob(doc);
  });

  it("generates a valid batch report docx (grouped + summary)", async () => {
    const doc = await generateBatchWordReport([makeBatchItem(), makeBatchItem(makeRecord({ id: "r2" }))], {
      mode: "internal",
      grouped: true,
      includeSummaryTable: true,
    });
    await assertValidDocxBlob(doc);
  });

  it("generates a valid flat client batch report without summary table", async () => {
    const doc = await generateBatchWordReport([makeBatchItem()], {
      mode: "client",
      grouped: false,
      includeSummaryTable: false,
    });
    await assertValidDocxBlob(doc);
  });
});

// ── Reflow regression: dropped empty sections must not leave blank pages ──
// The PDF path reflows via PDFLayoutEngine; the Word path must not force
// explicit page breaks that survive when a section's content was dropped as
// empty (a sparse section used to push the next one onto a fresh page,
// leaving a page with one row and the rest blank).

describe("Word export reflow (no forced page breaks)", () => {
  it("company report flows branches continuously (no page break between branches)", async () => {
    const doc = await generateCompanyWordReport(
      makeFormData({ hasBranches: true, branchCount: 2, branches: [makeBranch(), makeBranch({ id: 2, branchName: "Uptown" })], maintenanceHistory: [] }),
    );
    const xml = await docXml(doc);
    // A PageBreak in docx renders as <w:br w:type="page"/>. With reflow there
    // must be none — Word paginates on its own when content is long.
    expect(xml).not.toContain('w:type="page"');
  });

  it("grouped batch report flows groups continuously (no page break between groups)", async () => {
    const doc = await generateBatchWordReport(
      [
        makeBatchItem(),
        makeBatchItem(makeRecord({ id: "r2", maintenanceDate: "2026-07-16" })),
      ],
      { mode: "internal", grouped: true, includeSummaryTable: true },
    );
    const xml = await docXml(doc);
    expect(xml).not.toContain('w:type="page"');
  });

  it("missing-data form flows branches continuously (no page break between branch forms)", async () => {
    const data = makeFormData({
      hasBranches: true,
      branchCount: 2,
      branches: [
        makeBranch({ branchName: "", location: "", email: "", contacts: [], baristas: [] }),
        makeBranch({ id: 2, branchName: "", location: "", email: "", taxNumber: "", contacts: [], baristas: [], maintenanceHistory: [makeRecord({ id: "r2" })] }),
      ],
      maintenanceHistory: [],
    });
    const doc = await generateMissingDataWordReport(data, { scope: "company", mode: "dynamic" });
    expect(doc).not.toBeNull();
    const xml = await docXml(doc as Awaited<ReturnType<typeof generateVisitWordReport>>);
    expect(xml).not.toContain('w:type="page"');
  });

  it("sparse branch content contains no forced page breaks (dropped sections reflow)", async () => {
    // Regression: a branch whose empty sections were dropped must not strand
    // the remaining single row at the top of an otherwise blank page. With no
    // explicit break, everything lives in one continuous flow (Word paginates
    // naturally). The XML assertion locks in the absence of forced breaks;
    // actual page layout is Word's job.
    const doc = await generateCompanyWordReport(
      makeFormData({ hasBranches: true, branchCount: 1, branches: [makeBranch({ contacts: [], baristas: [] })], maintenanceHistory: [] }),
    );
    const xml = await docXml(doc);
    expect(xml).not.toContain('w:type="page"');
  });
});
