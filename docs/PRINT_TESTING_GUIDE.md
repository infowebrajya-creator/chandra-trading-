# WebRajya Billing POS — A5 Print Invoice Specification & Testing Guide

## 1. Physical Paper Specifications

| Attribute | Specification |
| :--- | :--- |
| **Paper Format** | A5 Portrait |
| **Dimensions** | 148 mm × 210 mm (5.83 in × 8.27 in) |
| **Margins** | `@page { size: A5 portrait; margin: 6mm 8mm; }` |
| **Borders** | Thin black solid borders (`1px solid #000000`) |
| **Color Scheme** | Printer-friendly crisp monochrome (White background, Black text) |

---

## 2. Mandatory Column Structure (In Exact Order)

The printed document follows the stationery shop's original **CREDIT ESTIMATE / TAX INVOICE** layout with **9 columns**:

1. **`S.`** — Line item serial number (1, 2, 3...)
2. **`Item Description`** — Full product name and description
3. **`Remark`** — Pack information and HSN code (e.g. `1 Pcs | HSN: 4820`)
4. **`Qty.`** — Billed quantity
5. **`FREE`** — Scheme free quantity (`freeQty` or `-`)
6. **`Rate`** — Unit selling price (`unitRate`)
7. **`MRP`** — Maximum retail price (`mrp`)
8. **`DIS%`** — Line discount percentage (`schemeDiscountPct + addlDiscountPct`)
9. **`Amount`** — Final line amount

---

## 3. Document Headers & Document Type Rules

- **GST Invoice (`invoiceType: 'gst'`)**:
  - Document Title Box: **`TAX INVOICE`**
  - Displays shop GSTIN, state code, customer GSTIN, supply type (Intra-state CGST + SGST vs Inter-state IGST), and full tax summary.
- **Simple Bill (`invoiceType: 'simple'`)**:
  - Document Title Box: **`RETAIL BILL / CREDIT ESTIMATE`**
  - Displays customer name, payment mode, item totals, and compliant invoice summary.

---

## 4. Totals & Footer Section

- **Authoritative Totals**: The print engine directly renders stored numbers from the saved `Invoice` record. Totals are never recalculated during print rendering.
- **Summary Fields**:
  - Subtotal (Taxable Value of Goods)
  - Total Discount
  - Tax Breakdown (CGST, SGST, IGST)
  - Freight / Delivery Overhead
  - Integer Rupee Round-Off Adjustment
  - **Grand Total / Net Payable**
- **Footer**:
  - **Amount in Words**: Formatted in Indian Rupees using Lakhs/Crores notation (e.g., *"Rupees One Thousand Two Hundred Fifty Only"*).
  - **Bank & UPI Details**: Shop Bank Name, Account Number, IFSC, and UPI ID.
  - **Terms and Conditions**: Configurable numbered terms.
  - **Authorised Signatory**: Formal signature line (`"For " + shopName`).

---

## 5. Physical Printer Scaling & Testing Instructions

1. **Browser Print Settings (Chrome / Edge / Firefox / Safari)**:
   - **Destination**: Select shop's thermal/laser printer (or "Save as PDF").
   - **Paper Size**: Select **A5** (148 × 210 mm).
   - **Orientation**: **Portrait**.
   - **Margins**: Set to **Default** or **Minimum**.
   - **Scale**: **100%** (or "Fit to Printable Area").
   - **Headers and Footers**: Uncheck browser default URL/Date headers & footers.
   - **Background Graphics**: Optional (CSS uses solid `#000` borders and white background).

2. **PDF Verification Steps**:
   - Save invoice as PDF.
   - Open PDF viewer and select 100% actual size view.
   - Verify all 9 column headers match exact order.
   - Confirm grand total in words matches net payable amount.

