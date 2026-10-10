import { create } from 'zustand';
import type { Invoice, PaymentMode, StockMovement, AuditLog } from '../types';
import { db } from '../lib/db';
import { getSupabaseClient } from '../lib/supabase';
import { generateInvoiceNumber } from '../utils/formatters';

interface SalesState {
  invoices: Invoice[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  paymentFilter: PaymentMode | 'all';
  dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'all';

  setSearchQuery: (query: string) => void;
  setPaymentFilter: (filter: PaymentMode | 'all') => void;
  setDateRange: (range: 'today' | 'yesterday' | 'week' | 'month' | 'all') => void;

  loadInvoices: () => Promise<void>;
  createCompletedInvoice: (
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'date' | 'time' | 'status' | 'createdAt'>,
    invoicePrefix?: string
  ) => Promise<Invoice>;
  cancelInvoice: (invoiceId: string, restoreStock?: boolean, reason?: string) => Promise<void>;
  syncInvoicesWithSupabase: () => Promise<{ success: boolean; message: string }>;
}

export const useSalesStore = create<SalesState>((set, get) => ({
  invoices: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  paymentFilter: 'all',
  dateRange: 'today',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter }),
  setDateRange: (dateRange) => set({ dateRange }),

  loadInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await db.invoices.orderBy('createdAt').reverse().toArray();
      set({ invoices, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load invoices', isLoading: false });
    }
  },

  createCompletedInvoice: async (invoiceData, invoicePrefix = 'WR-') => {
    // 1. VALIDATION CHECKS
    if (!invoiceData.items || invoiceData.items.length === 0) {
      throw new Error('CANNOT_COMPLETE_SALE: Invoice must contain at least one item.');
    }

    for (const item of invoiceData.items) {
      if (item.qty <= 0) {
        throw new Error(`INVALID_QUANTITY: Item "${item.productName}" quantity must be greater than zero.`);
      }
      if (item.schemeDiscountPct < 0 || item.schemeDiscountPct > 100 || item.addlDiscountPct < 0 || item.addlDiscountPct > 100) {
        throw new Error(`INVALID_DISCOUNT: Item "${item.productName}" discount percentage must be between 0% and 100%.`);
      }


    }

    // 2. IDEMPOTENCY CHECK (Local DB)
    if (invoiceData.idempotencyKey) {
      const existing = await db.invoices.where('idempotencyKey').equals(invoiceData.idempotencyKey).first();
      if (existing) {
        console.info(`[Idempotency] Sale already processed for key "${invoiceData.idempotencyKey}". Replaying existing invoice.`);
        return existing;
      }
    }

    const client = getSupabaseClient();

    // 3. SUPABASE ATOMIC RPC CALL (If connected)
    if (client) {
      try {
        const payloadItems = invoiceData.items.map(i => ({
          productId: i.productId,
          qty: i.qty,
          freeQty: i.freeQty || 0,
          unitRate: i.unitRate,
          schemeDiscountPct: i.schemeDiscountPct,
          addlDiscountPct: i.addlDiscountPct,
          discountPct: i.discountPct
        }));

        const payloadPayments = [{
          method: invoiceData.paymentMode,
          amount: invoiceData.paidAmount,
          transactionRef: invoiceData.transactionRef || invoiceData.upiReference || ''
        }];

        const { data: rpcRes, error: rpcErr } = await client.rpc('complete_sale', {
          p_idempotency_key: invoiceData.idempotencyKey || ('idem_' + Date.now()),
          p_customer_name: invoiceData.customerName || 'Cash Customer',
          p_customer_mobile: invoiceData.customerMobile || '',
          p_customer_gstin: invoiceData.customerGstin || '',
          p_customer_address: invoiceData.customerAddress || '',
          p_items: payloadItems,
          p_payments: payloadPayments,
          p_invoice_type: invoiceData.invoiceType || 'gst',
          p_is_interstate: invoiceData.isInterstate || false,
          p_discount_amount: invoiceData.totalDiscount || 0.00,
          p_freight_amount: invoiceData.freightAmount || 0.00,
          p_notes: invoiceData.notes || ''
        });

        if (rpcErr) {
          console.warn('Supabase complete_sale RPC error, falling back to local database:', rpcErr.message);
        } else if (rpcRes && rpcRes.invoice) {
          const invData = rpcRes.invoice;
          const remoteInvoice: Invoice = {
            id: invData.id,
            invoiceNumber: invData.invoice_number,
            invoiceType: invData.invoice_type || 'gst',
            date: invData.invoice_date,
            time: invData.invoice_time,
            customerName: invData.customer_name || 'Cash Customer',
            customerMobile: invData.customer_mobile || '',
            customerGstin: invData.customer_gstin || '',
            customerAddress: invData.customer_address || '',
            items: invoiceData.items,
            subtotal: Number(invData.subtotal),
            totalDiscount: Number(invData.discount_amount),
            totalGst: Number(invData.tax_total),
            cgstTotal: Number(invData.cgst_total),
            sgstTotal: Number(invData.sgst_total),
            igstTotal: Number(invData.igst_total),
            freightAmount: Number(invData.freight_amount || 0),
            roundOff: Number(invData.round_off),
            netPayable: Number(invData.grand_total),
            paymentMode: invoiceData.paymentMode,
            paidAmount: Number(invData.paid_amount),
            balanceAmount: Number(invData.balance_amount),
            status: invData.status,
            isInterstate: invData.is_interstate,
            notes: invData.notes,
            idempotencyKey: invData.idempotency_key,
            transactionRef: invoiceData.transactionRef || invoiceData.upiReference,
            createdAt: invData.created_at,
            synced: true
          };

          await db.invoices.put(remoteInvoice);
          await get().loadInvoices();
          return remoteInvoice;
        }
      } catch (e: any) {
        if (e.message?.includes('INVALID_QUANTITY') || e.message?.includes('CANNOT_COMPLETE_SALE')) {
          throw e;
        }
        console.warn('Supabase complete_sale RPC exception fallback:', e);
      }
    }

    // 4. LOCAL ATOMIC DEXIE TRANSACTION (Offline / Standalone mode)
    const totalCount = await db.invoices.count();
    const invoiceNumber = generateInvoiceNumber(invoicePrefix, 1000 + totalCount);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const newInvoice: Invoice = {
      ...invoiceData,
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      invoiceNumber,
      date: dateStr,
      time: timeStr,
      status: 'completed',
      createdAt: now.toISOString(),
      synced: false
    };

    let resultInvoice: Invoice = newInvoice;

    await db.transaction('rw', db.invoices, db.products, db.stockMovements, db.customers, async () => {
      // Re-verify idempotency inside transaction lock
      if (invoiceData.idempotencyKey) {
        const existingInTx = await db.invoices.where('idempotencyKey').equals(invoiceData.idempotencyKey).first();
        if (existingInTx) {
          resultInvoice = existingInTx;
          return;
        }
      }



      await db.invoices.put(newInvoice);

      if (invoiceData.customerMobile || invoiceData.customerName) {
        const existingCust = invoiceData.customerMobile ? await db.customers.where('mobile').equals(invoiceData.customerMobile).first() : null;
        if (!existingCust && (invoiceData.customerName || invoiceData.customerMobile)) {
          await db.customers.put({
            id: 'cust_' + Date.now(),
            name: invoiceData.customerName || 'Cash Customer',
            mobile: invoiceData.customerMobile || '',
            gstin: invoiceData.customerGstin || '',
            creditBalance: invoiceData.paymentMode === 'credit' ? invoiceData.netPayable : 0,
            createdAt: now.toISOString()
          });
        }
      }

      for (const item of newInvoice.items) {
        const product = await db.products.get(item.productId);
        if (product) {
          const prevStock = product.stockQty;
          const totalDeduct = item.qty + (item.freeQty || 0);
          const newStock = Math.max(0, prevStock - totalDeduct);

          await db.products.update(product.id, {
            stockQty: newStock,
            updatedAt: now.toISOString(),
            synced: false
          });

          const movement: StockMovement = {
            id: 'sm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            productId: product.id,
            productName: product.name,
            type: 'sale',
            quantityChange: -totalDeduct,
            previousStock: prevStock,
            newStock,
            reason: `Invoice ${invoiceNumber}`,
            createdAt: now.toISOString(),
            referenceId: newInvoice.id
          };
          await db.stockMovements.put(movement);
        }
      }
    });

    await get().loadInvoices();
    return resultInvoice;
  },

  cancelInvoice: async (invoiceId, restoreStock = true, reason = 'Invoice Reversal') => {
    const invoice = await db.invoices.get(invoiceId);
    if (!invoice) return;

    if (invoice.status === 'cancelled') {
      throw new Error('Invoice is already cancelled / reversed.');
    }

    const now = new Date().toISOString();

    await db.transaction('rw', db.invoices, db.products, db.stockMovements, db.auditLogs, async () => {
      await db.invoices.update(invoiceId, { status: 'cancelled', synced: false });

      if (restoreStock && invoice.items) {
        for (const item of invoice.items) {
          const product = await db.products.get(item.productId);
          if (product) {
            const prevStock = product.stockQty;
            const totalReturn = item.qty + (item.freeQty || 0);
            const newStock = prevStock + totalReturn;

            await db.products.update(product.id, {
              stockQty: newStock,
              updatedAt: now,
              synced: false
            });

            const movement: StockMovement = {
              id: 'sm_cancel_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              productId: product.id,
              productName: product.name,
              type: 'return',
              quantityChange: totalReturn,
              previousStock: prevStock,
              newStock,
              reason: `Reversal of Invoice ${invoice.invoiceNumber}: ${reason}`,
              createdAt: now,
              referenceId: invoice.id
            };
            await db.stockMovements.put(movement);
          }
        }
      }

      // Record Audit Log Entry
      const auditEntry: AuditLog = {
        id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        action: 'INVOICE_REVERSAL',
        tableName: 'invoices',
        recordId: invoice.id,
        details: {
          invoiceNumber: invoice.invoiceNumber,
          netPayable: invoice.netPayable,
          reason,
          restoredStock: restoreStock
        },
        createdAt: now
      };
      await db.auditLogs.put(auditEntry);
    });

    await get().loadInvoices();
  },

  syncInvoicesWithSupabase: async () => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase not configured' };
    }

    try {
      const unSynced = await db.invoices.filter(i => !i.synced).toArray();
      if (unSynced.length === 0) {
        return { success: true, message: 'All invoices synced' };
      }

      const payload = unSynced.map(({ synced, invoiceType, freightAmount, idempotencyKey, customerAddress, ...rest }) => ({
        ...rest,
        invoice_type: invoiceType,
        freight_amount: freightAmount,
        idempotency_key: idempotencyKey,
        customer_address: customerAddress
      }));
      const { error } = await client.from('invoices').upsert(payload, { onConflict: 'id' });

      if (error) {
        return { success: false, message: error.message };
      }

      await db.transaction('rw', db.invoices, async () => {
        for (const inv of unSynced) {
          await db.invoices.update(inv.id, { synced: true });
        }
      });

      await get().loadInvoices();
      return { success: true, message: `Synced ${unSynced.length} invoices to cloud.` };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Invoice sync failed' };
    }
  }
}));
