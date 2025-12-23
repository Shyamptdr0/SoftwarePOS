-- Disable RLS completely and recreate sales tables
-- This will remove all existing RLS policies that reference store_id

-- First, disable RLS on all tables that might have it
ALTER TABLE IF EXISTS sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stores DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies on sales table
DROP POLICY IF EXISTS "Users can view sales from their store" ON sales;
DROP POLICY IF EXISTS "Users can create sales in their store" ON sales;
DROP POLICY IF EXISTS "Users can update sales in their store" ON sales;
DROP POLICY IF EXISTS "Users can delete sales in their store" ON sales;
DROP POLICY IF EXISTS "Allow all operations on sales" ON sales;

-- Drop all existing policies on sale_items table
DROP POLICY IF EXISTS "Users can view sale items from their store sales" ON sale_items;
DROP POLICY IF EXISTS "Users can create sale items for their store sales" ON sale_items;
DROP POLICY IF EXISTS "Users can update sale items for their store sales" ON sale_items;
DROP POLICY IF EXISTS "Users can delete sale items for their store sales" ON sale_items;
DROP POLICY IF EXISTS "Allow all operations on sale_items" ON sale_items;

-- Drop and recreate tables completely clean
DROP TABLE IF EXISTS sale_items CASCADE;
DROP TABLE IF EXISTS sales CASCADE;

-- Ensure stores table exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stores') THEN
        CREATE TABLE stores (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            email TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        INSERT INTO stores (id, name, address, phone, email) VALUES 
        ('550e8400-e29b-41d4-a716-446655440001', 'Default Store', '123 Main St', '555-0123', 'store@example.com');
    END IF;
END $$;

-- Create sales table (no RLS)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number TEXT NOT NULL,
    customer_name TEXT NOT NULL DEFAULT 'Walk-in Customer',
    customer_phone TEXT DEFAULT '',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'mobile')),
    payment_status TEXT NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'pending', 'refunded')),
    staff_id UUID NOT NULL,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    notes TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sale_items table (no RLS)
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON sales(bill_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Create stock decrement function
CREATE OR REPLACE FUNCTION decrement_stock(product_id_param TEXT, quantity_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    SELECT stock_quantity INTO current_stock 
    FROM products 
    WHERE id = product_id_param;
    
    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    new_stock := current_stock - quantity_param;
    
    IF new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;
    
    UPDATE products 
    SET stock_quantity = new_stock 
    WHERE id = product_id_param;
    
    RETURN new_stock;
END;
$$ LANGUAGE plpgsql;
