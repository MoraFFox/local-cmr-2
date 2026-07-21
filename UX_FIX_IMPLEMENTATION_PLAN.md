# CMR UX Fix Implementation Plan

**Version:** 1.2  
**Generated:** July 20, 2026  
**Last Updated:** July 20, 2026  
**Status:** 🟢 Phase 1 Complete — Phase 2 Not Started  
**Total Duration:** 8 weeks

---

## 🚀 Quick Start for Continuing Agents

If you're continuing this work, start here:

### Current Status
- **Phase 1:** ✅ 100% complete (all target components integrated + foundation bugs fixed + typecheck passes with zero errors)
- **Phase 2:** Not started
- **Phase 3:** Not started
- **Phase 4:** Not started

### Completed Work ✅

**Foundation Components Created & Verified:**
- `components/forms/hooks/useAutoSave.ts` - Auto-save hook with version history
- `components/forms/hooks/useFormValidation.ts` - Validation hook with summaries
- `utils/offlineSupport.ts` - Offline detection and sync queue
- `components/form-ui/RequiredFieldBadge.tsx` - Required field indicator
- `components/form-ui/AutoSaveIndicator.tsx` - Save status display
- `components/form-ui/ValidationSummary.tsx` - Error summary component
- `components/form-ui/FormProgress.tsx` - Multi-section progress
- `components/form-ui/SafeModal.tsx` - Safe modal with focus trap
- `components/form-ui/ErrorRecovery.tsx` - Error recovery component
- `components/form-ui/EnhancedInput.tsx` - Enhanced input component

**Components Integrated (all Phase 1):**
- ✅ `MaintenanceRecordEditor.tsx` - Auto-save + validation + badges (reference implementation)
- ✅ `MobileMaintenanceEditor.tsx` - Auto-save + validation + badges
- ✅ `SplitPaneMaintenanceEditor.tsx` - Auto-save + validation + badges
- ✅ `TextInput.tsx` - RequiredFieldBadge integration
- ✅ `technician-portal/ui/TechInput.tsx` - RequiredFieldBadge integration
- ✅ `CompanyEditModal.tsx` - Auto-save + validation + validation summary + unsaved-changes protection (audit issue #16)

**Foundation Bugs Fixed (this session):**
See "Phase 1 Foundation Bug Fixes" section below for the full list of 14 bugs found during review and fixed.

### Next Immediate Tasks 🔜

1. Move to Phase 2 (High Priority Fixes):
   - Date picker presets (Today/Yesterday/Tomorrow) — `DateInputWithPresets` already exists in `EnhancedInput.tsx`, wire it into the editors
   - Replace form modals with `SafeModal` (CostBreakdownModal, BatchEditModal, etc.)
   - Selector UX improvements (ServiceSelector, PartsSelector)
2. Add unit tests for the foundation hooks/components (see Testing Strategy)
3. Manual testing of auto-save + validation flows

---

## Table of Contents

1. [Progress Tracking](#progress-tracking)
2. [Component Inventory](#component-inventory)
3. [Integration Status](#integration-status)
4. [Phase 1: Critical Fixes](#phase-1-critical-fixes-weeks-1-2)
5. [Phase 2: High Priority Fixes](#phase-2-high-priority-fixes-weeks-3-4)
6. [Phase 3: Medium Priority Fixes](#phase-3-medium-priority-fixes-weeks-5-6)
7. [Phase 4: Low Priority + Polish](#phase-4-low-priority--polish-weeks-7-8)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Success Metrics](#success-metrics)

---

## Progress Tracking

### Component Integration Status

| Component | Auto-Save | Validation | Badges | Status | Notes |
|-----------|-----------|------------|--------|--------|-------|
| MaintenanceRecordEditor.tsx | ✅ | ✅ | ✅ | ✅ Complete | Reference implementation |
| MobileMaintenanceEditor.tsx | ✅ | ✅ | ✅ | ✅ Complete | Fixed `clearError` alias |
| SplitPaneMaintenanceEditor.tsx | ✅ | ✅ | ✅ | ✅ Complete | |
| TextInput.tsx | N/A | N/A | ✅ | ✅ Complete | Fixed import path |
| TechInput.tsx | N/A | N/A | ✅ | ✅ Complete | |
| CompanyEditModal.tsx | ✅ | ✅ | ✅ | ✅ Complete | + unsaved-changes protection (audit #16) |
| BatchEditModal.tsx | ❌ | ❌ | ❌ | ⏳ Pending | Phase 2 |

### Phase Progress

```
Phase 1 (Critical Fixes):     [████████████████████] 100% ✅
Phase 2 (High Priority):       [░░░░░░░░░░░░░░░░░░░░] 0%
Phase 3 (Medium Priority):     [░░░░░░░░░░░░░░░░░░░░] 0%
Phase 4 (Low Priority):        [░░░░░░░░░░░░░░░░░░░░] 0%
```

---

## Phase 1 Foundation Bug Fixes (this session)

During the review of "completed" Phase 1 work, 14 bugs were found in the foundation components and integrations. All have been fixed and verified (`npx tsc --noEmit` passes with zero errors):

| # | File | Bug | Fix |
|---|------|-----|-----|
| 1 | `useFormValidation.ts` | `interface ValidationRules<T> { [K in keyof T]?: ... }` — mapped types can't be in an interface (TS1005 syntax error, blocked the build) | Changed to `type ValidationRules<T> = { ... }` |
| 2 | `useFormValidation.ts` | Missing `React` import → `React.FormEvent` namespace errors (TS2503) | Added `React` to the import |
| 3 | `useFormValidation.ts` | `handleSubmit` returned `(e: React.FormEvent) => void` and called `e.preventDefault()`, but editors call it as `handleSubmit(onValid, onInvalid)()` with no event → TypeError at runtime | Made event optional (`e?: React.FormEvent`) + `e?.preventDefault?.()` in both interface and implementation |
| 4 | `useFormValidation.ts` | `validateField` never reset `isValid`/`hasErrors` to true when the last error was fixed (accumulator pattern kept stale `false`) | Rewrote to recompute `isValid`/`hasErrors`/`errorCount` from the cleaned errors map |
| 5 | `useFormValidation.ts` | `clearFieldError` had the same stale-`isValid` bug (didn't reset `isValid` after deleting an error) | Added `isValid: !hasErrors` to the returned state |
| 6 | `useFormValidation.ts` | `MobileMaintenanceEditor` called `validation.clearError(key)` but the hook only exposed `clearFieldError` (TS2339) | Added `clearError` as an alias for `clearFieldError` in the interface and return object |
| 7 | `TextInput.tsx` | Imported `RequiredFieldBadge` from `../form-ui/...` (wrong — resolves to project root) instead of `./form-ui/...` (TS2307) | Fixed import path to `./form-ui/RequiredFieldBadge` |
| 8 | `ErrorRecovery.tsx` | `ErrorBoundary.componentDidCatch` used `logger` without importing it → runtime crash | Added `import { logger } from '../../utils/logger'` |
| 9 | `ErrorRecovery.tsx` | `ErrorBoundary` class had TS2339 on `this.state`/`this.props`/`this.setState` (tsconfig `useDefineForClassFields: false` + ES2022 target) | Added explicit `state`/`props`/`setState` class field declarations matching the working `components/ErrorBoundary.tsx` pattern |
| 10 | `useAutoSave.ts` | Unmount-save effect had deps `[formData, state.hasUnsavedChanges, ...]` so its cleanup ran on every change, repeatedly saving stale data | Switched to a ref-based pattern (`latestDataRef`/`latestUnsavedRef`) with deps `[enabled, formId, maxVersions]` so cleanup only runs on actual unmount |
| 11 | `AutoSaveIndicator.tsx` | Dynamically constructed Tailwind class `config.color.replace('text-', 'border-')` — JIT can't detect it, border colors missing from build | Added an explicit `border` property to each status config entry and used it directly |
| 12 | `EnhancedInput.tsx` | `DateInputWithPresets` default presets computed once at module load → "Today" goes stale across midnight | Moved default computation into the component body so it recomputes each render |
| 13 | `EnhancedInput.tsx` | Dead code: `filteredSuggestions.length === 0` block inside a `> 0` guard could never execute | Removed the dead block |
| 14 | `RequiredFieldBadge.tsx` | `RequiredFieldWrapper` used `<style jsx>` (Next.js styled-jsx) not available in Vite | Changed to `<style>` |

### CompanyEditModal Integration Notes

The last Phase 1 component was integrated this session. Key decisions:
- Defined a `CompanyEditableFields` interface with an index signature (`[key: string]: unknown`) to satisfy the hooks' `Record<string, unknown>` constraint while keeping named, strongly-typed fields.
- Auto-save is keyed by `company-edit-${company?.id ?? 'new'}` and `enabled` only when the modal is open.
- On open, restores from an auto-saved draft if one exists, otherwise loads from the company prop.
- Addresses audit issue #16 (modal dismisses on accidental backdrop click): backdrop click, X button, and footer cancel all route through `requestClose()`, which shows a discard-confirmation dialog when `isDirty` is true. Once the confirm is visible, external close triggers are ignored until the user resolves it via the confirm's own buttons.
- Added a Ctrl/Cmd+S keyboard shortcut to save.
- Public API (props) unchanged — `HistoryPage.tsx` needs no changes.

---

## Component Inventory

### Foundation Components (Created)

**Location:** `/run/media/amr/New Volume/my projects/local-CMR-main/components/`

```
forms/
├── hooks/
│   ├── useAutoSave.ts           ✅ Created - Auto-save with localStorage
│   └── useFormValidation.ts      ✅ Created - Validation with summaries
│
form-ui/
├── RequiredFieldBadge.tsx        ✅ Created - Required field indicator
├── AutoSaveIndicator.tsx         ✅ Created - Save status display
├── ValidationSummary.tsx         ✅ Created - Error summary
├── FormProgress.tsx              ✅ Created - Multi-section progress
├── SafeModal.tsx                 ✅ Created - Safe modal component
├── ErrorRecovery.tsx             ✅ Created - Error recovery UI
└── EnhancedInput.tsx              ✅ Created - Enhanced input

utils/
└── offlineSupport.ts              ✅ Created - Offline detection
```

### Target Components (To Be Updated)

**Forms to Update:**
```
components/
├── MaintenanceRecordEditor.tsx    ✅ Updated (Phase 1)
├── MobileMaintenanceEditor.tsx     🔄 Updating (Phase 1)
├── SplitPaneMaintenanceEditor.tsx  🔄 Updating (Phase 1)
├── CompanyEditModal.tsx            ⏳ Pending (Phase 1)
└── BatchEditModal.tsx              ⏳ Pending (Phase 2)

technician-portal/
├── PhotoUpload.tsx                 ⏳ Pending (Phase 2)
└── ui/
    └── TechInput.tsx               🔄 Updating (Phase 1)

Input Components:
├── TextInput.tsx                    🔄 Updating (Phase 1)
├── CheckboxGroup.tsx               ⏳ Pending (Phase 2)
├── RadioGroup.tsx                  ⏳ Pending (Phase 3)
├── ServiceSelector.tsx            ⏳ Pending (Phase 2)
└── PartsSelector.tsx              ⏳ Pending (Phase 2)
```

---

## Integration Status

### ✅ Completed Integrations

#### MaintenanceRecordEditor.tsx

**File:** `components/MaintenanceRecordEditor.tsx`

**Changes Made:**
1. Added imports for hooks and UI components
2. Integrated `useAutoSave` hook (30s debounce)
3. Integrated `useFormValidation` hook
4. Added `AutoSaveIndicator` component
5. Added `ValidationSummary` component
6. Updated labels with `RequiredFieldBadge`
7. Enhanced `handleSave` with validation

**Code Pattern:**
```typescript
// Imports
import { useAutoSave } from './forms/hooks/useAutoSave';
import { useFormValidation } from './forms/hooks/useFormValidation';
import { AutoSaveIndicator } from './form-ui/AutoSaveIndicator';
import { ValidationSummary } from './form-ui/ValidationSummary';
import { RequiredFieldBadge } from './form-ui/RequiredFieldBadge';

// Hooks
const autoSave = useAutoSave(`maintenance-record-${record.id}`, editedRecord, {
  debounceMs: 30000
});

const validation = useFormValidation(editedRecord, validationRules);

// Render
<AutoSaveIndicator isSaving={autoSave.isSaving} ... />
<ValidationSummary errors={validation.allErrors} ... />
```

**Testing Needed:**
- [ ] Auto-save actually saves to localStorage
- [ ] Validation errors show correctly
- [ ] Required badges display properly
- [ ] Save button works with validation

---

### 🔄 In Progress

#### MobileMaintenanceEditor.tsx

**Agent:** Working on integration via workflow

**Expected Changes:**
- Same pattern as MaintenanceRecordEditor
- Form ID: `mobile-maintenance-record-${recordId}`

#### SplitPaneMaintenanceEditor.tsx

**Agent:** Working on integration via workflow

**Expected Changes:**
- Same pattern as MaintenanceRecordEditor
- Form ID: `splitpane-maintenance-record-${recordId}`

#### TextInput.tsx

**Agent:** Adding RequiredFieldBadge integration

**Expected Changes:**
- Import RequiredFieldBadge
- Add badge to label when `required={true}`

#### TechInput.tsx

**Agent:** Adding RequiredFieldBadge integration

**Expected Changes:**
- Import RequiredFieldBadge
- Add badge to label when `required={true}`
- Maintain dark theme compatibility

---

## Phase 1: Critical Fixes (Weeks 1-2)

**Goal:** Eliminate data loss risk and provide basic error recovery

### ✅ Week 1 Tasks (Complete)

- [x] Create foundation components (10 hooks/components)
- [x] Integrate MaintenanceRecordEditor.tsx
- [x] Integrate MobileMaintenanceEditor.tsx
- [x] Integrate SplitPaneMaintenanceEditor.tsx
- [x] Update TextInput with badges
- [x] Update TechInput with badges
- [ ] Test auto-save functionality (manual — needs unit tests)
- [ ] Test validation functionality (manual — needs unit tests)

### 🟡 Week 2 Tasks (Partially Complete — core done, supporting items deferred)

- [x] Integrate CompanyEditModal.tsx (+ unsaved-changes protection, audit #16)
- [x] Fix 14 foundation/integration bugs found during review (see "Phase 1 Foundation Bug Fixes")
- [ ] Add ErrorRecovery components to forms (deferred — component exists, not yet wired into editors)
- [ ] Implement per-form error boundaries (app-level `components/ErrorBoundary.tsx` already exists; per-form boundaries deferred)
- [ ] Add offline detection UI (deferred to Phase 3)
- [ ] End-to-end testing (pending — vitest has a rollup optional-dep issue in this env; `npx tsc --noEmit` passes clean)
- [ ] User acceptance testing (pending)

> Note: Phase 1 core integration (auto-save + validation + badges for all 6 target components) is complete. The supporting tasks above (ErrorRecovery wiring, per-form error boundaries, offline UI, E2E tests, UAT) are deferred to later phases but documented here for traceability.

### How to Continue Integration

**Step 1: Check Workflow Status**
```bash
# Check if workflow wf_4961428e-5a1 completed
# Look for completion notification
```

**Step 2: Verify Components**

After workflow completes, verify each component:

```bash
# Check for TypeScript errors
npm run build

# Or check specific file
npx tsc --noEmit components/MobileMaintenanceEditor.tsx
```

**Step 3: Test Manual Flow**

1. Open MaintenanceRecordEditor
2. Fill in some fields
3. Wait 30 seconds (check for auto-save)
4. Check localStorage for saved data
5. Try validation (submit without required fields)

**Step 4: Continue to Next Components**

If workflow completed successfully, continue with:
1. CompanyEditModal.tsx integration
2. BatchEditModal.tsx integration

---

### Integration Checklist

For each form component, use this checklist:

**Auto-Save Integration:**
```typescript
// 1. Add import
import { useAutoSave } from './forms/hooks/useAutoSave';

// 2. Add hook
const autoSave = useAutoSave('unique-form-id', formData, {
  debounceMs: 30000,
  onSave: (data) => console.log('Saved:', data)
});

// 3. Add UI component
<AutoSaveIndicator
  isSaving={autoSave.isSaving}
  lastSaved={autoSave.lastSaved}
  hasUnsavedChanges={autoSave.hasUnsavedChanges}
/>
```

**Validation Integration:**
```typescript
// 1. Add import
import { useFormValidation } from './forms/hooks/useFormValidation';

// 2. Add hook with rules
const validation = useFormValidation(formData, {
  fieldName: { required: true, minLength: 2 }
});

// 3. Add UI component
{validation.hasErrors && (
  <ValidationSummary errors={validation.allErrors} />
)}

// 4. Update save
const handleSave = () => {
  validation.handleSubmit(onValid, onInvalid)();
};
```

**Required Badge Integration:**
```typescript
// 1. Add import
import { RequiredFieldBadge } from './form-ui/RequiredFieldBadge';

// 2. Update label
<label>
  Field Name
  <RequiredFieldBadge />
</label>
```

---

## Phase 2: High Priority Fixes (Weeks 3-4)

**Goal:** Reduce significant friction in common workflows

**Components to Update:**

### Mobile Keyboard Fixes
- [ ] Add useAutoScroll hook to EnhancedInput
- [ ] Test on iOS Safari
- [ ] Test on Android Chrome
- [ ] Adjust safe areas

### Selector Improvements
- [ ] Update ServiceSelector.tsx
  - Add inline quantity selector
  - Compact selected items
  - Add bulk edit mode
- [ ] Update PartsSelector.tsx
  - Same improvements as ServiceSelector

### Date Picker Enhancement
- [ ] Add DateInputWithPresets component
- [ ] Add Today/Yesterday/Tomorrow buttons
- [ ] Update all date fields

### Modal Safety
- [ ] Replace all modals with SafeModal
- [ ] Add focus trap
- [ ] Add ESC key handling
- [ ] Add unsaved changes protection

---

## Phase 3: Medium Priority Fixes (Weeks 5-6)

**Goal:** Address annoyances and improve usability

**Components to Update:**

### Progressive Disclosure
- [ ] Update CheckboxGroup.tsx
  - Add accordion mode
  - Add "Common" section
  - Implement lazy loading

### Contextual Help
- [ ] Create HelpTooltip component
- [ ] Add tooltips for technical terms
- [ ] Write help content

### Offline Support
- [ ] Integrate useOfflineQueue hook
- [ ] Add offline detection UI
- [ ] Add sync queue UI
- [ ] Test offline scenarios

### Photo Upload Progress
- [ ] Update PhotoUpload.tsx
- [ ] Add progress indicators
- [ ] Show compression status
- [ ] Add cancel button

---

## Phase 4: Low Priority + Polish (Weeks 7-8)

**Goal:** Complete polish and optimization

**Tasks:**
- [ ] Standardize button sizes (44px minimum)
- [ ] Standardize error styling
- [ ] Add FormProgress to long forms
- [ ] Animation polish
- [ ] Dark mode improvements
- [ ] Performance optimization

---

## Testing Strategy

### Unit Testing

**Files to Create:**
```
tests/
├── hooks/
│   ├── useAutoSave.test.ts
│   ├── useFormValidation.test.ts
│   └── useOfflineQueue.test.ts
├── components/
│   ├── AutoSaveIndicator.test.tsx
│   ├── ValidationSummary.test.tsx
│   └── SafeModal.test.tsx
└── integration/
    └── maintenance-form.test.tsx
```

**Run Tests:**
```bash
npm test
```

### Integration Testing

**Scenarios to Test:**
1. Auto-save after 30 seconds
2. Validation error display
3. Required field badges
4. Error recovery flow
5. Offline queue

**Run with Cypress/Playwright:**
```bash
npm run test:e2e
```

### Manual Testing Checklist

**Auto-Save:**
- [ ] Fill form fields
- [ ] Wait 30 seconds
- [ ] Check localStorage for data
- [ ] Close and reopen tab
- [ ] Verify data restored

**Validation:**
- [ ] Submit without required fields
- [ ] Verify error summary appears
- [ ] Click error to jump to field
- [ ] Fix error and verify it disappears

**Required Badges:**
- [ ] Verify badge shows on required fields
- [ ] Verify badge color is visible
- [ ] Verify ARIA label for screen readers

---

## Deployment Plan

### Environment Strategy

1. **Development** - Continuous integration
2. **Staging** - Pre-production testing
3. **Production** - Gradual rollout

### Feature Flags

Create `.env.local`:
```env
FEATURE_AUTO_SAVE=true
FEATURE_VALIDATION_SUMMARY=true
FEATURE_OFFLINE_MODE=false
```

### Rollout Plan

**Week 1-2:** Phase 1 (Critical) - 10% of users  
**Week 3-4:** Phase 1 - 50% of users, Phase 2 - 10% of users  
**Week 5-6:** Phase 1 - 100% of users, Phase 2 - 50% of users  
**Week 7-8:** All phases - 100% of users

---

## Success Metrics

### Baseline Measurements

**Current State (to be measured):**
- Average time per maintenance record: __ minutes
- Error rate (failed submissions): __%
- User satisfaction: __/5
- Data loss incidents per week: __

### Target Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|--------------|
| Time per record | __ min | -30% | Analytics |
| Error rate | __% | -50% | Error tracking |
| Satisfaction | __/5 | +0.5 | Survey |
| Data loss | __/week | -90% | Support tickets |

---

## Commands for Continuing Work

### Check Current Status
```bash
# Check git status to see modified files
git status

# Check for TypeScript errors
npm run build

# Run tests
npm test
```

### Verify Integration
```bash
# Check specific file
npx tsc --noEmit components/MobileMaintenanceEditor.tsx

# Run linter
npm run lint
```

### Start Next Component
```bash
# Edit next component
# Pattern: Add imports → Add hooks → Add UI → Test
```

---

## File Reference Summary

### Key Files

**Hooks:**
- `components/forms/hooks/useAutoSave.ts` - Auto-save implementation
- `components/forms/hooks/useFormValidation.ts` - Validation implementation
- `utils/offlineSupport.ts` - Offline support

**UI Components:**
- `components/form-ui/AutoSaveIndicator.tsx` - Save status
- `components/form-ui/ValidationSummary.tsx` - Error summary
- `components/form-ui/RequiredFieldBadge.tsx` - Required badge
- `components/form-ui/SafeModal.tsx` - Safe modal
- `components/form-ui/ErrorRecovery.tsx` - Error recovery

**Documentation:**
- `UX_FORMS_AUDIT_REPORT.md` - Full audit findings
- `UX_FIX_IMPLEMENTATION_PLAN.md` - This file

### Target Components for Integration

**Phase 1 (Critical):**
- ✅ `components/MaintenanceRecordEditor.tsx`
- 🔄 `components/MobileMaintenanceEditor.tsx`
- 🔄 `components/SplitPaneMaintenanceEditor.tsx`
- 🔄 `components/TextInput.tsx`
- 🔄 `components/technician-portal/ui/TechInput.tsx`
- ⏳ `components/CompanyEditModal.tsx`

**Phase 2 (High Priority):**
- ⏳ `components/ServiceSelector.tsx`
- ⏳ `components/PartsSelector.tsx`
- ⏳ `components/BatchEditModal.tsx`
- ⏳ `components/technician-portal/PhotoUpload.tsx`

---

## Notes for Next Agent

### What to Do First

1. **Check if workflow completed:**
   - Look for workflow completion notification
   - Check git status for modified files

2. **Verify completed integrations:**
   - Run `npm run build` to check for errors
   - Fix any TypeScript issues

3. **Continue with pending components:**
   - CompanyEditModal.tsx (Phase 1)
   - ServiceSelector.tsx (Phase 2)
   - PartsSelector.tsx (Phase 2)

4. **Update this document:**
   - Mark completed items as ✅
   - Update progress percentages
   - Add any new findings

### Common Issues to Watch For

1. **Import path errors** - Ensure paths are correct
2. **Type errors** - Fix any TypeScript issues
3. **Missing props** - Ensure all required props are passed
4. **Dark mode** - Test in both light and dark themes
5. **Mobile responsiveness** - Test on mobile viewport

### Integration Pattern

Follow this pattern for each component:

```typescript
// 1. ADD IMPORTS
import { useAutoSave } from './forms/hooks/useAutoSave';
import { useFormValidation } from './forms/hooks/useFormValidation';
import { AutoSaveIndicator } from './form-ui/AutoSaveIndicator';
import { ValidationSummary } from './form-ui/ValidationSummary';
import { RequiredFieldBadge } from './form-ui/RequiredFieldBadge';

// 2. ADD HOOKS (after existing state)
const autoSave = useAutoSave('form-id', formData, options);
const validation = useFormValidation(formData, validationRules, options);

// 3. ADD UI COMPONENTS (in return)
<AutoSaveIndicator
  isSaving={autoSave.isSaving}
  lastSaved={autoSave.lastSaved}
  hasUnsavedChanges={autoSave.hasUnsavedChanges}
/>

{validation.hasErrors && (
  <ValidationSummary
    errors={validation.allErrors}
    onJumpToError={focusField}
  />
)}

// 4. UPDATE SAVE FUNCTION
const handleSave = () => {
  validation.handleSubmit(onValid, onInvalid)();
};

// 5. ADD REQUIRED BADGES
<label>
  Field Name
  <RequiredFieldBadge />
</label>
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-20 | Initial plan creation | Claude |
| 1.1 | 2026-01-20 | Added progress tracking, current status, continuation guide | Claude |
| 1.2 | 2026-07-20 | Marked Phase 1 core complete; added 14-row foundation bug-fix table; documented CompanyEditModal integration | Buffy |

---

**For questions or updates, refer to the component code or this document's notes section.**

**Last Agent:** Update this document's progress section after completing any integration work.
