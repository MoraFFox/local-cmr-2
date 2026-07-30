---
phase: "02"
reviewed_at: 2026-07-31
depth: deep
files_reviewed: 7
findings_critical: 1
findings_warning: 2
findings_info: 2
findings_open: 0
---

# Phase 2: Time-Range PDF Export — Code Review

## Findings Summary

| # | Severity | Component | Finding | Status |
|---|----------|-----------|---------|--------|
| CR-1 | **CRITICAL** | `SubmissionDetails.tsx:handleDateRangeExport` | Branch PDFs pass original branch instead of filtered branch — date range has zero effect on branch exports | **FIXED** |
| CR-2 | WARNING | `pdfGenerator.ts` | Client PDFs accept `dateRange` but never render a period subtitle (D-06 violation — only internal reports show period) | **FIXED** |
| CR-3 | WARNING | `HistoryPage.tsx` | `onPrint` prop becomes dead code — print button navigates directly, never calls callback | **DOCUMENTED** |
| CR-4 | INFO | `tests/dateRangeFilter.test.ts` | Missing test for reversed custom dates (startDate > endDate) | ACCEPTED |
| CR-5 | INFO | `DateRangeExportModal.tsx:buildActiveRange` | Called twice per render — trivial, could be `useMemo` | ACCEPTED |

## Applied Fixes

### CR-1 — Branch PDF filtering (CRITICAL)

**Before**: `handleDateRangeExport` passed the original `branch` (captured from `pendingPrintAction`) to `generateInternalBranchReport` and `generateBranchPDF`. These generators iterate over `branch.maintenanceHistory` internally, so the date range filter had zero effect.

**After**: Looks up the filtered branch from the cloned submission:
```typescript
const filteredBranch = filteredSub.branches.find(b => b.id === branch.id) || branch;
```
Both internal and client branch generators now receive `filteredBranch` with pre-filtered `maintenanceHistory`. File names also use `filteredBranch.branchName`.

### CR-2 — Client PDF period subtitle (WARNING)

**Before**: `pdfGenerator.ts` accepted `dateRange` in `PDFOptions` but `generateCompanyPDF` never rendered a period indicator. The option was dead data.

**After**: Added period subtitle in the client PDF header, between "Generated:" and "Company Profile":
```typescript
if (options.dateRange && (options.dateRange.startDate || options.dateRange.endDate)) {
  doc.text(`Period: ${formatDateRangeLabel(options.dateRange)}`, ...);
}
```

### CR-3 — HistoryPage dead onPrint prop (WARNING)

**Before**: Print button navigates directly with `useNavigate()` instead of calling `onPrint()`, but the prop remains required in the interface.

**After**: Added `@deprecated` JSDoc comment documenting the prop is vestigial, kept for interface compatibility with App.tsx.

## Verified (not bugs)

- `getFilteredSubmission` correctly filters both `maintenanceHistory` and `branch.maintenanceHistory`
- No race condition between modal close and async PDF generation
- No unused `formatDateRangeLabel` import in `pdfGenerator.ts` (only `DateRange` was imported, which IS used)
- `structuredClone` is safe for FormData — no functions/DOM nodes in the type
- `!range || (!range.startDate && !range.endDate)` correctly handles allTime/null/empty
- No double `DateRange` import in `pdfGenerator.ts`
