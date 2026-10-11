-- ==============================================================================
-- WEBRAJYA STATIONERY POS - COMPLETE SUPABASE SETUP
-- RUN THIS IN SUPABASE SQL EDITOR FOR PROJECT: https://afmonljoftcsclxdcdpy.supabase.co
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY DEFAULT ('prod_' || uuid_generate_v4()),
  sku TEXT NOT NULL,
  barcode TEXT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General Supplies',
  pack_info TEXT DEFAULT '1*1',
  unit TEXT NOT NULL DEFAULT 'Pcs',
  mrp NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  purchase_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  sale_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  hsn_code TEXT DEFAULT '4820',
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00,
  stock_qty INT NOT NULL DEFAULT 0,
  min_stock_level INT NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products (barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products (name);

-- 2. CUSTOMERS TABLE
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY DEFAULT ('cust_' || uuid_generate_v4()),
  name TEXT NOT NULL,
  mobile TEXT,
  gstin TEXT,
  address TEXT,
  credit_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers (mobile);

-- 3. INVOICES / SALES TABLE
CREATE TABLE IF NOT EXISTS public.invoices (
  id TEXT PRIMARY KEY DEFAULT ('inv_' || uuid_generate_v4()),
  invoice_number TEXT UNIQUE NOT NULL,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  invoice_time TIME NOT NULL DEFAULT CURRENT_TIME,
  customer_id TEXT REFERENCES public.customers(id) ON DELETE SET NULL,
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
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  balance_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  is_interstate BOOLEAN NOT NULL DEFAULT FALSE,
  idempotency_key TEXT UNIQUE,
  transaction_ref TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices (invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices (created_at DESC);

-- 4. INVOICE LINE ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id TEXT PRIMARY KEY DEFAULT ('item_' || uuid_generate_v4()),
  invoice_id TEXT NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  barcode TEXT,
  pack_info TEXT,
  remark TEXT,
  unit TEXT NOT NULL DEFAULT 'Pcs',
  qty NUMERIC(10,2) NOT NULL CHECK (qty > 0),
  free_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
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

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items (product_id);

-- 5. STOCK MOVEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY DEFAULT ('sm_' || uuid_generate_v4()),
  product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  type TEXT NOT NULL,
  quantity_change NUMERIC(10,2) NOT NULL,
  previous_stock NUMERIC(10,2) NOT NULL,
  new_stock NUMERIC(10,2) NOT NULL,
  reason TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements (created_at DESC);

-- 6. ENABLE ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES FOR POS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Allow read/write access for anon and authenticated users
DROP POLICY IF EXISTS "Public access for products" ON public.products;
CREATE POLICY "Public access for products" ON public.products FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for customers" ON public.customers;
CREATE POLICY "Public access for customers" ON public.customers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for invoices" ON public.invoices;
CREATE POLICY "Public access for invoices" ON public.invoices FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for invoice_items" ON public.invoice_items;
CREATE POLICY "Public access for invoice_items" ON public.invoice_items FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access for stock_movements" ON public.stock_movements;
CREATE POLICY "Public access for stock_movements" ON public.stock_movements FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for instant multi-device sales synchronization
ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
