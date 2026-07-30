# Phase 2: Time-Range PDF Export — Context

**Gathered:** 2026-07-31
**Status:** Ready for planning

## Domain

Add date-range filtering to ALL PDF export surfaces across the app. A modal with pre-fixed time ranges (day, week, month, quarter, year, custom) opens before any PDF is generated. All data in the resulting PDF — maintenance records, KPIs, financial summaries, problem frequencies, technician tables, visit zones, logistics operations — reflects only the selected period. Default is "all range" (entire history — current behavior).

## Decisions

### D-01: Modal-based date range picker
A new `DateRangeExportModal` component opens when the user clicks any PDF export button (internal/client, company/branch, global print). The modal shows the range options, then dispatches to the corresponding PDF generator with the filtered date range. The existing `PrintDropdown` in `SubmissionDetails` triggers the modal instead of generating immediately.

### D-02: Pre-fixed ranges + custom date range
The modal presents both:
- **Quick presets relative to today**: This Day, This Week, This Month, This Quarter, This Year
- **Specific period picker**: Two date inputs (from → to) for custom ranges
- **"All Time"** default (no filter — current behavior)
- The presets are calculated client-side relative to the current date

### D-03: Everything in the PDF reflects the date range
Filtering applies to all data fed into the PDF generators:
- Maintenance history records (primary filter on `maintenanceDate`)
- KPI summaries (visit counts, resolution rates)
- Financial summaries (costs recalculated from filtered records only)
- Problem frequency breakdowns
- Technician performance tables
- Visit zone breakdowns
- Logistics operations (filtered by `open_date` within range)

### D-04: All export surfaces get the modal
Date range filtering applies to:
- **Per-company reports** — `SubmissionDetails.tsx` `handlePrintFull` (internal + client company PDFs)
- **Per-branch reports** — `SubmissionDetails.tsx` `handlePrintBranch` (internal + client branch PDFs)
- **Global print** — `HistoryPage` "طباعة" button triggers the modal, then filters across all companies
- **Global records** — `GlobalRecordsPage` export gets the same modal

### D-05: Default is "All Time"
The modal defaults to "All Time" — clicking "Export" without changing the range produces the exact same PDF as today. No behavioral regression for users who don't need date filtering.

### D-06: PDF period indicator
When a date range other than "All Time" is selected, the PDF header/metadata includes a period label (e.g., "الفترة: يوليو ٢٠٢٦"). This appears in the internal report header bar and as a subtitle in the client PDF.

## Code Context

### PDF export call sites (all must route through the modal)
| Location | Trigger | Generators |
|----------|---------|-----------|
| `components/SubmissionDetails.tsx:1183-1216` | PrintDropdown → handlePrintFull / handlePrintBranch | `generateInternalCompanyReport`, `generateCompanyPDF`, `generateInternalBranchReport`, `generateBranchPDF` |
| `components/HistoryPage.tsx:211` | "طباعة" button → `onPrint` | `PrintableWorkOrder` (via `/print` route) |
| `components/GlobalRecordsPage.tsx` | Export/print action (if exists) | TBD |

### Existing date filter patterns (reference)
- `SubmissionDetails.tsx` has `filterStartDate`/`filterEndDate` state + `filterRecords()` helper
- `HistoryPage.tsx` has date range inputs for searching submissions
- `GlobalRecordsPage.tsx` has `startDate`/`endDate` state
- All use `record.maintenanceDate` for comparison

### PDF generators to update
- `utils/internalReportPdf.ts` — `generateInternalCompanyReport`, `generateInternalBranchReport`
- `utils/pdfGenerator.ts` — `generateCompanyPDF`, `generateBranchPDF`
- `utils/pdfTheme.ts` — `drawInternalHeader` (add period label)
- `components/InternalReportPrintView.tsx` — HTML print view (if wired)

### New component needed
- `components/DateRangeExportModal.tsx` — modal with presets + custom range + "All Time" default

## Deferred Ideas
- Record counts per range shown in the modal (e.g., "12 records in July") — nice UX but separate feature
- Saved/custom named date ranges — future phase
- Scheduled/automated periodic PDF export — future phase
- Email delivery of time-range reports — future phase
