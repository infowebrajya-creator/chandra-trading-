import { Invoice, ShopProfile, PrintSettings } from '../types';
import { numberToWordsIndian } from '../utils/numberToWords';

export { numberToWordsIndian };

function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }
  return dateStr;
}

export function triggerA5Print(invoice: Invoice, shop: ShopProfile, _printSettings: PrintSettings) {
  const printWindow = window.open('', '_blank', 'width=800,height=950');
  if (!printWindow) {
    alert('Please allow popups for this site to enable printing.');
    return;
  }

  const isGstInvoice = invoice.invoiceType === 'gst';
  const docTitle = isGstInvoice ? 'TAX INVOICE' : 'CREDIT ESTIMATE';
  const formattedDate = formatDateDDMMYYYY(invoice.date);

  const items = invoice.items || [];
  const minRows = 25;
  const paddingRowsCount = Math.max(0, minRows - items.length);

  const itemsHtml = items.map((item, index) => {
    const remarkText = item.pack || (item.hsnCode ? `HSN:${item.hsnCode}` : '');
    const itemTotal = item.totalAmount || (item.unitRate * item.qty * (1 - (item.discountPct || 0) / 100));
    return `
      <tr style="height: 16px;">
        <td style="text-align: center; border-right: 1px solid #000; padding: 2px 2px; font-family: monospace;">${index + 1}</td>
        <td style="border-right: 1px solid #000; padding: 2px 4px; font-weight: bold; text-transform: uppercase;">${item.productName}</td>
        <td style="text-align: center; border-right: 1px solid #000; padding: 2px 2px; font-size: 8px; text-transform: uppercase;">${remarkText || ''}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding: 2px 3px; font-family: monospace; font-weight: bold;">${item.qty.toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding: 2px 3px; font-family: monospace;">${(item.freeQty || 0).toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding: 2px 3px; font-family: monospace;">${item.unitRate.toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding: 2px 3px; font-family: monospace;">${item.mrp.toFixed(2)}</td>
        <td style="text-align: right; border-right: 1px solid #000; padding: 2px 3px; font-family: monospace;">${(item.discountPct || 0).toFixed(2)}</td>
        <td style="text-align: right; padding: 2px 4px; font-family: monospace; font-weight: bold;">${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const paddingHtml = Array.from({ length: paddingRowsCount }).map(() => `
    <tr style="height: 15px;">
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td style="border-right: 1px solid #000;">&nbsp;</td>
      <td>&nbsp;</td>
    </tr>
  `).join('');

  const customerHtml = (invoice.customerName && invoice.customerName !== 'Cash Customer') ? `
    <div style="padding: 2px 6px; border-bottom: 1px solid #000; font-size: 9px; display: flex; justify-content: space-between; font-weight: 600;">
      <div><strong>Party:</strong> ${invoice.customerName} ${invoice.customerMobile ? `(${invoice.customerMobile})` : ''}</div>
      ${invoice.customerGstin ? `<div><strong>GSTIN:</strong> ${invoice.customerGstin}</div>` : ''}
    </div>
  ` : '';

  const termsList = shop.termsAndConditions
    ? shop.termsAndConditions.split('\n').filter(t => t.trim() !== '')
    : ['Goods once sold will not be taken back or exchanged.'];

  const grossSubtotal = invoice.subtotal + (invoice.totalDiscount || 0);

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${docTitle} - ${invoice.invoiceNumber}</title>
        <style>
          @page {
            size: A5 portrait;
            margin: 4mm 5mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: Arial, "Helvetica Neue", Helvetica, sans-serif;
            font-size: 9.5px;
            color: #000000;
            margin: 0;
            padding: 0;
            background: #ffffff;
            line-height: 1.25;
          }
          .outer-frame {
            border: 1.5px solid #000000;
            width: 140mm;
            height: 198mm;
            min-height: 198mm;
            box-sizing: border-box;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
          }
          .header-container {
            flex-shrink: 0;
          }
          .top-title {
            font-size: 13px;
            font-weight: 800;
            text-decoration: underline;
            text-align: center;
            letter-spacing: 0.5px;
            padding: 3px 0 2px 0;
          }
          .header-block {
            display: flex;
            justify-content: space-between;
            border-bottom: 1.5px solid #000000;
            padding: 3px 6px 4px 6px;
          }
          .shop-title {
            font-size: 12.5px;
            font-weight: 800;
            text-transform: uppercase;
            margin: 0;
          }
          .meta-side {
            width: 42%;
            padding-left: 10px;
            border-left: 1px solid #000000;
            font-family: monospace;
            font-size: 10px;
          }
          .meta-row {
            display: flex;
            margin-bottom: 2px;
          }
          .meta-lbl {
            width: 85px;
            font-weight: bold;
          }
          .table-container {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            min-height: 0;
            width: 100%;
          }
          table.items-table {
            width: 100%;
            height: 100%;
            border-collapse: collapse;
            table-layout: fixed;
            flex: 1 1 auto;
          }
          table.items-table thead {
            display: table-header-group;
          }
          table.items-table th {
            background-color: #A4E3E5 !important;
            color: #000000;
            font-weight: 800;
            font-size: 9px;
            padding: 3px 2px;
            border-bottom: 1px solid #000000;
            border-right: 1px solid #000000;
          }
          table.items-table th:last-child {
            border-right: none;
          }
          table.items-table tr {
            page-break-inside: avoid;
          }
          table.items-table td {
            padding: 2px 3px;
            font-size: 8.5px;
            border-right: 1px solid #000000;
            vertical-align: top;
          }
          table.items-table td:last-child {
            border-right: none;
          }
          .spacer-row td {
            height: 100%;
            border-right: 1px solid #000000;
          }
          .spacer-row td:last-child {
            border-right: none;
          }
          .footer-block {
            flex-shrink: 0;
            border-top: 1.5px solid #000000;
            display: flex;
            justify-content: space-between;
            page-break-inside: avoid;
          }
          .footer-left {
            width: 60%;
            padding: 6px;
            border-right: 1px solid #000000;
            font-size: 9px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .footer-right {
            width: 40%;
            padding: 6px;
            font-family: monospace;
            font-size: 10.5px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .tot-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin-bottom: 2px;
          }
          .tot-grand {
            border-top: 2px solid #000000;
            padding-top: 3px;
            margin-top: 2px;
            font-size: 12px;
            font-weight: 900;
          }
        </style>
      </head>
      <body>
        <div class="outer-frame">
          <div class="header-container">
            <div class="top-title">${docTitle}</div>
            <div class="header-block">
              <div style="width: 58%; display: flex; align-items: flex-start; gap: 10px;">
                <div>
                  <div class="shop-title">M/s ${shop.shopName || 'CHANDRA TRADING COMPANY'}</div>
                  <div style="font-size: 9.5px; font-weight: bold; text-transform: uppercase; margin-top: 2px;">
                    ${shop.address || 'NEW SHUKRAWARI MARKET, SEONI - 480661 (M.P.)'}
                  </div>
                  ${shop.gstin ? `<div style="font-size: 9px; font-weight: 600;">GSTIN: ${shop.gstin}</div>` : ''}
                  ${shop.phone ? `<div style="font-size: 9px; font-weight: 600;">Ph: ${shop.phone}</div>` : ''}
                </div>
              </div>

              <div class="meta-side">
                <div class="meta-row">
                  <span class="meta-lbl">Estimate No.:</span>
                  <span style="font-weight: bold;">${invoice.invoiceNumber}</span>
                </div>
                <div class="meta-row">
                  <span class="meta-lbl">Date</span>
                  <span style="font-weight: bold;">: ${formattedDate}</span>
                </div>
                ${invoice.time ? `
                  <div class="meta-row" style="font-size: 9px; color: #444;">
                    <span class="meta-lbl">Time</span>
                    <span>: ${invoice.time}</span>
                  </div>
                ` : ''}
              </div>
            </div>
            ${customerHtml}
          </div>

          <!-- Items Table Container - Extends Full Available Height to Touch Footer -->
          <div class="table-container">
            <table class="items-table">
              <thead>
                <tr>
                  <th style="width: 4%;">S.</th>
                  <th style="width: 34%; text-align: left;">Item Description</th>
                  <th style="width: 11%; text-align: center;">REMARK</th>
                  <th style="width: 8%; text-align: right;">Qty.</th>
                  <th style="width: 6%; text-align: right;">FREE</th>
                  <th style="width: 8%; text-align: right;">Rate</th>
                  <th style="width: 8%; text-align: right;">MRP</th>
                  <th style="width: 8%; text-align: right;">DIS%</th>
                  <th style="width: 13%; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
                ${paddingHtml}
                <tr class="spacer-row" style="height: 100%;">
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td style="border-right: 1px solid #000;">&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Footer Block -->
          <div class="footer-block">
            <div class="footer-left">
              <div>
                <div style="font-weight: bold; font-size: 9.5px;">
                  Rs. <span style="text-transform: capitalize;">${numberToWordsIndian(invoice.netPayable)}</span>
                </div>
                ${invoice.notes ? `
                  <div style="margin-top: 4px; font-weight: bold; font-size: 9.5px; text-transform: uppercase; border-left: 2px solid #000; padding-left: 6px; background-color: #f8f8f8; padding-top: 2px; padding-bottom: 2px;">
                    REMARK : ${invoice.notes}
                  </div>
                ` : ''}
              </div>

              <div style="margin-top: 8px; border-top: 1px dashed #999; padding-top: 3px;">
                <div style="font-weight: bold; text-decoration: underline; font-size: 8.5px; text-transform: uppercase;">
                  Terms & Conditions
                </div>
                ${termsList.map(t => `<div style="font-size: 8px; color: #222;">${t}</div>`).join('')}
              </div>
            </div>

            <div class="footer-right">
              <div>
                <div class="tot-row">
                  <span>SUB TOTAL</span>
                  <span>${grossSubtotal.toFixed(2)}</span>
                </div>
                ${invoice.totalDiscount > 0 ? `
                  <div class="tot-row">
                    <span>DISCOUNT</span>
                    <span>${invoice.totalDiscount.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${invoice.freightAmount > 0 ? `
                  <div class="tot-row">
                    <span>FRIGHT</span>
                    <span>${invoice.freightAmount.toFixed(2)}</span>
                  </div>
                ` : ''}
                ${isGstInvoice && invoice.totalGst > 0 ? `
                  <div class="tot-row" style="font-size: 9.5px;">
                    <span>GST TAX</span>
                    <span>${invoice.totalGst.toFixed(2)}</span>
                  </div>
                ` : ''}
              </div>

              <div class="tot-row tot-grand">
                <span>GRAND TOTAL</span>
                <span>${invoice.netPayable.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          }
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
