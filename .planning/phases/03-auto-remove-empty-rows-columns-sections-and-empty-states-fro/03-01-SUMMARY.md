# Plan 03-01 Summary — New-style PDF engine empty-state suppression

**Status:** ✅ Complete (committed `8159103`)

## What was done

1. **Shared helpers in `utils/pdfCompactLayout.ts`** (D-02/D-10 vocabulary):
   - `NO_DATA_LABEL = "no data"` — replaces the legacy "—" placeholder.
   - `isRowEmpty<T>(row, columns)` — true when every column is empty per its `ignoreIf` rule.
   - `filterEmptyRows<T>(rows, columns)` — returns surviving rows + removed count, never mutates input.
   - `addRepeater` no longer renders a "No items" block in compact mode — empty repeaters add NO block, so `addSection` skips the header too (D-04). Signature simplified to `(data, estimatedHeight, drawItems)` (dead `drawEmpty` param removed).

2. **Enforcement in `utils/internalReportPdf.ts`** (D-04/D-07/D-09/D-10/D-11/D-12):
   - All empty-section placeholders replaced with section-level guards — empty sections vanish completely (no "No X" message).
   - Parts/Services table accessors return raw arrays so `isValueEmpty([], "empty")` prunes all-empty columns.
   - D-07 row filters applied to zones/technicians/parts/contacts/machine-fleet.
   - D-09: Cost Breakdown / Financial Summary gated on `categories.some(c => c.total > 0)`.
   - D-10: surviving empty cells render `NO_DATA_LABEL`.
   - D-12: batch cover omits the Net Cost line when total is 0.
   - D-08: maintenance-record rows are never filtered. D-06: KPI cards kept at 0. D-05: `missingDataPdf.ts` untouched.

3. **Tests** — 8 new phase-03 tests in `tests/internalReportPdf.test.ts` (isRowEmpty, filterEmptyRows, empty-section suppression, zero-cost gating, D-07 row drops, D-08 date-only records kept, D-10 "no data", D-12 batch cover).

4. `tests/i18n-allowlist.json` — added exactly `"no data"` (1-line diff, verified by set-diff).

## Verification
- `npx tsc --noEmit` ✅ (at commit time)
- `tests/internalReportPdf.test.ts` 32/32 ✅, `tests/i18nAudit.test.ts` ✅
- Independent code review: **APPROVE**
