-- Migration: Logistics — given machine description, maintenance close fields, editing support
-- Follow-up to 20260731000000_create_logistics_tables.sql

-- 1. Allow custom "other" category values on operations
-- (the UI now lets users type a custom category when "أخرى" is selected)
ALTER TABLE logistics_operations DROP CONSTRAINT IF EXISTS logistics_operations_machine_category_check;

-- 2. New columns: machine given to the client + maintenance close data
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS given_machine_category TEXT;
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS given_machine_type TEXT
  CHECK (given_machine_type IS NULL OR given_machine_type IN ('manual', 'automatic', 'semi_automatic'));
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS maintenance_cost NUMERIC(10,2)
  CHECK (maintenance_cost IS NULL OR maintenance_cost >= 0);
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS work_done TEXT;

-- 3. Recompute total_logistics_cost to include maintenance cost
-- (drop + re-add the generated column so the new expression is applied)
ALTER TABLE logistics_operations DROP COLUMN IF EXISTS total_logistics_cost;
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS total_logistics_cost NUMERIC(10,2) GENERATED ALWAYS AS (
  COALESCE(total_rental_cost, 0) + COALESCE(pickup_cost, 0) + COALESCE(return_cost, 0) + COALESCE(maintenance_cost, 0)
) STORED;

-- 4. RLS: allow any authenticated user to update (was scoped to creator, which blocked
-- editing/closing operations created by other team members)
DROP POLICY IF EXISTS "Authenticated users can update logistics_operations" ON logistics_operations;
CREATE POLICY "Authenticated users can update logistics_operations"
  ON logistics_operations FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 5. RLS: add delete policy (operations can now be removed from the UI)
DROP POLICY IF EXISTS "Authenticated users can delete logistics_operations" ON logistics_operations;
CREATE POLICY "Authenticated users can delete logistics_operations"
  ON logistics_operations FOR DELETE
  USING (auth.role() = 'authenticated');
