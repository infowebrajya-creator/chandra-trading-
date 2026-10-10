import type { Product, Invoice, StockMovement } from '../types';

function triggerDownload(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// 1. Export Products Catalogue CSV
export function exportProductsCSV(products: Product[]) {
  const headers = ['ID', 'SKU', 'Barcode', 'ProductName', 'Category', 'PackInfo', 'Unit', 'MRP', 'PurchaseRate', 'SaleRate', 'HSNCode', 'GSTRate', 'TaxType', 'StockQuantity', 'MinStockLevel', 'IsActive', 'UpdatedAt'];
  const rows = products.map(p => [
    escapeCSV(p.id),
    escapeCSV(p.sku),
    escapeCSV(p.barcode),
    escapeCSV(p.name),
    escapeCSV(p.category),
    escapeCSV(p.packInfo),
    escapeCSV(p.unit),
    p.mrp.toFixed(2),
    p.purchaseRate.toFixed(2),
    p.saleRate.toFixed(2),
    escapeCSV(p.hsnCode),
    p.gstRate,
    escapeCSV(p.taxType),
    p.stockQty,
    p.minStockLevel,
    p.isActive ? 'Active' : 'Inactive',
    escapeCSV(p.updatedAt)
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, `products_catalogue_${new Date().toISOString().slice(0, 10)}.csv`);
}

// 2. Export Invoice Headers CSV
export function exportInvoiceHeadersCSV(invoices: Invoice[]) {
  const headers = ['InvoiceNumber', 'InvoiceType', 'Date', 'Time', 'CustomerName', 'CustomerMobile', 'CustomerGSTIN', 'Remark', 'PaymentMode', 'SubtotalTaxable', 'TotalDiscount', 'TotalGST', 'CGSTTotal', 'SGSTTotal', 'IGSTTotal', 'FreightAmount', 'RoundOff', 'GrandTotalNetPayable', 'PaidAmount', 'BalanceAmount', 'Status', 'IsInterstate', 'TransactionRef', 'IdempotencyKey'];
  const rows = invoices.map(i => [
    escapeCSV(i.invoiceNumber),
    escapeCSV(i.invoiceType || 'gst'),
    escapeCSV(i.date),
    escapeCSV(i.time),
    escapeCSV(i.customerName),
    escapeCSV(i.customerMobile),
    escapeCSV(i.customerGstin || ''),
    escapeCSV(i.notes || ''),
    escapeCSV(i.paymentMode),
    i.subtotal.toFixed(2),
    i.totalDiscount.toFixed(2),
    i.totalGst.toFixed(2),
    i.cgstTotal.toFixed(2),
    i.sgstTotal.toFixed(2),
    i.igstTotal.toFixed(2),
    i.freightAmount.toFixed(2),
    i.roundOff.toFixed(2),
    i.netPayable.toFixed(2),
    i.paidAmount.toFixed(2),
    i.balanceAmount.toFixed(2),
    escapeCSV(i.status),
    i.isInterstate ? 'Yes' : 'No',
    escapeCSV(i.transactionRef || ''),
    escapeCSV(i.idempotencyKey || '')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, `invoices_summary_${new Date().toISOString().slice(0, 10)}.csv`);
}

// 3. Export Invoice Line Items CSV
export function exportInvoiceItemsCSV(invoices: Invoice[]) {
  const headers = ['InvoiceNumber', 'InvoiceDate', 'SKU', 'Barcode', 'ProductName', 'HSNCode', 'Pack', 'Unit', 'QtyBilled', 'FreeQty', 'UnitRate', 'MRP', 'SchemeDiscountPct', 'AddlDiscountPct', 'TotalDiscountPct', 'TotalDiscountAmount', 'GSTRate', 'TaxType', 'TaxableAmount', 'CGSTAmount', 'SGSTAmount', 'IGSTAmount', 'LineTotalAmount'];
  
  const rows: string[][] = [];
  for (const inv of invoices) {
    for (const item of inv.items) {
      rows.push([
        escapeCSV(inv.invoiceNumber),
        escapeCSV(inv.date),
        escapeCSV(item.sku),
        escapeCSV(item.barcode),
        escapeCSV(item.productName),
        escapeCSV(item.hsnCode),
        escapeCSV(item.pack),
        escapeCSV(item.unit),
        item.qty.toString(),
        item.freeQty.toString(),
        item.unitRate.toFixed(2),
        item.mrp.toFixed(2),
        item.schemeDiscountPct.toString(),
        item.addlDiscountPct.toString(),
        item.discountPct.toString(),
        item.discountAmount.toFixed(2),
        item.gstRate.toString(),
        escapeCSV(item.taxType),
        item.taxableAmount.toFixed(2),
        item.cgstAmount.toFixed(2),
        item.sgstAmount.toFixed(2),
        item.igstAmount.toFixed(2),
        item.totalAmount.toFixed(2)
      ]);
    }
  }

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, `invoice_items_export_${new Date().toISOString().slice(0, 10)}.csv`);
}

// 4. Export Payments CSV
export function exportPaymentsCSV(invoices: Invoice[]) {
  const headers = ['InvoiceNumber', 'Date', 'Time', 'CustomerName', 'PaymentMethod', 'AmountPaid', 'TransactionRef', 'PaymentStatus'];
  const rows = invoices.map(i => [
    escapeCSV(i.invoiceNumber),
    escapeCSV(i.date),
    escapeCSV(i.time),
    escapeCSV(i.customerName),
    escapeCSV(i.paymentMode),
    i.paidAmount.toFixed(2),
    escapeCSV(i.transactionRef || ''),
    i.balanceAmount <= 0 ? 'Full Payment' : 'Partial / Balance'
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, `payments_export_${new Date().toISOString().slice(0, 10)}.csv`);
}

// 5. Export Stock Movements CSV
export function exportStockMovementsCSV(movements: StockMovement[]) {
  const headers = ['ID', 'ProductID', 'ProductName', 'MovementType', 'QuantityChange', 'PreviousStock', 'NewStock', 'Reason', 'CreatedAt', 'ReferenceID'];
  const rows = movements.map(m => [
    escapeCSV(m.id),
    escapeCSV(m.productId),
    escapeCSV(m.productName),
    escapeCSV(m.type),
    m.quantityChange.toString(),
    m.previousStock.toString(),
    m.newStock.toString(),
    escapeCSV(m.reason),
    escapeCSV(m.createdAt),
    escapeCSV(m.referenceId || '')
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  triggerDownload(csvContent, `stock_movements_${new Date().toISOString().slice(0, 10)}.csv`);
}
