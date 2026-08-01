# Phase 3: Auto-remove empty rows, columns, sections & empty states from all PDF reports - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

## Phase Boundary

A UX cleanup pass across **every PDF report surface** in the app. Any row, column, or section that is entirely empty, zero, or null is automatically detected and removed from the generated PDF, so reports render clean and informative — only useful, meaningful information remains. Empty sections vanish completely (no header, no placeholder message). The only intentional exceptions: **KPI cards always render** (even at 0), and **draft/missing-data capture modes keep their placeholders** (so technicians still see what's missing).

**This IS:** Empty-data suppression across all PDF generators and the HTML print view, with a "no data" placeholder for surviving cells.

**This is NOT:** A change to draft/missing-data capture flows, a redesign of report layouts, or new report content.

## Implementation Decisions

### Report Surface Scope
- **D-01:** The cleanup applies to ALL PDF report surfaces — no surface is exempt:
  - New-style engine reports (`utils/internalReportPdf.ts`): company / branch / visit / batch × client / cost / internal modes
  - Legacy generator (`utils/pdfGenerator.ts`): `generateCompanyPDF`, `generateBranchPDF`
  - HTML print view (`components/InternalReportPrintView.tsx`)

### Emptiness Definition
- **D-02:** Anything with **0, null, or empty** in a section is considered "empty" and dropped automatically. Zero counts as empty for removal purposes — **except** KPI cards (D-06).
- **D-03:** The existing `IgnoreCondition` rules (`"null" | "empty" | "zero" | "never"`) in `utils/pdfCompactLayout.ts` are the canonical emptiness vocabulary; extend their consistent application everywhere.

### Empty-State Behavior
- **D-04:** Empty sections **vanish completely** — no section header, no "No problems"/"No parts used" message. Applies to all **generated PDFs only**.
- **D-05:** Draft / missing-data capture modes (`hideEmptyComponents: false`, the missing-data flow) **keep their placeholders** — technicians must still see what's missing. This is a hard boundary; the suppression must never leak into those flows.

### KPI & Summary Cards
- **D-06:** KPI cards **stay even when the value is 0** (Total Visits, Spare Parts, etc.). They are structural and always render.

### Row-Level Removal
- **D-07:** Same rule as columns: if an **entire row** is empty, zero, or null, remove it.
- **D-08:** **Exception — maintenance records are the report's core data**: a record row is kept even if its only content is a date. This exception applies to the maintenance log tables and per-record detail blocks, not to derived data rows (zones, technicians, parts, contacts, etc.).

### Financial Section at Zero
- **D-09:** The **Cost Breakdown / Financial Summary section drops entirely when every category is 0** (nothing to show). KPI cards still render.

### Placeholder Cells
- **D-10:** The placeholder text for a surviving cell with no data is **"no data"** (English). This replaces the current "—" dash in cells that survive row/column removal.

### Legacy + HTML Print Parity
- **D-11:** The **same strictness** (drop all-zero/empty rows, columns, sections; "no data" placeholder) applies to the legacy `pdfGenerator.ts` and `InternalReportPrintView.tsx` — not just the new-style reports.

### Batch Export Cover
- **D-12:** The batch report cover sheet follows the same rules — zero-cost lines and the selection description drop when empty/zero.

### Claude's Discretion
- None explicitly delegated — all areas were decided by the user. Implementation detail (how to wire suppression into each surface) is left to planning.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing PDF infrastructure (the machinery this phase extends)
- `utils/pdfCompactLayout.ts` — `PDFLayoutEngine` with `hideEmptyComponents` flag (default on), `isValueEmpty(value, IgnoreCondition)`, `IgnoreCondition = "null" | "empty" | "zero" | "never"`, `buildCompactTable` (already drops all-empty columns and widens the rest), `addField`/`addSection`/`addRepeater` skip-empty behavior
- `utils/internalReportPdf.ts` — new-style generators: `generateInternalBranchReport`, `generateClientBranchReport`, `generateCostBranchReport`, `generateInternalCompanyReport`, `generateClientCompanyReport`, `generateCostCompanyReport`, `generateBatchReport`, per-visit report generators; `drawEmptyMessage` placeholders to eliminate; `buildMaintenanceTableColumns` with per-column `ignoreIf`
- `utils/pdfGenerator.ts` — legacy generators `generateCompanyPDF` (line 508) / `generateBranchPDF` (line 1227); 12+ raw `autoTable` calls with no empty-row/empty-column handling — the primary gap
- `utils/pdfTheme.ts` — shared drawing primitives (`drawSectionHeader`, `drawTableHeader`, `drawTableRow`, `drawKPICards`, `drawFinancialSummary`, `drawInfoBox`, `pdfText`, `drawLogisticsOperationsTable`, `drawClientLogisticsTable`)
- `components/InternalReportPrintView.tsx` — HTML print view; no empty-state handling today
- `utils/costAggregation.ts` — cost aggregation used by financial sections (zero detection source)

### Prior phase context
- `.planning/phases/02-time-range-pdf-export/02-CONTEXT.md` — established date-range export modal on all PDF surfaces; PDF generators list
- `.planning/phases/01-machine-logistics/01-CONTEXT.md` — internal vs client PDF separation (costs shown/hidden) that this phase must preserve

## Existing Code Insights

### Reusable Assets
- `PDFLayoutEngine` (`utils/pdfCompactLayout.ts`): `hideEmptyComponents`, `isValueEmpty`, `buildCompactTable` — the core suppression machinery already exists for new-style reports; extend its use and close gaps
- `IgnoreCondition` / `isValueEmpty`: canonical emptiness vocabulary to apply in the legacy generator and print view
- `buildMaintenanceTableColumns` per-column `ignoreIf`: pattern to replicate for row-level and legacy-table suppression

### Established Patterns
- New-style reports are engine-driven (`addSection`/`addBlock`/`addRepeater`) with `hideEmptyComponents: true` default
- Legacy generator uses raw `autoTable` calls with fixed columns — needs dynamic column/row filtering
- Print view is HTML — needs conditional rendering or filtering before render
- `drawEmptyMessage` currently prints "No X" placeholders in several sections — these should vanish per D-04 instead

### Integration Points
- `utils/pdfCompactLayout.ts` — extend or configure the engine's skip-empty behavior
- `utils/internalReportPdf.ts` — replace `drawEmptyMessage` placeholder paths with section removal; add row-level filtering to tables; drop zero Cost Breakdown
- `utils/pdfGenerator.ts` — add empty row/column filtering to the legacy `autoTable` calls
- `components/InternalReportPrintView.tsx` — add empty-state suppression to the HTML print view
- Existing tests: `tests/internalReportPdf.test.ts` (459+ suite total) — must be extended to assert removal behavior; the i18n audit (`tests/i18nAudit.test.ts` + `tests/i18n-allowlist.json`) will flag any new English UI strings like "no data"

## Specific Ideas

- The "no data" placeholder (D-10) is a new English UI string — it will need to be added to `tests/i18n-allowlist.json` or localized, and tests will need to assert surviving cells show it while removed rows/columns don't render at all.
- Row-level removal for maintenance records (D-08) keeps records with only a date — but derived data rows (zones with 0 visits, technicians with no visits, parts with 0 count) drop.

## Deferred Ideas

None — discussion stayed within phase scope.

---

*Phase: 3-Auto-remove empty rows, columns, sections & empty states from all PDF reports*
*Context gathered: 2026-08-01*
