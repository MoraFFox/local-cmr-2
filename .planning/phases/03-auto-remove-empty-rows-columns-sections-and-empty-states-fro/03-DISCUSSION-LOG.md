# Phase 3: Auto-remove empty rows, columns, sections & empty states from all PDF reports - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-01
**Phase:** 3-auto-remove-empty-rows-columns-sections-and-empty-states-fro
**Areas discussed:** Report surface scope, Emptiness definition, Empty-state behavior, KPI & summary cards, Row-level removal, Financial section at zero, Placeholder cells, Legacy + HTML print parity, Batch export cover

---

## Report Surface Scope

| Option | Description | Selected |
|--------|-------------|----------|
| New-style only | Only internalReportPdf.ts engine reports | |
| New-style + legacy + print view | All PDF surfaces including pdfGenerator.ts and InternalReportPrintView.tsx | ✓ |

**User's choice:** All — "1. all"
**Notes:** No surface is exempt.

## Emptiness Definition

| Option | Description | Selected |
|--------|-------------|----------|
| 0/null/empty all drop | Any zero, null, or empty value is dropped automatically | ✓ |
| Only null/empty | Zeros preserved | |
| Only all-empty columns | Only fully-empty columns drop | |

**User's choice:** "2. any thing with 0 or null or empty in the sections so useless info get dropped automatically"
**Notes:** Zero counts as empty for removal, except KPI cards (see KPI decision).

## Empty-State Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Vanish completely | No header, no message — section gone | ✓ |
| Compact note | Keep a "No X" note | |
| Keep current behavior | Leave as-is | |

**User's choice:** "3. yes it should vanish, this will apply to all pdf generated only. so they stay clear and only the useful meaningfull info is there."
**Notes:** Applies to generated PDFs only; draft/missing-data capture modes keep placeholders.

## KPI & Summary Cards

| Option | Description | Selected |
|--------|-------------|----------|
| Keep KPIs at 0 | KPI cards always render even at 0 | ✓ |
| Hide zero KPIs | Cards with zero values vanish | |

**User's choice:** "4. no, keep the KPI even if they are 0"

## Row-Level Removal

| Option | Description | Selected |
|--------|-------------|----------|
| Drop all-empty rows | Same rule as columns for rows | ✓ |
| Keep records, drop other all-empty rows | Maintenance records are core data | ✓ (combined) |

**User's choice:** "A . same thing to the column. if the entire row is empty or zero or null remove it."
**Notes:** Maintenance record rows are the exception — kept even if only a date is present (D-08 in CONTEXT.md).

## Financial Section at Zero

| Option | Description | Selected |
|--------|-------------|----------|
| Drop at zero | Cost Breakdown vanishes when every category is 0 | ✓ |
| Keep | Always render | |

**User's choice:** "B. yes drop it if there nothing to show"

## Placeholder Cells

| Option | Description | Selected |
|--------|-------------|----------|
| Keep "—" | Existing dash | |
| Use "no data" | English placeholder text | ✓ |

**User's choice:** "C. the place holder will be ' no data'"
**Notes:** New English UI string — must be added to the i18n allowlist or localized.

## Legacy + HTML Print Parity

| Option | Description | Selected |
|--------|-------------|----------|
| Same strictness everywhere | Same row/column/section rules in legacy + print view | ✓ |
| Sections-only in legacy | Lighter touch | |

**User's choice:** "D. yes the same strictness"

## Batch Export Cover

| Option | Description | Selected |
|--------|-------------|----------|
| Same rules | Batch cover follows same empty/zero drop behavior | ✓ |
| Always show | Cover summary always renders fully | |

**User's choice:** "E . yes"

---

## Claude's Discretion

None — all areas decided by the user.

## Deferred Ideas

None — discussion stayed within phase scope.
