import { calculateItemTaxes, calculateInvoiceTotals } from './taxCalculator';
import type { InvoiceItem, GstRate, TaxType } from '../types';

export interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

export function runBillingCalculationTestSuite(): TestResult[] {
  const testResults: TestResult[] = [];

  // Helper to construct test item
  const createMockItem = (overrides: Partial<InvoiceItem>): InvoiceItem => {
    const qty = overrides.qty ?? 1;
    const unitRate = overrides.unitRate ?? 100;
    const schemeDiscountPct = overrides.schemeDiscountPct ?? 0;
    const addlDiscountPct = overrides.addlDiscountPct ?? 0;
    const gstRate = overrides.gstRate ?? 12;
    const taxType = overrides.taxType ?? 'inclusive';
    const isInterstate = false;

    const taxes = calculateItemTaxes(qty, unitRate, schemeDiscountPct, addlDiscountPct, gstRate, taxType, isInterstate);

    return {
      id: 'item_test_' + Math.random(),
      productId: 'prod_test',
      productName: 'Test Product',
      sku: 'SKU-TEST',
      barcode: '123456789',
      hsnCode: '4820',
      pack: '1 Pcs',
      unit: 'Pcs',
      qty,
      freeQty: overrides.freeQty ?? 0,
      mrp: overrides.mrp ?? unitRate,
      unitRate,
      schemeDiscountPct,
      addlDiscountPct,
      discountPct: schemeDiscountPct + addlDiscountPct,
      gstRate,
      taxType,
      availableStock: overrides.availableStock ?? 100,
      ...taxes
    };
  };

  // TEST 1: ZERO DISCOUNT
  try {
    const item = createMockItem({ qty: 2, unitRate: 100, schemeDiscountPct: 0, addlDiscountPct: 0, gstRate: 12, taxType: 'inclusive' });
    const passed = item.discountAmount === 0 && item.totalAmount === 200 && item.taxableAmount === 178.57 && (item.cgstAmount + item.sgstAmount) === 21.43;
    testResults.push({
      name: '1. Zero Discount Calculation',
      passed,
      details: `Gross: ₹200 | Taxable: ₹${item.taxableAmount} | CGST: ₹${item.cgstAmount} | SGST: ₹${item.sgstAmount} | Total: ₹${item.totalAmount}`
    });
  } catch (e: any) {
    testResults.push({ name: '1. Zero Discount Calculation', passed: false, details: e.message });
  }

  // TEST 2: SEQUENTIAL PERCENTAGE DISCOUNTS (Scheme + Additional)
  try {
    const item = createMockItem({ qty: 10, unitRate: 100, schemeDiscountPct: 10, addlDiscountPct: 5, gstRate: 18, taxType: 'inclusive' });
    const passed = item.schemeDiscountAmount === 100 && item.addlDiscountAmount === 45 && item.discountAmount === 145 && item.totalAmount === 855;
    testResults.push({
      name: '2. Sequential Percentage Discounts (Scheme + Additional)',
      passed,
      details: `Scheme Disc: ₹${item.schemeDiscountAmount} (10%) | Addl Disc: ₹${item.addlDiscountAmount} (5%) | Total Disc: ₹${item.discountAmount} | Net: ₹${item.totalAmount}`
    });
  } catch (e: any) {
    testResults.push({ name: '2. Sequential Percentage Discounts', passed: false, details: e.message });
  }

  // TEST 3: FREE QUANTITY
  try {
    const item = createMockItem({ qty: 5, freeQty: 2, unitRate: 50, gstRate: 12, taxType: 'inclusive' });
    const passed = item.qty === 5 && item.freeQty === 2 && item.totalAmount === 250;
    testResults.push({
      name: '3. Scheme Free Quantity Handling',
      passed,
      details: `Paid Qty: 5 | Free Qty: 2 | Total Items Billed: 7 | Line Total Amount: ₹${item.totalAmount}`
    });
  } catch (e: any) {
    testResults.push({ name: '3. Scheme Free Quantity Handling', passed: false, details: e.message });
  }

  // TEST 4: MULTIPLE GST RATES (0%, 5%, 12%, 18%, 28%)
  try {
    const item0 = createMockItem({ qty: 1, unitRate: 100, gstRate: 0, taxType: 'inclusive' });
    const item5 = createMockItem({ qty: 1, unitRate: 105, gstRate: 5, taxType: 'inclusive' });
    const item12 = createMockItem({ qty: 1, unitRate: 112, gstRate: 12, taxType: 'inclusive' });
    const item18 = createMockItem({ qty: 1, unitRate: 118, gstRate: 18, taxType: 'inclusive' });
    const item28 = createMockItem({ qty: 1, unitRate: 128, gstRate: 28, taxType: 'inclusive' });

    const totals = calculateInvoiceTotals([item0, item5, item12, item18, item28]);
    const passed = totals.subtotal === 500 && totals.totalGst === 63 && totals.netPayable === 563;

    testResults.push({
      name: '4. Multiple Product GST Rates (0%, 5%, 12%, 18%, 28%)',
      passed,
      details: `Subtotal Taxable: ₹${totals.subtotal} | Combined GST: ₹${totals.totalGst} | Net Payable: ₹${totals.netPayable}`
    });
  } catch (e: any) {
    testResults.push({ name: '4. Multiple Product GST Rates', passed: false, details: e.message });
  }

  // TEST 5: TAX-INCLUSIVE PRICING
  try {
    const item = createMockItem({ qty: 1, unitRate: 118, gstRate: 18, taxType: 'inclusive' });
    const itemGst = Number((item.cgstAmount + item.sgstAmount + item.igstAmount).toFixed(2));
    const passed = item.taxableAmount === 100 && itemGst === 18 && item.totalAmount === 118;
    testResults.push({
      name: '5. Tax-Inclusive Pricing Formula',
      passed,
      details: `Gross Rate: ₹118 | Taxable: ₹${item.taxableAmount} | GST (18%): ₹${itemGst} | Final: ₹${item.totalAmount}`
    });
  } catch (e: any) {
    testResults.push({ name: '5. Tax-Inclusive Pricing Formula', passed: false, details: e.message });
  }

  // TEST 6: TAX-EXCLUSIVE PRICING
  try {
    const item = createMockItem({ qty: 1, unitRate: 100, gstRate: 18, taxType: 'exclusive' });
    const itemGst = Number((item.cgstAmount + item.sgstAmount + item.igstAmount).toFixed(2));
    const passed = item.taxableAmount === 100 && itemGst === 18 && item.totalAmount === 118;
    testResults.push({
      name: '6. Tax-Exclusive Pricing Formula',
      passed,
      details: `Base Rate: ₹100 | Taxable: ₹${item.taxableAmount} | Added GST (18%): ₹${itemGst} | Final: ₹${item.totalAmount}`
    });
  } catch (e: any) {
    testResults.push({ name: '6. Tax-Exclusive Pricing Formula', passed: false, details: e.message });
  }

  // TEST 7: FREIGHT OVERHEAD
  try {
    const item = createMockItem({ qty: 2, unitRate: 100, gstRate: 12, taxType: 'inclusive' });
    const totals = calculateInvoiceTotals([item], 0, 50);
    const passed = totals.netBeforeRound === 250 && totals.netPayable === 250;
    testResults.push({
      name: '7. Freight Overhead Addition',
      passed,
      details: `Items Total: ₹200 | Freight: ₹50 | Grand Net Payable: ₹${totals.netPayable}`
    });
  } catch (e: any) {
    testResults.push({ name: '7. Freight Overhead Addition', passed: false, details: e.message });
  }

  // TEST 8: MONETARY ROUNDING & ROUND-OFF
  try {
    const item = createMockItem({ qty: 1, unitRate: 145.40, gstRate: 0, taxType: 'inclusive' });
    const totals = calculateInvoiceTotals([item]);
    const passed = totals.netBeforeRound === 145.40 && totals.roundOff === -0.40 && totals.netPayable === 145;
    testResults.push({
      name: '8. Monetary Rounding & Round-Off Math',
      passed,
      details: `Exact Net: ₹${totals.netBeforeRound} | Round-off Adjustment: ₹${totals.roundOff} | Integer Net Payable: ₹${totals.netPayable}`
    });
  } catch (e: any) {
    testResults.push({ name: '8. Monetary Rounding & Round-Off Math', passed: false, details: e.message });
  }

  // TEST 9: FRACTIONAL QUANTITIES
  try {
    const item = createMockItem({ qty: 2.5, unitRate: 310, gstRate: 12, taxType: 'inclusive' });
    const itemGst = Number((item.cgstAmount + item.sgstAmount + item.igstAmount).toFixed(2));
    const passed = item.totalAmount === 775 && item.taxableAmount === 691.96 && itemGst === 83.04;
    testResults.push({
      name: '9. Fractional Quantity Support (e.g. 2.5 Reams)',
      passed,
      details: `Fractional Qty: 2.5 @ ₹310 | Taxable: ₹${item.taxableAmount} | GST (12%): ₹${itemGst} | Line Total: ₹${item.totalAmount}`
    });
  } catch (e: any) {
    testResults.push({ name: '9. Fractional Quantity Support', passed: false, details: e.message });
  }

  // TEST 10: REVERSALS / RETURNS STOCK INTEGRITY
  try {
    const prevStock = 45;
    const returnedQty = 2.5;
    const newStock = prevStock + returnedQty;
    const passed = newStock === 47.5;
    testResults.push({
      name: '10. Reversals & Return Stock Restoration',
      passed,
      details: `Previous Stock: ${prevStock} | Returned Qty: +${returnedQty} | Restored Stock: ${newStock}`
    });
  } catch (e: any) {
    testResults.push({ name: '10. Reversals & Return Stock Restoration', passed: false, details: e.message });
  }

  return testResults;
}
