import React, { useState, useRef } from 'react';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, User, Phone, FileText, StickyNote,
  CheckCircle2, ChevronDown, ChevronUp, X, Sparkles, Wifi, WifiOff, ArrowRight
} from 'lucide-react';
import { useBillingStore } from '../../store/useBillingStore';
import { useProductStore } from '../../store/useProductStore';
import { useCustomerStore } from '../../store/useCustomerStore';
import { formatCurrency } from '../../utils/formatters';
import type { Product, Customer } from '../../types';

interface MobileBillingViewProps {
  onToast: (type: 'success' | 'error' | 'info', title: string, desc?: string) => void;
  onOpenQuickPay: () => void;
  onOpenNewBill: () => void;
  totals: {
    subtotal: number;
    totalDiscount: number;
    totalGst: number;
    cgstTotal: number;
    sgstTotal: number;
    igstTotal: number;
    roundOff: number;
    netPayable: number;
  };
  isOnline: boolean;
  isSupabaseConnected: boolean;
}

export const MobileBillingView: React.FC<MobileBillingViewProps> = ({
  onToast,
  onOpenQuickPay,
  onOpenNewBill,
  totals,
  isOnline,
  isSupabaseConnected
}) => {
  const {
    customerName, customerMobile, customerGstin, customerAddress, invoiceType,
    items, notes, isInterstate,
    setCustomerInfo, setInvoiceType, setIsInterstate, setNotes,
    addItemByProduct, updateItemQty, removeItem, clearBill
  } = useBillingStore();

  const { products } = useProductStore();
  const { customers, findOrCreateCustomer } = useCustomerStore();

  // Search & suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const isGstEnabled = invoiceType === 'gst';

  // Filter matching products
  const matchingProducts = searchQuery.trim().length > 0
    ? products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (p.barcode && p.barcode.includes(searchQuery.trim()))
      ).slice(0, 10)
    : [];

  const handleAddProduct = (prod: Product) => {
    addItemByProduct(prod, 1);
    onToast('success', `Added ${prod.name}`, `₹${prod.saleRate.toFixed(2)}`);
    setSearchQuery('');
  };

  const handleSelectCustomer = (cust: Customer) => {
    setCustomerInfo(cust.name, cust.mobile || '', cust.gstin || '', cust.address || '');
    setIsCustomerDrawerOpen(false);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8.5rem)] pb-24 font-sans text-[#172B4D] select-none">
      {/* 1. TOP MOBILE HEADER: GST Toggle, Status, New Bill */}
      <div className="flex items-center justify-between bg-white border border-[#D8E1EC] rounded-xl px-3 py-2 shadow-xs mb-2.5">
        <div className="flex items-center gap-2">
          {/* GST Toggle Pill */}
          <button
            type="button"
            onClick={() => setInvoiceType(invoiceType === 'gst' ? 'simple' : 'gst')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black border transition-all ${
              isGstEnabled
                ? 'bg-[#DCFCE7] text-[#15803D] border-[#86EFAC]'
                : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isGstEnabled ? 'bg-[#16A34A] animate-pulse' : 'bg-[#94A3B8]'}`}></span>
            <span>{isGstEnabled ? 'GST: ON' : 'GST: OFF'}</span>
          </button>

          {isGstEnabled && (
            <label className="flex items-center gap-1 text-[11px] font-bold text-[#172B4D]">
              <input
                type="checkbox"
                checked={isInterstate}
                onChange={(e) => setIsInterstate(e.target.checked)}
                className="w-3 h-3 text-[#2563EB] rounded"
              />
              <span>IGST</span>
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status dot */}
          <span className="flex items-center gap-1 text-[11px] text-[#64748B] font-mono">
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[#15803D]' : 'bg-[#B91C1C]'}`}></span>
            {isOnline ? 'Online' : 'Offline'}
          </span>

          {/* New Bill Button */}
          <button
            type="button"
            onClick={onOpenNewBill}
            className="flex items-center gap-1 px-2.5 py-1 bg-[#2563EB] text-white rounded-lg text-xs font-bold shadow-xs active:scale-95 transition-transform"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* 2. CUSTOMER & REMARK QUICK CARD */}
      <div 
        onClick={() => setIsCustomerDrawerOpen(!isCustomerDrawerOpen)}
        className="bg-white border border-[#D8E1EC] rounded-xl p-3 shadow-xs mb-2.5 cursor-pointer active:bg-[#F5F9FF] transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#DBEAFE] text-[#2563EB] flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-[#172B4D] truncate">
                {customerName.trim() || 'Cash Customer'}
              </div>
              <div className="text-[11px] text-[#64748B] flex items-center gap-2 truncate">
                {customerMobile && <span>📱 {customerMobile}</span>}
                {notes ? (
                  <span className="text-[#B45309] font-bold truncate">📝 {notes}</span>
                ) : (
                  <span className="text-[#94A3B8] italic">No remark</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs text-[#2563EB] font-bold shrink-0">
            <span>{isCustomerDrawerOpen ? 'Close' : 'Edit'}</span>
            {isCustomerDrawerOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>

        {/* Expandable Customer & Remark Form on Mobile */}
        {isCustomerDrawerOpen && (
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="mt-3 pt-3 border-t border-[#D8E1EC] space-y-2.5 animate-in fade-in duration-100"
          >
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1">Customer Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar / School Name"
                value={customerName}
                onChange={(e) => setCustomerInfo(e.target.value, customerMobile, customerGstin, customerAddress)}
                className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-semibold text-[#172B4D] focus:bg-white focus:outline-none focus:border-[#2563EB]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] mb-1">Mobile Number</label>
                <input
                  type="text"
                  placeholder="10 Digits..."
                  value={customerMobile}
                  onChange={(e) => setCustomerInfo(customerName, e.target.value, customerGstin, customerAddress)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#172B4D] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748B] mb-1">GSTIN (Optional)</label>
                <input
                  type="text"
                  placeholder="GSTIN..."
                  value={customerGstin}
                  onChange={(e) => setCustomerInfo(customerName, customerMobile, e.target.value.toUpperCase(), customerAddress)}
                  className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs font-mono uppercase text-[#172B4D] focus:bg-white focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#64748B] mb-1 flex items-center justify-between">
                <span>Bill Remark / Narration</span>
                <span className="text-[10px] text-[#2563EB]">Prints on bill</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Class 10th Books, School Order..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-1.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs font-bold text-[#78350F] focus:outline-none focus:border-[#D97706]"
              />
            </div>

            {/* Quick suggestion customers if list available */}
            {customers.length > 0 && (
              <div>
                <div className="text-[10px] font-bold text-[#64748B] mb-1">Saved Clients:</div>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {customers.slice(0, 5).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectCustomer(c)}
                      className="px-2 py-0.5 bg-[#F1F5F9] hover:bg-[#DBEAFE] border border-[#D8E1EC] rounded text-[11px] font-semibold text-[#172B4D] whitespace-nowrap"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. PROMINENT PRODUCT SEARCH BAR (MOBILE) */}
      <div className="relative mb-3">
        <div className="relative flex items-center bg-white border-2 border-[#BFDBFE] rounded-xl shadow-xs overflow-hidden focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/20">
          <Search className="w-4 h-4 text-[#2563EB] ml-3 shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search product name, barcode or SKU..."
            className="w-full py-2.5 px-2.5 text-xs font-semibold text-[#172B4D] placeholder-[#94A3B8] focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
              className="p-2 text-[#94A3B8] hover:text-[#172B4D]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Live Search Suggestions Dropdown */}
        {searchQuery.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-[#D8E1EC] rounded-xl shadow-xl z-30 max-h-72 overflow-y-auto divide-y divide-gray-100 animate-in fade-in duration-100">
            {matchingProducts.length === 0 ? (
              <div className="p-4 text-center text-xs text-[#64748B]">
                No stationery items found for "{searchQuery}"
              </div>
            ) : (
              matchingProducts.map((prod) => (
                <div
                  key={prod.id}
                  onClick={() => handleAddProduct(prod)}
                  className="p-3 hover:bg-[#F5F9FF] active:bg-[#DBEAFE] cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="min-w-0 pr-2">
                    <div className="text-xs font-bold text-[#172B4D] truncate">{prod.name}</div>
                    <div className="text-[11px] text-[#64748B] flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-[#15803D] font-bold">₹{prod.saleRate.toFixed(2)}</span>
                      {prod.mrp > prod.saleRate && (
                        <span className="text-[#94A3B8] line-through text-[10px]">₹{prod.mrp}</span>
                      )}
                      <span>• {prod.unit}</span>
                      <span className="text-[10px] text-gray-500 font-mono">Stock: {prod.stockQty}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="px-3 py-1.5 bg-[#2563EB] text-white rounded-lg text-xs font-bold shrink-0 shadow-xs active:scale-95"
                  >
                    + Add
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 4. CART ITEMS LIST (MOBILE CARD VIEW) */}
      <div className="flex items-center justify-between px-1 mb-2">
        <div className="text-xs font-bold text-[#64748B] uppercase tracking-wider">
          Items in Cart ({items.length})
        </div>
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm('Clear all items from current bill?')) clearBill();
            }}
            className="text-[11px] text-[#B91C1C] font-bold hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-[#D8E1EC] rounded-2xl p-8 text-center text-[#64748B] shadow-xs my-2">
          <div className="w-12 h-12 rounded-full bg-[#DBEAFE] text-[#2563EB] mx-auto mb-3 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="text-sm font-black text-[#172B4D]">Cart is Empty</div>
          <div className="text-xs text-[#64748B] mt-1 max-w-xs mx-auto">
            Use the search box above to add books, pens, registers, and stationery.
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {items.map((item, index) => (
            <div 
              key={item.id} 
              className="bg-white border border-[#D8E1EC] rounded-xl p-3 shadow-xs space-y-2.5"
            >
              {/* Card Header: Product Name + Trash */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-extrabold text-[#172B4D] leading-snug">
                    <span className="text-[#64748B] font-mono mr-1.5">#{index + 1}</span>
                    {item.productName}
                  </div>
                  <div className="text-[10px] text-[#64748B] font-mono mt-0.5 flex items-center gap-2">
                    {item.pack && <span>{item.pack}</span>}
                    {item.hsnCode && <span>HSN: {item.hsnCode}</span>}
                    {item.unit && <span>({item.unit})</span>}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-[#94A3B8] hover:text-[#B91C1C] rounded-lg hover:bg-red-50 transition-colors"
                  title="Remove Item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Card Footer: Rate, Quantity Stepper, Line Total */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100">
                {/* Unit Rate & MRP */}
                <div>
                  <div className="text-xs font-bold text-[#172B4D] font-mono">
                    ₹{item.unitRate.toFixed(2)}
                  </div>
                  {item.mrp > item.unitRate && (
                    <div className="text-[10px] text-[#94A3B8] line-through font-mono">
                      MRP ₹{item.mrp.toFixed(2)}
                    </div>
                  )}
                </div>

                {/* Touch-Friendly Quantity Stepper */}
                <div className="flex items-center gap-2 bg-[#F1F5F9] border border-[#CBD5E1] rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.id, Math.max(1, item.qty - 1))}
                    className="w-8 h-8 rounded bg-white text-[#172B4D] flex items-center justify-center font-bold text-sm shadow-2xs active:bg-gray-100 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  <span className="w-7 text-center font-mono font-extrabold text-xs text-[#172B4D]">
                    {item.qty}
                  </span>

                  <button
                    type="button"
                    onClick={() => updateItemQty(item.id, item.qty + 1)}
                    className="w-8 h-8 rounded bg-white text-[#172B4D] flex items-center justify-center font-bold text-sm shadow-2xs active:bg-gray-100 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Line Total */}
                <div className="text-right">
                  <div className="text-sm font-black text-[#15803D] font-mono">
                    ₹{item.totalAmount.toFixed(2)}
                  </div>
                  {item.schemeDiscountPct > 0 && (
                    <div className="text-[10px] text-[#2563EB] font-bold">
                      {item.schemeDiscountPct}% off
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. FIXED BOTTOM CHECKOUT BAR (MOBILE ONLY) */}
      <div className="fixed bottom-14 left-0 right-0 z-40 bg-white border-t border-[#D8E1EC] px-3.5 py-2.5 shadow-xl flex items-center justify-between">
        {/* Left: Total & Breakdown trigger */}
        <div 
          onClick={() => setIsBreakdownOpen(!isBreakdownOpen)}
          className="cursor-pointer"
        >
          <div className="text-[11px] text-[#64748B] flex items-center gap-1 font-semibold">
            <span>{items.length} item(s)</span>
            <span className="text-[#2563EB] text-[10px] underline">Details</span>
          </div>
          <div className="text-lg font-black text-[#123B70] font-mono leading-tight">
            {formatCurrency(totals.netPayable)}
          </div>
        </div>

        {/* Right: Settle Button */}
        <button
          type="button"
          disabled={items.length === 0}
          onClick={onOpenQuickPay}
          className="px-5 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-md active:scale-95 transition-all cursor-pointer"
        >
          <span>Settle Bill</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Breakdown Bottom Sheet Modal */}
      {isBreakdownOpen && (
        <div 
          onClick={() => setIsBreakdownOpen(false)}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-end animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-2xl p-4 space-y-3 pb-24 shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#D8E1EC]">
              <div className="text-xs font-black text-[#172B4D] uppercase">Bill Breakdown</div>
              <button 
                onClick={() => setIsBreakdownOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#172B4D]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[#64748B]">
                <span>Taxable Subtotal:</span>
                <span>₹{totals.subtotal.toFixed(2)}</span>
              </div>

              {totals.totalDiscount > 0 && (
                <div className="flex justify-between text-[#15803D]">
                  <span>Total Discount:</span>
                  <span>- ₹{totals.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              {isGstEnabled && (
                <>
                  <div className="flex justify-between text-[#64748B]">
                    <span>CGST:</span>
                    <span>₹{totals.cgstTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#64748B]">
                    <span>SGST:</span>
                    <span>₹{totals.sgstTotal.toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-[#64748B]">
                <span>Round Off:</span>
                <span>{totals.roundOff >= 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-base font-black text-[#123B70] pt-2 border-t border-[#D8E1EC]">
                <span>Grand Total:</span>
                <span>₹{totals.netPayable.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => {
                setIsBreakdownOpen(false);
                onOpenQuickPay();
              }}
              className="w-full py-3 bg-[#2563EB] text-white rounded-xl text-xs font-black text-center shadow-md cursor-pointer"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
