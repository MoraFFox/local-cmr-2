# Testing

This project has two test layers: **Vitest** unit/component tests (jsdom) and
**Playwright** end-to-end tests (Chromium).

## Unit & component tests (Vitest)

```bash
npm test           # = vitest run
npm run test:watch # = vitest (watch mode)
```

- **Location:** `tests/**/*.test.{ts,tsx}` (plus a `tests/wizard/` subfolder).
  Spec-style files (`tests/**/*.spec.ts`) and `e2e/` are excluded from Vitest.
- **Environment:** jsdom, configured in `vite.config.ts`
  (`environment: 'jsdom'`, `setupFiles: ['./vitest.setup.ts']`, `globals:
  true`).
- **Tooling:** Vitest + `@testing-library/react`, `@testing-library/jest-dom`
  (matchers are registered in `vitest.setup.ts`). Shared helpers live in
  `tests/testUtils.tsx`.

> ⚠️ Use the project's configured runner (`npm test` → `vitest run`), not
> `bun test`. Bun's native runner does not provide jsdom, so tests that touch
> `window`/`localStorage` fail there.

### Test suites worth knowing

| Area | Files |
|---|---|
| Report PDFs | `internalReportPdf.test.ts`, `pdfGeneratorEmpty.test.ts`, `missingDataPdf.test.ts`, `printViewEmpty.test.tsx`, `internalReportPdf.test.ts` (empty-state suppression) |
| Word export | `wordExport.test.ts`, `wordExportTemplate.test.ts` |
| i18n | `i18nAudit.test.ts` (allowlist/translation coverage), `arabicText.test.ts` |
| Wizard / editors | `FormWizardView.test.tsx`, `MaintenanceRecordEditor.test.tsx`, `MobileMaintenanceEditor.test.tsx`, `SplitPaneMaintenanceEditor`-adjacent suites |
| Logistics | `LogisticsReportSection.test.tsx`, `MachineLogisticsSection.test.tsx`, `logisticsLabels.test.ts`, `dateRangeFilter.test.ts` |
| Modals / UI | `BulkExportModal.test.tsx`, `ModalAudit.test.tsx`, `Sidebar.test.tsx`, `Button.test.tsx`, `Card.test.tsx`, `TextInput.test.tsx` |
| Utils | `utils.test.ts`, `draft_test.js`, `mockData.test.ts`, `importExport.test.ts`, `useSectionJump.test.ts` |

## End-to-end tests (Playwright)

```bash
npm run test:e2e     # playwright test
npm run test:e2e:ui  # playwright test --ui (interactive UI)
```

- **Location:** `e2e/` — `auth.spec.ts`, `routing.spec.ts`, `wizard.spec.ts`,
  `drafts.spec.ts`, `draft-load.spec.ts`, `problemSuggestions.spec.ts`.
  (A smoke spec also lives at `tests/smoke.spec.ts`, excluded from the Vitest
  run by the `tests/**/*.spec.ts` ignore rule.)
- **Config:** `playwright.config.ts` — Chromium (Desktop Chrome) only,
  `baseURL: http://localhost:3000`, and a `webServer` that runs `npm run dev`
  on port 3000 (reuses an existing server when one is already running).
- **CI behavior:** `retries: 2`, `workers: 1`, `forbidOnly: true` when
  `CI` is set. Traces are recorded on first retry.

> The E2E suites assume a running dev server with the Supabase env vars
> configured (see `docs/GETTING-STARTED.md`).

## i18n checks

- `npm run i18n:check` — audits for untracked English strings in UI code
  (also enforced by the pre-commit hook: `npm run i18n:check -- --staged`).
- `npm run i18n:allowlist` — regenerates `tests/i18n-allowlist.json` for
  intentionally-exempt strings. Add a string to the allowlist only when it
  genuinely must remain in English.
