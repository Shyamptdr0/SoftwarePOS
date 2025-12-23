-- Supabase Schema Update - Add store_id columns for multi-store support

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
UPDATE users SET store_id = '550e8400-e29b-41d4-a716-446655440001' WHERE store_id IS NULL;

-- Update categories table  
ALTER TABLE categories ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
UPDATE categories SET store_id = '550e8400-e29b-41d4-a716-446655440001' WHERE store_id IS NULL;

-- Update products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
UPDATE products SET store_id = '550e8400-e29b-41d4-a716-446655440001' WHERE store_id IS NULL;

-- Update inventory_transactions table
ALTER TABLE inventory_transactions ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
UPDATE inventory_transactions SET store_id = '550e8400-e29b-41d4-a716-446655440001' WHERE store_id IS NULL;

-- Update sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
UPDATE sales SET store_id = '550e8400-e29b-41d4-a716-446655440001' WHERE store_id IS NULL;

-- Update settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id);
UPDATE settings SET store_id = '550e8400-e29b-41d4-a716-446655440001' WHERE store_id IS NULL;

-- Create indexes for store_id columns
CREATE INDEX IF NOT EXISTS idx_users_store_id ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_store_id ON inventory_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_settings_store_id ON settings(store_id);
