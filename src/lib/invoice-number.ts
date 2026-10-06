const COUNTER_KEY = 'pdk_invoice_counter';

/**
 * Generate a unique invoice number in format: PDK-YYYY-NNNN
 * PDK = Priya Dream Kitchen
 */
export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const yearKey = `${COUNTER_KEY}_${year}`;
  
  let counter = 1;
  
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(yearKey);
    if (stored) {
      counter = parseInt(stored, 10) + 1;
    }
    localStorage.setItem(yearKey, counter.toString());
  }

  const paddedCounter = counter.toString().padStart(4, '0');
  return `PDK-${year}-${paddedCounter}`;
}

/**
 * Generate a unique ID for internal use
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
