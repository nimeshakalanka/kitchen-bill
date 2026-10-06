import { InvoiceItem } from './types';

/**
 * Calculate the total for a single line item
 */
export function calculateItemTotal(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

/**
 * Calculate the subtotal from all invoice items
 */
export function calculateSubtotal(items: InvoiceItem[]): number {
  return Math.round(items.reduce((sum, item) => sum + item.total, 0) * 100) / 100;
}

/**
 * Calculate the tax amount
 */
export function calculateTax(subtotal: number, taxRate: number): number {
  return Math.round(subtotal * (taxRate / 100) * 100) / 100;
}

/**
 * Calculate the grand total
 */
export function calculateGrandTotal(
  subtotal: number,
  taxAmount: number,
  discount: number
): number {
  return Math.round((subtotal + taxAmount - discount) * 100) / 100;
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency: string = 'LKR'): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
