import React from 'react';
import { Invoice, ShopProfile } from '../../types';
import { numberToWordsIndian } from '../../utils/numberToWords';

interface A5PrintInvoiceProps {
  invoice: Invoice;
  shopProfile: ShopProfile;
}

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

export const A5PrintInvoice: React.FC<A5PrintInvoiceProps> = ({ invoice, shopProfile }) => {
  const isGstInvoice = invoice.invoiceType === 'gst';
  const docTitle = isGstInvoice ? 'TAX INVOICE' : 'CREDIT ESTIMATE';

  const items = invoice.items || [];
  const minRows = 25;
  const paddingRowsCount = Math.max(0, minRows - items.length);

  const formattedDate = formatDateDDMMYYYY(invoice.date);

  const termsList = shopProfile.termsAndConditions
    ? shopProfile.termsAndConditions.split('\n').filter(t => t.trim() !== '')
    : ['Goods once sold will not be taken back or exchanged.'];

  // Calculate gross subtotal before discount if needed
  const grossSubtotal = invoice.subtotal + (invoice.totalDiscount || 0);

  return (
    <div className="a5-invoice-wrapper" id="a5-print-document">
      <div className="a5-outer-frame">
        {/* Top Centered Title Banner */}
        <div className="a5-top-title-banner">
          {docTitle}
        </div>

        {/* Top Header Block: Shop Info (Left) & Invoice Meta (Right) */}
        <div className="a5-header-block">
          <div className="w-[58%] flex items-start gap-2.5">
            <div>
              <h1 className="font-extrabold text-[12.5px] uppercase leading-tight font-sans">
                M/s {shopProfile.shopName || 'CHANDRA TRADING COMPANY'}
              </h1>
              <div className="text-[9.5px] font-bold uppercase mt-0.5 font-sans">
                {shopProfile.address || 'NEW SHUKRAWARI MARKET, SEONI - 480661 (M.P.)'}
              </div>
              {shopProfile.gstin && (
                <div className="text-[9px] font-semibold mt-0.5">
                  GSTIN: {shopProfile.gstin}
                </div>
              )}
              {shopProfile.phone && (
                <div className="text-[9px] font-semibold">
                  Ph: {shopProfile.phone}
                </div>
              )}
            </div>
          </div>

          <div className="w-[42%] pl-3 border-l border-black font-mono text-[10px] space-y-0.5">
            <div className="flex">
              <span className="w-24 font-bold">Estimate No.:</span>
              <span className="font-bold">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex">
              <span className="w-24 font-bold">Date</span>
              <span className="font-bold">: {formattedDate}</span>
            </div>
            {invoice.time && (
              <div className="flex text-[9px] text-gray-700">
                <span className="w-24">Time</span>
                <span>: {invoice.time}</span>
              </div>
            )}
          </div>
        </div>

        {/* Optional Billed To Customer Info Bar */}
        {invoice.customerName && invoice.customerName !== 'Cash Customer' && (
          <div className="px-2 py-0.5 border-b border-black text-[9px] flex justify-between font-semibold font-sans">
            <div><strong>Party:</strong> {invoice.customerName} {invoice.customerMobile ? `(${invoice.customerMobile})` : ''}</div>
            {invoice.customerGstin && <div><strong>GSTIN:</strong> {invoice.customerGstin}</div>}
          </div>
        )}

        {/* Main 9-Column Table Container - Extends Full Available Height */}
        <div className="a5-table-container">
          <table className="a5-items-table">
            <thead>
              <tr>
                <th style={{ width: '4%' }}>S.</th>
                <th style={{ width: '34%', textAlign: 'left' }}>Item Description</th>
                <th style={{ width: '11%', textAlign: 'center' }}>REMARK</th>
                <th style={{ width: '8%', textAlign: 'right' }}>Qty.</th>
                <th style={{ width: '6%', textAlign: 'right' }}>FREE</th>
                <th style={{ width: '8%', textAlign: 'right' }}>Rate</th>
                <th style={{ width: '8%', textAlign: 'right' }}>MRP</th>
                <th style={{ width: '8%', textAlign: 'right' }}>DIS%</th>
                <th style={{ width: '13%', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const remarkText = item.pack || (item.hsnCode ? `HSN:${item.hsnCode}` : '');
                const itemTotal = item.totalAmount || (item.unitRate * item.qty * (1 - (item.discountPct || 0) / 100));
                return (
                  <tr key={item.id || index} className="a5-table-row">
                    <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{index + 1}</td>
                    <td style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                      {item.productName}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: '8px', textTransform: 'uppercase' }}>
                      {remarkText || ''}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {item.qty.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {(item.freeQty || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {item.unitRate.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {item.mrp.toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                      {(item.discountPct || 0).toFixed(2)}
                    </td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 'bold' }}>
                      {itemTotal.toFixed(2)}
                    </td>
                  </tr>
                );
              })}

              {/* Continuous Vertical Padding Rows */}
              {Array.from({ length: paddingRowsCount }).map((_, pIdx) => (
                <tr key={`pad-${pIdx}`} className="a5-table-row a5-pad-row">
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                  <td>&nbsp;</td>
                </tr>
              ))}

              {/* Full-Height Spacer Row to Guarantee Vertical Lines Touch Footer With Zero Gap */}
              <tr className="a5-table-row a5-spacer-row" style={{ height: '100%' }}>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td style={{ borderRight: '1px solid #000' }}>&nbsp;</td>
                <td>&nbsp;</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer Summary Section */}
        <div className="a5-footer-block">
          {/* Left Side: Amount Words, Remarks, Terms */}
          <div className="w-[60%] p-1.5 flex flex-col justify-between border-r border-black text-[9px] font-sans">
            <div>
              <div className="font-bold text-[9.5px]">
                Rs. <span className="capitalize">{numberToWordsIndian(invoice.netPayable)}</span>
              </div>
              {invoice.notes && (
                <div className="mt-1.5 font-bold text-[9.5px] uppercase tracking-wide text-black border-l-2 border-black pl-1.5 py-0.5 bg-gray-50">
                  REMARK : {invoice.notes}
                </div>
              )}
            </div>

            <div className="mt-2 pt-1 border-t border-dashed border-gray-400">
              <div className="font-bold underline text-[8.5px] uppercase">Terms & Conditions</div>
              {termsList.map((term, idx) => (
                <div key={idx} className="text-[8px] leading-tight text-gray-800">{term}</div>
              ))}
            </div>
          </div>

          {/* Right Side: Exact Marg Summary Box */}
          <div className="w-[40%] p-1.5 bg-white flex flex-col justify-between text-[10.5px] font-mono">
            <div className="space-y-1">
              <div className="flex justify-between font-bold">
                <span>SUB TOTAL</span>
                <span>{grossSubtotal.toFixed(2)}</span>
              </div>
              
              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>DISCOUNT</span>
                  <span>{invoice.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              {invoice.freightAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>FRIGHT</span>
                  <span>{invoice.freightAmount.toFixed(2)}</span>
                </div>
              )}

              {isGstInvoice && invoice.totalGst > 0 && (
                <div className="flex justify-between font-bold text-[9.5px]">
                  <span>GST TAX</span>
                  <span>{invoice.totalGst.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="pt-1 mt-1 border-t-2 border-black flex justify-between font-black text-xs">
              <span>GRAND TOTAL</span>
              <span>{invoice.netPayable.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
