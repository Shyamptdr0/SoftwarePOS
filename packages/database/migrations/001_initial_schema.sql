-- Migration 001: Initial Schema Setup
-- This migration creates the complete Shreem POS database schema

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-------------------------------------------------
-- STORES
-------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    address text,
    phone text,
    email text,
    tax_number text,
    currency text DEFAULT 'USD',
    timezone text DEFAULT 'UTC',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict'))
);

-------------------------------------------------
-- USERS (Custom table linked to Supabase auth)
-------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY, -- same as auth.users.id
    email text UNIQUE NOT NULL,
    role text DEFAULT 'staff' CHECK (role IN ('admin','staff')),
    store_id uuid REFERENCES stores(id),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced' CHECK (sync_status IN ('synced','pending','conflict'))
);

-------------------------------------------------
-- CATEGORIES
-------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    color text DEFAULT '#6366f1',
    store_id uuid REFERENCES stores(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced'
);

-------------------------------------------------
-- PRODUCTS
-------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sku text UNIQUE NOT NULL,
    barcode text,
    name text NOT NULL,
    description text,
    category_id uuid REFERENCES categories(id),
    cost_price numeric(10,2),
    selling_price numeric(10,2) NOT NULL,
    tax_rate numeric(5,2) DEFAULT 0,
    stock_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 5,
    unit text DEFAULT 'pcs',
    image_url text,
    is_active boolean DEFAULT true,
    store_id uuid REFERENCES stores(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced'
);

-------------------------------------------------
-- INVENTORY TRANSACTIONS
-------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES products(id),
    transaction_type text CHECK (transaction_type IN ('in','out','adjustment')),
    quantity integer NOT NULL,
    reference_type text CHECK (reference_type IN ('purchase','sale','adjustment','return')),
    reference_id uuid,
    notes text,
    store_id uuid REFERENCES stores(id),
    created_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced'
);

-------------------------------------------------
-- SALES
-------------------------------------------------
CREATE TABLE IF NOT EXISTS sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_number text UNIQUE NOT NULL,
    customer_name text,
    customer_phone text,
    subtotal numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) NOT NULL,
    payment_method text CHECK (payment_method IN ('cash','card','upi','other')),
    payment_status text DEFAULT 'paid' CHECK (payment_status IN ('paid','pending','partial')),
    staff_id uuid REFERENCES users(id),
    store_id uuid REFERENCES stores(id),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced'
);

-------------------------------------------------
-- SALE ITEMS
-------------------------------------------------
CREATE TABLE IF NOT EXISTS sale_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id uuid REFERENCES sales(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id),
    quantity integer NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    discount_amount numeric(10,2) DEFAULT 0,
    tax_amount numeric(10,2) DEFAULT 0,
    total_price numeric(10,2) NOT NULL,
    created_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced'
);

-------------------------------------------------
-- SETTINGS
-------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value text,
    description text,
    store_id uuid REFERENCES stores(id),
    updated_at timestamptz DEFAULT now(),
    sync_status text DEFAULT 'synced'
);

-------------------------------------------------
-- SYNC LOG
-------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation text CHECK (operation IN ('push','pull','conflict')),
    table_name text NOT NULL,
    record_id uuid,
    status text CHECK (status IN ('success','error','pending')),
    error_message text,
    store_id uuid REFERENCES stores(id),
    created_at timestamptz DEFAULT now()
);

-------------------------------------------------
-- LICENSE
-------------------------------------------------
CREATE TABLE IF NOT EXISTS license (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    license_key text UNIQUE,
    machine_id text,
    status text DEFAULT 'trial' CHECK (status IN ('trial','active','expired','blocked')),
    expires_at timestamptz,
    features jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-------------------------------------------------
-- INDEXES
-------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_store ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_bill_number ON sales(bill_number);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_staff ON sales(staff_id);
CREATE INDEX IF NOT EXISTS idx_sales_store ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_date ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_store ON inventory_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_log(status);
CREATE INDEX IF NOT EXISTS idx_sync_date ON sync_log(created_at);
CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id);
CREATE INDEX IF NOT EXISTS idx_categories_store ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_settings_store ON settings(store_id);

-------------------------------------------------
-- UPDATED_AT TRIGGER
-------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_sales_updated BEFORE UPDATE ON sales
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stores_updated BEFORE UPDATE ON stores
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_license_updated BEFORE UPDATE ON license
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON settings
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
