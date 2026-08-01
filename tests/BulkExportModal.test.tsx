import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "./testUtils";
import BulkExportModal from "../components/BulkExportModal";
import { BatchExportItem } from "../utils/internalReportPdf";
import { MaintenanceRecord } from "../types";

const makeRecord = (id: string, overrides: Partial<MaintenanceRecord> = {}): MaintenanceRecord =>
  ({
    id,
    maintenanceDate: "2026-07-15",
    type: "scheduled",
    isLogisticsVisit: false,
    hadProblem: false,
    partsWereReplaced: false,
    problemSolved: false,
    partsReplaced: [],
    servicesPerformed: [],
    paidBy: "company",
    baristaName: "Tech 1",
    visitZone: "cairo",
    followUpVisits: [],
    supervisors: [],
    dailyLeaseCost: 0,
    problems: [],
    ...overrides,
  }) as MaintenanceRecord;

const makeItems = (n: number): BatchExportItem[] =>
  Array.from({ length: n }, (_, i) => ({
    record: makeRecord(`rec-${i}`),
    companyId: i < 2 ? 1 : 2,
    companyName: i < 2 ? "Alpha Co" : "Beta Co",
    branchId: i % 2 === 0 ? -1 : 5,
    branchName: i % 2 === 0 ? "Main Office" : "Branch Five",
  }));

describe("BulkExportModal", () => {
  const mockOnClose = vi.fn();
  const mockOnExportPDF = vi.fn();
  const mockOnExportCSV = vi.fn();

  beforeEach(() => {
    mockOnClose.mockReset();
    mockOnExportPDF.mockReset();
    mockOnExportCSV.mockReset();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <BulkExportModal
        isOpen={false}
        onClose={mockOnClose}
        items={makeItems(3)}
        onExportPDF={mockOnExportPDF}
        onExportCSV={mockOnExportCSV}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("shows the selection summary (records, companies, branches)", () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        items={makeItems(3)}
        onExportPDF={mockOnExportPDF}
        onExportCSV={mockOnExportCSV}
      />,
    );
    // React splits interpolated text into separate DOM nodes, so read the
    // summary box via its testid and assert on textContent.
    const summary = screen.getByTestId("bulk-summary");
    expect(summary.textContent).toContain("Exporting 3 records");
    expect(summary.textContent).toContain("2 companies");
    // makeItems(3) spans company-branch keys (1,-1), (1,5) and (2,-1) → 3.
    expect(summary.textContent).toContain("3 branches");
  });

  it("defaults to Cost mode with grouping + summary table enabled", () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        items={makeItems(1)}
        onExportPDF={mockOnExportPDF}
        onExportCSV={mockOnExportCSV}
      />,
    );
    fireEvent.click(screen.getByText("Export PDF"));
    expect(mockOnExportPDF).toHaveBeenCalledWith("cost", true, true);
  });

  it("passes the selected mode, grouping and summary flag to onExportPDF", () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        items={makeItems(1)}
        onExportPDF={mockOnExportPDF}
        onExportCSV={mockOnExportCSV}
      />,
    );
    fireEvent.click(screen.getByText("Client"));
    fireEvent.click(screen.getByText("Flat List"));
    fireEvent.click(screen.getByText("Summary table on cover"));
    fireEvent.click(screen.getByText("Export PDF"));
    expect(mockOnExportPDF).toHaveBeenCalledWith("client", false, false);
  });

  it("calls onExportCSV when the CSV button is clicked", () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        items={makeItems(2)}
        onExportPDF={mockOnExportPDF}
        onExportCSV={mockOnExportCSV}
      />,
    );
    fireEvent.click(screen.getByText("CSV"));
    expect(mockOnExportCSV).toHaveBeenCalledOnce();
  });

  it("hides the combined total when Client mode is selected (no costs reach the client)", () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        items={makeItems(2)}
        onExportPDF={mockOnExportPDF}
        onExportCSV={mockOnExportCSV}
      />,
    );
    expect(screen.getByText(/Combined total/)).toBeTruthy();
    fireEvent.click(screen.getByText("Client"));
    expect(screen.queryByText(/Combined total/)).toBeNull();
  });

  it("calls onClose when the X button is clicked", () => {
    render(
      <BulkExportModal
        isOpen={true}
        onClose={mockOnClose}
        items={makeItems(1)}
        onExportPDF={mockOnExportPDF}
        onExportCSV={mockOnExportCSV}
      />,
    );
    fireEvent.click(screen.getByLabelText("Close"));
    expect(mockOnClose).toHaveBeenCalledOnce();
  });
});
