---
phase: 3
slug: auto-remove-empty-rows-columns-sections-and-empty-states-fro
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-01
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | vite.config.ts |
| **Quick run command** | `npx vitest run tests/internalReportPdf.test.ts tests/BulkExportModal.test.tsx --reporter=dot` |
| **Full suite command** | `npx vitest run --reporter=dot` |
| **Estimated runtime** | ~20-45 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/internalReportPdf.test.ts tests/BulkExportModal.test.tsx --reporter=dot`
- **After every plan wave:** Run `npx vitest run --reporter=dot`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** ~45 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | D-04 | — | Empty sections vanish; no "No X" message | unit | `npx vitest run tests/internalReportPdf.test.ts` | ✅ | ⬜ pending |
| 03-01-02 | 01 | 1 | D-07/D-08 | — | Empty derived rows drop; maintenance records kept | unit | new tests in `tests/internalReportPdf.test.ts` | ❌ W0 | ⬜ pending |
| 03-01-03 | 01 | 1 | D-09 | — | Cost Breakdown drops when all categories 0 | unit | new tests in `tests/internalReportPdf.test.ts` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | D-11/D-07 | — | Legacy autoTables filter empty rows/columns | unit | new `tests/pdfGeneratorEmpty.test.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | D-11/D-10 | — | Print view same strictness; "no data" in surviving cells | unit + i18n | `npx vitest run tests/i18nAudit.test.ts` + print-view test | ❌ W0 | ⬜ pending |
| 03-03-02 | 03 | 2 | D-05 | — | Missing-data flow keeps placeholders (regression) | unit | `npx vitest run tests/missingDataPdf.test.ts` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Extend `tests/internalReportPdf.test.ts` — row-drop / financial-zero / "no data" cases
- [ ] Create `tests/pdfGeneratorEmpty.test.ts` — legacy empty filtering cases
- [ ] Print-view test coverage (may extend `tests/internalReportPdf.test.ts` or a new `tests/printViewEmpty.test.tsx`)
- [ ] Add "no data" (and any new labels) to `tests/i18n-allowlist.json`

*Existing vitest infra covers the framework — no install needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual layout after column drop (widths rebalance) | D-11 | jsPDF rendering is pixel-based | Generate a PDF with a fully-empty column; confirm no overflow warnings and the table fills the width |
| "no data" cell appearance in the print view | D-10 | HTML/CSS rendering | Open InternalReportPrintView with a record missing a field; confirm "no data" renders |
