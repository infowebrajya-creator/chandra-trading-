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

let realtimeSubscribed = false;

function mapLocalInvoiceToRemote(inv: Invoice) {
  const taggedNotes = `[[meta:pm=${inv.paymentMode}|type=${inv.invoiceType}|status=${inv.status}]] ${inv.notes || ''}`.trim();

  const invoiceRow = {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    invoice_date: inv.date,
    invoice_time: inv.time,
    customer_name: inv.customerName || 'Cash Customer',
    customer_mobile: inv.customerMobile || null,
    customer_gstin: inv.customerGstin || null,
    customer_address: inv.customerAddress || null,
    subtotal: inv.subtotal,
    total_discount: inv.totalDiscount,
    total_gst: inv.totalGst,
    cgst_total: inv.cgstTotal,
    sgst_total: inv.sgstTotal,
    igst_total: inv.igstTotal,
    freight_amount: inv.freightAmount,
    round_off: inv.roundOff,
    net_payable: inv.netPayable,
    paid_amount: inv.paidAmount,
    balance_amount: inv.balanceAmount,
    is_interstate: inv.isInterstate || false,
    idempotency_key: inv.idempotencyKey || null,
    transaction_ref: inv.transactionRef || inv.upiReference || null,
    notes: taggedNotes,
    created_at: inv.createdAt
  };

  const itemRows = (inv.items || []).map((it, idx) => ({
    id: `item_${inv.id}_${idx}_${it.productId}`,
    invoice_id: inv.id,
    product_id: it.productId,
    product_name: it.productName,
    sku: it.sku || '',
    barcode: it.barcode || null,
    pack_info: it.pack || null,
    unit: it.unit || 'Pcs',
    qty: it.qty,
    free_qty: it.freeQty || 0,
    unit_rate: it.unitRate,
    mrp: it.mrp || 0,
    scheme_discount_pct: it.schemeDiscountPct || 0,
    addl_discount_pct: it.addlDiscountPct || 0,
    discount_pct: it.discountPct || 0,
    discount_amount: it.discountAmount || 0,
    hsn_code: it.hsnCode || null,
    gst_rate: it.gstRate || 12,
    gst_amount: ((it.cgstAmount || 0) + (it.sgstAmount || 0) + (it.igstAmount || 0)) || 0,
    total_amount: it.totalAmount,
    created_at: inv.createdAt
  }));

  return { invoiceRow, itemRows };
}

function mapRemoteInvoiceToLocal(remoteInv: any): Invoice {
  let paymentMode: PaymentMode = 'cash';
  let invoiceType: any = 'gst';
  let status: any = 'completed';
  let cleanNotes = remoteInv.notes || '';

  if (cleanNotes.includes('[[meta:')) {
    const metaMatch = cleanNotes.match(/\[\[meta:([^\]]+)\]\]/);
    if (metaMatch) {
      const parts = metaMatch[1].split('|');
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k === 'pm' && v) paymentMode = v as PaymentMode;
        if (k === 'type' && v) invoiceType = v;
        if (k === 'status' && v) status = v;
      }
      cleanNotes = cleanNotes.replace(/\[\[meta:[^\]]+\]\]/, '').trim();
    }
  } else if (cleanNotes.includes('[[pm:')) {
    const match = cleanNotes.match(/\[\[pm:([a-z]+)\]\]/);
    if (match) paymentMode = match[1] as PaymentMode;
    cleanNotes = cleanNotes.replace(/\[\[pm:[a-z]+\]\]/, '').trim();
  } else if (remoteInv.transaction_ref?.startsWith('UPI') || remoteInv.transaction_ref?.length > 0) {
    paymentMode = 'upi';
  }

  const items = (remoteInv.invoice_items || []).map((it: any) => ({
    id: it.id || `item_${remoteInv.id}_${it.product_id}`,
    productId: it.product_id,
    productName: it.product_name,
    sku: it.sku || '',
    barcode: it.barcode || '',
    hsnCode: it.hsn_code || '4820',
    pack: it.pack_info || '1*1',
    unit: (it.unit as any) || 'Pcs',
    qty: Number(it.qty || 1),
    freeQty: Number(it.free_qty || 0),
    mrp: Number(it.mrp || 0),
    unitRate: Number(it.unit_rate || 0),
    schemeDiscountPct: Number(it.scheme_discount_pct || 0),
    schemeDiscountAmount: 0,
    addlDiscountPct: Number(it.addl_discount_pct || 0),
    addlDiscountAmount: 0,
    discountPct: Number(it.discount_pct || 0),
    discountAmount: Number(it.discount_amount || 0),
    gstRate: Number(it.gst_rate || 12) as any,
    taxType: 'inclusive' as any,
    taxableAmount: Number(it.total_amount || 0),
    cgstAmount: Number(it.gst_amount ? it.gst_amount / 2 : 0),
    sgstAmount: Number(it.gst_amount ? it.gst_amount / 2 : 0),
    igstAmount: 0,
    totalAmount: Number(it.total_amount || 0),
    availableStock: 0
  }));

  const createdDate = remoteInv.created_at ? new Date(remoteInv.created_at) : null;
  const localDate = createdDate && !isNaN(createdDate.getTime())
    ? createdDate.toLocaleDateString('en-CA')
    : (remoteInv.invoice_date || new Date().toLocaleDateString('en-CA'));
  const localTime = createdDate && !isNaN(createdDate.getTime())
    ? createdDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : (remoteInv.invoice_time || '');

  return {
    id: remoteInv.id,
    invoiceNumber: remoteInv.invoice_number,
    invoiceType,
    date: localDate,
    time: localTime,
    customerName: remoteInv.customer_name || 'Cash Customer',
    customerMobile: remoteInv.customer_mobile || '',
    customerGstin: remoteInv.customer_gstin || undefined,
    customerAddress: remoteInv.customer_address || undefined,
    items,
    subtotal: Number(remoteInv.subtotal || 0),
    totalDiscount: Number(remoteInv.total_discount || 0),
    totalGst: Number(remoteInv.total_gst || 0),
    cgstTotal: Number(remoteInv.cgst_total || 0),
    sgstTotal: Number(remoteInv.sgst_total || 0),
    igstTotal: Number(remoteInv.igst_total || 0),
    freightAmount: Number(remoteInv.freight_amount || 0),
    roundOff: Number(remoteInv.round_off || 0),
    netPayable: Number(remoteInv.net_payable || 0),
    paymentMode,
    paidAmount: Number(remoteInv.paid_amount || 0),
    balanceAmount: Number(remoteInv.balance_amount || 0),
    status,
    isInterstate: Boolean(remoteInv.is_interstate),
    notes: cleanNotes || undefined,
    idempotencyKey: remoteInv.idempotency_key || undefined,
    transactionRef: remoteInv.transaction_ref || undefined,
    upiReference: remoteInv.transaction_ref || undefined,
    createdAt: remoteInv.created_at || new Date().toISOString(),
    synced: true
  };
}

export const useSalesStore = create<SalesState>((set, get) => ({
  invoices: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  paymentFilter: 'all',
  dateRange: 'all',

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setPaymentFilter: (paymentFilter) => set({ paymentFilter }),
  setDateRange: (dateRange) => set({ dateRange }),

  loadInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const client = getSupabaseClient();

      if (client) {
        // Setup Realtime subscription once for automatic cross-device sync
        if (!realtimeSubscribed) {
          try {
            client
              .channel('public:invoices_sync')
              .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'invoices' },
                () => {
                  get().loadInvoices();
                }
              )
              .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                  realtimeSubscribed = true;
                }
              });
          } catch (e) {
            console.warn('Realtime channel warning:', e);
          }
        }

        // 1. Direct Supabase Query: Always pull latest database records
        const { data: remoteInvoices, error: fetchErr } = await client
          .from('invoices')
          .select('*, invoice_items(*)')
          .order('created_at', { ascending: false })
          .limit(500);

        if (!fetchErr && remoteInvoices) {
          const mapped = remoteInvoices.map(mapRemoteInvoiceToLocal);
          // Update local Dexie storage
          await db.invoices.bulkPut(mapped).catch(() => {});
          set({ invoices: mapped, isLoading: false });

          // Also push any local-only unsynced invoices up to Supabase in background
          const unsynced = await db.invoices.filter((i) => !i.synced).toArray();
          for (const un of unsynced) {
            try {
              const { invoiceRow, itemRows } = mapLocalInvoiceToRemote(un);
              const { error: upErr } = await client.from('invoices').upsert(invoiceRow, { onConflict: 'id' });
              if (!upErr) {
                if (itemRows.length > 0) {
                  await client.from('invoice_items').upsert(itemRows, { onConflict: 'id' });
                }
                await db.invoices.update(un.id, { synced: true });
              }
            } catch (syncErr) {
              console.warn('Sync push error:', syncErr);
            }
          }

          return;
        }
      }

      // Offline fallback: load from IndexedDB
      const localInvoices = await db.invoices.orderBy('createdAt').reverse().toArray();
      set({ invoices: localInvoices, isLoading: false });
    } catch (err: any) {
      console.warn('Failed to load invoices from Supabase:', err);
      const fallbackInvoices = await db.invoices.orderBy('createdAt').reverse().toArray();
      set({ invoices: fallbackInvoices, isLoading: false });
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

    const totalCount = await db.invoices.count();
    const invoiceNumber = generateInvoiceNumber(invoicePrefix, 1000 + totalCount);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD in local time
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

    // 3. PUSH DIRECTLY TO SUPABASE CLOUD (If connected)
    const client = getSupabaseClient();
    if (client) {
      try {
        const { invoiceRow, itemRows } = mapLocalInvoiceToRemote(newInvoice);
        const { error: invErr } = await client.from('invoices').upsert(invoiceRow, { onConflict: 'id' });
        if (!invErr) {
          if (itemRows.length > 0) {
            await client.from('invoice_items').upsert(itemRows, { onConflict: 'id' });
          }
          newInvoice.synced = true;
        } else {
          console.warn('Supabase direct invoice save warning:', invErr.message);
        }
      } catch (e: any) {
        console.warn('Supabase remote invoice push exception:', e);
      }
    }

    let resultInvoice: Invoice = newInvoice;

    // 4. LOCAL ATOMIC DEXIE TRANSACTION (Offline / Local storage cache)
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

    const client = getSupabaseClient();
    if (client) {
      try {
        const updatedInv = await db.invoices.get(invoiceId);
        if (updatedInv) {
          const { invoiceRow } = mapLocalInvoiceToRemote(updatedInv);
          const { error } = await client.from('invoices').upsert(invoiceRow, { onConflict: 'id' });
          if (!error) {
            await db.invoices.update(invoiceId, { synced: true });
          }
        }
      } catch (e) {
        console.warn('Failed to sync cancellation to Supabase:', e);
      }
    }

    await get().loadInvoices();
  },

  syncInvoicesWithSupabase: async () => {
    const client = getSupabaseClient();
    if (!client) {
      return { success: false, message: 'Supabase not configured' };
    }

    try {
      // 1. Push all unsynced local invoices to cloud
      const unSynced = await db.invoices.filter((i) => !i.synced).toArray();
      let pushCount = 0;

      for (const un of unSynced) {
        try {
          const { invoiceRow, itemRows } = mapLocalInvoiceToRemote(un);
          const { error: invErr } = await client.from('invoices').upsert(invoiceRow, { onConflict: 'id' });
          if (!invErr) {
            if (itemRows.length > 0) {
              await client.from('invoice_items').upsert(itemRows, { onConflict: 'id' });
            }
            await db.invoices.update(un.id, { synced: true });
            pushCount++;
          }
        } catch (e) {
          console.warn('Failed pushing invoice in batch:', un.id, e);
        }
      }

      // 2. Pull remote invoices down from Supabase
      const { data: remoteInvoices, error: fetchErr } = await client
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('created_at', { ascending: false })
        .limit(500);

      if (fetchErr) {
        return { success: false, message: fetchErr.message };
      }

      if (remoteInvoices && remoteInvoices.length > 0) {
        const mapped = remoteInvoices.map(mapRemoteInvoiceToLocal);
        await db.invoices.bulkPut(mapped);
      }

      await get().loadInvoices();
      return {
        success: true,
        message: `Cloud sync complete! Pushed ${pushCount} local invoices, downloaded ${remoteInvoices?.length || 0} cloud invoices.`
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Invoice sync failed' };
    }
  }
}));
