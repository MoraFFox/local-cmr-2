import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./testUtils";
import InternalReportPrintView from "../components/InternalReportPrintView";
import { NO_DATA_LABEL } from "../utils/pdfCompactLayout";
import { FormData } from "../types";

// The print view pulls in ReportIcon (font-awesome icon font) and the
// logistics section — both irrelevant to empty-state assertions, so stub
// them to keep the test hermetic.
vi.mock("../components/ReportIcon", () => ({
  default: () => <span data-testid="report-icon" />,
}));
vi.mock("../components/LogisticsReportSection", () => ({
  default: () => <div data-testid="logistics-section" />,
}));

const baseRecord = {
  id: 1,
  maintenanceDate: "2026-07-01",
  type: "scheduled" as const,
  hadProblem: false,
  partsWereReplaced: false,
  problemSolved: false,
  partsReplaced: [],
  paidBy: "company" as const,
  baristaName: "",
  problems: [],
  visitZone: null,
  servicesPerformed: [],
  supervisors: [],
};

// Branch with NO visits at all — every derived section must vanish.
const emptyBranch = {
  id: 1,
  branchName: "Empty Branch",
  email: "",
  taxNumber: "",
  location: "",
  contacts: [],
  baristas: [],
  clientBaristas: [],
  usesOurMachines: false,
  machines: [],
  maintenanceHistory: [],
};

// Branch with a single date-only record (D-08: the record card survives,
// but the empty section headings still vanish).
const dataOnlyBranch = {
  ...emptyBranch,
  id: 2,
  branchName: "Data Only Branch",
  maintenanceHistory: [{ ...baseRecord, maintenanceDate: "2026-07-02" }],
};

const baseForm = (overrides: Partial<FormData> = {}): FormData => ({
  companyName: "Test Coffee Co",
  email: "",
  taxNumber: "",
  location: "",
  hasBranches: false,
  usesOurMachines: false,
  machines: [],
  branchCount: 1,
  branches: [emptyBranch],
  warehouse: { location: "", contacts: [] },
  baristas: [],
  maintenanceHistory: [],
  contacts: [],
  ...overrides,
});

describe("InternalReportPrintView empty-state suppression (plan 03-03)", () => {
  it("omits every empty section heading for a visit-less branch report", () => {
    render(<InternalReportPrintView data={baseForm()} branch={emptyBranch} />);

    // KPI cards stay at 0 (D-06) — the report still renders.
    expect(screen.getByText("Total Visits")).toBeTruthy();
    expect(screen.getByText("Net Cost")).toBeTruthy();

    // Empty sections vanish entirely (D-04/D-07/D-11): no headings…
    expect(screen.queryByText("Financial Summary")).toBeNull();
    expect(screen.queryByText("Visit Zone Fees")).toBeNull();
    expect(screen.queryByText("Technician Performance")).toBeNull();
    expect(screen.queryByText("Common Problems")).toBeNull();
    expect(screen.queryByText("Maintenance Log")).toBeNull();
    // …and no empty tables/placeholders.
    expect(screen.queryByText("Technician", { selector: "th" })).toBeNull();
  });

  it("keeps date-only maintenance records but suppresses their empty headers (D-08)", () => {
    render(
      <InternalReportPrintView
        data={baseForm({ branches: [dataOnlyBranch], branchCount: 1 })}
        branch={dataOnlyBranch}
      />,
    );

    // The record card itself survives (date visible).
    expect(screen.getByText("2026-07-02")).toBeTruthy();
    // Empty derived sections still vanish.
    expect(screen.queryByText("Visit Zone Fees")).toBeNull();
    expect(screen.queryByText("Technician Performance")).toBeNull();
    // Surviving empty cell uses the shared placeholder.
    expect(screen.getByText(NO_DATA_LABEL)).toBeTruthy();
  });

  it("company report renders the branch comparison 'no data' logistics cell", () => {
    const data = baseForm({
      hasBranches: true,
      branches: [dataOnlyBranch],
      branchCount: 1,
    });
    render(<InternalReportPrintView data={data} />);

    // Branch comparison table exists (hasBranches)…
    expect(screen.getByText("Branch Comparison")).toBeTruthy();
    // …and the logistics cell with no operations renders the shared placeholder.
    expect(screen.getAllByText(NO_DATA_LABEL).length).toBeGreaterThan(0);
  });
});
