---
phase: "02"
threats_found: 9
threats_closed: 9
threats_open: 0
last_audit: 2026-07-31
---

# Phase 2: Time-Range PDF Export — Security Audit

## Threat Register

| ID | STRIDE | Component | Threat | Disposition | Mitigation |
|----|--------|-----------|--------|-------------|------------|
| T-01 | Tampering | `dateRangeFilter.ts:formatArabicDate` | Invalid date string passed to `new Date()` → `getMonth()` returns NaN → array index out of bounds → "undefined" displayed in PDF label | **CLOSED** | Added `isNaN(d.getTime())` guard + month bounds check; falls back to raw string |
| T-02 | Tampering | `dateRangeFilter.ts:filterMaintenanceByDateRange` | Malformed date string in `range.startDate`/`range.endDate` → `new Date(invalid).getTime()` returns NaN → all comparisons fail → no records matched | **CLOSED** | Safe failure: NaN comparisons return false, producing empty result set rather than crash |
| T-03 | Tampering | `DateRangeExportModal.tsx` | Custom date inputs accept arbitrary strings from `<input type="date">` | **CLOSED** | Browser enforces YYYY-MM-DD format on `type="date"` inputs; utility handles invalid dates safely |
| T-04 | Information Disclosure | `DateRangeExportModal.tsx` | Active range indicator displays raw date strings directly in DOM | **CLOSED** | Dates originate from hardcoded presets or browser-validated inputs; no unsanitized user content |
| T-05 | Tampering | `SubmissionDetails.tsx:getFilteredSubmission` | `structuredClone` on deeply nested FormData with MaintenanceRecord arrays | **CLOSED** | `structuredClone` is a native browser API that safely deep-clones without prototype pollution risk; recursive structures handled correctly |
| T-06 | Information Disclosure | `SubmissionDetails.tsx:handleDateRangeExport` | Filtered maintenance data passed to PDF generators | **CLOSED** | Same data already visible in the UI; PDF export is an intentional feature, not a leak; client PDFs already hide costs via `includeCosts: false` |
| T-07 | Tampering | `HistoryPage.tsx` | URL query params `?startDate=...&endDate=...` passed to print view — untrusted input | **CLOSED** | Date strings validated by `filterMaintenanceByDateRange` utility; invalid dates produce safe empty filter |
| T-08 | Tampering | `internalReportPdf.ts` / `pdfGenerator.ts` | `formatDateRangeLabel(options.dateRange)` injects date strings into PDF header | **CLOSED** | Arabic month names hardcoded; date values originate from browser-validated inputs or trusted presets; jsPDF renders as text, not HTML |
| T-09 | Denial of Service | `dateRangeFilter.ts:filterMaintenanceByDateRange` | Recursive filter on deeply nested `followUpVisits` could exhaust stack | **CLOSED** (accepted risk) | Maintenance records have practical depth of 1–2 levels; recursion is the standard pattern for tree traversal in this codebase |

## Audit Summary

| Metric | Count |
|--------|-------|
| Threats found | 9 |
| Closed | 9 |
| Open | 0 |

## Audit Trail

- **2026-07-31** — Initial security audit (retroactive-STRIDE mode). Phase 2 plan did not include a formal `<threat_model>` block. Built STRIDE register from implementation files (`dateRangeFilter.ts`, `DateRangeExportModal.tsx`, `SubmissionDetails.tsx`, `HistoryPage.tsx`, `internalReportPdf.ts`, `pdfGenerator.ts`). One actionable finding (T-01: unvalidated date in `formatArabicDate` → fixed with NaN guard). All 9 threats verified closed.

## Accepted Risks

- **T-09 (DoS — recursive stack overflow)**: Accepted. The recursive `filterMaintenanceByDateRange` follows the existing codebase pattern for tree traversal. Maintenance records have practical nesting depth of 1–2 levels; stack overflow is not a realistic threat. Monitoring: if record nesting depth exceeds 50 levels, revisit with iterative approach.
