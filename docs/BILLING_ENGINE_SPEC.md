# WebRajya Billing POS - Calculation Engine Specification

This specification documents the mathematical formulas, discount application precedence, GST tax calculations, document type configurations, and server-side validation rules for **WebRajya Billing POS**.

---

## 📄 1. Document Types & Tax Configurations

The cashier selects one of two document types per transaction:

1. **GST Tax Invoice (`gst`)**:
   - Used for GST-registered B2B & B2C sales.
   - Includes full GST breakdown table (CGST + SGST or IGST), item HSN codes, shop GSTIN, customer GSTIN (if provided), and tax summary.
2. **Simple Cash Bill (`simple`)**:
   - Used for simple retail transactions / cash memos / non-GST estimates according to the shop's verified tax status and applicable law.
   - Line totals and net payable calculations use identical, mathematically verified formulas.

---

## 🧮 2. Mathematical Formulas & Discount Order

### Step A: Gross Line Amount
$$\text{Gross Amount} = \text{Quantity} \times \text{Selling Rate}$$
- Supports fractional quantities (e.g. `2.5` reams / `0.5` kg).
- `Free Quantity` units do not add to the line amount but are tracked for inventory movement.

---

### Step B: Discount Precedence (Sequential Order)
1. **Scheme Discount**: Applied first on the Gross Amount.
   $$\text{Scheme Discount Amount} = \text{ROUND}\left(\text{Gross Amount} \times \frac{\text{Scheme Discount \%}}{100}, 2\right)$$
   $$\text{Amount After Scheme} = \max\left(0, \text{Gross Amount} - \text{Scheme Discount Amount}\right)$$

2. **Additional Discount**: Applied second on the remaining amount after scheme discount.
   $$\text{Additional Discount Amount} = \text{ROUND}\left(\text{Amount After Scheme} \times \frac{\text{Additional Discount \%}}{100}, 2\right)$$

3. **Total Item Discount**:
   $$\text{Total Item Discount} = \text{ROUND}(\text{Scheme Discount Amount} + \text{Additional Discount Amount}, 2)$$
   $$\text{Net Line Base Amount} = \max\left(0, \text{Gross Amount} - \text{Total Item Discount}\right)$$

---

### Step C: Taxable Value & GST Calculation Formulas

Product pricing policies support both **Tax-Inclusive** (MRP includes GST) and **Tax-Exclusive** (GST added extra) pricing on a per-product basis:

#### 1. Tax-Inclusive Pricing (Default for Stationery Retail)
$$\text{Taxable Amount} = \text{ROUND}\left(\frac{\text{Net Line Base Amount}}{1 + \frac{\text{GST Rate \%}}{100}}, 2\right)$$
$$\text{GST Amount} = \text{ROUND}(\text{Net Line Base Amount} - \text{Taxable Amount}, 2)$$
$$\text{Final Line Total} = \text{Net Line Base Amount}$$

#### 2. Tax-Exclusive Pricing (Business B2B Pricing)
$$\text{Taxable Amount} = \text{Net Line Base Amount}$$
$$\text{GST Amount} = \text{ROUND}\left(\text{Taxable Amount} \times \frac{\text{GST Rate \%}}{100}, 2\right)$$
$$\text{Final Line Total} = \text{ROUND}(\text{Taxable Amount} + \text{GST Amount}, 2)$$

---

### Step D: Intra-State vs Inter-State Tax Split
- **Intra-State (Same State Supply, e.g. Delhi to Delhi)**:
  $$\text{CGST Amount} = \text{ROUND}\left(\frac{\text{GST Amount}}{2}, 2\right)$$
  $$\text{SGST Amount} = \text{ROUND}(\text{GST Amount} - \text{CGST Amount}, 2)$$
  $$\text{IGST Amount} = 0.00$$

- **Inter-State (Out-of-State Supply)**:
  $$\text{IGST Amount} = \text{GST Amount}$$
  $$\text{CGST Amount} = 0.00, \quad \text{SGST Amount} = 0.00$$

---

### Step E: Invoice Master Totals & Integer Round-Off

1. **Subtotal (Taxable Total)**: $\sum \text{Item Taxable Amount}$
2. **Total GST**: $\sum \text{Item CGST} + \sum \text{Item SGST} + \sum \text{Item IGST}$
3. **Net Payable Before Rounding**:
   $$\text{Net Before Round} = \max\left(0, \sum \text{Item Line Total} - \text{Bill Discount Amount} + \text{Freight Amount}\right)$$
4. **Grand Total (Net Payable Integer)**:
   $$\text{Grand Total} = \text{ROUND}(\text{Net Before Round})$$
5. **Round-Off Difference**:
   $$\text{Round Off} = \text{Grand Total} - \text{Net Before Round}$$

---

## 🛡️ 3. Server-Side PostgreSQL Validation (`complete_sale`)

The database procedure `public.complete_sale()` in Supabase PostgreSQL independently re-calculates all item taxable amounts, discounts, GST splits, and grand totals during transaction execution. Browser-submitted totals are not trusted for financial ledger entries.

All historical item attributes (`sku`, `barcode`, `product_name`, `mrp`, `unit_rate`, `discount_pct`, `taxable_amount`, `cgst_amount`, `sgst_amount`, `igst_amount`, `final_line_amount`) are stored as immutable snapshots in `invoice_items`.
