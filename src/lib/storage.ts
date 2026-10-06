import { Invoice } from './types';

const INVOICES_KEY = 'pdk_invoices';
const CURRENT_INVOICE_KEY = 'pdk_current_invoice';

/**
 * Get all saved invoices from localStorage
 */
export function getAllInvoices(): Invoice[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const data = localStorage.getItem(INVOICES_KEY);
    if (!data) return [];
    return JSON.parse(data) as Invoice[];
  } catch {
    return [];
  }
}

/**
 * Save a new invoice to localStorage
 */
export function saveInvoice(invoice: Invoice): void {
  if (typeof window === 'undefined') return;
  
  const invoices = getAllInvoices();
  const existingIndex = invoices.findIndex((inv) => inv.id === invoice.id);
  
  if (existingIndex >= 0) {
    invoices[existingIndex] = invoice;
  } else {
    invoices.unshift(invoice);
  }
  
  localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
}

/**
 * Get a single invoice by ID
 */
export function getInvoiceById(id: string): Invoice | null {
  const invoices = getAllInvoices();
  return invoices.find((inv) => inv.id === id) || null;
}

/**
 * Delete an invoice by ID
 */
export function deleteInvoice(id: string): void {
  if (typeof window === 'undefined') return;
  
  const invoices = getAllInvoices();
  const filtered = invoices.filter((inv) => inv.id !== id);
  localStorage.setItem(INVOICES_KEY, JSON.stringify(filtered));
}

/**
 * Save the current invoice draft (for passing between pages)
 */
export function setCurrentInvoice(invoice: Invoice): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_INVOICE_KEY, JSON.stringify(invoice));
}

/**
 * Get the current invoice draft
 */
export function getCurrentInvoice(): Invoice | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(CURRENT_INVOICE_KEY);
    if (!data) return null;
    return JSON.parse(data) as Invoice;
  } catch {
    return null;
  }
}

/**
 * Clear the current invoice draft
 */
export function clearCurrentInvoice(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_INVOICE_KEY);
}

/**
 * Update invoice status
 */
export function updateInvoiceStatus(id: string, status: Invoice['status']): void {
  const invoice = getInvoiceById(id);
  if (invoice) {
    invoice.status = status;
    saveInvoice(invoice);
  }
}
