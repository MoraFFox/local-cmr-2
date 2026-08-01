# Plan 03-02 Summary — Legacy `pdfGenerator.ts` empty-state suppression

**Status:** ✅ Complete (committed `418ff52`)

## What was done

1. **New helpers in `utils/pdfGenerator.ts`** (legacy vocabulary, D-02/D-07/D-10):
   - `isBlankCell` — null/undefined/blank strings/legacy "—"/"-" treated as empty.
   - `filterBlankRows` — drops entirely-empty rows from derived tables. **Never** applied to maintenance-record tables (D-08).
   - `pruneBlankColumns` — drops all-empty columns, returning surviving columns indexed by their ORIGINAL positions so `columnStyles` rebuilds correctly (avoids autoTable width-overflow warnings).

2. **Applied at all 15 autoTable call sites**:
   - Company report: company info, insights, branch summary (column-prune), issues/parts breakdown (column-prune + rebuilt columnStyles), manager contacts (row-filter), main-office maintenance table (`NO_DATA_LABEL` cells), branch info/contacts/baristas, per-branch maintenance table.
   - Branch report: branch info, key contacts (row-filter), assigned staff (row-filter + `NO_DATA_LABEL`), maintenance table (`NO_DATA_LABEL` cells), per-record parts/services tables (row-filter).
   - Stale-`lastAutoTable` paths guarded — `yPos` only advances when a table actually drew.
   - Client-mode cost stripping (`includeCosts:false`) untouched — filters run on already-stripped data (T-03-11).

3. **Tests** — new `tests/pdfGeneratorEmpty.test.ts` (3 tests, jsPDF drawn-strings capture):
   - blank contact row dropped while date-only maintenance record kept (D-07/D-08);
   - all-empty Part/Qty breakdown columns pruned (asserts "Qty" absent, "Count" + "test issue" present);
   - "no data" renders in surviving empty maintenance cells (D-10).

## Verification
- `npx tsc --noEmit` ✅ (excluding the concurrent agent's in-flight `internalReportPdf.ts`/`missingDataPdf.test.ts` errors, present in the tree from separate uncommitted work — not mine, untouched)
- `tests/pdfGeneratorEmpty.test.ts` 3/3 ✅, `tests/i18nAudit.test.ts` ✅
- Independent code review: **APPROVE**

## Note
`utils/internalReportPdf.ts`, `utils/missingDataPdf.ts` and `tests/missingDataPdf.test.ts` contain ANOTHER agent's in-flight, uncommitted changes (a `drawMaintenanceHistoryTable` rewrite referencing undefined `buildMaintenanceItemCell`, and a `createTestPDF` helper). Those files were deliberately NOT touched (D-05 boundary); their known failures are separate from this plan.
