# Architecture

This document describes the architecture of the maintenance management system
(**ميدوز — نظام إدارة الصيانة**, a.k.a. "Mido's CMR"). It is a single-page
React application backed by Supabase, with bilingual (Arabic/English) RTL UI,
offline support, and rich PDF/Word reporting.

## Overview

```
index.html ── index.tsx ── AppRouter.tsx ── App.tsx (admin shell)
                        └─────────────── TechnicianPortal (technician flow)
```

- **Entry:** `index.tsx` mounts the React root and wires the global providers:
  `ErrorBoundary`, `ToastProvider`, `UndoQueueProvider`, `BrowserRouter`
  (with `v7_startTransition` + `v7_relativeSplatPath`), and `LanguageProvider`.
- **Routing/auth gating:** `components/AppRouter.tsx` evaluates the current
  path before rendering and gates access per role. Route priority order:
  1. `/reset-password` — public, renders `ResetPassword`
  2. `/admin/recovery/:key` — public, renders `EmergencyAdminRecovery`
  3. `/admin/invite` and `/technician/invite` — public, render `InviteSignup`
  4. `/technician/*` — technician auth, renders `TechnicianPortal`
  5. Everything else — admin auth, renders `App`
- **Admin shell:** `App.tsx` renders the sidebar navigation, lazy-loaded views
  (via `React.lazy` + `Suspense`), and shared chrome (offline banner, theme
  toggle, keyboard shortcuts).

## Directory layout

| Path | Purpose |
|---|---|
| `src/views/` | Route-level views (lazy-loaded in `App.tsx`): `HistoryView`, `BaristasView`, `FormWizardView`, `PrintView`, `SubmissionDetailsView`, `BaristaDetailsView`, `MaintenanceEditView`, `UserAccessView`, `GlobalRecordsView`, `SettingsView`, `LogisticsTimelineView`, `Sidebar` |
| `src/views/wizard/` | The multi-step company form (`Step1_CompanyInfo` … `Step6_Review`, `BranchCard`, `ContactsSection`, `BranchBaristaSection`, `MachineTypeField`) |
| `components/` | Reusable UI and feature components: editors (`SplitPaneMaintenanceEditor`, `MobileMaintenanceEditor`, `MaintenanceRecordEditor`), report views (`InternalReportPrintView`, `PrintableWorkOrder`, `LogisticsWorkOrder`, `SubmissionDetails`), modals (`BulkExportModal`, `CostBreakdownModal`, `CompanyEditModal`), auth (`AdminLogin`, `InviteSignup`, `TechnicianLogin`) |
| `components/form-ui/` | Form primitives: `EnhancedInput`, `CheckboxGroup`, `StarRating`, `SelectorSelectedChips`, `ValidationSummary`, `SafeModal`, `OfflineBanner`, `PortalSelect` |
| `components/technician-portal/` | Technician app screens: `Step1_Context`, `Step2_WorkLog`, `Step3_Summary`, `PhotoUpload`, `CameraBottomSheet`, `TechnicianFooter` |
| `hooks/` | Shared hooks, barrel-exported from `hooks/index.ts`: `useTheme`, `useNetworkStatus`, `useDrafts`, `useTechnicians`, `useSubmissions`, `useOfflineQueue`, `useLogisticsOperations`, `useFloatingMenu`, `useSearchRefocus`, `useSectionJump`, `useCustomCatalog` |
| `utils/` | Domain logic and integrations (see below) |
| `types.ts` | Shared TypeScript domain model (`FormData`, `Branch`, `MaintenanceRecord`, `LogisticsOperation`, `InvitationRecord`, …) |
| `constants.ts` | Navigation items (`NAV_ITEMS`), `ViewKey`, sidebar icon names |

## Data flow

1. **Company data** is authored in the wizard (`src/views/wizard/`) and stored
   as a `FormData` object (`types.ts`).
2. **Persistence** goes through Supabase (`supabaseClient.ts`) — a client
   wrapper that adds a 30-second timeout, request logging (`utils/logger.ts`),
   and error-body capture.
3. **Offline**: `hooks/useOfflineQueue` + `utils/offlineQueue` queue mutations
   when the network drops (`hooks/useNetworkStatus`), and `useDrafts` keeps
   work-in-progress forms in local storage.
4. **Submissions**: technician portal submissions are stored as
   `PortalSubmission` records and merged into the company/branch history via
   `utils/mappers.ts`.

## Reports (PDF & Word)

Report generation is a major subsystem with several generators:

- **New-style jsPDF reports:** `utils/internalReportPdf.ts` uses
  `utils/pdfCompactLayout.ts` (a buffered `PDFLayoutEngine` with empty-state
  suppression — empty fields/rows/sections drop off and content reflows).
- **Legacy PDF:** `utils/pdfGenerator.ts` (older layout, still used for some
  surfaces).
- **Missing-data form:** `utils/missingDataPdf.ts` (interactive AcroForm).
- **Word export:** `utils/wordExport.ts` + `utils/wordExportLabels.ts` +
  `utils/wordExportTemplate.ts` (`docx` library, lazy-loaded, configurable
  template in Settings).
- **Print views:** `components/InternalReportPrintView.tsx` and
  `components/PrintableWorkOrder.tsx` render browser-print HTML reports.
- Shared theme/colors live in `utils/pdfTheme.ts`.

## Internationalization

- `utils/LanguageContext.tsx` provides `useLanguage()` (en/ar).
- Translation dictionaries: `utils/englishTranslations.ts`,
  `utils/arabicTranslations.ts`.
- RTL/Arabic text shaping: `utils/arabicText.ts` (uses `bidi-js` — note the
  CJS alias in `vite.config.ts` workaround) and `utils/arabicTranslations.ts`.
- An i18n audit (`scripts/checkI18n.ts`, `tests/i18nAudit.test.ts`) runs as a
  pre-commit hook via `simple-git-hooks` (`npm run i18n:check -- --staged`).

## Authentication & roles

- **Auth:** Supabase Auth sessions managed in `AppRouter.tsx`.
- **Roles:** `utils/authRoles.ts` (`hasAdminRole`, `checkAdminFallback`).
- **Technicians:** `components/TechnicianAuthContext.tsx`,
  `components/technician-portal/`.
- **Invitations:** `utils/inviteManager.ts`, `components/InviteSignup.tsx`,
  `components/TechnicianInvitations.tsx`; invite validation/redemption uses
  Supabase Edge Functions.
- **Emergency admin recovery:** `components/EmergencyAdminRecovery.tsx`.

## Logistics

Machine logistics (pickup/deliver/replacement) is modeled by
`LogisticsOperation` (`types.ts`) with domain logic in
`hooks/useLogisticsOperations.ts`, `utils/logisticsLabels.ts`,
`utils/costAggregation.ts`, and UI in `components/MachineLogisticsSection.tsx`,
`components/LogisticsReportSection.tsx`, `src/views/LogisticsTimelineView.tsx`.

## PWA

`vite-plugin-pwa` (configured in `vite.config.ts`) registers a service worker
(`registerType: 'autoUpdate'`) with runtime caching for Supabase API calls and
Google Fonts. Manifest data is RTL Arabic (`lang: 'ar'`, `dir: 'rtl'`).
Public assets: `public/manifest.webmanifest`, `public/logo.png`,
`public/logo.svg`.

## Testing

- **Unit/component tests:** Vitest with jsdom
  (`npm test` → `vitest run`; files in `tests/**/*.test.{ts,tsx}`, setup in
  `vitest.setup.ts`, jsdom environment configured in `vite.config.ts`).
- **E2E:** Playwright (`npm run test:e2e`; specs in `e2e/`, Chromium only,
  dev server on port 3000).
