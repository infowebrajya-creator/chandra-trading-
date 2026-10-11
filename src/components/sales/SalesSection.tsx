import React, { useState, useEffect } from 'react';
import { 
  Receipt, Search, Printer, Eye, XCircle, Download, RefreshCw, Trash2 
} from 'lucide-react';
import { useSalesStore } from '../../store/useSalesStore';
import { useProductStore } from '../../store/useProductStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Modal } from '../common/Modal';
import { Badge } from '../common/Badge';
import { Invoice, PaymentMode, InvoiceType, InvoiceStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { triggerA5Print } from '../../lib/print';
import { db } from '../../lib/db';
import { 
  exportProductsCSV, exportInvoiceHeadersCSV, exportInvoiceItemsCSV, 
  exportPaymentsCSV, exportStockMovementsCSV 
} from '../../lib/exportProcessor';

interface SalesSectionProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
}

export const SalesSection: React.FC<SalesSectionProps> = ({ onToast }) => {
  const { 
    invoices, isLoading, searchQuery, paymentFilter, dateRange, 
    setSearchQuery, setPaymentFilter, setDateRange, loadInvoices, cancelInvoice,
    syncInvoicesWithSupabase, clearAllSalesData
  } = useSalesStore();

  const { products, loadProducts } = useProductStore();
  const { shopProfile, printSettings } = useSettingsStore();

  // Additional Filter State
  const [billTypeFilter, setBillTypeFilter] = useState<InvoiceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [isSubmittingReversal, setIsSubmittingReversal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    try {
      const res = await syncInvoicesWithSupabase();
      if (res.success) {
        onToast('success', 'Cloud Synced', res.message);
      } else {
        onToast('info', 'Supabase Notice', res.message);
      }
    } catch (e: any) {
      onToast('error', 'Sync Failed', e?.message || 'Failed to sync with Supabase.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearOldSalesData = async () => {
    if (!window.confirm('Are you sure you want to remove all old/test sales bills? This will reset sales history to match your clean Supabase database.')) {
      return;
    }
    try {
      await clearAllSalesData(true);
      onToast('success', 'Sales Data Reset', 'All old/test sales bills have been removed.');
    } catch (e: any) {
      onToast('error', 'Reset Failed', e?.message || 'Failed to reset sales data.');
    }
  };

  useEffect(() => {
    loadInvoices();
    loadProducts();
  }, []);

  const todayStr = new Date().toLocaleDateString('en-CA');
  const isDateToday = (d: string) => d === todayStr;

  // Filter Invoices
  const filteredInvoices = invoices.filter(inv => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = inv.invoiceNumber.toLowerCase().includes(q);
      const matchCust = inv.customerName.toLowerCase().includes(q);
      const matchMobile = inv.customerMobile?.includes(q);
      const matchNotes = inv.notes?.toLowerCase().includes(q);
      if (!matchNum && !matchCust && !matchMobile && !matchNotes) return false;
    }

    // Payment Filter
    if (paymentFilter !== 'all' && inv.paymentMode !== paymentFilter) return false;

    // Bill Type Filter
    if (billTypeFilter !== 'all' && inv.invoiceType !== billTypeFilter) return false;

    // Status Filter
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

    // Date Range Filter
    if (dateRange !== 'all') {
      const invDate = new Date(inv.date);
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      if (dateRange === 'today') {
        if (!isDateToday(inv.date)) return false;
      } else if (dateRange === 'yesterday') {
        const yest = new Date(now);
        yest.setDate(now.getDate() - 1);
        const yestStr = yest.toLocaleDateString('en-CA');
        if (inv.date !== yestStr) return false;
      } else if (dateRange === 'week') {
        const weekAgo = new Date(now);
        weekAgo.setDate(now.getDate() - 7);
        if (invDate < weekAgo) return false;
      } else if (dateRange === 'month') {
        const monthAgo = new Date(now);
        monthAgo.setDate(now.getDate() - 30);
        if (invDate < monthAgo) return false;
      }
    }

    return true;
  });

  // Compute Operational Dashboard Stats based on active selection
  const activeStatsInvoices = dateRange === 'today'
    ? invoices.filter(i => isDateToday(i.date))
    : filteredInvoices;

  const todayCompleted = activeStatsInvoices.filter(i => i.status === 'completed');
  const todayCompletedSalesAmt = todayCompleted.reduce((sum, i) => sum + i.netPayable, 0);

  const todayCashAmt = todayCompleted
    .filter(i => i.paymentMode === 'cash')
    .reduce((sum, i) => sum + i.paidAmount, 0);

  const todayUpiAmt = todayCompleted
    .filter(i => i.paymentMode === 'upi')
    .reduce((sum, i) => sum + i.paidAmount, 0);

  const todayCompletedCount = todayCompleted.length;

  const todayCancelled = activeStatsInvoices.filter(i => i.status === 'cancelled');
  const todayCancelledCount = todayCancelled.length;
  const todayCancelledAmt = todayCancelled.reduce((sum, i) => sum + i.netPayable, 0);

  const handleReprintA5 = (inv: Invoice) => {
    triggerA5Print(inv, shopProfile, printSettings);
    onToast('info', 'Printing Invoice A5', `Triggered print for #${inv.invoiceNumber}`);
  };

  const handleOpenReversal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setReversalReason('');
    setIsReversalModalOpen(true);
  };

  const handleConfirmReversal = async () => {
    if (!selectedInvoice) return;
    if (!reversalReason.trim()) {
      onToast('error', 'Reason Required', 'Please enter a valid reason for cancelling this invoice.');
      return;
    }

    setIsSubmittingReversal(true);
    try {
      await cancelInvoice(selectedInvoice.id, true, reversalReason.trim());
      onToast('success', 'Invoice Cancelled & Reversed', `Invoice #${selectedInvoice.invoiceNumber} reversed. Stock restored and audit log written.`);
      setIsReversalModalOpen(false);
      setIsDetailModalOpen(false);
    } catch (err: any) {
      onToast('error', 'Reversal Failed', err.message || 'Error executing invoice reversal.');
    } finally {
      setIsSubmittingReversal(false);
    }
  };

  const handleExportStockMovements = async () => {
    const movements = await db.stockMovements.orderBy('createdAt').reverse().toArray();
    exportStockMovementsCSV(movements);
    onToast('success', 'Export Complete', `Exported ${movements.length} stock movement records.`);
  };

  return (
    <div className="flex flex-col h-auto md:h-[calc(100vh-4.5rem)] gap-3 font-sans text-[#172B4D] pb-16 md:pb-0">
      {/* Top Reporting Dashboard Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 shrink-0 font-sans">
        <div className="p-3 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="text-[10px] uppercase text-[#64748B] font-bold">
            {dateRange === 'today' ? "Today's Sales" : dateRange === 'all' ? "Total Sales" : "Period Sales"} (Completed)
          </div>
          <div className="text-xl font-black text-[#15803D] font-mono mt-1">{formatCurrency(todayCompletedSalesAmt)}</div>
          <div className="text-[10px] text-[#64748B] mt-0.5">{todayCompletedCount} completed bill(s)</div>
        </div>

        <div className="p-3 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="text-[10px] uppercase text-[#64748B] font-bold">Cash Collected</div>
          <div className="text-xl font-black text-[#B45309] font-mono mt-1">{formatCurrency(todayCashAmt)}</div>
          <div className="text-[10px] text-[#64748B] mt-0.5">Cash tender total</div>
        </div>

        <div className="p-3 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="text-[10px] uppercase text-[#64748B] font-bold">UPI Recorded</div>
          <div className="text-xl font-black text-[#2563EB] font-mono mt-1">{formatCurrency(todayUpiAmt)}</div>
          <div className="text-[10px] text-[#64748B] mt-0.5">UPI / QR total</div>
        </div>

        <div className="p-3 bg-white border border-[#D8E1EC] rounded-xl shadow-sm">
          <div className="text-[10px] uppercase text-[#64748B] font-bold">Bills Completed</div>
          <div className="text-xl font-black text-[#172B4D] font-mono mt-1">{todayCompletedCount}</div>
          <div className="text-[10px] text-[#64748B] mt-0.5">Active transactions</div>
        </div>

        <div className="p-3 bg-white border border-[#FCA5A5] bg-[#FEE2E2]/30 rounded-xl shadow-sm">
          <div className="text-[10px] uppercase text-[#B91C1C] font-bold">Reversals / Cancelled</div>
          <div className="text-xl font-black text-[#B91C1C] font-mono mt-1">{formatCurrency(todayCancelledAmt)}</div>
          <div className="text-[10px] text-[#B91C1C] mt-0.5">{todayCancelledCount} reversed bill(s)</div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="flex-1 bg-white border border-[#D8E1EC] rounded-xl p-3 sm:p-4 flex flex-col min-h-0 shadow-sm">
        {/* Filters & Actions Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-[#D8E1EC]">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-full md:max-w-xs">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Invoice #, Customer or Remark..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs font-mono text-[#172B4D] focus:outline-none focus:border-[#2563EB] shadow-xs"
              />
            </div>

            {/* Date Range Filter */}
            <select
              value={dateRange}
              onChange={(e: any) => setDateRange(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-semibold"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>

            {/* Payment Method Filter */}
            <select
              value={paymentFilter}
              onChange={(e: any) => setPaymentFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-semibold"
            >
              <option value="all">All Payments</option>
              <option value="cash">Cash Only</option>
              <option value="upi">UPI Only</option>
              <option value="card">Card Only</option>
              <option value="credit">Credit / Khata</option>
            </select>

            {/* Bill Type Filter */}
            <select
              value={billTypeFilter}
              onChange={(e: any) => setBillTypeFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-semibold"
            >
              <option value="all">All Bill Types</option>
              <option value="gst">GST Invoice</option>
              <option value="simple">Simple Bill</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e: any) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#2563EB] font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed Only</option>
              <option value="cancelled">Cancelled / Reversed</option>
            </select>
          </div>

          {/* Action Buttons: Sync & Export */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncSupabase}
              disabled={isSyncing || isLoading}
              className="px-3.5 py-2 bg-white hover:bg-[#F0F6FF] border border-[#D8E1EC] text-[#172B4D] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Sync sales with Supabase cloud"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2563EB] ${isSyncing || isLoading ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Cloud'}</span>
            </button>

            <button
              onClick={handleClearOldSalesData}
              disabled={isLoading}
              className="px-3 py-2 bg-white hover:bg-red-50 border border-red-200 text-[#B91C1C] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              title="Remove old mock bills to match your clean Supabase database"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#B91C1C]" />
              <span>Clear Old Data</span>
            </button>

            <button
              onClick={() => setIsExportModalOpen(true)}
              className="px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" /> Export Data (CSV)
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-[#F1F5F9] text-[#172B4D] font-bold uppercase sticky top-0 border-b border-[#D8E1EC] text-[11px]">
              <tr>
                <th className="p-3">Invoice #</th>
                <th className="p-3">Bill Type</th>
                <th className="p-3">Date & Time</th>
                <th className="p-3">Customer Details</th>
                <th className="p-3">Remark</th>
                <th className="p-3 text-center">Payment Mode</th>
                <th className="p-3 text-right">Items</th>
                <th className="p-3 text-right">Net Amount</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-[#64748B]">
                    <Receipt className="w-10 h-10 mx-auto mb-2 text-[#94A3B8]" />
                    <div className="font-bold text-[#172B4D]">No invoices found matching current criteria</div>
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-[#F0F6FF] transition-colors">
                    <td className="p-3 font-mono font-bold text-[#2563EB]">{inv.invoiceNumber}</td>
                    <td className="p-3 font-mono uppercase text-[11px]">
                      <span className={`px-2 py-0.5 rounded font-bold ${inv.invoiceType === 'gst' ? 'bg-[#DBEAFE] text-[#123B70] border border-[#BFDBFE]' : 'bg-[#F1F5F9] text-[#64748B] border border-[#D8E1EC]'}`}>
                        {inv.invoiceType === 'gst' ? 'GST' : 'SIMPLE'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-[#64748B]">{formatDate(inv.date)} {inv.time}</td>
                    <td className="p-3 font-semibold text-[#172B4D]">
                      <div>{inv.customerName || 'Cash Customer'}</div>
                      {inv.customerMobile && <div className="text-[11px] text-[#64748B] font-mono font-normal">{inv.customerMobile}</div>}
                    </td>
                    <td className="p-3">
                      {inv.notes ? (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] max-w-[170px] truncate" title={inv.notes}>
                          {inv.notes}
                        </span>
                      ) : (
                        <span className="text-[#94A3B8] font-mono text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-center uppercase font-mono text-xs">
                      <Badge variant={inv.paymentMode === 'cash' ? 'emerald' : inv.paymentMode === 'upi' ? 'indigo' : 'cyan'}>
                        {inv.paymentMode}
                      </Badge>
                      {inv.transactionRef && <div className="text-[10px] text-[#64748B] mt-0.5 truncate max-w-[100px]" title={inv.transactionRef}>Ref: {inv.transactionRef}</div>}
                    </td>
                    <td className="p-3 text-right font-mono text-[#172B4D]">{inv.items.length} items</td>
                    <td className="p-3 text-right font-mono font-extrabold text-[#15803D]">₹{inv.netPayable.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-center font-mono">
                      {inv.status === 'completed' ? (
                        <Badge variant="emerald">COMPLETED</Badge>
                      ) : (
                        <Badge variant="rose">CANCELLED</Badge>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => { setSelectedInvoice(inv); setIsDetailModalOpen(true); }}
                          className="p-1.5 text-[#64748B] hover:text-[#2563EB] rounded hover:bg-[#DBEAFE] transition-colors cursor-pointer"
                          title="View Saved Invoice Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleReprintA5(inv)}
                          className="p-1.5 text-[#64748B] hover:text-[#15803D] rounded hover:bg-[#DCFCE7] transition-colors cursor-pointer"
                          title="Reprint A5 Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {inv.status === 'completed' && (
                          <button
                            onClick={() => handleOpenReversal(inv)}
                            className="p-1.5 text-[#64748B] hover:text-[#B91C1C] rounded hover:bg-[#FEE2E2] transition-colors cursor-pointer"
                            title="Reverse / Cancel Sale"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={`Saved Invoice Details #${selectedInvoice?.invoiceNumber}`}
        subtitle="Saved line items, historical snapshots, and authoritative totals"
        maxWidth="3xl"
      >
        {selectedInvoice && (
          <div className="space-y-4 font-sans text-xs text-[#172B4D]">
            <div className="grid grid-cols-2 gap-3 p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg font-mono">
              <div>
                <div>Customer Name: <strong className="text-[#172B4D]">{selectedInvoice.customerName}</strong></div>
                <div>Mobile: <span className="text-[#64748B]">{selectedInvoice.customerMobile || 'N/A'}</span></div>
                {selectedInvoice.customerGstin && <div>GSTIN: <span className="text-[#172B4D]">{selectedInvoice.customerGstin}</span></div>}
              </div>
              <div>
                <div>Date & Time: <span className="text-[#172B4D]">{selectedInvoice.date} {selectedInvoice.time}</span></div>
                <div>Document Type: <strong className="text-[#2563EB] uppercase">{selectedInvoice.invoiceType === 'gst' ? 'GST Tax Invoice' : 'Simple Bill'}</strong></div>
                <div>Payment Mode: <strong className="text-[#15803D] uppercase">{selectedInvoice.paymentMode}</strong></div>
                {selectedInvoice.transactionRef && <div>Transaction Ref / UTR: <span className="text-[#B45309]">{selectedInvoice.transactionRef}</span></div>}
              </div>

              {selectedInvoice.notes && (
                <div className="col-span-2 p-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
                  <div className="text-[10px] font-bold uppercase text-[#92400E]">Bill Remark / Narration:</div>
                  <div className="text-xs font-bold text-[#78350F] mt-0.5">{selectedInvoice.notes}</div>
                </div>
              )}
            </div>

            {/* Item Table */}
            <div className="overflow-x-auto border border-[#D8E1EC] rounded-lg bg-white">
              <table className="w-full border-collapse text-left text-[11px]">
                <thead className="bg-[#F1F5F9] text-[#172B4D] uppercase font-bold border-b border-[#D8E1EC]">
                  <tr>
                    <th className="p-2">Product</th>
                    <th className="p-2 text-center">Remark (Pack/HSN)</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-center">Free</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">MRP</th>
                    <th className="p-2 text-center">Disc %</th>
                    <th className="p-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="p-2 text-[#172B4D] font-semibold">{item.productName}</td>
                      <td className="p-2 text-center text-[#64748B] text-[10px] font-mono">{item.pack} {item.hsnCode ? `| HSN:${item.hsnCode}` : ''}</td>
                      <td className="p-2 text-center text-[#15803D] font-bold font-mono">{item.qty} {item.unit}</td>
                      <td className="p-2 text-center text-[#B45309] font-mono">{item.freeQty > 0 ? item.freeQty : '-'}</td>
                      <td className="p-2 text-right font-mono">₹{item.unitRate.toFixed(2)}</td>
                      <td className="p-2 text-right text-[#64748B] font-mono">₹{item.mrp.toFixed(2)}</td>
                      <td className="p-2 text-center font-mono">{item.discountPct}%</td>
                      <td className="p-2 text-right font-bold text-[#123B70] font-mono">₹{item.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Authoritative Totals */}
            <div className="p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg space-y-1 text-right text-xs font-mono">
              <div className="flex justify-between text-[#64748B]"><span>Taxable Subtotal:</span><span>₹{selectedInvoice.subtotal.toFixed(2)}</span></div>
              {selectedInvoice.totalDiscount > 0 && <div className="flex justify-between text-[#15803D]"><span>Total Discount:</span><span>- ₹{selectedInvoice.totalDiscount.toFixed(2)}</span></div>}
              {selectedInvoice.isInterstate ? (
                <div className="flex justify-between text-[#64748B]"><span>IGST Total:</span><span>₹{selectedInvoice.igstTotal.toFixed(2)}</span></div>
              ) : (
                <>
                  <div className="flex justify-between text-[#64748B]"><span>CGST Total:</span><span>₹{selectedInvoice.cgstTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-[#64748B]"><span>SGST Total:</span><span>₹{selectedInvoice.sgstTotal.toFixed(2)}</span></div>
                </>
              )}
              {selectedInvoice.freightAmount > 0 && <div className="flex justify-between text-[#64748B]"><span>Freight Overhead:</span><span>₹{selectedInvoice.freightAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between text-[#64748B]"><span>Round Off:</span><span>{selectedInvoice.roundOff >= 0 ? '+' : ''}₹{selectedInvoice.roundOff.toFixed(2)}</span></div>
              <div className="flex justify-between text-base font-extrabold text-[#123B70] pt-1 border-t border-[#D8E1EC] mt-1">
                <span>NET PAYABLE (SAVED):</span>
                <span>{formatCurrency(selectedInvoice.netPayable)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-between pt-3 border-t border-[#D8E1EC]">
              {selectedInvoice.status === 'completed' ? (
                <button
                  type="button"
                  onClick={() => handleOpenReversal(selectedInvoice)}
                  className="px-3 py-2 bg-[#FEE2E2] hover:bg-[#FECDD3] text-[#B91C1C] border border-[#FCA5A5] rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4" /> Cancel / Reverse Invoice
                </button>
              ) : (
                <Badge variant="rose">CANCELLED / REVERSED</Badge>
              )}
              
              <button
                type="button"
                onClick={() => handleReprintA5(selectedInvoice)}
                className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print A5 Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Controlled Invoice Reversal Modal */}
      <Modal
        isOpen={isReversalModalOpen}
        onClose={() => setIsReversalModalOpen(false)}
        title={`Confirm Reversal - Invoice #${selectedInvoice?.invoiceNumber}`}
        subtitle="Stock restoration & audit trail recording workflow"
        maxWidth="lg"
      >
        <div className="space-y-4 font-sans text-xs">
          <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-lg text-xs text-[#B91C1C]">
            <strong>Warning:</strong> Reversing an invoice will restore the product stock quantities in database, set invoice status to <code>cancelled</code>, and write an immutable audit log record.
          </div>

          <div>
            <label className="block text-xs font-bold text-[#172B4D] mb-1">Reason for Reversal / Cancellation *</label>
            <textarea
              rows={3}
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              placeholder="e.g. Customer returned merchandise / Billed wrong item by cashier..."
              className="w-full px-3 py-2 bg-white border border-[#D8E1EC] rounded-lg text-xs text-[#172B4D] focus:outline-none focus:border-[#B91C1C]"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmittingReversal}
              onClick={() => setIsReversalModalOpen(false)}
              className="px-4 py-2 bg-white hover:bg-[#F5F9FF] text-[#172B4D] border border-[#D8E1EC] rounded-lg text-xs font-semibold cursor-pointer"
            >
              Back
            </button>

            <button
              type="button"
              disabled={isSubmittingReversal}
              onClick={handleConfirmReversal}
              className="px-4 py-2 bg-[#B91C1C] hover:bg-[#991B1B] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              {isSubmittingReversal ? 'Processing Reversal...' : 'Confirm Reversal & Restore Stock'}
            </button>
          </div>
        </div>
      </Modal>

      {/* CSV Data Export Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Operational Data (CSV)"
        subtitle="Export sales, products, payments and stock ledger reports"
        maxWidth="lg"
      >
        <div className="space-y-3 font-sans text-xs">
          <div className="p-3 bg-[#F5F9FF] border border-[#D8E1EC] rounded-lg text-xs text-[#64748B]">
            Select a report to download in standard CSV format suitable for Microsoft Excel or accounting audit.
          </div>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => { exportInvoiceHeadersCSV(filteredInvoices); onToast('success', 'CSV Exported', `Exported ${filteredInvoices.length} invoice headers.`); }}
              className="p-3 bg-white hover:bg-[#F0F6FF] border border-[#D8E1EC] rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer shadow-xs"
            >
              <div>
                <div className="font-bold text-[#15803D]">1. Invoice Summary Headers CSV</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Includes invoice numbers, totals, discounts, taxes, customer details, payment modes.</div>
              </div>
              <Download className="w-4 h-4 text-[#15803D] shrink-0 ml-2" />
            </button>

            <button
              onClick={() => { exportInvoiceItemsCSV(filteredInvoices); onToast('success', 'CSV Exported', 'Exported invoice line items.'); }}
              className="p-3 bg-white hover:bg-[#F0F6FF] border border-[#D8E1EC] rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer shadow-xs"
            >
              <div>
                <div className="font-bold text-[#2563EB]">2. Invoice Line Items Detailed CSV</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Includes item-level snapshots, quantities, free quantities, rates, MRPs, item discounts, GST breakdown.</div>
              </div>
              <Download className="w-4 h-4 text-[#2563EB] shrink-0 ml-2" />
            </button>

            <button
              onClick={() => { exportPaymentsCSV(filteredInvoices); onToast('success', 'CSV Exported', 'Exported payment log report.'); }}
              className="p-3 bg-white hover:bg-[#F0F6FF] border border-[#D8E1EC] rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer shadow-xs"
            >
              <div>
                <div className="font-bold text-[#B45309]">3. Payments Log CSV</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Includes payment methods (Cash, UPI), paid amounts, and UTR transaction references.</div>
              </div>
              <Download className="w-4 h-4 text-[#B45309] shrink-0 ml-2" />
            </button>

            <button
              onClick={() => { exportProductsCSV(products); onToast('success', 'CSV Exported', `Exported ${products.length} product records.`); }}
              className="p-3 bg-white hover:bg-[#F0F6FF] border border-[#D8E1EC] rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer shadow-xs"
            >
              <div>
                <div className="font-bold text-[#0369A1]">4. Products Catalogue CSV</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Includes SKUs, barcodes, names, MRPs, selling rates, GST rates, HSN codes, stock quantities.</div>
              </div>
              <Download className="w-4 h-4 text-[#0369A1] shrink-0 ml-2" />
            </button>

            <button
              onClick={handleExportStockMovements}
              className="p-3 bg-white hover:bg-[#F0F6FF] border border-[#D8E1EC] rounded-xl text-left flex items-center justify-between text-xs transition-colors cursor-pointer shadow-xs"
            >
              <div>
                <div className="font-bold text-[#B91C1C]">5. Stock Movements Audit Ledger CSV</div>
                <div className="text-[11px] text-[#64748B] mt-0.5">Includes full stock audit history (sales, returns, adjustments, previous & new stock).</div>
              </div>
              <Download className="w-4 h-4 text-[#B91C1C] shrink-0 ml-2" />
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
