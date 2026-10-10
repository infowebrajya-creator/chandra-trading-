import { z } from 'zod';

export const ProductSchema = z.object({
  sku: z.string().min(1, 'SKU / Item Code is required'),
  name: z.string().min(2, 'Product name must be at least 2 characters'),
  barcode: z.string().optional().default(''),
  hsnCode: z.string().optional().default(''),
  category: z.string().min(1, 'Category is required'),
  packInfo: z.string().optional().default('1 Pcs'),
  unit: z.enum(['Pcs', 'Pkt', 'Box', 'Dozen', 'Ream', 'Set', 'Roll', 'Pad']),
  mrp: z.number().min(0, 'MRP cannot be negative'),
  purchaseRate: z.number().min(0, 'Purchase rate cannot be negative').optional().default(0),
  saleRate: z.number().min(0, 'Selling rate cannot be negative'),
  gstRate: z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]),
  taxType: z.enum(['inclusive', 'exclusive']),
  stockQty: z.number().min(0, 'Stock quantity cannot be negative'),
  minStockLevel: z.number().min(0, 'Min stock alert level must be 0 or greater'),
  isActive: z.boolean().default(true),
});

export const CustomerSchema = z.object({
  name: z.string().min(2, 'Customer name is required'),
  mobile: z.string().regex(/^[0-9]{10}$/, 'Mobile number must be 10 digits').or(z.literal('')),
  email: z.string().email('Invalid email address').or(z.literal('')).optional(),
  address: z.string().optional(),
  gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format').or(z.literal('')).optional(),
});

export const ShopProfileSchema = z.object({
  shopName: z.string().min(3, 'Shop name is required'),
  tagline: z.string().optional(),
  address: z.string().min(5, 'Address is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email().or(z.literal('')).optional(),
  gstin: z.string().min(15, 'Valid 15-character GSTIN is required'),
  state: z.string().min(2, 'State is required'),
  pincode: z.string().min(6, 'Pincode must be 6 digits'),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
  invoicePrefix: z.string().min(1, 'Prefix required'),
  termsAndConditions: z.string().optional(),
});
