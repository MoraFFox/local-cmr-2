-- Migration: Add machine name columns to logistics_operations
-- The user can now record the name/brand of the client's machine and of the
-- given (replacement) machine, alongside the existing category/system fields.

ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS machine_name TEXT;
ALTER TABLE logistics_operations ADD COLUMN IF NOT EXISTS given_machine_name TEXT;
