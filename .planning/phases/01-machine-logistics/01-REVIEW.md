---
status: review_complete
files_reviewed: 14
critical: 4
warning: 5
info: 3
total: 12
---

## CR-01: RLS allows cross-customer UPDATE on logistics_operations
**File:** `supabase/migrations/20260731000000_create_logistics_tables.sql`  
**Threat:** T-02  

The UPDATE policy only checks `auth.role() = 'authenticated'`. Any authenticated user can modify any logistics operation regardless of customer. Add customer-scoping.

**Fix:** Add `USING` clause with customer scope check.

## CR-02: company_machines RLS grants DELETE to all authenticated users
**File:** `supabase/migrations/20260731000000_create_logistics_tables.sql`  
**Threat:** T-08  

`CREATE POLICY "Authenticated users can manage company_machines" FOR ALL` grants DELETE to every authenticated user. Split into separate policies.

**Fix:** Separate SELECT (all authenticated) from INSERT/UPDATE/DELETE (admin-only via `is_admin()` or similar).

## CR-03: No CHECK constraints on price columns — negative values accepted
**File:** `supabase/migrations/20260731000000_create_logistics_tables.sql`  
**Threat:** T-03  

`monthly_rental_price`, `pickup_cost`, `return_cost` have no CHECK >= 0 constraint. HTML `min="0"` is client-only.

**Fix:** Add `CHECK (monthly_rental_price IS NULL OR monthly_rental_price >= 0)` and similar for pickup_cost, return_cost.

## CR-04: recordId falls back to 0 for non-numeric IDs
**Files:** `MaintenanceRecordEditor.tsx`, `MaintenanceRecordCard.tsx`  
**Threat:** T-04  

`typeof record.id === 'number' ? record.id : 0` passes 0 when ID is a string — invalid FK.

**Fix:** Pass `null` instead of `0` when ID isn't numeric.

---

## WR-01: closeOperation overwrites updated_at with browser time
**File:** `hooks/useLogisticsOperations.ts`  

`updated_at: new Date().toISOString()` writes browser-local time over DB's `DEFAULT NOW()`. Remove the manual set.

## WR-02: No audit trail — missing created_by/closed_by user tracking
**File:** `hooks/useLogisticsOperations.ts`  
**Threat:** T-07  

Neither `createOperation` nor `closeOperation` records which user performed the action.

**Fix:** Add `created_by` and `closed_by` columns (auth.uid()) to migration and hook insert/update calls.

## WR-03: Missing index on logistics_operations.customer_id
**File:** `supabase/migrations/20260731000000_create_logistics_tables.sql`  

Every fetch filters by customer_id. Add index: `CREATE INDEX idx_logistics_ops_customer ON logistics_operations(customer_id);`

## WR-04: LogisticsTimelineView exposes costs without role check
**File:** `src/views/LogisticsTimelineView.tsx`  
**Threat:** T-06  

The view renders all costs in the DOM for any authenticated user. While administratively internal, no role gate prevents technician access. Deferred — needs role infrastructure.

## WR-05: price inputs lack client-side guard beyond HTML validation
**File:** `components/MachineLogisticsSection.tsx`  

`type="number" min="0"` is bypassable. Add `Math.max(0, Number(value))` in handleSave.

---

## IN-01: selectedAction uses `as any` casts
**File:** `components/MachineLogisticsSection.tsx`  

`createOperation({ operation_type: selectedAction as any, ... })` — narrow with a type guard instead of casting.

## IN-02: completedSteps doesn't include step 7 (logistics)
**File:** `components/MaintenanceRecordEditor.tsx`  

The useMemo covers steps 1-6, 8-9 but skips 7. Intentional (logistics always visible) but undocumented.

## IN-03: Sidebar handleViewChange type missing new view keys
**File:** `src/views/Sidebar.tsx`  

Prop type excludes `"machines"`, `"logistics-timeline"`, `"all-records"`. Works via `as any` cast.
