-- ==============================================================================
-- WEBRAJYA POS - DELETE ALL PRODUCTS & INVENTORY DATA
-- Wipes all items, invoices, stock movements, and product catalog records.
-- Target DB: PostgreSQL / Supabase
-- ==============================================================================

-- 1. TRUNCATE ALL ITEM & TRANSACTION TABLES (Wipes all items & sales history)
TRUNCATE TABLE invoice_items, stock_movements, invoices, products RESTART IDENTITY CASCADE;

-- 2. OPTIONAL: TRUNCATE BRANDS & CATEGORIES (Uncomment if you want to wipe brands too)
-- TRUNCATE TABLE brands, categories RESTART IDENTITY CASCADE;

-- ==============================================================================
-- VERIFICATION QUERY
-- Run this to confirm all items have been deleted:
-- ==============================================================================
SELECT 'products' AS table_name, COUNT(*) AS remaining_count FROM products
UNION ALL
SELECT 'invoice_items', COUNT(*) FROM invoice_items
UNION ALL
SELECT 'stock_movements', COUNT(*) FROM stock_movements
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices;
