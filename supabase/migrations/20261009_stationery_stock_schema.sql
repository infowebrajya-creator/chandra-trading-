-- ==============================================================================
-- WEBRAJYA POS - STATIONERY & BOOKSTORE DATABASE SCHEMA
-- Tailored for Chandra Trading Company / WebRajya POS Inventory Stock Catalog
-- Target DB: PostgreSQL 15+ / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUM TYPES (Safely handles existing or new DBs)
DROP TYPE IF EXISTS invoice_type_enum CASCADE;
DROP TYPE IF EXISTS invoice_status_enum CASCADE;
DROP TYPE IF EXISTS payment_mode_enum CASCADE;
DROP TYPE IF EXISTS tax_type_enum CASCADE;
DROP TYPE IF EXISTS stock_movement_type_enum CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_type_enum') THEN
    CREATE TYPE invoice_type_enum AS ENUM ('gst', 'simple');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_enum') THEN
    CREATE TYPE invoice_status_enum AS ENUM ('completed', 'cancelled');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_mode_enum') THEN
    CREATE TYPE payment_mode_enum AS ENUM ('cash', 'upi', 'card', 'credit');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tax_type_enum') THEN
    CREATE TYPE tax_type_enum AS ENUM ('inclusive', 'exclusive');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'stock_movement_type_enum') THEN
    CREATE TYPE stock_movement_type_enum AS ENUM ('purchase', 'sale', 'return', 'adjustment');
  END IF;
END $$;

-- ==============================================================================
-- 3. BRANDS & PUBLISHERS TABLE
-- Groups products by publisher / brand (e.g., MPTCB, SLA, NAVBODH, APSARA, DOMS, REYNOLDS, RORITO, UNOMAX, NCERT, etc.)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 4. CATEGORIES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  hsn_default TEXT,
  gst_rate_default NUMERIC(5,2) DEFAULT 12.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 5. PRODUCTS / STOCK MASTER TABLE
-- Represents individual items from stock PDF list (e.g., Apsara Pencils, MPTCB Guides, Navbodh Textbooks, Doms Geo Box, etc.)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY DEFAULT ('prod_' || uuid_generate_v4()),
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  brand_name TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category TEXT NOT NULL DEFAULT 'General Supplies',
  pack_info TEXT DEFAULT '1*1',
  unit TEXT NOT NULL DEFAULT 'Pcs',
  mrp NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (mrp >= 0),
  purchase_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (purchase_rate >= 0),
  sale_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (sale_rate >= 0),
  hsn_code TEXT DEFAULT '4820',
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00 CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  tax_type tax_type_enum NOT NULL DEFAULT 'inclusive',
  stock_qty INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  min_stock_level INT NOT NULL DEFAULT 10 CHECK (min_stock_level >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigram Index for ultra-fast Marg-style keyboard searching by name, sku, barcode, or brand
CREATE INDEX IF NOT EXISTS idx_products_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products (sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand_name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- ==============================================================================
-- 6. CUSTOMERS / KHATA DIRECTORY
-- ==============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT ('cust_' || uuid_generate_v4()),
  name TEXT NOT NULL,
  mobile TEXT UNIQUE,
  gstin TEXT,
  address TEXT,
  credit_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 7. INVOICES / SALES HEADERS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY DEFAULT ('inv_' || uuid_generate_v4()),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_type invoice_type_enum NOT NULL DEFAULT 'gst',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_time TIME NOT NULL DEFAULT CURRENT_TIME,
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Cash Customer',
  customer_mobile TEXT,
  customer_gstin TEXT,
  customer_address TEXT,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_discount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_gst NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  cgst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sgst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  igst_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  freight_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  round_off NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  net_payable NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_mode payment_mode_enum NOT NULL DEFAULT 'cash',
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status invoice_status_enum NOT NULL DEFAULT 'completed',
  is_interstate BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key TEXT UNIQUE,
  transaction_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices (customer_name);
CREATE INDEX IF NOT EXISTS idx_invoices_idempotency ON invoices (idempotency_key);

-- ==============================================================================
-- 8. INVOICE LINE ITEMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
  id TEXT PRIMARY KEY DEFAULT ('item_' || uuid_generate_v4()),
  invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  pack_info TEXT,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  qty INT NOT NULL CHECK (qty > 0),
  free_qty INT NOT NULL DEFAULT 0 CHECK (free_qty >= 0),
  unit_rate NUMERIC(10,2) NOT NULL CHECK (unit_rate >= 0),
  mrp NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  scheme_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  addl_discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  hsn_code TEXT,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  gst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON invoice_items (product_id);

-- ==============================================================================
-- 9. STOCK MOVEMENTS LEDGER TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY DEFAULT ('sm_' || uuid_generate_v4()),
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type stock_movement_type_enum NOT NULL,
  quantity_change INT NOT NULL,
  previous_stock INT NOT NULL,
  new_stock INT NOT NULL,
  reason TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements (created_at DESC);

-- ==============================================================================
-- 10. AUDIT LOGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT ('audit_' || uuid_generate_v4()),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. SUPABASE ATOMIC SALE CHECKOUT RPC FUNCTION
-- ==============================================================================
CREATE OR REPLACE FUNCTION complete_sale(
  p_idempotency_key TEXT,
  p_customer_name TEXT,
  p_customer_mobile TEXT,
  p_customer_gstin TEXT,
  p_customer_address TEXT,
  p_items JSONB,
  p_payments JSONB,
  p_invoice_type TEXT DEFAULT 'gst',
  p_is_interstate BOOLEAN DEFAULT FALSE,
  p_discount_amount NUMERIC DEFAULT 0.00,
  p_freight_amount NUMERIC DEFAULT 0.00,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_existing_id TEXT;
  v_invoice_id TEXT;
  v_invoice_number TEXT;
  v_item JSONB;
  v_prod RECORD;
  v_req_qty INT;
  v_subtotal NUMERIC := 0.00;
  v_total_gst NUMERIC := 0.00;
  v_cgst NUMERIC := 0.00;
  v_sgst NUMERIC := 0.00;
  v_igst NUMERIC := 0.00;
  v_grand_total NUMERIC := 0.00;
  v_paid_amt NUMERIC := 0.00;
  v_payment JSONB;
  v_prev_stock INT;
  v_new_stock INT;
BEGIN
  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
    SELECT id INTO v_existing_id FROM invoices WHERE idempotency_key = p_idempotency_key LIMIT 1;
    IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', true, 'replayed', true, 'invoice_id', v_existing_id);
    END IF;
  END IF;

  -- Stock check & lock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_req_qty := (v_item->>'qty')::INT + COALESCE((v_item->>'freeQty')::INT, 0);
    SELECT id, name, stock_qty INTO v_prod FROM products WHERE id = (v_item->>'productId') FOR UPDATE;
    IF v_prod.id IS NULL THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product ID % does not exist.', (v_item->>'productId');
    END IF;
    IF v_prod.stock_qty < v_req_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product "%" has only % in stock, requested %.', v_prod.name, v_prod.stock_qty, v_req_qty;
    END IF;
  END LOOP;

  -- Generate invoice number
  v_invoice_id := 'inv_' || uuid_generate_v4();
  v_invoice_number := 'WR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((SELECT COUNT(*)+1 FROM invoices)::TEXT, 4, '0');

  -- Calculate totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_subtotal := v_subtotal + ((v_item->>'unitRate')::NUMERIC * (v_item->>'qty')::INT);
  END LOOP;

  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments) LOOP
    v_paid_amt := v_paid_amt + (v_payment->>'amount')::NUMERIC;
  END LOOP;

  v_grand_total := GREATEST(0.00, v_subtotal - p_discount_amount + p_freight_amount);

  -- Insert invoice header
  INSERT INTO invoices (
    id, invoice_number, invoice_type, customer_name, customer_mobile, customer_gstin, customer_address,
    subtotal, total_discount, net_payable, paid_amount, balance_amount, status, is_interstate,
    idempotency_key, notes
  ) VALUES (
    v_invoice_id, v_invoice_number, p_invoice_type::invoice_type_enum, COALESCE(p_customer_name, 'Cash Customer'),
    p_customer_mobile, p_customer_gstin, p_customer_address,
    v_subtotal, p_discount_amount, v_grand_total, v_paid_amt, GREATEST(0.00, v_grand_total - v_paid_amt),
    'completed', p_is_interstate, p_idempotency_key, p_notes
  );

  -- Insert items and update stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_req_qty := (v_item->>'qty')::INT + COALESCE((v_item->>'freeQty')::INT, 0);
    SELECT stock_qty, name INTO v_prev_stock, v_prod.name FROM products WHERE id = (v_item->>'productId');
    v_new_stock := v_prev_stock - v_req_qty;

    UPDATE products SET stock_qty = v_new_stock, updated_at = NOW() WHERE id = (v_item->>'productId');

    INSERT INTO stock_movements (
      product_id, product_name, type, quantity_change, previous_stock, new_stock, reason, reference_id
    ) VALUES (
      (v_item->>'productId'), v_prod.name, 'sale', -v_req_qty, v_prev_stock, v_new_stock, 'Invoice ' || v_invoice_number, v_invoice_id
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'invoice', jsonb_build_object(
      'id', v_invoice_id,
      'invoice_number', v_invoice_number,
      'grand_total', v_grand_total,
      'paid_amount', v_paid_amt,
      'status', 'completed'
    )
  );
END;
$$;

-- 12. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Brands" ON brands;
DROP POLICY IF EXISTS "Public Read Categories" ON categories;
DROP POLICY IF EXISTS "Public Read Products" ON products;
DROP POLICY IF EXISTS "Public Read Invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated Manage Brands" ON brands;
DROP POLICY IF EXISTS "Authenticated Manage Categories" ON categories;
DROP POLICY IF EXISTS "Authenticated Manage Products" ON products;
DROP POLICY IF EXISTS "Authenticated Manage Customers" ON customers;
DROP POLICY IF EXISTS "Authenticated Manage Invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated Manage Invoice Items" ON invoice_items;
DROP POLICY IF EXISTS "Authenticated Manage Stock Movements" ON stock_movements;

CREATE POLICY "Public Read Brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Public Read Categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public Read Products" ON products FOR SELECT USING (true);
CREATE POLICY "Public Read Invoices" ON invoices FOR SELECT USING (true);

CREATE POLICY "Authenticated Manage Brands" ON brands FOR ALL USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated Manage Categories" ON categories FOR ALL USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated Manage Products" ON products FOR ALL USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated Manage Customers" ON customers FOR ALL USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated Manage Invoices" ON invoices FOR ALL USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated Manage Invoice Items" ON invoice_items FOR ALL USING (auth.role() IN ('anon', 'authenticated'));
CREATE POLICY "Authenticated Manage Stock Movements" ON stock_movements FOR ALL USING (auth.role() IN ('anon', 'authenticated'));
