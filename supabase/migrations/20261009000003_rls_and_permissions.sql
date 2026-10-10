-- Migration 3: Row Level Security (RLS) & Role-Based Permissions
-- Target: Supabase PostgreSQL

-- Enable RLS on all tables
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. STORE SETTINGS POLICIES
CREATE POLICY "Allow authenticated users to read store settings"
ON public.store_settings FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Allow owner to update store settings"
ON public.store_settings FOR UPDATE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
    OR (SELECT COUNT(*) FROM public.profiles) = 0 -- Fallback for fresh setup
);

-- 2. PROFILES POLICIES
CREATE POLICY "Allow users to read profiles"
ON public.profiles FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Allow users to update own profile"
ON public.profiles FOR UPDATE
TO authenticated USING (id = auth.uid());

-- 3. CATEGORIES POLICIES
CREATE POLICY "Allow authenticated users to read categories"
ON public.categories FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert/update categories"
ON public.categories FOR ALL
TO authenticated USING (true);

-- 4. PRODUCTS POLICIES
CREATE POLICY "Allow authenticated users to read active products"
ON public.products FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage products"
ON public.products FOR ALL
TO authenticated USING (true);

-- 5. INVOICES POLICIES (PROTECTED FROM DIRECT MODIFICATION/DELETION)
CREATE POLICY "Allow authenticated users to view invoices"
ON public.invoices FOR SELECT
TO authenticated USING (true);

-- Invoices are created via SECURITY DEFINER complete_sale() function.
CREATE POLICY "Allow authenticated users to insert invoices"
ON public.invoices FOR INSERT
TO authenticated WITH CHECK (true);

-- Prevent direct UPDATE of completed invoices except for status reversal by owners
CREATE POLICY "Restrict invoice modifications to owners"
ON public.invoices FOR UPDATE
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
    OR (SELECT COUNT(*) FROM public.profiles) = 0
);

-- 6. INVOICE ITEMS POLICIES
CREATE POLICY "Allow authenticated users to view invoice items"
ON public.invoice_items FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert invoice items"
ON public.invoice_items FOR INSERT
TO authenticated WITH CHECK (true);

-- 7. PAYMENTS POLICIES
CREATE POLICY "Allow authenticated users to view payments"
ON public.payments FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert payments"
ON public.payments FOR INSERT
TO authenticated WITH CHECK (true);

-- 8. STOCK MOVEMENTS POLICIES
CREATE POLICY "Allow authenticated users to view stock movements"
ON public.stock_movements FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to insert stock movements"
ON public.stock_movements FOR INSERT
TO authenticated WITH CHECK (true);

-- 9. AUDIT LOGS POLICIES
CREATE POLICY "Allow owners to view audit logs"
ON public.audit_logs FOR SELECT
TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin'))
    OR (SELECT COUNT(*) FROM public.profiles) = 0
);

-- ANONYMOUS/OFFLINE FALLBACK READ POLICIES (If anon key is used locally without auth session)
CREATE POLICY "Allow anon read products for local cache" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read store settings" ON public.store_settings FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon read categories" ON public.categories FOR SELECT TO anon USING (true);

-- GRANT EXECUTE PERMISSIONS ON RPC FUNCTIONS
GRANT EXECUTE ON FUNCTION public.complete_sale TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_sale TO anon;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number TO anon;
