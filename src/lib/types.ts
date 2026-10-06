// Core types for Priya Dream Kitchen billing system

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  customer: CustomerInfo;
  items: InvoiceItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  discount: number;
  grandTotal: number;
  notes: string;
  status: 'draft' | 'sent' | 'paid';
  createdAt: string;
  currency: string;
}

export type InvoiceFormData = Omit<Invoice, 'id' | 'createdAt' | 'subtotal' | 'taxAmount' | 'grandTotal'>;
