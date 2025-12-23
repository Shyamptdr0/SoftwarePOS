-- Migration 002: Seed Data
-- This migration inserts realistic seed data for the POS system

-------------------------------------------------
-- STORES
-------------------------------------------------
INSERT INTO stores (id, name, address, phone, email, tax_number, currency, timezone) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'TechHub Electronics', '123 Main Street, Downtown, NY 10001', '+1-555-0101', 'contact@techhub.com', '12-3456789', 'USD', 'America/New_York'),
    ('550e8400-e29b-41d4-a716-446655440002', 'Mobile Zone', '456 Oak Avenue, Mall Plaza, CA 90210', '+1-555-0102', 'info@mobilezone.com', '98-7654321', 'USD', 'America/Los_Angeles')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------
-- USERS
-------------------------------------------------
INSERT INTO users (id, email, role, store_id, is_active) VALUES 
    ('550e8400-e29b-41d4-a716-446655440011', 'admin@techhub.com', 'admin', '550e8400-e29b-41d4-a716-446655440001', true),
    ('550e8400-e29b-41d4-a716-446655440012', 'john.smith@techhub.com', 'staff', '550e8400-e29b-41d4-a716-446655440001', true),
    ('550e8400-e29b-41d4-a716-446655440013', 'sarah.jones@techhub.com', 'staff', '550e8400-e29b-41d4-a716-446655440001', true),
    ('550e8400-e29b-41d4-a716-446655440021', 'manager@mobilezone.com', 'admin', '550e8400-e29b-41d4-a716-446655440002', true),
    ('550e8400-e29b-41d4-a716-446655440022', 'mike.wilson@mobilezone.com', 'staff', '550e8400-e29b-41d4-a716-446655440002', true)
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------
-- CATEGORIES
-------------------------------------------------
INSERT INTO categories (id, name, description, color, store_id) VALUES 
    ('550e8400-e29b-41d4-a716-446655440101', 'Smartphones', 'Mobile phones and accessories', '#3b82f6', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440102', 'Laptops', 'Notebook computers and laptops', '#10b981', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440103', 'Tablets', 'Tablet computers and e-readers', '#f59e0b', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440104', 'Accessories', 'Phone cases, chargers, cables', '#8b5cf6', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440105', 'Audio', 'Headphones, speakers, audio equipment', '#ef4444', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440106', 'Gaming', 'Gaming consoles and accessories', '#06b6d4', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440201', 'Mobile Phones', 'Smartphones and basic phones', '#3b82f6', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440202', 'Wearables', 'Smart watches and fitness trackers', '#10b981', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------
-- PRODUCTS
-------------------------------------------------
INSERT INTO products (id, sku, barcode, name, description, category_id, cost_price, selling_price, tax_rate, stock_quantity, min_stock_level, unit, image_url, store_id) VALUES 
    -- TechHub Products
    ('550e8400-e29b-41d4-a716-446655440301', 'IPHONE15-128-BLK', '1234567890123', 'iPhone 15 128GB Black', 'Apple iPhone 15 with A16 chip, 128GB storage', '550e8400-e29b-41d4-a716-446655440101', 799.00, 999.99, 8.25, 25, 10, 'pcs', 'https://example.com/images/iphone15-128blk.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440302', 'IPHONE15-256-BLU', '1234567890124', 'iPhone 15 256GB Blue', 'Apple iPhone 15 with A16 chip, 256GB storage', '550e8400-e29b-41d4-a716-446655440101', 899.00, 1099.99, 8.25, 15, 8, 'pcs', 'https://example.com/images/iphone15-256blu.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440303', 'S23U-256-BLK', '1234567890125', 'Samsung Galaxy S23 Ultra 256GB', 'Samsung flagship with S Pen, 256GB storage', '550e8400-e29b-41d4-a716-446655440101', 999.00, 1199.99, 8.25, 20, 10, 'pcs', 'https://example.com/images/s23u-256blk.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440304', 'MACBOOK-AIR-M2', '1234567890126', 'MacBook Air M2 13"', 'Apple MacBook Air with M2 chip, 13" display', '550e8400-e29b-41d4-a716-446655440102', 899.00, 1099.99, 8.25, 12, 5, 'pcs', 'https://example.com/images/macbook-air-m2.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440305', 'DELL-XPS-13', '1234567890127', 'Dell XPS 13 9320', 'Dell ultrabook with Intel i7, 13.4" display', '550e8400-e29b-41d4-a716-446655440102', 1099.00, 1299.99, 8.25, 8, 3, 'pcs', 'https://example.com/images/dell-xps-13.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440306', 'IPAD-PRO-11', '1234567890128', 'iPad Pro 11" M2', 'Apple iPad Pro with M2 chip, 11" display', '550e8400-e29b-41d4-a716-446655440103', 699.00, 899.99, 8.25, 18, 8, 'pcs', 'https://example.com/images/ipad-pro-11.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440307', 'SAMSUNG-TAB-S9', '1234567890129', 'Samsung Tab S9', 'Samsung tablet with Snapdragon 8 Gen 2', '550e8400-e29b-41d4-a716-446655440103', 599.00, 799.99, 8.25, 14, 6, 'pcs', 'https://example.com/images/samsung-tab-s9.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440308', 'AIRPODS-PRO-2', '1234567890130', 'AirPods Pro 2nd Gen', 'Apple wireless earbuds with noise cancellation', '550e8400-e29b-41d4-a716-446655440104', 199.00, 249.99, 8.25, 45, 20, 'pcs', 'https://example.com/images/airpods-pro-2.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440309', 'USB-C-CABLE-2M', '1234567890131', 'USB-C Cable 2M', 'High-quality USB-C charging cable, 2 meters', '550e8400-e29b-41d4-a716-446655440104', 9.00, 14.99, 8.25, 100, 30, 'pcs', 'https://example.com/images/usb-c-cable-2m.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440310', 'SONY-WH1000XM5', '1234567890132', 'Sony WH-1000XM5', 'Premium noise-canceling headphones', '550e8400-e29b-41d4-a716-446655440105', 299.00, 399.99, 8.25, 22, 10, 'pcs', 'https://example.com/images/sony-wh1000xm5.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440311', 'JBL-FLIP6', '1234567890133', 'JBL Flip 6 Bluetooth Speaker', 'Portable waterproof Bluetooth speaker', '550e8400-e29b-41d4-a716-446655440105', 79.00, 99.99, 8.25, 35, 15, 'pcs', 'https://example.com/images/jbl-flip6.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440312', 'PS5-SLIM', '1234567890134', 'PlayStation 5 Slim', 'Sony PlayStation 5 Slim console', '550e8400-e29b-41d4-a716-446655440106', 399.00, 499.99, 8.25, 10, 5, 'pcs', 'https://example.com/images/ps5-slim.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440313', 'XBOX-SERIES-X', '1234567890135', 'Xbox Series X', 'Microsoft Xbox Series X console', '550e8400-e29b-41d4-a716-446655440106', 449.00, 549.99, 8.25, 8, 4, 'pcs', 'https://example.com/images/xbox-series-x.jpg', '550e8400-e29b-41d4-a716-446655440001'),
    
    -- Mobile Zone Products
    ('550e8400-e29b-41d4-a716-446655440401', 'IPHONE14-128-RED', '2234567890123', 'iPhone 14 128GB Red', 'Apple iPhone 14 with A15 chip, 128GB storage', '550e8400-e29b-41d4-a716-446655440201', 699.00, 849.99, 8.25, 20, 8, 'pcs', 'https://example.com/images/iphone14-128red.jpg', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440402', 'GALAXY-WATCH6', '2234567890124', 'Samsung Galaxy Watch 6', 'Samsung smartwatch with health tracking', '550e8400-e29b-41d4-a716-446655440202', 249.00, 299.99, 8.25, 30, 12, 'pcs', 'https://example.com/images/galaxy-watch6.jpg', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------
-- SETTINGS
-------------------------------------------------
INSERT INTO settings (id, key, value, description, store_id) VALUES 
    -- TechHub Settings
    ('550e8400-e29b-41d4-a716-446655440501', 'store_name', 'TechHub Electronics', 'Store name for receipts', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440502', 'store_address', '123 Main Street, Downtown, NY 10001', 'Store address', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440503', 'store_phone', '+1-555-0101', 'Store phone number', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440504', 'store_email', 'contact@techhub.com', 'Store email', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440505', 'tax_number', '12-3456789', 'Tax identification number', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440506', 'currency', 'USD', 'Default currency', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440507', 'timezone', 'America/New_York', 'Store timezone', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440508', 'low_stock_alert', 'true', 'Enable low stock alerts', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440509', 'auto_backup', 'true', 'Enable automatic backups', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440510', 'receipt_header', 'Thank you for shopping at TechHub!', 'Receipt header message', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440511', 'receipt_footer', 'Visit us again soon!', 'Receipt footer message', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440512', 'default_tax_rate', '8.25', 'Default tax rate', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440513', 'barcode_type', 'CODE128', 'Default barcode type', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440514', 'print_receipt', 'true', 'Auto print receipt', '550e8400-e29b-41d4-a716-446655440001'),
    ('550e8400-e29b-41d4-a716-446655440515', 'sync_interval', '300', 'Sync interval in seconds', '550e8400-e29b-41d4-a716-446655440001'),
    
    -- Mobile Zone Settings
    ('550e8400-e29b-41d4-a716-446655440521', 'store_name', 'Mobile Zone', 'Store name for receipts', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440522', 'store_address', '456 Oak Avenue, Mall Plaza, CA 90210', 'Store address', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440523', 'store_phone', '+1-555-0102', 'Store phone number', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440524', 'store_email', 'info@mobilezone.com', 'Store email', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440525', 'tax_number', '98-7654321', 'Tax identification number', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440526', 'currency', 'USD', 'Default currency', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440527', 'timezone', 'America/Los_Angeles', 'Store timezone', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440528', 'low_stock_alert', 'true', 'Enable low stock alerts', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440529', 'auto_backup', 'true', 'Enable automatic backups', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440530', 'receipt_header', 'Thank you for shopping at Mobile Zone!', 'Receipt header message', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440531', 'receipt_footer', 'Your mobile device experts!', 'Receipt footer message', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440532', 'default_tax_rate', '8.75', 'Default tax rate', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440533', 'barcode_type', 'CODE128', 'Default barcode type', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440534', 'print_receipt', 'true', 'Auto print receipt', '550e8400-e29b-41d4-a716-446655440002'),
    ('550e8400-e29b-41d4-a716-446655440535', 'sync_interval', '300', 'Sync interval in seconds', '550e8400-e29b-41d4-a716-446655440002')
ON CONFLICT (id) DO NOTHING;

-------------------------------------------------
-- LICENSE
-------------------------------------------------
INSERT INTO license (id, license_key, machine_id, status, expires_at, features) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'LIC-TECHHUB-2024-PRO', 'MH-TECHHUB-001', 'active', '2025-12-31 23:59:59+00', '{"pos": true, "inventory": true, "reports": true, "multi_store": true, "api_access": true}')
ON CONFLICT (id) DO NOTHING;
