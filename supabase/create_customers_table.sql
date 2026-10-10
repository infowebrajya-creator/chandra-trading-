-- ==============================================================================
-- WEBRAJYA POS - CONTACTS / CLIENTS TABLE MIGRATION
-- Target DB: PostgreSQL / Supabase
-- Description: Stores customer & client directory with contact info & credit balance
-- ==============================================================================

-- 1. Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY DEFAULT ('cust_' || gen_random_uuid()),
    name TEXT NOT NULL,
    mobile TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    gstin TEXT,
    credit_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist in case table was partially created
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS mobile TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS state TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS pincode TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS gstin TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Indexes for search speed
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);
CREATE INDEX IF NOT EXISTS idx_customers_mobile ON public.customers (mobile);
CREATE INDEX IF NOT EXISTS idx_customers_gstin ON public.customers (gstin);

-- 3. Enable Row Level Security (RLS) & Policies
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow public read access to customers') THEN
        CREATE POLICY "Allow public read access to customers" ON public.customers FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'customers' AND policyname = 'Allow full access for authenticated users to customers') THEN
        CREATE POLICY "Allow full access for authenticated users to customers" ON public.customers FOR ALL USING (true);
    END IF;
END $$;

-- 4. Initial Seed Sample Customer
INSERT INTO public.customers (name, mobile, address, notes)
VALUES
    ('Cash Customer', '', 'Local Counter Sale', 'Walk-in cash customer')
ON CONFLICT DO NOTHING;

-- View all customers
SELECT id, name, mobile, address, gstin, credit_balance, is_active
FROM public.customers
ORDER BY name;
