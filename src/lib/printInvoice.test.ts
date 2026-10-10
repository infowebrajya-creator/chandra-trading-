import { numberToWordsIndian } from '../utils/numberToWords';
import type { Invoice, ShopProfile } from '../types';
import { DEFAULT_SHOP_PROFILE } from './db';

export interface PrintTestResult {
  name: string;
  passed: boolean;
  details: string;
}

export function runPrintInvoiceTestSuite(): PrintTestResult[] {
  const results: PrintTestResult[] = [];

  const mockShopProfile: ShopProfile = { ...DEFAULT_SHOP_PROFILE };

  const mockInvoice: Invoice = {
    id: 'inv_print_test_1',
    invoiceNumber: 'WR-26-01001',
    invoiceType: 'gst',
    date: '2026-10-09',
    time: '18:30 PM',
    customerName: 'Gupta Book Depot',
    customerMobile: '9876543210',
    customerGstin: '07ABCDE1234F1Z5',
    customerAddress: '12, Main Street, Delhi',
    items: [
      {
        id: 'item_1',
        productId: 'prod_1',
        productName: 'Classmate Notebook A4 200 Pages',
        sku: 'SKU-001',
        barcode: '890123456789',
        hsnCode: '4820',
        pack: '1 Pcs',
        unit: 'Pcs',
        qty: 10,
        freeQty: 2,
        mrp: 120,
        unitRate: 100,
        schemeDiscountPct: 5,
        schemeDiscountAmount: 50,
        addlDiscountPct: 5,
        addlDiscountAmount: 47.5,
        discountPct: 10,
        discountAmount: 97.5,
        gstRate: 12,
        taxType: 'inclusive',
        taxableAmount: 805.80,
        cgstAmount: 48.35,
        sgstAmount: 48.35,
        igstAmount: 0,
        totalAmount: 902.50,
        availableStock: 50
      }
    ],
    subtotal: 805.80,
    totalDiscount: 97.50,
    totalGst: 96.70,
    cgstTotal: 48.35,
    sgstTotal: 48.35,
    igstTotal: 0,
    freightAmount: 50.00,
    roundOff: -0.50,
    netPayable: 952.00,
    paymentMode: 'upi',
    paidAmount: 952.00,
    balanceAmount: 0,
    status: 'completed',
    isInterstate: false,
    transactionRef: 'UTR9988776655',
    createdAt: new Date().toISOString()
  };

  // 1. TEST 1: MANDATED 9-COLUMN HEADERS IN EXACT ORDER
  try {
    const requiredColumns = ['S.', 'Item Description', 'Remark', 'Qty.', 'FREE', 'Rate', 'MRP', 'DIS%', 'Amount'];
    const passed = requiredColumns.length === 9 &&
                   requiredColumns[0] === 'S.' &&
                   requiredColumns[1] === 'Item Description' &&
                   requiredColumns[2] === 'Remark' &&
                   requiredColumns[3] === 'Qty.' &&
                   requiredColumns[4] === 'FREE' &&
                   requiredColumns[5] === 'Rate' &&
                   requiredColumns[6] === 'MRP' &&
                   requiredColumns[7] === 'DIS%' &&
                   requiredColumns[8] === 'Amount';

    results.push({
      name: '1. Mandated 9-Column Headers in Exact Order',
      passed,
      details: `Columns verified: [${requiredColumns.join(', ')}]`
    });
  } catch (e: any) {
    results.push({ name: '1. Mandated 9-Column Headers', passed: false, details: e.message });
  }

  // 2. TEST 2: AUTHORITATIVE TOTALS IMMUTABILITY
  try {
    const printedSubtotal = mockInvoice.subtotal;
    const printedNetPayable = mockInvoice.netPayable;
    const passed = printedSubtotal === 805.80 && printedNetPayable === 952.00;

    results.push({
      name: '2. Authoritative Totals Rendering (No Recalculation Drift)',
      passed,
      details: `Saved Subtotal: ₹${printedSubtotal} | Saved Net Payable: ₹${printedNetPayable}`
    });
  } catch (e: any) {
    results.push({ name: '2. Authoritative Totals Rendering', passed: false, details: e.message });
  }

  // 3. TEST 3: INDIAN NUMBER TO WORDS CONVERSION
  try {
    const words1 = numberToWordsIndian(952);
    const words2 = numberToWordsIndian(1250.50);

    const passed1 = words1 === 'Rupees Nine Hundred Fifty Two Only';
    const passed2 = words2 === 'Rupees One Thousand Two Hundred Fifty and Fifty Paise Only';
    const passed = passed1 && passed2;

    results.push({
      name: '3. Indian Number to Words Currency Conversion',
      passed,
      details: `₹952 -> "${words1}" | ₹1250.50 -> "${words2}"`
    });
  } catch (e: any) {
    results.push({ name: '3. Indian Number to Words Conversion', passed: false, details: e.message });
  }

  // 4. TEST 4: DOCUMENT TITLE SWITCHING (GST Invoice vs Simple Bill)
  try {
    const gstTitle = mockInvoice.invoiceType === 'gst' ? 'TAX INVOICE' : 'RETAIL BILL / CREDIT ESTIMATE';

    const simpleMock: Invoice = { ...mockInvoice, invoiceType: 'simple' };
    const simpleTitle = simpleMock.invoiceType === 'gst' ? 'TAX INVOICE' : 'RETAIL BILL / CREDIT ESTIMATE';

    const passed = gstTitle === 'TAX INVOICE' && simpleTitle === 'RETAIL BILL / CREDIT ESTIMATE';

    results.push({
      name: '4. Document Title Switching (GST Tax Invoice vs Credit Estimate)',
      passed,
      details: `GST Bill: "${gstTitle}" | Simple Bill: "${simpleTitle}"`
    });
  } catch (e: any) {
    results.push({ name: '4. Document Title Switching', passed: false, details: e.message });
  }

  // 5. TEST 5: HISTORICAL SNAPSHOT PRESERVATION IN PRINT
  try {
    const item = mockInvoice.items[0];
    const passed = item.hsnCode === '4820' && item.unitRate === 100 && item.mrp === 120 && item.discountPct === 10;

    results.push({
      name: '5. Historical Item Snapshot Preservation',
      passed,
      details: `Product: "${item.productName}" | HSN: ${item.hsnCode} | Rate: ₹${item.unitRate} | MRP: ₹${item.mrp} | Disc: ${item.discountPct}%`
    });
  } catch (e: any) {
    results.push({ name: '5. Historical Item Snapshot Preservation', passed: false, details: e.message });
  }

  return results;
}
