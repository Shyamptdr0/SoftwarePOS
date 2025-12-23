-- Fix RLS policies for products table

-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view products from their store" ON products;
DROP POLICY IF EXISTS "Users can create products in their store" ON products;
DROP POLICY IF EXISTS "Users can update products in their store" ON products;
DROP POLICY IF EXISTS "Users can delete products in their store" ON products;

-- Create RLS policies for products
CREATE POLICY "Users can view products from their store" ON products
    FOR SELECT USING (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE store_id = products.store_id AND is_active = true
        )
    );

CREATE POLICY "Users can create products in their store" ON products
    FOR INSERT WITH CHECK (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE store_id = products.store_id AND is_active = true
        )
    );

CREATE POLICY "Users can update products in their store" ON products
    FOR UPDATE USING (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE store_id = products.store_id AND is_active = true
        )
    );

CREATE POLICY "Users can delete products in their store" ON products
    FOR DELETE USING (
        auth.uid()::text IN (
            SELECT id::text FROM users 
            WHERE store_id = products.store_id AND is_active = true
        )
    );
