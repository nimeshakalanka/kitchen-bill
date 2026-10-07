import { InvoiceItem, DiscountType } from './types';

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
 * Calculate the discount amount based on type
 */
export function calculateDiscount(
  subtotal: number,
  discountType: DiscountType,
  discountValue: number
): number {
  if (discountValue <= 0) return 0;

  if (discountType === 'percentage') {
    const clamped = Math.min(discountValue, 100);
    return Math.round(subtotal * (clamped / 100) * 100) / 100;
  }

  // fixed amount – cap at subtotal
  return Math.round(Math.min(discountValue, subtotal) * 100) / 100;
}

/**
 * Calculate the grand total (subtotal minus discount)
 */
export function calculateGrandTotal(subtotal: number, discountAmount: number): number {
  return Math.round(Math.max(subtotal - discountAmount, 0) * 100) / 100;
}

/**
 * Format a number as currency (always USD for this business)
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
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

/**
 * Format date as DD/MM/YYYY
 */
export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Format time for display (12-hour)
 */
export function formatTime(timeStr: string): string {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':').map(Number);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const h = hours % 12 || 12;
  return `${h}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}
