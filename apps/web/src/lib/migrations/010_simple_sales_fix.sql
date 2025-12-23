-- Simple and safe sales tables creation
-- This migration only creates tables without dropping anything

-- First, ensure stores table exists with proper structure
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
        
        -- Insert default store
        INSERT INTO stores (id, name, address, phone, email) VALUES 
        ('550e8400-e29b-41d4-a716-446655440001', 'Default Store', '123 Main St', '555-0123', 'store@example.com');
    END IF;
END $$;

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
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

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on both tables
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create simple RLS policies that allow all operations
DO $$
BEGIN
    -- Drop policies if they exist, then create new ones
    DROP POLICY IF EXISTS "Allow all operations on sales" ON sales;
    EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Allow all operations on sales" ON sales
    FOR ALL USING (true);

DO $$
BEGIN
    -- Drop policies if they exist, then create new ones
    DROP POLICY IF EXISTS "Allow all operations on sale_items" ON sale_items;
    EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Allow all operations on sale_items" ON sale_items
    FOR ALL USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON sales(bill_number);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_sales_updated_at ON sales;
CREATE TRIGGER update_sales_updated_at BEFORE UPDATE
    ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create stock decrement function
CREATE OR REPLACE FUNCTION decrement_stock(product_id_param UUID, quantity_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT stock_quantity INTO current_stock 
    FROM products 
    WHERE id = product_id_param;
    
    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found';
    END IF;
    
    -- Calculate new stock
    new_stock := current_stock - quantity_param;
    
    IF new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock';
    END IF;
    
    -- Update stock
    UPDATE products 
    SET stock_quantity = new_stock 
    WHERE id = product_id_param;
    
    RETURN new_stock;
END;
$$ LANGUAGE plpgsql;
