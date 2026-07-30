import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "./testUtils";
import DateRangeExportModal from "../components/DateRangeExportModal";
import { ARABIC_PRESET_LABELS } from "../utils/dateRangeFilter";

describe("DateRangeExportModal", () => {
  const mockOnClose = vi.fn();
  const mockOnExport = vi.fn();

  beforeEach(() => {
    mockOnClose.mockReset();
    mockOnExport.mockReset();
  });

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <DateRangeExportModal
        isOpen={false}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with default title when isOpen", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    expect(screen.getByText("تصدير التقرير")).toBeTruthy();
  });

  it("renders custom title when provided", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        title="تقرير مخصص"
      />,
    );
    expect(screen.getByText("تقرير مخصص")).toBeTruthy();
  });

  it("renders all 6 preset buttons with Arabic labels", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    expect(screen.getByText(ARABIC_PRESET_LABELS.allTime)).toBeTruthy();
    expect(screen.getByText(ARABIC_PRESET_LABELS.today)).toBeTruthy();
    expect(screen.getByText(ARABIC_PRESET_LABELS.thisWeek)).toBeTruthy();
    expect(screen.getByText(ARABIC_PRESET_LABELS.thisMonth)).toBeTruthy();
    expect(screen.getByText(ARABIC_PRESET_LABELS.thisQuarter)).toBeTruthy();
    expect(screen.getByText(ARABIC_PRESET_LABELS.thisYear)).toBeTruthy();
  });

  it('defaults to "All Time" selected', () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    const allTimeBtn = screen.getByText(ARABIC_PRESET_LABELS.allTime).closest("button")!;
    expect(allTimeBtn.className).toContain("border-primary");
  });

  it("calls onExport with allTime range when no selection made", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    fireEvent.click(screen.getByText("تصدير"));
    expect(mockOnExport).toHaveBeenCalledOnce();
    expect(mockOnExport).toHaveBeenCalledWith(
      expect.objectContaining({ preset: "allTime" }),
    );
  });

  it("calls onClose when X button clicked", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    fireEvent.click(screen.getByLabelText("إغلاق"));
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when backdrop clicked", () => {
    const { container } = render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    const backdrop = container.querySelector(".fixed.inset-0");
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop!);
    expect(mockOnClose).toHaveBeenCalledOnce();
  });

  it("switches to custom preset when date inputs are changed", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    const startInput = screen.getByLabelText("من") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "2026-07-01" } });
    expect(startInput.value).toBe("2026-07-01");
  });

  it("preset click clears custom dates", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    // First set a custom date
    const startInput = screen.getByLabelText("من") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "2026-07-01" } });
    expect(startInput.value).toBe("2026-07-01");

    // Then click a preset
    fireEvent.click(screen.getByText(ARABIC_PRESET_LABELS.today));
    expect(startInput.value).toBe("");
  });

  it("export button shows spinner when isGenerating is true", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isGenerating={true}
      />,
    );
    expect(screen.getByText("جاري التصدير...")).toBeTruthy();
  });

  it("export button is disabled when isGenerating is true", () => {
    render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
        isGenerating={true}
      />,
    );
    const exportBtn = screen.getByText("جاري التصدير...").closest("button")!;
    expect(exportBtn.disabled).toBe(true);
  });

  it("resets to defaults when reopened", () => {
    const { rerender } = render(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    // Select a preset and set a custom date
    fireEvent.click(screen.getByText(ARABIC_PRESET_LABELS.thisMonth));
    const startInput = screen.getByLabelText("من") as HTMLInputElement;
    fireEvent.change(startInput, { target: { value: "2026-06-01" } });

    // Close
    rerender(
      <DateRangeExportModal
        isOpen={false}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );
    // Reopen
    rerender(
      <DateRangeExportModal
        isOpen={true}
        onClose={mockOnClose}
        onExport={mockOnExport}
      />,
    );

    // Should be reset to allTime
    const allTimeBtn = screen.getByText(ARABIC_PRESET_LABELS.allTime).closest("button")!;
    expect(allTimeBtn.className).toContain("border-primary");
    expect((screen.getByLabelText("من") as HTMLInputElement).value).toBe("");
  });
});
