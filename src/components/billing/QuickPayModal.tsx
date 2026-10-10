import React, { useState, useEffect } from 'react';
import { IndianRupee, CreditCard, QrCode, BookOpen, Printer, CheckCircle2, Loader2, Info, ReceiptText, User, StickyNote } from 'lucide-react';
import { Modal } from '../common/Modal';
import { PaymentMode, InvoiceItem, InvoiceType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface QuickPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  netPayable: number;
  paymentMode: PaymentMode;
  onSelectPaymentMode: (mode: PaymentMode) => void;
  onConfirmPayment: (paidAmount: number, shouldPrint: boolean, upiRef?: string) => Promise<void> | void;
  isSubmitting?: boolean;
  items?: InvoiceItem[];
  totals?: {
    subtotal: number;
    totalDiscount: number;
    totalGst: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    roundOff: number;
    netPayable: number;
  };
  customerName?: string;
  invoiceType?: InvoiceType;
  notes?: string;
  onNotesChange?: (notes: string) => void;
}

export const QuickPayModal: React.FC<QuickPayModalProps> = ({
  isOpen,
  onClose,
  netPayable,
  paymentMode,
  onSelectPaymentMode,
  onConfirmPayment,
  isSubmitting = false,
  items = [],
  totals,
  customerName = 'Cash Customer',
  invoiceType = 'gst',
  notes = '',
  onNotesChange
}) => {
  const [cashTendered, setCashTendered] = useState<number>(netPayable);
  const [upiRef, setUpiRef] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setCashTendered(netPayable);
      setUpiRef('');
    }
  }, [isOpen, netPayable]);

  const changeReturn = Math.max(0, cashTendered - netPayable);

  const quickCashOptions = [netPayable, 100, 200, 500, 2000].filter(
    (val, idx, arr) => arr.indexOf(val) === idx && val >= netPayable
  );

  const paymentModes: { id: PaymentMode; label: string; shortcut: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'Cash', shortcut: '1', icon: <IndianRupee className="w-4 h-4" /> },
    { id: 'upi', label: 'UPI / QR', shortcut: '2', icon: <QrCode className="w-4 h-4" /> },
    { id: 'card', label: 'Card / POS', shortcut: '3', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'credit', label: 'Credit / Khata', shortcut: '4', icon: <BookOpen className="w-4 h-4" /> },
  ];

  const handleConfirm = (shouldPrint: boolean) => {
    if (isSubmitting) return;
    onConfirmPayment(paymentMode === 'cash' ? cashTendered : netPayable, shouldPrint, upiRef.trim() || undefined);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';

      if (e.key === 'F9') {
        e.preventDefault();
        handleConfirm(true);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm(true);
        return;
      }

      // Quick payment mode keys (1: Cash, 2: UPI, 3: Card, 4: Credit)
      if (!isInput) {
        if (e.key === '1' || e.key.toLowerCase() === 'c') {
          e.preventDefault();
          onSelectPaymentMode('cash');
        } else if (e.key === '2' || e.key.toLowerCase() === 'u') {
          e.preventDefault();
          onSelectPaymentMode('upi');
        } else if (e.key === '3' || e.key.toLowerCase() === 'p') {
          e.preventDefault();
          onSelectPaymentMode('card');
        } else if (e.key === '4' || e.key.toLowerCase() === 'k') {
          e.preventDefault();
          onSelectPaymentMode('credit');
        }
      }
    };

    window.addEventListener('keydown', handleModalKeyDown);
    return () => window.removeEventListener('keydown', handleModalKeyDown);
  }, [isOpen, paymentMode, cashTendered, netPayable, isSubmitting, upiRef]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Quick Settle & Save Bill [F8]"
      subtitle="Review live invoice preview, payment details, and complete billing"
      maxWidth="4xl"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: LIVE BILL PREVIEW */}
        <div className="lg:col-span-6 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl p-4 flex flex-col justify-between">
          <div>
            {/* Header / Info */}
            <div className="flex items-center justify-between border-b border-[#D8E1EC] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-[#2563EB]" />
                <span className="text-xs font-extrabold text-[#172B4D] uppercase tracking-wider">Live Bill Preview</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase ${
                invoiceType === 'gst' ? 'bg-[#DBEAFE] text-[#123B70]' : 'bg-gray-200 text-gray-700'
              }`}>
                {invoiceType === 'gst' ? 'GST Tax Invoice' : 'Non-GST Bill'}
              </span>
            </div>

            {/* Customer Details */}
            <div className="flex items-center gap-2 text-xs font-semibold text-[#172B4D] mb-3 bg-white px-3 py-2 rounded-lg border border-[#D8E1EC]">
              <User className="w-3.5 h-3.5 text-[#2563EB]" />
              <span className="text-[#64748B]">Customer:</span>
              <span className="font-bold text-[#123B70]">{customerName.trim() || 'Cash Customer'}</span>
            </div>

            {/* Line Items Table */}
            <div className="max-h-60 overflow-y-auto border border-[#D8E1EC] rounded-lg bg-white mb-3">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F5F9FF] text-[#123B70] font-bold border-b border-[#D8E1EC] sticky top-0">
                  <tr>
                    <th className="py-2 px-2.5">#</th>
                    <th className="py-2 px-2.5">Item Name</th>
                    <th className="py-2 px-2.5 text-center">Qty</th>
                    <th className="py-2 px-2.5 text-right">Rate</th>
                    <th className="py-2 px-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-[#64748B] italic">No items added to bill</td>
                    </tr>
                  ) : (
                    items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F9FF]/50">
                        <td className="py-2 px-2.5 text-[#64748B] font-mono text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-2.5 font-semibold text-[#172B4D] max-w-[140px] truncate" title={item.productName}>
                          {item.productName}
                        </td>
                        <td className="py-2 px-2.5 text-center font-mono font-bold text-[#123B70]">{item.qty}</td>
                        <td className="py-2 px-2.5 text-right font-mono text-[#64748B]">₹{item.unitRate.toFixed(2)}</td>
                        <td className="py-2 px-2.5 text-right font-mono font-bold text-[#172B4D]">₹{(item.totalAmount || (item.unitRate * item.qty)).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Totals Breakdown */}
          {totals && (
            <div className="bg-white border border-[#D8E1EC] rounded-lg p-3 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#64748B]">
                <span>Taxable Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>
              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-[#15803D]">
                  <span>Total Discount:</span>
                  <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
              )}
              {totals.totalGst > 0 && (
                <div className="flex justify-between text-[#2563EB]">
                  <span>GST Amount:</span>
                  <span>+₹{totals.totalGst.toFixed(2)}</span>
                </div>
              )}
              {totals.roundOff !== 0 && (
                <div className="flex justify-between text-[#64748B]">
                  <span>Round Off:</span>
                  <span>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-[#123B70] pt-1.5 border-t border-[#D8E1EC]">
                <span>Grand Total:</span>
                <span className="text-[#2563EB]">₹{totals.netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: PAYMENT & SETTLEMENT CONTROLS */}
        <div className="lg:col-span-6 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Net Payable Banner */}
            <div className="p-4 bg-[#123B70] border border-[#0D2D56] rounded-xl text-center shadow-sm text-white">
              <div className="text-xs uppercase tracking-wider text-blue-200 font-bold">Net Payable Amount</div>
              <div className="text-3xl font-black text-white font-mono mt-1">
                {formatCurrency(netPayable)}
              </div>
            </div>

            {/* Bill Remark / Narration */}
            <div className="p-3 bg-[#F8FAFC] border border-[#D8E1EC] rounded-xl space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#172B4D] flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>Bill Remark / Narration</span>
                </label>
                <span className="text-[10px] text-[#64748B] font-mono">Prints on bill & saved</span>
              </div>
              <input
                type="text"
                disabled={isSubmitting}
                placeholder="e.g. Class 10th Books, School Order, Counter Sale..."
                value={notes || ''}
                onChange={(e) => onNotesChange?.(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#172B4D] placeholder-[#94A3B8] focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            {/* Payment Modes Selection */}
            <div>
              <label className="block text-xs font-bold text-[#172B4D] mb-2 uppercase tracking-wider">Select Payment Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {paymentModes.map((mode) => {
                  const active = paymentMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => onSelectPaymentMode(mode.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-sm ring-2 ring-[#2563EB]/30'
                          : 'bg-white border-[#D8E1EC] text-[#172B4D] hover:bg-[#F5F9FF]'
                      } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        {mode.icon}
                        <span>{mode.label}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                        active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        [{mode.shortcut}]
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Tender Calculation */}
            {paymentMode === 'cash' && (
              <div className="p-3.5 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#172B4D]">Cash Received</label>
                  <span className="text-xs text-[#64748B] font-mono">
                    Return Change: <strong className="text-[#B45309] font-bold">₹{changeReturn.toFixed(2)}</strong>
                  </span>
                </div>
                
                <input
                  type="number"
                  min={0}
                  disabled={isSubmitting}
                  value={cashTendered || ''}
                  onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-lg font-mono text-[#15803D] font-extrabold focus:outline-none focus:border-[#2563EB] shadow-xs"
                />

                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[11px] text-[#64748B] font-mono">Quick Amounts:</span>
                  {quickCashOptions.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setCashTendered(amt)}
                      className="px-2 py-0.5 bg-white hover:bg-[#DBEAFE] border border-[#D8E1EC] rounded text-xs font-mono text-[#172B4D] transition-colors cursor-pointer font-semibold"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* UPI Details Input */}
            {paymentMode === 'upi' && (
              <div className="p-3.5 bg-[#F5F9FF] border border-[#D8E1EC] rounded-xl space-y-2.5">
                <label className="block text-xs font-bold text-[#172B4D]">UPI Reference / UTR Number (Optional)</label>
                <input
                  type="text"
                  disabled={isSubmitting}
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  placeholder="e.g. 123456789012 or UTR Ref"
                  className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-sm font-mono text-[#172B4D] focus:outline-none focus:border-[#2563EB] shadow-xs"
                />
                <div className="flex items-start gap-2 p-2 bg-white rounded-lg border border-[#D8E1EC] text-[11px] text-[#64748B]">
                  <Info className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                  <span>
                    Records payment mode and UPI transaction reference number.
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <button
              type="button"
              disabled={isSubmitting || items.length === 0}
              onClick={() => handleConfirm(false)}
              className="w-full py-3 bg-white hover:bg-[#F5F9FF] disabled:opacity-50 text-[#172B4D] rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-[#D8E1EC] cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" /> : <CheckCircle2 className="w-4 h-4 text-[#15803D]" />}
              Save Bill (No Print)
            </button>
            
            <button
              type="button"
              disabled={isSubmitting || items.length === 0}
              onClick={() => handleConfirm(true)}
              className="w-full py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Printer className="w-4 h-4" />}
              Save & Print A5 [F9 / Enter]
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
