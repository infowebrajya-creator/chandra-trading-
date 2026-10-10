export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      store_settings: {
        Row: {
          id: string
          store_name: string
          tagline: string | null
          address: string
          phone: string
          email: string | null
          gstin: string
          state_code: string
          state_name: string
          pincode: string | null
          bank_name: string | null
          account_no: string | null
          ifsc_code: string | null
          upi_id: string | null
          invoice_prefix: string
          terms_and_conditions: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['store_settings']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['store_settings']['Insert']>
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'owner' | 'cashier' | 'admin'
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: 'owner' | 'cashier' | 'admin'
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      categories: {
        Row: {
          id: string
          name: string
          description: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }
      products: {
        Row: {
          id: string
          sku: string
          barcode: string | null
          name: string
          category_id: string | null
          category: string
          pack_info: string | null
          unit: 'Pcs' | 'Pkt' | 'Box' | 'Dozen' | 'Ream' | 'Set' | 'Roll' | 'Pad'
          mrp: number
          purchase_price: number | null
          selling_rate: number
          hsn_code: string | null
          gst_rate: number
          tax_type: 'inclusive' | 'exclusive'
          stock_quantity: number
          low_stock_threshold: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['products']['Insert']>
      }
      invoices: {
        Row: {
          id: string
          invoice_number: string
          invoice_date: string
          invoice_time: string
          invoice_type: 'gst' | 'simple'
          status: 'draft' | 'completed' | 'reversed'
          customer_name: string | null
          customer_mobile: string | null
          customer_gstin: string | null
          customer_address: string | null
          is_interstate: boolean
          subtotal: number
          discount_amount: number
          taxable_amount: number
          cgst_total: number
          sgst_total: number
          igst_total: number
          tax_total: number
          freight_amount: number
          round_off: number
          grand_total: number
          paid_amount: number
          balance_amount: number
          payment_status: 'paid' | 'partial' | 'unpaid'
          idempotency_key: string | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoices']['Row'], 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          product_id: string | null
          product_name: string
          sku: string
          barcode: string | null
          hsn_code: string | null
          unit: string
          quantity: number
          free_quantity: number
          mrp: number
          unit_rate: number
          discount_pct: number
          discount_amount: number
          tax_type: string
          tax_rate: number
          taxable_amount: number
          cgst_amount: number
          sgst_amount: number
          igst_amount: number
          final_line_amount: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['invoice_items']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['invoice_items']['Insert']>
      }
      payments: {
        Row: {
          id: string
          invoice_id: string
          payment_method: 'cash' | 'upi' | 'card' | 'credit'
          amount: number
          transaction_ref: string | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['payments']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['payments']['Insert']>
      }
      stock_movements: {
        Row: {
          id: string
          product_id: string
          quantity_change: number
          previous_stock: number
          new_stock: number
          movement_type: 'sale' | 'purchase' | 'adjustment' | 'reversal' | 'return'
          invoice_id: string | null
          reason: string
          created_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['stock_movements']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['stock_movements']['Insert']>
      }
      audit_logs: {
        Row: {
          id: string
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: Json | null
          new_data: Json | null
          performed_by: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_logs']['Row'], 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>
      }
    }
    Functions: {
      complete_sale: {
        Args: {
          p_idempotency_key?: string
          p_customer_name?: string
          p_customer_mobile?: string
          p_customer_gstin?: string
          p_customer_address?: string
          p_items: Json
          p_payments: Json
          p_invoice_type?: string
          p_is_interstate?: boolean
          p_discount_amount?: number
          p_freight_amount?: number
          p_notes?: string
        }
        Returns: Json
      }
      generate_invoice_number: {
        Args: {
          p_prefix?: string
        }
        Returns: string
      }
    }
  }
}
