# Phase 3: Auto-remove empty rows, columns, sections & empty states from all PDF reports - Research

**Researched:** 2026-08-01
**Domain:** PDF report rendering / empty-state suppression (jsPDF + jspdf-autotable + React print view)
**Confidence:** HIGH (all findings verified against the live codebase this session)

## Summary

The app renders reports through **three distinct surfaces** with very different empty-handling maturity:

1. **New-style engine reports** (`utils/internalReportPdf.ts` + `utils/pdfCompactLayout.ts`) — already engine-driven with `hideEmptyComponents` (default **on**), `isValueEmpty(value, IgnoreCondition)` with `"null" | "empty" | "zero" | "never"` rules, and `buildCompactTable` which already drops all-empty columns and widens the rest. The remaining leak here is `drawEmptyMessage` — 10+ call sites render "No maintenance records" / "No problems" / "No parts used" / "No logistics costs" / "No branches to compare" placeholders that violate the user's "vanish completely" decision.
2. **Legacy generator** (`utils/pdfGenerator.ts`) — `generateCompanyPDF` (line 508) and `generateBranchPDF` (line 1227) with **15 raw `autoTable` calls and zero empty-row/empty-column handling**. This is the primary gap.
3. **HTML print view** (`components/InternalReportPrintView.tsx`) — React component rendering `<table>` markup with no empty-state suppression.

**Primary recommendation:** centralize the emptiness vocabulary (`isValueEmpty` + `IgnoreCondition` already exist) and apply it uniformly across all three surfaces — filter rows/columns before drawing, drop empty sections before rendering headers, replace surviving empty cells with "no data", and never touch the missing-data capture flow (`utils/missingDataPdf.ts`, `hideEmptyComponents: false` draft mode).

**Primary constraint (D-05, hard boundary):** draft/missing-data capture modes keep placeholders. The suppression must never leak into `generateMissingDataPDF` (used at `components/SubmissionDetails.tsx:1383`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Cleanup applies to ALL PDF surfaces — new-style engine reports (company/branch/visit/batch × client/cost/internal), legacy `pdfGenerator.ts` (`generateCompanyPDF`/`generateBranchPDF`), and the HTML print view (`InternalReportPrintView.tsx`).
- **D-02:** Anything with 0, null, or empty is "empty" and dropped automatically. Zero counts as empty — except KPI cards.
- **D-03:** The existing `IgnoreCondition` rules (`"null" | "empty" | "zero" | "never"`) are the canonical emptiness vocabulary.
- **D-04:** Empty sections vanish completely — no header, no "No X" message. Generated PDFs only.
- **D-05:** Draft / missing-data capture modes keep placeholders — hard boundary, never leak suppression into those flows.
- **D-06:** KPI cards stay even at 0 — structural, always render.
- **D-07:** Entirely-empty rows are removed, same as columns.
- **D-08:** Maintenance records are core data — a record row is kept even if only a date exists. Derived data rows (zones, technicians, parts, contacts) drop when empty.
- **D-09:** Cost Breakdown / Financial Summary section drops entirely when every category is 0. KPI cards still render.
- **D-10:** Surviving empty cells render "no data" (English) instead of "—".
- **D-11:** Same strictness in legacy `pdfGenerator.ts` and `InternalReportPrintView.tsx`.
- **D-12:** Batch report cover follows the same rules (zero-cost lines and selection description drop when empty).

### Claude's Discretion
None explicitly delegated — implementation detail left to planning.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Emptiness detection | Client (utils) | — | `isValueEmpty`/`IgnoreCondition` already live in `utils/pdfCompactLayout.ts` |
| Table row/column filtering | Client (utils) | — | `buildCompactTable` pattern already drops all-empty columns |
| Legacy PDF table filtering | Client (utils) | — | `pdfGenerator.ts` autoTable calls need the same filter applied pre-draw |
| HTML print view suppression | Client (component) | — | `InternalReportPrintView.tsx` renders conditionally |
| Draft/missing-data preservation | Client (utils) | — | `missingDataPdf.ts` must remain untouched |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jspdf | (existing, in package.json) | PDF generation | Already the app's PDF engine |
| jspdf-autotable | (existing) | Table rendering | Already used by legacy + maintenance tables |

**No new dependencies.** This phase is pure logic over existing rendering primitives. `npm install` not required.

## Architecture Patterns

### Pattern 1: Centralized emptiness predicate
`isValueEmpty(value, condition)` in `utils/pdfCompactLayout.ts:31` is the single source of truth. Every surface should route its emptiness checks through it (or its `IgnoreCondition` vocabulary).

### Pattern 2: Filter-before-draw (tables)
`buildCompactTable` (in `utils/pdfCompactLayout.ts`) already implements column-level filtering: it checks `rows.some((row) => !isValueEmpty(col.accessor(row), col.ignoreIf))` and drops all-empty columns, widening the rest. This phase extends the same philosophy to:
- **Row-level** filtering (D-07): drop rows where every cell is empty/zero/null — with the D-08 maintenance-record exception.
- **Legacy autoTable** calls: build filtered `body` arrays and filtered column sets before each `autoTable(doc, ...)` in `pdfGenerator.ts` (15 call sites: lines 717, 774, 803, 851, 922, 973, 1047, 1099, 1125, 1165, 1288, 1331, 1364, 1490, 1520).

### Pattern 3: Section-level gating
New-style reports gate sections via the engine (`hideEmptyComponents` skips a section header when all child blocks are empty — `pdfCompactLayout.ts:193`). Replace `drawEmptyMessage` placeholder paths in `internalReportPdf.ts` (lines 858, 874, 949, 977, 1015, 1033, 1266, 1299, 1374, 1400, 1423, 1461, 1479, 2103, 2117) so empty sections produce **no block at all** instead of a "No X" message (D-04).

### Pattern 4: Financial section zero-drop
`buildFinancialCategories` / `drawFinancialSummary` in `pdfTheme.ts` — gate the whole Cost Breakdown section on `categories.some((c) => c.total > 0)` (D-09).

### Anti-Patterns to Avoid
- **Mutating the engine's draft mode:** never flip `hideEmptyComponents` to false globally — D-05 depends on the flag staying on for generated reports.
- **Special-casing "—" strings:** the current `"—"` placeholder appears in `formatPartsList`/`formatServicesList`/`formatProblemsList` (internalReportPdf.ts:28-100) and `drawInfoBox` defaults. D-10 replaces surviving empty cells with "no data" — a shared constant, not per-call literals.
- **Row-drop that deletes maintenance records:** D-08 is explicit — record rows with only a date survive.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Emptiness predicate | New "isEmpty" function | Existing `isValueEmpty` + `IgnoreCondition` | Already battle-tested; centralizing avoids drift |
| Empty-column drop | New column logic per table | Extend `buildCompactTable` pattern | Same algorithm already proven |
| PDF text shaping | Manual Arabic reshaping | Existing `pdfText` helper (`utils/pdfTheme.ts`) | Avoids the bidi/reshape regressions from earlier phases |

## Common Pitfalls

### Pitfall 1: Suppression leaking into missing-data capture
**What goes wrong:** A shared "filter empty" helper accidentally applies to `generateMissingDataPDF`, hiding the very fields technicians must see.
**Why it happens:** `missingDataPdf.ts` intentionally renders missing fields.
**How to avoid:** Gate every new filter behind an explicit "generated report" context; never call it from `missingDataPdf.ts`; add a regression test asserting the missing-data PDF still renders empty-field placeholders.
**Warning signs:** Missing-data export stops listing missing fields.

### Pitfall 2: Legacy autoTable column/width mismatch
**What goes wrong:** Dropping a column in `pdfGenerator.ts` without adjusting `columnStyles`/widths causes overflow or misalignment.
**Why it happens:** Each autoTable has fixed `columnStyles` keyed by index.
**How to avoid:** Filter columns first, rebuild `columnStyles` from the surviving set, then draw. Follow the `buildCompactTable` widening approach.
**Warning signs:** jsPDF "table width exceeds page" warnings (already seen in tests).

### Pitfall 3: i18n audit failure on "no data"
**What goes wrong:** The new "no data" string (D-10) is a hard-coded English UI string — `tests/i18nAudit.test.ts` fails on new English strings not in `tests/i18n-allowlist.json`.
**How to avoid:** Add "no data" (and any new labels) to the allowlist in the same commit, or route through i18n.
**Warning signs:** `npx vitest run tests/i18nAudit.test.ts` fails.

## Code Examples

### Filter-before-draw for a legacy table
```typescript
// Source: buildCompactTable pattern in utils/pdfCompactLayout.ts (verified this session)
const activeCols = allCols.filter((col) =>
  col.ignoreIf === "never" || rows.some((r) => !isValueEmpty(col.accessor(r), col.ignoreIf)),
);
```
Extend with a row filter: `const activeRows = rows.filter((r) => activeCols.some((c) => !isValueEmpty(c.accessor(r), c.ignoreIf)))` — then drop `"no data"`-only rows per D-08 rules.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Row-level drop should use the same `IgnoreCondition` vocabulary as columns | Pattern 2 | LOW — planner can define row predicates per table |
| A2 | "no data" is acceptable as a hard-coded English string if allowlisted | Pitfall 3 | LOW — allowlist is the established mechanism |

## Open Questions

1. **Row-level predicate granularity** — should the row filter be "all cells empty/zero/null" or "all *content* cells empty (ignoring date/type/status)"? D-08 answers the maintenance-record case; derived tables (zones/technicians/parts) can use the strict all-empty rule. Recommendation: strict all-empty for derived data; maintenance records always kept.

## Environment Availability

> No external dependencies — code/config-only changes. Step 2.6: SKIPPED (no external dependencies identified).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest 4.x |
| Config file | vite.config.ts (vitest config) |
| Quick run command | `npx vitest run tests/internalReportPdf.test.ts tests/BulkExportModal.test.tsx --reporter=dot` |
| Full suite command | `npx vitest run --reporter=dot` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-04 | Empty sections vanish (no "No problems" etc.) | unit | `npx vitest run tests/internalReportPdf.test.ts` | ✅ |
| D-07/D-08 | Empty rows drop; maintenance records kept | unit | new tests in `tests/internalReportPdf.test.ts` | ❌ Wave 0 |
| D-09 | Cost Breakdown drops when all categories 0 | unit | new tests | ❌ Wave 0 |
| D-10 | "no data" in surviving empty cells | unit + i18n audit | `npx vitest run tests/i18nAudit.test.ts` | ✅ |
| D-11 | Legacy + print view same strictness | unit | new tests for `pdfGenerator.ts` outputs | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/internalReportPdf.test.ts tests/BulkExportModal.test.tsx --reporter=dot`
- **Per wave merge:** `npx vitest run --reporter=dot`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/internalReportPdf.test.ts` — extend with row-drop / financial-zero / "no data" tests
- [ ] New test coverage for `pdfGenerator.ts` legacy empty filtering (may live in `tests/internalReportPdf.test.ts` or a new `tests/pdfGeneratorEmpty.test.ts`)

*(Existing vitest infra covers the framework; no install needed)*

## Security Domain

> This phase renders existing data into PDFs — no new input surfaces, no auth changes, no external calls.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | — |
| V3 Session Management | no | — |
| V4 Access Control | no | — |
| V5 Input Validation | yes (indirect) | Existing sanitization; suppression must not render unsanitized empty-sentinel values |
| V6 Cryptography | no | — |

### Known Threat Patterns
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Data leak via client-visible report | Information Disclosure | Client-mode cost stripping (D-01 preserves existing client/cost/internal separation); suppression must not re-expose cost cells in client mode |

## Sources

### Primary (HIGH confidence — verified in this session's codebase work)
- `utils/pdfCompactLayout.ts` — `isValueEmpty`, `IgnoreCondition`, `hideEmptyComponents`, `buildCompactTable` (lines 22-31, 77-193, 253-274)
- `utils/internalReportPdf.ts` — `drawEmptyMessage` call sites, `buildMaintenanceTableColumns`, `formatPartsList`/`formatServicesList`, engine wiring (lines 28-100, 313, 724, 1095, 1978)
- `utils/pdfGenerator.ts` — `generateCompanyPDF` (508), `generateBranchPDF` (1227), 15 `autoTable` call sites
- `components/InternalReportPrintView.tsx` — FinancialCard/SectionTitle/PrintRecordCard structure
- `utils/missingDataPdf.ts` — `generateMissingDataPDF` (841) — DO NOT MODIFY
- `components/SubmissionDetails.tsx:1383` — missing-data flow call site

### Secondary (MEDIUM confidence)
- `tests/i18nAudit.test.ts` + `tests/i18n-allowlist.json` — English-string gate mechanics

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against live code this session
- Architecture: HIGH — all four patterns verified against actual code
- Pitfalls: HIGH — i18n audit failure and autoTable width warnings observed in this session's test runs

**Research date:** 2026-08-01
**Valid until:** 2026-09-01
