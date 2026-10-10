import Dexie, { Table } from 'dexie';
import type { Product, Invoice, DraftInvoice, StockMovement, Customer, ShopProfile, PrintSettings, SupabaseConfig } from '../types';

export class WebRajyaDatabase extends Dexie {
  products!: Table<Product, string>;
  invoices!: Table<Invoice, string>;
  drafts!: Table<DraftInvoice, string>;
  stockMovements!: Table<StockMovement, string>;
  customers!: Table<Customer, string>;
  auditLogs!: Table<any, string>;
  keyValueSettings!: Table<{ key: string; value: any }, string>;

  constructor() {
    super('WebRajyaStationeryDB');
    this.version(1).stores({
      products: 'id, barcode, name, category, hsnCode, stockQty, synced, updatedAt',
      invoices: 'id, invoiceNumber, date, customerName, customerMobile, status, idempotencyKey, synced, createdAt',
      drafts: 'id, draftName, updatedAt',
      stockMovements: 'id, productId, createdAt, type',
      customers: 'id, mobile, name, createdAt',
      auditLogs: 'id, action, recordId, createdAt',
      keyValueSettings: 'key'
    });
  }
}

export const db = new WebRajyaDatabase();

// Default Shop Profile Settings
export const DEFAULT_SHOP_PROFILE: ShopProfile = {
  shopName: 'WebRajya Stationery & Books',
  tagline: 'All Stationery, School & Office Supplies',
  address: 'Shop No. 12, Main Market Road, Near City Central, New Delhi - 110001',
  phone: '+91 98765 43210',
  email: 'contact@webrajyastationery.com',
  gstin: '07AAAAA0000A1Z5',
  state: 'Delhi (07)',
  pincode: '110001',
  bankName: 'State Bank of India',
  accountNo: '34567890123',
  ifscCode: 'SBIN0001234',
  upiId: 'webrajyastationery@sbi',
  invoicePrefix: 'WR-',
  termsAndConditions: '1. Goods once sold will not be taken back without bill.\n2. Warranty as per manufacturer guidelines.\n3. Subject to local jurisdiction.'
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paperSize: 'A5',
  showGstBreakdown: true,
  showBankDetails: true,
  showTerms: true,
  autoPrintOnSave: true
};

export const DEFAULT_SUPABASE_CONFIG: SupabaseConfig = {
  url: (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL) || '',
  anonKey: (typeof import.meta !== 'undefined' && import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY) || '',
  autoSync: false,
  lastSyncAt: null
};
