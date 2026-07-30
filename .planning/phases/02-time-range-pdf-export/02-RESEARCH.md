# Phase 2: Time-Range PDF Export — Research

**Researched:** 2026-07-31
**Status:** Complete

## Architecture Analysis

### Current PDF Export Flow

```
SubmissionDetails
  └─ PrintDropdown (label, onPrint)
       ├─ "Internal Report" → handlePrintFull("internal")
       │    └─ generateInternalCompanyReport(submission, { logisticsOperations })
       └─ "Client Report"  → handlePrintFull("client")
            └─ generateCompanyPDF(submission, { includeCosts: false, logisticsOperations })

  └─ Per-branch PrintDropdown
       ├─ "Internal Report" → handlePrintBranch(branch, "internal")
       │    └─ generateInternalBranchReport(companyName, branch, { logisticsOperations })
       └─ "Client Report"  → handlePrintBranch(branch, "client")
            └─ generateBranchPDF(companyName, branch, { includeCosts: false, logisticsOperations })
```

### Key Findings

#### 1. `filterRecords()` already exists in SubmissionDetails
```typescript
// components/SubmissionDetails.tsx:1287
const filterRecords = (records: MaintenanceRecord[]) => {
    if (!filterStartDate && !filterEndDate) return records;
    return records.filter((r) => {
      const rDate = new Date(r.maintenanceDate);
      let match = true;
      if (filterStartDate && rDate < new Date(filterStartDate)) match = false;
      if (filterEndDate && rDate > new Date(filterEndDate)) match = false;
      return match;
    });
};
```
This pattern should be extracted into a shared utility function that both the screen filter and PDF generators can use.

#### 2. PDF generators receive FormData directly
All 4 generators accept `FormData` (or `Branch`) and iterate over `maintenanceHistory` internally. They also compute KPIs, financial summaries, problem frequencies, etc. from the full record set. To filter, we need to either:
- **Option A**: Filter the FormData before passing to generators (clone + filter `maintenanceHistory` on branches too)
- **Option B**: Pass `dateRange` as an additional option to generators, which filter internally
- **Recommendation**: Option B — cleaner, no FormData mutation needed

#### 3. Shared `filterMaintenanceByDateRange` utility
Extract a shared utility to `utils/dateRangeFilter.ts`:
```typescript
export function filterMaintenanceByDateRange(
  records: MaintenanceRecord[],
  startDate?: string,
  endDate?: string,
): MaintenanceRecord[]
```
Used by both screen views and PDF generators. Recursively filters `followUpVisits`.

#### 4. Date preset calculations
Pre-fixed ranges calculated client-side relative to today:
```typescript
const presets = {
  today:       { start: today, end: today },
  thisWeek:    { start: monday, end: today },
  thisMonth:   { start: firstDay, end: today },
  thisQuarter: { start: quarterStart, end: today },
  thisYear:    { start: jan1, end: today },
  allTime:     null, // no filter
};
```
Each preset sets `start` (inclusive) and `end` (inclusive) as ISO date strings (`YYYY-MM-DD`).

#### 5. PrintDropdown modification
Currently routes directly to `handlePrintFull`/`handlePrintBranch`. The modal should:
1. Intercept the print button click
2. Open `DateRangeExportModal`
3. On confirm, call the generator with the selected range
4. The `PrintDropdown` doesn't change — it just sets a `onRequestPrint` state instead of calling the handler directly

#### 6. Global print (HistoryPage)
`HistoryPage:211` has `onPrint` callback → navigates to `/print` → `PrintableWorkOrder`. The modal should:
1. Triggered by clicking "طباعة"
2. After range selected, filter all `submissions` across companies
3. Generate a multi-company report (or separate per-company PDFs)

#### 7. MaintenanceRecord followUpVisits
Records have nested `followUpVisits: MaintenanceRecord[]`. Filtering must be recursive — if a parent record is in-range but a child follow-up is out-of-range, the child should be excluded.

### Files to Modify

| File | Change |
|------|--------|
| `components/DateRangeExportModal.tsx` | **NEW** — modal component |
| `utils/dateRangeFilter.ts` | **NEW** — shared filter utility |
| `components/SubmissionDetails.tsx` | Add modal state, route exports through modal, extract `filterRecords` to utility |
| `components/HistoryPage.tsx` | Add modal trigger for global print button |
| `components/GlobalRecordsPage.tsx` | Add modal trigger for export (if exists) |
| `utils/internalReportPdf.ts` | Accept optional `dateRange` in `InternalReportOptions`, filter internally |
| `utils/pdfGenerator.ts` | Accept optional `dateRange` in `PDFOptions`, filter internally |
| `utils/pdfTheme.ts` | `drawInternalHeader` accepts optional `periodLabel` parameter |

### Risk Assessment

- **FormData mutation risk**: LOW — generators already work with the object read-only
- **Nested followUpVisits**: MEDIUM — must filter recursively; missed in current `filterRecords`
- **KPI/statistics recalculation**: LOW — `costAggregation` functions recompute from filtered records naturally
- **Performance**: NEGLIGIBLE — filtering happens on small in-memory arrays before PDF generation
- **Regression risk**: LOW — default "All Time" preserves exact existing behavior
