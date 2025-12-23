-- Temporarily disable RLS for categories to allow operations
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Add store_id column if it doesn't exist
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Update existing categories to have a default store_id
UPDATE categories 
SET store_id = '550e8400-e29b-41d4-a716-446655440001' 
WHERE store_id IS NULL;

-- Re-enable RLS with simpler policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "categories_select_policy" ON categories;
DROP POLICY IF EXISTS "categories_insert_policy" ON categories;
DROP POLICY IF EXISTS "categories_update_policy" ON categories;
DROP POLICY IF EXISTS "categories_delete_policy" ON categories;

-- Create simple RLS policies that allow all operations for now
CREATE POLICY "categories_select_policy" ON categories
  FOR SELECT USING (true);

CREATE POLICY "categories_insert_policy" ON categories
  FOR INSERT WITH CHECK (true);

CREATE POLICY "categories_update_policy" ON categories
  FOR UPDATE USING (true);

CREATE POLICY "categories_delete_policy" ON categories
  FOR DELETE USING (true);
