-- Add store_id column to categories table if it doesn't exist
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);

-- Update existing categories to have a default store_id (for migration purposes)
UPDATE categories 
SET store_id = '550e8400-e29b-41d4-a716-446655440001' 
WHERE store_id IS NULL;

-- Enable RLS on categories table if not already enabled
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view categories for their store" ON categories;
DROP POLICY IF EXISTS "Users can insert categories for their store" ON categories;
DROP POLICY IF EXISTS "Users can update categories for their store" ON categories;
DROP POLICY IF EXISTS "Users can delete categories for their store" ON categories;

-- Create RLS policies for categories table
CREATE POLICY "Users can view categories for their store" ON categories
  FOR SELECT USING (store_id = current_setting('app.current_store_id', true)::UUID);

CREATE POLICY "Users can insert categories for their store" ON categories
  FOR INSERT WITH CHECK (store_id = current_setting('app.current_store_id', true)::UUID);

CREATE POLICY "Users can update categories for their store" ON categories
  FOR UPDATE USING (store_id = current_setting('app.current_store_id', true)::UUID);

CREATE POLICY "Users can delete categories for their store" ON categories
  FOR DELETE USING (store_id = current_setting('app.current_store_id', true)::UUID);
