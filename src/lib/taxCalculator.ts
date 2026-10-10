import type { GstRate, TaxType, InvoiceItem } from '../types';

export interface CalculatedItem {
  schemeDiscountAmount: number;
  addlDiscountAmount: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGst: number;
  totalAmount: number;
}

export function calculateItemTaxes(
  qty: number,
  saleRate: number,
  schemeDiscountPct: number = 0,
  addlDiscountPct: number = 0,
  gstRate: GstRate = 12,
  taxType: TaxType = 'inclusive',
  isInterstate: boolean = false
): CalculatedItem {
  const grossAmount = Math.max(0, qty * saleRate);

  // 1. Calculate Scheme Discount
  const schemeDiscountAmount = Math.round((grossAmount * (schemeDiscountPct / 100)) * 100) / 100;
  const afterScheme = Math.max(0, grossAmount - schemeDiscountAmount);

  // 2. Calculate Additional Discount on remaining amount
  const addlDiscountAmount = Math.round((afterScheme * (addlDiscountPct / 100)) * 100) / 100;
  const totalDiscountAmount = Math.round((schemeDiscountAmount + addlDiscountAmount) * 100) / 100;

  const amountAfterDiscount = Math.max(0, grossAmount - totalDiscountAmount);

  let taxableAmount = 0;
  let totalGst = 0;

  if (taxType === 'inclusive') {
    if (gstRate > 0) {
      taxableAmount = Math.round((amountAfterDiscount / (1 + gstRate / 100)) * 100) / 100;
      totalGst = Math.round((amountAfterDiscount - taxableAmount) * 100) / 100;
    } else {
      taxableAmount = amountAfterDiscount;
      totalGst = 0;
    }
  } else {
    taxableAmount = amountAfterDiscount;
    totalGst = Math.round((taxableAmount * (gstRate / 100)) * 100) / 100;
  }

  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (isInterstate) {
    igstAmount = totalGst;
  } else {
    cgstAmount = Math.round((totalGst / 2) * 100) / 100;
    sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;
  }

  const totalAmount = taxType === 'inclusive' 
    ? amountAfterDiscount 
    : Math.round((taxableAmount + totalGst) * 100) / 100;

  return {
    schemeDiscountAmount,
    addlDiscountAmount,
    discountAmount: totalDiscountAmount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalGst,
    totalAmount
  };
}

export function calculateInvoiceTotals(
  items: InvoiceItem[], 
  billDiscountAmount: number = 0,
  freightAmount: number = 0,
  isGstEnabled: boolean = true
) {
  let subtotal = 0;
  let totalItemDiscount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let grossPayable = 0;

  items.forEach((item) => {
    totalItemDiscount += item.discountAmount;

    if (isGstEnabled) {
      subtotal += item.taxableAmount;
      cgstTotal += item.cgstAmount;
      sgstTotal += item.sgstAmount;
      igstTotal += item.igstAmount;
      grossPayable += item.totalAmount;
    } else {
      // GST is OFF: No tax component, full net line amount is used
      const lineNet = Math.max(0, (item.qty * item.unitRate) - item.discountAmount);
      subtotal += lineNet;
      grossPayable += lineNet;
    }
  });

  const totalDiscount = Math.round((totalItemDiscount + billDiscountAmount) * 100) / 100;
  const netBeforeRound = Math.max(0, grossPayable - billDiscountAmount + freightAmount);
  const netPayable = Math.round(netBeforeRound);
  const roundOff = Math.round((netPayable - netBeforeRound) * 100) / 100;
  const totalGst = isGstEnabled ? Math.round((cgstTotal + sgstTotal + igstTotal) * 100) / 100 : 0;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    grossPayable: Math.round(grossPayable * 100) / 100,
    totalDiscount,
    totalGst,
    cgstTotal: isGstEnabled ? Math.round(cgstTotal * 100) / 100 : 0,
    sgstTotal: isGstEnabled ? Math.round(sgstTotal * 100) / 100 : 0,
    igstTotal: isGstEnabled ? Math.round(igstTotal * 100) / 100 : 0,
    netBeforeRound: Math.round(netBeforeRound * 100) / 100,
    roundOff,
    netPayable
  };
}
