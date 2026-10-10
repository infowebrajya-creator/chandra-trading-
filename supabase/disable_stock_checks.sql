-- ==============================================================================
-- WEBRAJYA POS - DISABLE STOCK CHECKS IN SUPABASE RPC
-- Description: Removes stock validation & stock deduction from complete_sale()
-- Run this script in Supabase SQL Editor to allow saving sales without stock limits
-- ==============================================================================

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

    -- Fetch store invoice prefix
    SELECT invoice_prefix INTO v_prefix FROM public.store_settings LIMIT 1;
    IF v_prefix IS NULL THEN v_prefix := 'WR-'; END IF;

    v_invoice_number := public.generate_invoice_number(v_prefix);
    v_invoice_id := gen_random_uuid();

    -- 3. SERVER-SIDE INDEPENDENT CALCULATION OF TAXABLE & GST TOTALS
    FOR item_elem IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        SELECT * INTO v_prod FROM public.products WHERE id = (item_elem->>'productId')::UUID;
        
        v_qty := (item_elem->>'qty')::NUMERIC;
        v_free_qty := COALESCE((item_elem->>'freeQty')::NUMERIC, 0.00);
        v_rate := (item_elem->>'unitRate')::NUMERIC;
        v_sch_disc_pct := COALESCE((item_elem->>'schemeDiscountPct')::NUMERIC, 0.00);
        v_addl_disc_pct := COALESCE((item_elem->>'addlDiscountPct')::NUMERIC, 0.00);

        v_line_gross := ROUND(v_qty * v_rate, 2);
        v_sch_disc_amt := ROUND(v_line_gross * (v_sch_disc_pct / 100.0), 2);
        v_after_sch := v_line_gross - v_sch_disc_amt;
        v_addl_disc_amt := ROUND(v_after_sch * (v_addl_disc_pct / 100.0), 2);
        v_tot_disc_amt := v_sch_disc_amt + v_addl_disc_amt;

        v_net_line_base := v_line_gross - v_tot_disc_amt;

        IF v_prod.tax_type = 'inclusive' AND v_prod.gst_rate > 0 THEN
            v_line_taxable := ROUND(v_net_line_base / (1.0 + (v_prod.gst_rate / 100.0)), 2);
            v_line_gst := v_net_line_base - v_line_taxable;
        ELSE
            v_line_taxable := v_net_line_base;
            v_line_gst := ROUND(v_line_taxable * (v_prod.gst_rate / 100.0), 2);
        END IF;

        IF p_is_interstate THEN
            v_line_igst := v_line_gst;
            v_line_cgst := 0.00;
            v_line_sgst := 0.00;
        ELSE
            v_line_igst := 0.00;
            v_line_cgst := ROUND(v_line_gst / 2.0, 2);
            v_line_sgst := v_line_gst - v_line_cgst;
        END IF;

        v_line_final := v_line_taxable + v_line_gst;

        v_subtotal := v_subtotal + v_line_taxable;
        v_cgst_total := v_cgst_total + v_line_cgst;
        v_sgst_total := v_sgst_total + v_line_sgst;
        v_igst_total := v_igst_total + v_line_igst;
        v_tax_total := v_tax_total + v_line_gst;
        v_total_item_discount := v_total_item_discount + v_tot_disc_amt;

        -- Insert Invoice Line Item
        INSERT INTO public.invoice_items (
            id, invoice_id, product_id, product_name, sku, barcode, hsn_code,
            pack_info, unit, quantity, free_quantity, mrp, unit_rate,
            scheme_discount_pct, scheme_discount_amount, addl_discount_pct, addl_discount_amount,
            discount_pct, discount_amount, gst_rate, tax_type, taxable_amount,
            cgst_amount, sgst_amount, igst_amount, total_amount
        ) VALUES (
            gen_random_uuid(), v_invoice_id, v_prod.id, v_prod.name, v_prod.sku, v_prod.barcode, v_prod.hsn_code,
            v_prod.pack_info, v_prod.unit, v_qty, v_free_qty, v_prod.mrp, v_rate,
            v_sch_disc_pct, v_sch_disc_amt, v_addl_disc_pct, v_addl_disc_amt,
            (v_sch_disc_pct + v_addl_disc_pct), v_tot_disc_amt, v_prod.gst_rate, v_prod.tax_type,
            v_line_taxable, v_line_cgst, v_line_sgst, v_line_igst, v_line_final
        );
    END LOOP;

    -- 4. Calculate Final Financials & Round-off
    v_gross_payable := v_subtotal + v_tax_total - p_discount_amount + p_freight_amount;
    v_grand_total := ROUND(v_gross_payable);
    v_round_off := v_grand_total - v_gross_payable;

    -- Calculate total paid across payments payload
    FOR pay_elem IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        v_paid_total := v_paid_total + (pay_elem->>'amount')::NUMERIC;
    END LOOP;

    -- 5. Insert Invoice Master Record
    INSERT INTO public.invoices (
        id, invoice_number, invoice_type, invoice_date, invoice_time,
        customer_name, customer_mobile, customer_gstin, customer_address,
        subtotal, discount_amount, tax_total, cgst_total, sgst_total, igst_total,
        freight_amount, round_off, grand_total, paid_amount, balance_amount,
        payment_mode, status, is_interstate, notes, idempotency_key, created_by
    ) VALUES (
        v_invoice_id, v_invoice_number, p_invoice_type, CURRENT_DATE, CURRENT_TIME::TIME(0),
        COALESCE(NULLIF(TRIM(p_customer_name), ''), 'Cash Customer'), p_customer_mobile, p_customer_gstin, p_customer_address,
        v_subtotal, (v_total_item_discount + p_discount_amount), v_tax_total, v_cgst_total, v_sgst_total, v_igst_total,
        p_freight_amount, v_round_off, v_grand_total, v_paid_total, GREATEST(0.00, v_grand_total - v_paid_total),
        (p_payments->0->>'method'), 'completed', p_is_interstate, p_notes, p_idempotency_key, v_user_id
    );

    -- 6. Insert Payment Records
    FOR pay_elem IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        INSERT INTO public.payments (
            id, invoice_id, payment_method, amount, transaction_ref, notes, created_by
        ) VALUES (
            gen_random_uuid(), v_invoice_id, (pay_elem->>'method'), (pay_elem->>'amount')::NUMERIC,
            (pay_elem->>'transactionRef'), 'Initial POS Payment', v_user_id
        );
    END LOOP;

    -- 7. Return Full Json Result
    SELECT row_to_json(i)::jsonb INTO v_result FROM public.invoices i WHERE id = v_invoice_id;
    RETURN jsonb_build_object('success', true, 'invoice', v_result);
END;
$$ LANGUAGE plpgsql VOLATILE SECURITY DEFINER;
