-- Migration 2: Server-Side Calculation Engine, Invoice Generator & Atomic complete_sale Procedure
-- Target: Supabase PostgreSQL

-- 1. INVOICE NUMBER SEQUENCE & SERVER-SIDE GENERATOR
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1001 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(p_prefix VARCHAR DEFAULT 'WR-')
RETURNS VARCHAR AS $$
DECLARE
  v_year_str VARCHAR;
  v_seq INT;
  v_month INT;
BEGIN
  v_month := EXTRACT(MONTH FROM CURRENT_DATE);
  IF v_month >= 4 THEN
    v_year_str := SUBSTRING(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT FROM 3 FOR 2) || SUBSTRING((EXTRACT(YEAR FROM CURRENT_DATE) + 1)::TEXT FROM 3 FOR 2);
  ELSE
    v_year_str := SUBSTRING((EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT FROM 3 FOR 2) || SUBSTRING(EXTRACT(YEAR FROM CURRENT_DATE)::TEXT FROM 3 FOR 2);
  END IF;

  v_seq := NEXTVAL('public.invoice_number_seq');
  RETURN p_prefix || v_year_str || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;

-- 2. AUTOMATIC UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();
CREATE TRIGGER trg_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_column();

-- 3. SERVER-SIDE VALIDATED ATOMIC COMPLETE SALE TRANSACTION FUNCTION
CREATE OR REPLACE FUNCTION public.complete_sale(
    p_idempotency_key VARCHAR,
    p_customer_name VARCHAR,
    p_customer_mobile VARCHAR,
    p_customer_gstin VARCHAR,
    p_customer_address TEXT,
    p_items JSONB,
    p_payments JSONB,
    p_invoice_type VARCHAR DEFAULT 'gst',
    p_is_interstate BOOLEAN DEFAULT FALSE,
    p_discount_amount NUMERIC DEFAULT 0.00,
    p_freight_amount NUMERIC DEFAULT 0.00,
    p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
    v_existing_invoice_id UUID;
    v_invoice_id UUID;
    v_invoice_number VARCHAR;
    v_subtotal NUMERIC(12,2) := 0.00;
    v_cgst_total NUMERIC(12,2) := 0.00;
    v_sgst_total NUMERIC(12,2) := 0.00;
    v_igst_total NUMERIC(12,2) := 0.00;
    v_tax_total NUMERIC(12,2) := 0.00;
    v_total_item_discount NUMERIC(12,2) := 0.00;
    v_gross_payable NUMERIC(12,2) := 0.00;
    v_net_before_round NUMERIC(12,2) := 0.00;
    v_round_off NUMERIC(12,2) := 0.00;
    v_grand_total NUMERIC(12,2) := 0.00;
    v_paid_total NUMERIC(12,2) := 0.00;
    
    item_elem JSONB;
    pay_elem JSONB;
    v_prod RECORD;
    v_qty NUMERIC(12,3);
    v_free_qty NUMERIC(12,3);
    v_rate NUMERIC(12,2);
    v_sch_disc_pct NUMERIC(5,2);
    v_addl_disc_pct NUMERIC(5,2);
    v_sch_disc_amt NUMERIC(12,2);
    v_addl_disc_amt NUMERIC(12,2);
    v_tot_disc_amt NUMERIC(12,2);
    v_line_gross NUMERIC(12,2);
    v_after_sch NUMERIC(12,2);
    v_net_line_base NUMERIC(12,2);
    v_line_taxable NUMERIC(12,2);
    v_line_gst NUMERIC(12,2);
    v_line_cgst NUMERIC(12,2);
    v_line_sgst NUMERIC(12,2);
    v_line_igst NUMERIC(12,2);
    v_line_final NUMERIC(12,2);
    
    v_prefix VARCHAR := 'WR-';
    v_user_id UUID := auth.uid();
    v_result JSONB;
BEGIN
    -- 1. Idempotency Key Check
    IF p_idempotency_key IS NOT NULL AND p_idempotency_key <> '' THEN
        SELECT id INTO v_existing_invoice_id 
        FROM public.invoices 
        WHERE idempotency_key = p_idempotency_key;

        IF v_existing_invoice_id IS NOT NULL THEN
            SELECT row_to_json(i)::jsonb INTO v_result 
            FROM public.invoices i WHERE id = v_existing_invoice_id;
            RETURN jsonb_build_object('success', true, 'replayed', true, 'invoice', v_result);
        END IF;
    END IF;

    -- 2. Validate Items Payload
    IF jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'CANNOT_COMPLETE_SALE: Invoice must contain at least one item.';
    END IF;

    -- 3. Lock & Validate Stock
    FOR item_elem IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_qty := (item_elem->>'qty')::NUMERIC;
        IF v_qty <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Item quantity must be greater than zero.';
        END IF;

        SELECT * INTO v_prod FROM public.products 
        WHERE id = (item_elem->>'productId')::UUID FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Product ID % does not exist.', (item_elem->>'productId');
        END IF;

        IF NOT v_prod.is_active THEN
            RAISE EXCEPTION 'PRODUCT_INACTIVE: Product "%" is disabled.', v_prod.name;
        END IF;

        IF v_prod.stock_quantity < v_qty THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product "%" (SKU: %) has only % units in stock (requested %).', 
                v_prod.name, v_prod.sku, v_prod.stock_quantity, v_qty;
        END IF;
    END LOOP;

    -- Fetch store invoice prefix
    SELECT invoice_prefix INTO v_prefix FROM public.store_settings LIMIT 1;
    IF v_prefix IS NULL THEN v_prefix := 'WR-'; END IF;

    v_invoice_number := public.generate_invoice_number(v_prefix);
    v_invoice_id := gen_random_uuid();

    -- 4. SERVER-SIDE INDEPENDENT CALCULATION OF TAXABLE & GST TOTALS
    FOR item_elem IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_prod FROM public.products WHERE id = (item_elem->>'productId')::UUID;
        
        v_qty := (item_elem->>'qty')::NUMERIC;
        v_free_qty := COALESCE((item_elem->>'freeQty')::NUMERIC, 0.000);
        v_rate := COALESCE((item_elem->>'unitRate')::NUMERIC, v_prod.selling_rate);
        v_sch_disc_pct := COALESCE((item_elem->>'schemeDiscountPct')::NUMERIC, 0.00);
        v_addl_disc_pct := COALESCE((item_elem->>'addlDiscountPct')::NUMERIC, 0.00);

        -- Step A: Gross Line Amount
        v_line_gross := ROUND((v_qty * v_rate)::NUMERIC, 2);

        -- Step B: Sequential Scheme & Additional Discount Math
        v_sch_disc_amt := ROUND((v_line_gross * (v_sch_disc_pct / 100.0))::NUMERIC, 2);
        v_after_sch := GREATEST(0.00, v_line_gross - v_sch_disc_amt);
        v_addl_disc_amt := ROUND((v_after_sch * (v_addl_disc_pct / 100.0))::NUMERIC, 2);
        v_tot_disc_amt := ROUND((v_sch_disc_amt + v_addl_disc_amt)::NUMERIC, 2);

        v_net_line_base := GREATEST(0.00, v_line_gross - v_tot_disc_amt);

        -- Step C: Taxable Amount & GST Calculation
        IF v_prod.tax_type = 'inclusive' THEN
            IF v_prod.gst_rate > 0 THEN
                v_line_taxable := ROUND((v_net_line_base / (1.0 + (v_prod.gst_rate / 100.0)))::NUMERIC, 2);
                v_line_gst := ROUND((v_net_line_base - v_line_taxable)::NUMERIC, 2);
            ELSE
                v_line_taxable := v_net_line_base;
                v_line_gst := 0.00;
            END IF;
            v_line_final := v_net_line_base;
        ELSE
            v_line_taxable := v_net_line_base;
            v_line_gst := ROUND((v_line_taxable * (v_prod.gst_rate / 100.0))::NUMERIC, 2);
            v_line_final := ROUND((v_line_taxable + v_line_gst)::NUMERIC, 2);
        END IF;

        -- Step D: Tax Split (Intra-state vs Inter-state)
        IF p_is_interstate THEN
            v_line_igst := v_line_gst;
            v_line_cgst := 0.00;
            v_line_sgst := 0.00;
        ELSE
            v_line_cgst := ROUND((v_line_gst / 2.0)::NUMERIC, 2);
            v_line_sgst := ROUND((v_line_gst - v_line_cgst)::NUMERIC, 2);
            v_line_igst := 0.00;
        END IF;

        -- Accumulate Totals
        v_subtotal := v_subtotal + v_line_taxable;
        v_total_item_discount := v_total_item_discount + v_tot_disc_amt;
        v_cgst_total := v_cgst_total + v_line_cgst;
        v_sgst_total := v_sgst_total + v_line_sgst;
        v_igst_total := v_igst_total + v_line_igst;
        v_gross_payable := v_gross_payable + v_line_final;

        -- Insert Item Snapshot
        INSERT INTO public.invoice_items (
            invoice_id, product_id, product_name, sku, barcode, hsn_code, unit,
            quantity, free_quantity, mrp, unit_rate, discount_pct, discount_amount,
            tax_type, tax_rate, taxable_amount, cgst_amount, sgst_amount, igst_amount, final_line_amount
        ) VALUES (
            v_invoice_id, v_prod.id, v_prod.name, v_prod.sku, COALESCE(v_prod.barcode, ''), COALESCE(v_prod.hsn_code, ''), v_prod.unit,
            v_qty, v_free_qty, v_prod.mrp, v_rate, v_sch_disc_pct + v_addl_disc_pct, v_tot_disc_amt,
            v_prod.tax_type, v_prod.gst_rate, v_line_taxable, v_line_cgst, v_line_sgst, v_line_igst, v_line_final
        );

        -- Deduct Stock
        UPDATE public.products 
        SET stock_quantity = stock_quantity - v_qty
        WHERE id = v_prod.id;

        -- Record Stock Movement
        INSERT INTO public.stock_movements (
            product_id, quantity_change, previous_stock, new_stock, movement_type, invoice_id, reason, created_by
        ) VALUES (
            v_prod.id, -v_qty, v_prod.stock_quantity, v_prod.stock_quantity - v_qty, 'sale', v_invoice_id, 'Invoice ' || v_invoice_number, v_user_id
        );
    END LOOP;

    -- Grand Total & Round Off Calculations
    v_tax_total := v_cgst_total + v_sgst_total + v_igst_total;
    v_net_before_round := GREATEST(0.00, v_gross_payable - p_discount_amount + p_freight_amount);
    v_grand_total := ROUND(v_net_before_round);
    v_round_off := v_grand_total - v_net_before_round;

    -- Calculate Payments Total
    FOR pay_elem IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_paid_total := v_paid_total + (pay_elem->>'amount')::NUMERIC;
    END LOOP;

    -- Insert Invoice Master Record
    INSERT INTO public.invoices (
        id, invoice_number, invoice_type, status, customer_name, customer_mobile, customer_gstin, customer_address,
        is_interstate, subtotal, discount_amount, taxable_amount, cgst_total, sgst_total, igst_total, tax_total,
        freight_amount, round_off, grand_total, paid_amount, balance_amount, payment_status, idempotency_key, notes, created_by
    ) VALUES (
        v_invoice_id, v_invoice_number, p_invoice_type, 'completed',
        COALESCE(p_customer_name, 'Cash Customer'), COALESCE(p_customer_mobile, ''), COALESCE(p_customer_gstin, ''), COALESCE(p_customer_address, ''),
        p_is_interstate, v_subtotal, p_discount_amount + v_total_item_discount, v_subtotal, v_cgst_total, v_sgst_total, v_igst_total, v_tax_total,
        p_freight_amount, v_round_off, v_grand_total, v_paid_total, GREATEST(0.00, v_grand_total - v_paid_total),
        CASE WHEN v_paid_total >= v_grand_total THEN 'paid' WHEN v_paid_total > 0 THEN 'partial' ELSE 'unpaid' END,
        p_idempotency_key, p_notes, v_user_id
    );

    -- Insert Payments
    FOR pay_elem IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.payments (
            invoice_id, payment_method, amount, transaction_ref, notes, created_by
        ) VALUES (
            v_invoice_id, (pay_elem->>'method')::VARCHAR, (pay_elem->>'amount')::NUMERIC,
            COALESCE(pay_elem->>'transactionRef', ''), COALESCE(pay_elem->>'notes', ''), v_user_id
        );
    END LOOP;

    SELECT row_to_json(i)::jsonb INTO v_result FROM public.invoices i WHERE id = v_invoice_id;
    RETURN jsonb_build_object('success', true, 'replayed', false, 'invoice', v_result);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
