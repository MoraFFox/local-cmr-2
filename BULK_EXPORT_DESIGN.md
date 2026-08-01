# Bulk Export — Design Spec

**Status:** Approved
**Scope:** Selection UX in "All Records" + a generalized batch export PDF/CSV flow
**Primary users:** Both admin (cost/internal batches) and client-facing (no costs) batches — the report mode is chosen at export time, exactly like today's three report types.

## 1. Selection layer (GlobalRecordsPage)

The "All Records" screen already flattens every record across companies/branches and has
search/filters/sort/pagination. Selection slots right in:

- **Checkbox column** on desktop rows + a checkbox on each mobile card.
- **Header checkbox** = select current page; **"Select all N matching"** button selects
  everything the current filters match (not just the visible page).
- **Row click toggles selection** (hover affordance) so it feels like a checklist.
- Selection keyed by `companyId-branchId-record.id`, stored in a `Set`.

## 2. Smart presets ("Grab" buttons)

A row of one-click buttons that **add** matching records to the selection (stackable —
they never clear what you already picked):

- All **requested** / all **scheduled** visits
- All **resolved** / all **unresolved** visits
- **Cost range** — min/max number inputs using the existing `getRecordCostSummary()`
  from `costAggregation.ts`, with a **company cost vs. total cost** toggle
- **Technician** batch (pick a tech → select their visits)
- **Rating**: rated ≤ 2★ or unrated

## 3. Sticky selection bar

When ≥1 record is selected, a floating bar shows:
**"47 selected · Total cost: EGP 12,400 · Export ▾ · Clear"**

- Live total cost updates with the selection.
- Cost shows only when a mode that includes costs is chosen (client mode shows count only).

## 4. Export modal — one flow, three audiences

A generalized modal (extends the `DateRangeExportModal` pattern):

- **Summary up top**: "Exporting 47 records · 3 companies · 5 branches"
- **Report mode toggle**: Client (no costs) / Cost (all costs) / Internal (costs + payer split)
- **Grouping**: Flat list vs. grouped by Company → Branch
- **Optional summary table** on page 1 (date, company, branch, tech, status, cost)
- **CSV option** alongside PDF — `exportMaintenanceToCSV()` already exists

## 5. PDF engine (generateBatchReport)

New entry point in `internalReportPdf.ts` that reuses existing pieces:

- `generateBatchReport(records: BatchRecord[], mode, opts)` where `BatchRecord` carries
  `{ companyName, branchName, record }`.
- **Cover sheet** documenting the batch: N visits, period, filters/presets, exported date.
- **Summary table** (per mode: with/without cost column).
- **Detail blocks** via the existing `renderClientRecordBlocks` (client) and
  `drawVisitDetails` with costs (cost/internal).
- **Grouping** via the existing per-branch section pattern.

## 6. Deliberately cut (phase 2)

Saved named presets, batch history/re-export, shift-click range selection,
very-large-batch progress UI.

## 7. Validation

- `tsc --noEmit` clean
- New tests in `tests/internalReportPdf.test.ts` asserting:
  - batch report renders client/cost/internal modes without throwing
  - client batch mode never draws `EGP` / cost labels
  - cost/internal batch modes draw cost figures
  - cover sheet + summary table + per-record detail blocks render
- Code review via code-reviewer-deepseek-flash
