-- First, ensure stores table exists with proper structure
DO $$
BEGIN
    -- Create stores table if it doesn't exist
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
    
    -- Ensure id column exists and is UUID type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stores' AND column_name = 'id') THEN
        ALTER TABLE stores ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();
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

-- Create RLS policies for sales table
CREATE POLICY "Users can view sales from their store" ON sales
    FOR SELECT USING (store_id = auth.uid()::text);

CREATE POLICY "Users can create sales in their store" ON sales
    FOR INSERT WITH CHECK (store_id = auth.uid()::text);

CREATE POLICY "Users can update sales in their store" ON sales
    FOR UPDATE USING (store_id = auth.uid()::text);

CREATE POLICY "Users can delete sales in their store" ON sales
    FOR DELETE USING (store_id = auth.uid()::text);

-- Create RLS policies for sale_items table
CREATE POLICY "Users can view sale items from their store sales" ON sale_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.store_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create sale items for their store sales" ON sale_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.store_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update sale items for their store sales" ON sale_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.store_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete sale items for their store sales" ON sale_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM sales 
            WHERE sales.id = sale_items.sale_id 
            AND sales.store_id = auth.uid()::text
        )
    );

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

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE
    ON sales FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
