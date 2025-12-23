-- Complete products table schema fix
-- Add missing columns to products table

-- Add store_id column
ALTER TABLE products ADD COLUMN IF NOT EXISTS store_id UUID;

-- Add all missing product columns
ALTER TABLE products ADD COLUMN IF NOT EXISTS sku text UNIQUE;
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid;
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price numeric(10,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price numeric(10,2) NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_rate numeric(5,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS min_stock_level integer DEFAULT 5;
ALTER TABLE products ADD COLUMN IF NOT EXISTS unit text DEFAULT 'pcs';
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE products ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'synced';

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_store_id_fkey' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_store_id_fkey 
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'products_category_id_fkey' 
        AND table_name = 'products'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT products_category_id_fkey 
        FOREIGN KEY (category_id) REFERENCES categories(id);
    END IF;
END $$;

-- Update existing products to have default values
UPDATE products 
SET store_id = '550e8400-e29b-41d4-a716-446655440001' 
WHERE store_id IS NULL;

UPDATE products 
SET sku = COALESCE(sku, 'PROD-' || id)
WHERE sku IS NULL;

UPDATE products 
SET name = COALESCE(name, 'Untitled Product')
WHERE name IS NULL OR name = '';

UPDATE products 
SET selling_price = COALESCE(selling_price, 0)
WHERE selling_price IS NULL;
