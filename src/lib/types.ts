// Core types for Priya Dream Kitchen billing system

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type CustomerType = 'guest' | 'hotel';

export interface CustomerInfo {
  name: string;
  customerType?: CustomerType;
  country?: string;
  phone?: string;
  numberOfGuests: number;
  bookingDate: string;
  bookingTime: string;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'online';
export type PaymentStatus = 'paid' | 'pending';
export type DiscountType = 'fixed' | 'percentage';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: CustomerInfo;
  items: InvoiceItem[];
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes: string;
  status: 'draft' | 'sent' | 'paid';
  createdAt: string;
  currency: string;
}
