-- Custom catalog items: reusable parts, services, and problems added by users.
-- These are merged with the hardcoded lists in the UI so they appear as natural options.
CREATE TABLE IF NOT EXISTS custom_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('part', 'service', 'problem')),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  category TEXT,
  cost NUMERIC(10, 2),
  is_frequently_replaced BOOLEAN DEFAULT false,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Unique index to prevent duplicate labels per type (case-insensitive).
CREATE UNIQUE INDEX IF NOT EXISTS custom_catalog_items_type_value_lower_idx
  ON custom_catalog_items (type, lower(value));

-- Index for quick lookups by type and category.
CREATE INDEX IF NOT EXISTS custom_catalog_items_type_category_idx
  ON custom_catalog_items (type, category);

-- Enable RLS.
ALTER TABLE custom_catalog_items ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all custom catalog items.
CREATE POLICY "Allow authenticated read access on custom_catalog_items"
  ON custom_catalog_items
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can insert new custom catalog items.
CREATE POLICY "Allow authenticated insert on custom_catalog_items"
  ON custom_catalog_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Authenticated users can update their own items or any item (admin/technician shared catalog).
CREATE POLICY "Allow authenticated update on custom_catalog_items"
  ON custom_catalog_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Authenticated users can delete their own items or any item.
CREATE POLICY "Allow authenticated delete on custom_catalog_items"
  ON custom_catalog_items
  FOR DELETE
  TO authenticated
  USING (true);

-- Updated_at trigger.
CREATE OR REPLACE FUNCTION update_custom_catalog_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS custom_catalog_items_updated_at ON custom_catalog_items;
CREATE TRIGGER custom_catalog_items_updated_at
  BEFORE UPDATE ON custom_catalog_items
  FOR EACH ROW
  EXECUTE FUNCTION update_custom_catalog_items_updated_at();
