import { validateImportBatch, autoDetectColumnMapping, ImportMode } from './importProcessor';
import type { Product } from '../types';

export interface TestCaseResult {
  testName: string;
  passed: boolean;
  totalRows: number;
  validCount: number;
  errorCount: number;
  executionTimeMs: number;
  detectedErrors: string[];
}

export function runProductsImportTestSuite(existingProducts: Product[] = []): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  // DEFAULT MAPPING
  const mapping = {
    sku: 'SKU',
    barcode: 'Barcode',
    name: 'ProductName',
    category: 'Category',
    packInfo: 'PackInfo',
    unit: 'Unit',
    mrp: 'MRP',
    purchaseRate: 'PurchaseRate',
    saleRate: 'SellingRate',
    hsnCode: 'HSNCode',
    gstRate: 'GSTRate',
    taxType: 'TaxType',
    stockQty: 'StockQuantity',
    minStockLevel: 'LowStockThreshold',
    isActive: 'IsActive'
  };

  // TEST 1: DUPLICATE BARCODES
  const test1Start = performance.now();
  const test1Rows = [
    { SKU: 'ITEM-001', Barcode: '8901111111111', ProductName: 'Notebook 1', SellingRate: '50', GSTRate: '12' },
    { SKU: 'ITEM-002', Barcode: '8901111111111', ProductName: 'Notebook 2', SellingRate: '60', GSTRate: '12' } // Duplicate Barcode
  ];
  const test1Validation = validateImportBatch(test1Rows, mapping, existingProducts, 'CREATE_AND_UPDATE');
  const test1Time = performance.now() - test1Start;
  const test1Errors = test1Validation.flatMap(r => r.errors);

  results.push({
    testName: 'Duplicate Barcodes Detection',
    passed: test1Errors.some(e => e.includes('Duplicate Barcode')),
    totalRows: test1Rows.length,
    validCount: test1Validation.filter(r => r.status === 'valid').length,
    errorCount: test1Validation.filter(r => r.status === 'error').length,
    executionTimeMs: Math.round(test1Time * 100) / 100,
    detectedErrors: test1Errors
  });

  // TEST 2: DUPLICATE SKUS
  const test2Start = performance.now();
  const test2Rows = [
    { SKU: 'DUP-SKU-001', Barcode: '8901111111101', ProductName: 'Reynolds Pen Blue', SellingRate: '10', GSTRate: '18' },
    { SKU: 'DUP-SKU-001', Barcode: '8901111111102', ProductName: 'Reynolds Pen Black', SellingRate: '10', GSTRate: '18' } // Duplicate SKU
  ];
  const test2Validation = validateImportBatch(test2Rows, mapping, existingProducts, 'CREATE_AND_UPDATE');
  const test2Time = performance.now() - test2Start;
  const test2Errors = test2Validation.flatMap(r => r.errors);

  results.push({
    testName: 'Duplicate SKUs Detection',
    passed: test2Errors.some(e => e.includes('Duplicate SKU')),
    totalRows: test2Rows.length,
    validCount: test2Validation.filter(r => r.status === 'valid').length,
    errorCount: test2Validation.filter(r => r.status === 'error').length,
    executionTimeMs: Math.round(test2Time * 100) / 100,
    detectedErrors: test2Errors
  });

  // TEST 3: BLANK PRODUCT NAMES
  const test3Start = performance.now();
  const test3Rows = [
    { SKU: 'BLANK-NAME-01', Barcode: '8902222222222', ProductName: '', SellingRate: '120', GSTRate: '12' }
  ];
  const test3Validation = validateImportBatch(test3Rows, mapping, existingProducts, 'CREATE_AND_UPDATE');
  const test3Time = performance.now() - test3Start;
  const test3Errors = test3Validation.flatMap(r => r.errors);

  results.push({
    testName: 'Blank Product Name Detection',
    passed: test3Errors.some(e => e.includes('Product Name is missing')),
    totalRows: test3Rows.length,
    validCount: test3Validation.filter(r => r.status === 'valid').length,
    errorCount: test3Validation.filter(r => r.status === 'error').length,
    executionTimeMs: Math.round(test3Time * 100) / 100,
    detectedErrors: test3Errors
  });

  // TEST 4: INVALID PRICES
  const test4Start = performance.now();
  const test4Rows = [
    { SKU: 'NEG-PRICE-01', Barcode: '8903333333333', ProductName: 'Fevicol Glue', SellingRate: '-45.00', GSTRate: '18' }
  ];
  const test4Validation = validateImportBatch(test4Rows, mapping, existingProducts, 'CREATE_AND_UPDATE');
  const test4Time = performance.now() - test4Start;
  const test4Errors = test4Validation.flatMap(r => r.errors);

  results.push({
    testName: 'Invalid Negative Price Detection',
    passed: test4Errors.some(e => e.includes('Selling Rate must be a valid non-negative number')),
    totalRows: test4Rows.length,
    validCount: test4Validation.filter(r => r.status === 'valid').length,
    errorCount: test4Validation.filter(r => r.status === 'error').length,
    executionTimeMs: Math.round(test4Time * 100) / 100,
    detectedErrors: test4Errors
  });

  // TEST 5: MISSING / INVALID GST RATES
  const test5Start = performance.now();
  const test5Rows = [
    { SKU: 'NO-GST-01', Barcode: '8904444444444', ProductName: 'A4 Copier Paper', SellingRate: '350', GSTRate: '' },
    { SKU: 'BAD-GST-02', Barcode: '8904444444445', ProductName: 'A4 Copier Paper 80GSM', SellingRate: '380', GSTRate: '17' } // 17% is invalid GST slab
  ];
  const test5Validation = validateImportBatch(test5Rows, mapping, existingProducts, 'CREATE_AND_UPDATE');
  const test5Time = performance.now() - test5Start;
  const test5Errors = test5Validation.flatMap(r => r.errors);

  results.push({
    testName: 'Missing & Invalid GST Slab Validation',
    passed: test5Errors.length >= 2,
    totalRows: test5Rows.length,
    validCount: test5Validation.filter(r => r.status === 'valid').length,
    errorCount: test5Validation.filter(r => r.status === 'error').length,
    executionTimeMs: Math.round(test5Time * 100) / 100,
    detectedErrors: test5Errors
  });

  // TEST 6: VALID 1,000-PRODUCT STATIONERY FILE PERFORMANCE BENCHMARK
  const test6Start = performance.now();
  const test6Rows = Array.from({ length: 1000 }, (_, i) => ({
    SKU: `BENCH-SKU-${(i + 1).toString().padStart(4, '0')}`,
    Barcode: `8909000${(i + 1).toString().padStart(6, '0')}`,
    ProductName: `Stationery Item #${i + 1} High Density Catalog`,
    Category: i % 2 === 0 ? 'Notebooks & Registers' : 'Pens & Writing',
    PackInfo: '1 Pcs',
    Unit: 'Pcs',
    MRP: (50 + (i % 500)).toString(),
    PurchaseRate: (30 + (i % 300)).toString(),
    SellingRate: (45 + (i % 450)).toString(),
    HSNCode: '4820',
    GSTRate: i % 3 === 0 ? '12' : '18',
    TaxType: 'inclusive',
    StockQuantity: (100 + (i % 50)).toString(),
    LowStockThreshold: '10',
    IsActive: 'true'
  }));

  const test6Validation = validateImportBatch(test6Rows, mapping, existingProducts, 'CREATE_AND_UPDATE');
  const test6Time = performance.now() - test6Start;
  const test6Errors = test6Validation.flatMap(r => r.errors);

  results.push({
    testName: '1,000-Product Stationery File Performance Benchmark',
    passed: test6Validation.length === 1000 && test6Errors.length === 0,
    totalRows: 1000,
    validCount: test6Validation.filter(r => r.status === 'valid' || r.status === 'warning').length,
    errorCount: test6Validation.filter(r => r.status === 'error').length,
    executionTimeMs: Math.round(test6Time * 100) / 100,
    detectedErrors: test6Errors
  });

  return results;
}
