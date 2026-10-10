-- =====================================================================
-- WEBRAJYA BILLING POS - SUPABASE POSTGRESQL VERIFICATION SCRIPT
-- Run this script in the Supabase SQL Editor to verify schema & functions
-- =====================================================================

-- 1. VERIFY ALL 9 REQUIRED TABLES EXIST
SELECT 
    table_name,
    (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN (
    'store_settings', 'profiles', 'categories', 'products', 
    'invoices', 'invoice_items', 'payments', 'stock_movements', 'audit_logs'
  )
ORDER BY table_name;

-- 2. VERIFY FOREIGN KEYS & UNIQUE CONSTRAINTS
SELECT
    tc.table_name, 
    kcu.column_name, 
    tc.constraint_type,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
ORDER BY tc.table_name, tc.constraint_type;

-- 3. TEST INVOICE NUMBER GENERATOR FUNCTION
SELECT public.generate_invoice_number('WR-') AS test_invoice_number_1;
SELECT public.generate_invoice_number('WR-') AS test_invoice_number_2;

-- 4. SEED TEST CATEGORY & PRODUCT FOR FUNCTION VERIFICATION
INSERT INTO public.categories (name, description) 
VALUES ('Verification Test Category', 'Created for complete_sale testing')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.products (
    sku, barcode, name, category, pack_info, unit, mrp, purchase_price, selling_rate, hsn_code, gst_rate, tax_type, stock_quantity, low_stock_threshold
) VALUES (
    'VERIFY-SKU-001', '8900000000001', 'Test Classmate Notebook', 'Verification Test Category', '1 Pcs', 'Pcs', 75.00, 45.00, 70.00, '4820', 12.00, 'inclusive', 100.000, 10.000
) ON CONFLICT (sku) DO UPDATE SET stock_quantity = 100.000
RETURNING id, name, sku, stock_quantity;

-- 5. TEST ATOMIC COMPLETE_SALE FUNCTION (Execution & Stock Deduction Verification)
DO $$
DECLARE
    v_test_prod_id UUID;
    v_idempotency_key VARCHAR := 'test_idem_' || gen_random_uuid()::text;
    v_sale_result JSONB;
    v_replayed_result JSONB;
    v_after_stock NUMERIC;
BEGIN
    SELECT id INTO v_test_prod_id FROM public.products WHERE sku = 'VERIFY-SKU-001';

    -- Call complete_sale function
    v_sale_result := public.complete_sale(
        p_idempotency_key := v_idempotency_key,
        p_customer_name := 'Test Verification Customer',
        p_customer_mobile := '9999988888',
        p_customer_gstin := '07AAAAA0000A1Z5',
        p_customer_address := 'New Delhi Test Address',
        p_items := jsonb_build_array(
            jsonb_build_object('productId', v_test_prod_id, 'qty', 2, 'unitRate', 70.00, 'discountPct', 0.00)
        ),
        p_payments := jsonb_build_array(
            jsonb_build_object('method', 'cash', 'amount', 140.00)
        ),
        p_invoice_type := 'gst',
        p_is_interstate := false,
        p_discount_amount := 0.00,
        p_notes := 'Verification Test Sale'
    );

    RAISE NOTICE 'COMPLETE_SALE TEST RESULT: %', v_sale_result;

    -- Verify Idempotency replay protection
    v_replayed_result := public.complete_sale(
        p_idempotency_key := v_idempotency_key,
        p_customer_name := 'Test Verification Customer',
        p_customer_mobile := '9999988888',
        p_customer_gstin := '07AAAAA0000A1Z5',
        p_customer_address := 'New Delhi Test Address',
        p_items := jsonb_build_array(
            jsonb_build_object('productId', v_test_prod_id, 'qty', 2, 'unitRate', 70.00)
        ),
        p_payments := jsonb_build_array(
            jsonb_build_object('method', 'cash', 'amount', 140.00)
        )
    );

    RAISE NOTICE 'IDEMPOTENCY REPLAY TEST RESULT: %', v_replayed_result;

    -- Verify Stock Deduction (Should be 98 left from 100)
    SELECT stock_quantity INTO v_after_stock FROM public.products WHERE id = v_test_prod_id;
    IF v_after_stock = 98.000 THEN
        RAISE NOTICE 'SUCCESS: Stock correctly updated from 100.000 to 98.000!';
    ELSE
        RAISE EXCEPTION 'STOCK FAILURE: Expected stock 98.000 but found %', v_after_stock;
    END IF;
END;
$$;

-- 6. VERIFY ROW LEVEL SECURITY (RLS) POLICIES ENABLED
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'store_settings', 'profiles', 'categories', 'products', 
    'invoices', 'invoice_items', 'payments', 'stock_movements', 'audit_logs'
  );
