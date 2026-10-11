-- Migration: Add optional item remark to invoice_items
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS remark TEXT;
