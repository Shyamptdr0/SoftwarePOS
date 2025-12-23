-- Fix price column name mismatch
-- Rename 'price' column to 'selling_price' to match the code

-- First, add the selling_price column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'selling_price') THEN
        ALTER TABLE products ADD COLUMN selling_price numeric(10,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Copy data from price to selling_price if price exists and selling_price is null
UPDATE products 
SET selling_price = price 
WHERE price IS NOT NULL AND selling_price = 0;

-- Drop the old price column if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'price') THEN
        ALTER TABLE products DROP COLUMN price;
    END IF;
END $$;

-- Also add other commonly missing columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price numeric(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'stock_quantity') THEN
        ALTER TABLE products ADD COLUMN stock_quantity integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sku') THEN
        ALTER TABLE products ADD COLUMN sku text UNIQUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'name') THEN
        ALTER TABLE products ADD COLUMN name text NOT NULL DEFAULT '';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'store_id') THEN
        ALTER TABLE products ADD COLUMN store_id UUID;
    END IF;
END $$;

-- Update any products with null values to have defaults
UPDATE products 
SET 
    store_id = COALESCE(store_id, '550e8400-e29b-41d4-a716-446655440001'),
    sku = COALESCE(sku, 'PROD-' || id),
    name = COALESCE(name, 'Untitled Product'),
    stock_quantity = COALESCE(stock_quantity, 0)
WHERE store_id IS NULL OR sku IS NULL OR name IS NULL OR stock_quantity IS NULL;
