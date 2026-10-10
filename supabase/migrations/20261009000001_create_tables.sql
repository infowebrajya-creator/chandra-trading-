-- Migration 1: Create Core Schema Tables for WebRajya Billing POS
-- Target: Supabase PostgreSQL (Single Store Stationery POS)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. STORE SETTINGS
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_name VARCHAR(255) NOT NULL DEFAULT 'WebRajya Stationery & Books',
    tagline VARCHAR(255) DEFAULT 'All Stationery, School & Office Supplies',
    address TEXT NOT NULL DEFAULT 'Shop No. 12, Main Market Road, New Delhi',
    phone VARCHAR(30) NOT NULL DEFAULT '+91 98765 43210',
    email VARCHAR(255) DEFAULT 'contact@webrajyastationery.com',
    gstin VARCHAR(20) NOT NULL DEFAULT '07AAAAA0000A1Z5',
    state_code VARCHAR(10) NOT NULL DEFAULT '07',
    state_name VARCHAR(100) NOT NULL DEFAULT 'Delhi',
    pincode VARCHAR(10) DEFAULT '110001',
    bank_name VARCHAR(100) DEFAULT 'State Bank of India',
    account_no VARCHAR(50) DEFAULT '34567890123',
    ifsc_code VARCHAR(20) DEFAULT 'SBIN0001234',
    upi_id VARCHAR(100) DEFAULT 'webrajyastationery@sbi',
    invoice_prefix VARCHAR(10) NOT NULL DEFAULT 'WR-',
    terms_and_conditions TEXT DEFAULT '1. Goods once sold will not be taken back without bill. 2. Warranty as per manufacturer guidelines.',
    updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. PROFILES (Users/Staff)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'cashier' CHECK (role IN ('owner', 'cashier', 'admin')),
    phone VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    display_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRODUCTS
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'General Supplies',
    pack_info VARCHAR(100) DEFAULT '1 Pcs',
    unit VARCHAR(20) NOT NULL DEFAULT 'Pcs' CHECK (unit IN ('Pcs', 'Pkt', 'Box', 'Dozen', 'Ream', 'Set', 'Roll', 'Pad')),
    mrp NUMERIC(12,2) NOT NULL CHECK (mrp >= 0),
    purchase_price NUMERIC(12,2) CHECK (purchase_price >= 0),
    selling_rate NUMERIC(12,2) NOT NULL CHECK (selling_rate >= 0),
    hsn_code VARCHAR(10) DEFAULT '',
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 12.00 CHECK (gst_rate IN (0.00, 5.00, 12.00, 18.00, 28.00)),
    tax_type VARCHAR(20) NOT NULL DEFAULT 'inclusive' CHECK (tax_type IN ('inclusive', 'exclusive')),
    stock_quantity NUMERIC(12,3) NOT NULL DEFAULT 0.000 CHECK (stock_quantity >= 0),
    low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 10.000 CHECK (low_stock_threshold >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partial unique index on barcode to allow multiple null/empty barcode values while enforcing uniqueness when barcode exists
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode_unique 
ON public.products (barcode) 
WHERE barcode IS NOT NULL AND barcode <> '';

-- Indexes for ultra-fast barcode scanner and product lookup
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON public.products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);

-- 5. INVOICES
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_time TIME NOT NULL DEFAULT CURRENT_TIME,
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'gst' CHECK (invoice_type IN ('gst', 'simple')),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('draft', 'completed', 'reversed')),
    customer_name VARCHAR(255) DEFAULT 'Cash Customer',
    customer_mobile VARCHAR(20) DEFAULT '',
    customer_gstin VARCHAR(20) DEFAULT '',
    customer_address TEXT DEFAULT '',
    is_interstate BOOLEAN NOT NULL DEFAULT FALSE,
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
    cgst_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (cgst_total >= 0),
    sgst_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sgst_total >= 0),
    igst_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (igst_total >= 0),
    tax_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_total >= 0),
    freight_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (freight_amount >= 0),
    round_off NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    grand_total NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (grand_total >= 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
    balance_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (balance_amount >= 0),
    payment_status VARCHAR(20) NOT NULL DEFAULT 'paid' CHECK (payment_status IN ('paid', 'partial', 'unpaid')),
    idempotency_key VARCHAR(64) UNIQUE,
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_mobile ON public.invoices(customer_mobile);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON public.invoices(created_at);

-- 6. INVOICE ITEMS (Snapshots item details at time of sale)
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    barcode VARCHAR(50) DEFAULT '',
    hsn_code VARCHAR(10) DEFAULT '',
    unit VARCHAR(20) NOT NULL DEFAULT 'Pcs',
    quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
    free_quantity NUMERIC(12,3) NOT NULL DEFAULT 0.000 CHECK (free_quantity >= 0),
    mrp NUMERIC(12,2) NOT NULL CHECK (mrp >= 0),
    unit_rate NUMERIC(12,2) NOT NULL CHECK (unit_rate >= 0),
    discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (discount_pct >= 0 AND discount_pct <= 100),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_type VARCHAR(20) NOT NULL DEFAULT 'inclusive',
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (tax_rate >= 0),
    taxable_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (taxable_amount >= 0),
    cgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (cgst_amount >= 0),
    sgst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (sgst_amount >= 0),
    igst_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (igst_amount >= 0),
    final_line_amount NUMERIC(12,2) NOT NULL CHECK (final_line_amount >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items(product_id);

-- 7. PAYMENTS
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('cash', 'upi', 'card', 'credit')),
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    transaction_ref TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments(invoice_id);

-- 8. STOCK MOVEMENTS
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity_change NUMERIC(12,3) NOT NULL,
    previous_stock NUMERIC(12,3) NOT NULL,
    new_stock NUMERIC(12,3) NOT NULL,
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN ('sale', 'purchase', 'adjustment', 'reversal', 'return')),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_invoice ON public.stock_movements(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at);

-- 9. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(50) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_data JSONB,
    new_data JSONB,
    performed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
