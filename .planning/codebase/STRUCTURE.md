# STRUCTURE.md — Directory Layout & Organization

**Project:** ميدوز (Midoe)
**Last mapped:** 2026-07-30

---

## Top-Level Layout

```
local-CMR-main/
├── index.tsx                  ← React entry point
├── App.tsx                    ← Main admin shell (800+ lines)
├── index.html                 ← HTML template
├── index.css                  ← Global styles + Tailwind directives
├── output.css                 ← Compiled CSS output
├── supabaseClient.ts          ← Supabase client initialization
├── types.ts                   ← All TypeScript interfaces/types
├── constants.ts               ← Static data (parts, services, nav items)
├── vite.config.ts             ← Vite + PWA + test configuration
├── tailwind.config.js         ← Tailwind theme + custom colors
├── tsconfig.json              ← TypeScript configuration
├── postcss.config.js          ← PostCSS plugins
├── playwright.config.ts       ← E2E test configuration
├── package.json               ← Dependencies & scripts
├── bun.lock                   ← Bun lockfile
├── vercel.json                ← Vercel deployment config
├── netlify.toml               ← Netlify deployment config
├── vitest.setup.ts            ← Vitest setup
│
├── components/                ← Reusable UI components
├── src/                       ← View-level components + wizard
├── hooks/                     ← Custom React hooks
├── utils/                     ← Utility functions
├── tests/                     ← Unit & component tests
├── e2e/                       ← Playwright E2E tests
├── supabase/                  ← Supabase config + Edge Functions
├── public/                    ← Static assets (fonts, manifest)
├── styles/                    ← CSS animation files
├── scripts/                   ← Development scripts
├── packages/                  ← Monorepo packages
└── .planning/                 ← GSD planning artifacts
```

---

## `components/` — Reusable UI Components

| File | Purpose |
|------|---------|
| `AppRouter.tsx` | Auth gate & route dispatcher |
| `AdminLogin.tsx` | Admin login form |
| `TechnicianLogin.tsx` | Technician login form |
| `MaintenanceEditPage.tsx` | Branch selector + record list for editing |
| `MaintenanceRecordList.tsx` | Paginated, sortable record table |
| `MaintenanceRecordCard.tsx` | Full record editing card (600+ lines) |
| `MaintenanceRecordEditor.tsx` | Record editor wrapper |
| `MobileMaintenanceEditor.tsx` | Mobile-optimized record editor |
| `SplitPaneMaintenanceEditor.tsx` | Split-pane record editing |
| `HistoryPage.tsx` | Company list with search/filter |
| `HistoryViewer.tsx` | Activity history & version snapshots |
| `CollapsibleCard.tsx` | Expandable card container |
| `CollapsibleSection.tsx` | Accordion-like section |
| `ServiceSelector.tsx` | Multi-select service picker |
| `PartsSelector.tsx` | Multi-select parts picker |
| `CheckboxGroup.tsx` | Grouped checkboxes |
| `RadioGroup.tsx` | Radio button group |
| `TextInput.tsx` | Form input wrapper |
| `EmptyState.tsx` | Empty state placeholder |
| `BottomSheet.tsx` | Mobile bottom sheet |
| `ConfirmationModal.tsx` | Confirmation dialog |
| `CostBreakdownModal.tsx` | Cost summary modal |
| `ImportExportDialog.tsx` | Data import/export dialog |
| `QuickActionsMenu.tsx` | Floating action menu |
| `KeyboardShortcutsHelp.tsx` | Keyboard shortcut reference |
| `DebugPanel.tsx` | Dev-only debug panel |
| `CompanyEditModal.tsx` | Quick company edit modal |
| `UserAccessManagement.tsx` | Technician management |
| `TechnicianInvitations.tsx` | Invitation management |
| `EmergencyAdminRecovery.tsx` | Admin recovery UI |
| `InviteSignup.tsx` | Invitation redemption |
| `ResetPassword.tsx` | Password reset |
| `PrintableWorkOrder.tsx` | Print-friendly work order |
| `InternalReportPrintView.tsx` | Internal report print view |
| `MissingFieldsPanel.tsx` | Missing data indicator |
| `BatchEditModal.tsx` | Bulk edit modal |
| `TemplateSelector.tsx` | Maintenance template picker |
| `StepIndicator.tsx` | Step progress indicator |
| `ReviewStep.tsx` | Review step summary |
| `PayerSegmentedControl.tsx` | Payment toggle |
| `ThemeToggle.tsx` | Dark/light theme toggle |
| `Avatar.tsx` | User avatar |
| `Card.tsx` | Generic card wrapper |
| `NavigationButtons.tsx` | Prev/next navigation |
| `VisitZoneManager.tsx` | Visit zone configuration |
| `ContactPositionManager.tsx` | Contact position management |
| `BaristasPage.tsx` | Barista management page |
| `BaristaDetailsPage.tsx` | Barista detail page |

### Sub-directories

| Directory | Purpose |
|-----------|---------|
| `components/ui/` | Primitive UI: Button, ConfirmDialog, LoadingState, Skeleton, Stepper, SelectDrawer, Tech* |
| `components/form-ui/` | Form utilities: AutoSave, EnhancedInput, ErrorRecovery, FormProgress, HelpTooltip, OfflineBanner, RequiredFieldBadge, SafeModal, StarRating, ValidationSummary |
| `components/forms/hooks/` | Form hooks: useAutoSave, useFormValidation |
| `components/technician-portal/` | Technician-specific: CameraBottomSheet, CompactStarRating, FloatingCameraFAB, PhotoUpload, SectionContainer, Steps 1-3, TechnicianFooter, TechnicianPortal |

---

## `src/views/` — View-Level Components

| File | Matched Route |
|------|---------------|
| `HistoryView.tsx` | `/` — Company history list |
| `BaristasView.tsx` | `/baristas` — Barista performance |
| `BaristaDetailsView.tsx` | `/baristas/:name` — Single barista |
| `FormWizardView.tsx` | `/companies/new` — Form wizard |
| `SubmissionDetailsView.tsx` | `/companies/:id` — Company details |
| `MaintenanceEditView.tsx` | `/companies/:id/maintenance` — Edit records |
| `PrintView.tsx` | `/print` — Print center |
| `UserAccessView.tsx` | `/users` — User management |
| `Sidebar.tsx` | Sidebar navigation |

### `src/views/wizard/` — Wizard Steps

| File | Step |
|------|------|
| `Step1_CompanyInfo.tsx` | Company information |
| `Step2_Branches.tsx` | Branch configuration |
| `Step3_Warehouse.tsx` | Warehouse details |
| `Step4_Baristas.tsx` | My technicians |
| `Step4_5_ClientBaristas.tsx` | Client baristas |
| `Step5_MaintenanceHistory.tsx` | Maintenance records |
| `Step6_Review.tsx` | Final review |
| `WizardJumpContext.tsx` | Cross-step navigation context |
| `BranchCard.tsx` | Branch summary card |
| `BranchBaristaSection.tsx` | Branch barista management |
| `ContactsSection.tsx` | Contact management |
| `types.ts` | Wizard-specific types |

---

## `hooks/` — Custom React Hooks

| File | Purpose |
|------|---------|
| `useSubmissions.ts` | CRUD operations for company submissions |
| `useDrafts.ts` | Form draft auto-save/load/delete |
| `useTechnicians.ts` | Technician data + display name mapping |
| `useOfflineQueue.ts` | Offline operation queue |
| `useNetworkStatus.ts` | Online/offline detection |
| `useTheme.ts` | Dark/light theme toggle |
| `useFloatingMenu.ts` | Portal-based floating menu positioning |
| `useSectionJump.ts` | Section navigation within forms |
| `index.ts` | Barrel export |

---

## `utils/` — Utility Modules

| File | Purpose |
|------|---------|
| `sharedConstants.ts` | Shared constants (form steps, initial data) |
| `logger.ts` | Structured logging utility |
| `validation.ts` | Form validation logic |
| `i18n.ts` | Translation helper |
| `arabicTranslations.ts` | Arabic UI strings |
| `englishTranslations.ts` | English UI strings |
| `LanguageContext.tsx` | Language provider (ar/en toggle) |
| `sanitization.ts` | Input sanitization |
| `idGenerator.ts` | Unique ID generation |
| `mappers.ts` | Data transformation utilities |
| `importExport.ts` | JSON import/export |
| `pdfGenerator.ts` | PDF report generation |
| `pdfCompactLayout.ts` | Compact PDF layout |
| `pdfTheme.ts` | PDF styling/theme |
| `internalReportPdf.ts` | Internal report PDF |
| `missingDataPdf.ts` | Missing data report PDF |
| `costAggregation.ts` | Cost calculation/aggregation |
| `baristaAnalytics.ts` | Barista performance analytics |
| `maintenanceTemplates.ts` | Reusable maintenance templates |
| `problemSuggestions.ts` | AI-powered service/part suggestions |
| `googleSheetsSync.ts` | Google Sheets sync |
| `offlineQueue.ts` | Offline queue implementation |
| `offlineSupport.ts` | Offline capability detection |
| `historyManager.ts` | In-memory version history |
| `mockData.ts` | Mock data generator (dev) |
| `authRoles.ts` | Role-based access control |
| `rateLimiter.ts` | Client-side rate limiting |
| `visitZones.ts` | Visit zone configuration |
| `contactPositions.ts` | Contact position definitions |
| `phone.ts` | Phone number utilities |
| `imageCompression.ts` | Client-side image compression |
| `ariaAnnouncer.ts` | Screen reader announcements |

---

## `tests/` — Test Files

| File | Tests |
|------|-------|
| `App.lazy.test.tsx` | App lazy loading |
| `Button.test.tsx` | Button component |
| `Card.test.tsx` | Card component |
| `FormProgress.test.tsx` | Form progress |
| `FormWizardView.test.tsx` | Form wizard view |
| `KeyboardShortcutsHelp.test.tsx` | Keyboard shortcuts |
| `MaintenanceRecordEditor.test.tsx` | Record editor |
| `MobileMaintenanceEditor.test.tsx` | Mobile editor |
| `ModalAudit.test.tsx` | Modal components |
| `smoke.spec.ts` | Smoke tests |
| `ariaAnnouncer.test.ts` | Aria announcer |
| `draft_test.js` | Draft logic |
| `alias_merge_test.js` | Alias merge |
| `i18nAudit.test.ts` | i18n audit |
| `importExport.test.ts` | Import/export |
| `missingDataPdf.test.ts` | Missing data PDF |
| `mockData.test.ts` | Mock data |
| `problemSuggestions.test.ts` | Problem suggestions |
| `useSectionJump.test.ts` | Section jump hook |
| `utils.test.ts` | Utility functions |
| `hooks/useAutoSave.test.ts` | Auto-save hook |
| `hooks/useFormValidation.test.ts` | Form validation hook |
| `wizard/helpers.ts` | Wizard test helpers |
| `wizard/Step1-6*.test.tsx` | Individual wizard step tests |

---

## `supabase/` — Backend Configuration

| Path | Purpose |
|------|---------|
| `supabase/config.toml` | Project config (API, auth, DB, storage, functions) |
| `supabase/functions/invite-signup/index.ts` | Invitation signup edge function |
| `supabase/functions/admin-users/index.ts` | Admin user management |
| `supabase/functions/admin-recovery/index.ts` | Emergency admin recovery |
| `supabase/functions/sync-sheets/index.ts` | Google Sheets sync |

---

*Generated by GSD map-codebase — 2026-07-30*
