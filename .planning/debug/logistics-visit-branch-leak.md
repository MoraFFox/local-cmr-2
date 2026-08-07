---
slug: logistics-visit-branch-leak
status: resolved
trigger: "i have a problem with the logistics visit records, the problem is when i regeister a logicitc visit for one of the branches it appear in other branches reports too, why is that happening, it should appear in the report of the baranch it self to the others, and should appear in the company branch too."
created: 2026-08-07
updated: 2026-08-07
---

# Debug Session: logistics-visit-branch-leak

## Symptoms

- **Expected:** A logistics visit registered for branch A appears in branch A's
  report (and in the company-level report), but NOT in other branches' reports.
- **Actual:** Registering a logistics visit for one branch makes it appear in
  every branch's reports.
- **Errors:** None reported.
- **Reproduction:** Register a logistics visit on a branch's maintenance record,
  then generate a branch report for any other branch — the operation appears.

## Current Focus

- hypothesis: Branch reports receive the company-wide logistics operations list
  unfiltered, so every branch shows every branch's operations.
- next_action: Filter logistics operations per branch using the originating
  maintenance record id (`opened_by_record_id`) before passing them to branch
  reports.

## Evidence

- `hooks/useLogisticsOperations.ts`: `useLogisticsOperations(customerId)` fetches
  all operations scoped only by `customer_id` (= the company id).
- `components/SubmissionDetails.tsx`:
  - `const { operations: logisticsOps } = useLogisticsOperations(submission.id ?? null);`
  - The same unfiltered `logisticsOps` is passed to every branch PDF report
    (`generateInternalBranchReport` / `generateClientBranchReport` /
    `generateCostBranchReport`) and the branch Word report
    (`generateBranchWordReport`).
- `components/MachineLogisticsSection.tsx`: operations are created with
  `createOperation(base, recordId)` → `opened_by_record_id = recordId`, where
  `recordId` is the id of the maintenance record the logistics visit is attached
  to. That record lives in exactly one branch's `maintenanceHistory`.
- `components/InternalReportPrintView.tsx`: `BranchInternalReport` renders
  `logisticsOperations` verbatim (no branch scoping); `CompanyInternalReport`
  renders embedded branch sections without any logistics operations.
- `utils/dateRangeFilter.ts`: `getReportRecords` strips logistics visits from
  report history, so branch attribution must match against the RAW branch
  history (which retains logistics visits).

## Root Cause

Logistics operations are keyed to the company (`customer_id`), not to a branch.
The originating maintenance record is the only link to a branch
(`opened_by_record_id`), but branch reports never filtered by it — they received
the full company list. Hence a visit registered on branch A appeared in every
branch report. Company-level reports were correctly receiving all operations.

## Fix

1. Added pure helpers to `hooks/useLogisticsOperations.ts`:
   - `collectMaintenanceRecordIds(records)` — collects all record ids in a
     branch's history including nested follow-up visits (string-normalized).
   - `filterLogisticsOperationsForBranch(operations, branchHistory)` — keeps
     only operations whose `opened_by_record_id` matches a record in the branch
     history. Unattributable operations (no `opened_by_record_id`) are excluded
     from branch reports but still appear in company reports.
2. `components/SubmissionDetails.tsx` — branch PDF (internal/client/cost) and
   Word report generation now pass `filterLogisticsOperationsForBranch(logisticsOps, filteredBranch.maintenanceHistory)`.
   Company reports keep the full list.
3. `components/InternalReportPrintView.tsx` — `BranchInternalReport` filters its
   `logisticsOperations` against the raw branch history; `CompanyInternalReport`
   now passes logistics operations (scoped per branch) to its embedded branch
   sections.
4. Unit tests added in `tests/hooks/useLogisticsOperations.test.ts`.

## Verification

- `npx tsc --noEmit` (typecheck)
- `npx vitest run tests/hooks/useLogisticsOperations.test.ts tests/printViewEmpty.test.tsx tests/LogisticsReportSection.test.tsx`
- Manual: generate a branch report — only that branch's logistics visits appear.

## Resolution

- root_cause: Branch reports received the company-wide logistics operations list
  without filtering by originating branch.
- files_changed:
  - hooks/useLogisticsOperations.ts
  - components/SubmissionDetails.tsx
  - components/InternalReportPrintView.tsx
  - tests/hooks/useLogisticsOperations.test.ts
