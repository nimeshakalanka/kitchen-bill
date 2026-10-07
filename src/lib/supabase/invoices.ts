import { createClient } from './client';
import { Invoice, InvoiceItem, CustomerInfo } from '@/lib/types';

export interface DbInvoiceRow {
  id: string;
  invoice_no: string;
  invoice_date: string;
  customer_name: string;
  country: string | null;
  phone: string | null;
  guests: number | null;
  booking_date: string | null;
  booking_time: string | null;
  items: Array<{ description: string; qty: number; price: number; amount: number }>;
  subtotal: number;
  discount: number;
  discount_type: 'fixed' | 'percentage';
  total: number;
  payment_method: string | null;
  payment_status: string;
  notes: string | null;
  created_at: string;
}

/**
 * Check if real Supabase credentials are configured
 */
export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('placeholder') &&
    !url.includes('your-project-id') &&
    !key.includes('placeholder') &&
    !key.includes('your-anon-key')
  );
}

/**
 * Map a Supabase database row into the frontend Invoice model
 */
export function dbRowToInvoice(row: DbInvoiceRow): Invoice {
  const items: InvoiceItem[] = Array.isArray(row.items)
    ? row.items.map((item, idx) => ({
        id: `item-${idx + 1}`,
        description: item.description || '',
        quantity: item.qty ?? (item as unknown as { quantity?: number }).quantity ?? 1,
        unitPrice: item.price ?? (item as unknown as { unitPrice?: number }).unitPrice ?? 0,
        total: item.amount ?? (item as unknown as { total?: number }).total ?? 0,
      }))
    : [];

  const isHotel = !row.country && !row.phone;
  const customer: CustomerInfo = {
    name: row.customer_name || '',
    customerType: isHotel ? 'hotel' : 'guest',
    country: row.country || '',
    phone: row.phone || '',
    numberOfGuests: row.guests || 1,
    bookingDate: row.booking_date || '',
    bookingTime: row.booking_time ? row.booking_time.slice(0, 5) : '',
  };

  const isPaid = (row.payment_status || '').toLowerCase() === 'paid';

  return {
    id: row.id,
    invoiceNumber: row.invoice_no,
    date: row.invoice_date,
    customer,
    items,
    subtotal: Number(row.subtotal) || 0,
    discountType: (row.discount_type as 'fixed' | 'percentage') || 'fixed',
    discountValue: Number(row.discount) || 0,
    discountAmount: Number(row.discount) || 0,
    grandTotal: Number(row.total) || 0,
    paymentMethod: (row.payment_method as Invoice['paymentMethod']) || 'cash',
    paymentStatus: isPaid ? 'paid' : 'pending',
    notes: row.notes || '',
    status: isPaid ? 'paid' : 'draft',
    createdAt: row.created_at,
    currency: 'USD',
  };
}

/**
 * Convert frontend invoice data to Supabase insert payload
 */
export function invoiceToDbInsert(inv: Partial<Invoice>) {
  const items = (inv.items || []).map((i) => ({
    description: i.description,
    qty: i.quantity,
    price: i.unitPrice,
    amount: i.total,
  }));

  const bookingTime = inv.customer?.bookingTime
    ? inv.customer.bookingTime.length === 5
      ? `${inv.customer.bookingTime}:00`
      : inv.customer.bookingTime
    : null;

  return {
    invoice_no: inv.invoiceNumber,
    invoice_date: inv.date || new Date().toISOString().split('T')[0],
    customer_name: inv.customer?.name || '',
    country: inv.customer?.country || null,
    phone: inv.customer?.phone || null,
    guests: inv.customer?.numberOfGuests || 1,
    booking_date: inv.customer?.bookingDate || null,
    booking_time: bookingTime,
    items,
    subtotal: inv.subtotal ?? 0,
    discount: inv.discountAmount ?? inv.discountValue ?? 0,
    discount_type: inv.discountType || 'fixed',
    total: inv.grandTotal ?? 0,
    payment_method: inv.paymentMethod || 'cash',
    payment_status: inv.paymentStatus === 'paid' ? 'Paid' : 'Pending',
    notes: inv.notes || null,
  };
}

/**
 * Get next atomic invoice number from Supabase via Postgres function
 */
export async function getNextInvoiceNumberFromSupabase(): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('next_invoice_no');
    if (error) {
      console.warn('Supabase next_invoice_no RPC error:', error.message);
      return null;
    }
    return data as string;
  } catch (err) {
    console.warn('Supabase next_invoice_no failed:', err);
    return null;
  }
}

/**
 * Save an invoice to Supabase table
 */
export async function saveInvoiceToSupabase(
  invoice: Invoice
): Promise<{ id: string; invoiceNumber: string } | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const payload = invoiceToDbInsert(invoice);

    const { data, error } = await supabase
      .from('invoices')
      .insert([payload])
      .select('id, invoice_no')
      .single();

    if (error) {
      console.error('Supabase insert failed:', error.message);
      return null;
    }

    return { id: data.id, invoiceNumber: data.invoice_no };
  } catch (err) {
    console.error('Supabase save error:', err);
    return null;
  }
}

/**
 * Fetch a single invoice by ID or invoice_no from Supabase
 */
export async function fetchInvoiceFromSupabase(id: string): Promise<Invoice | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const query = supabase.from('invoices').select('*');
    const { data, error } = isUuid
      ? await query.eq('id', id).single()
      : await query.eq('invoice_no', id).single();

    if (error || !data) {
      return null;
    }

    return dbRowToInvoice(data as DbInvoiceRow);
  } catch (err) {
    console.error('Supabase fetch error:', err);
    return null;
  }
}

/**
 * Fetch all invoices from Supabase ordered by creation date
 */
export async function fetchAllInvoicesFromSupabase(): Promise<Invoice[] | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) {
      return null;
    }

    return (data as DbInvoiceRow[]).map(dbRowToInvoice);
  } catch (err) {
    console.error('Supabase fetch all error:', err);
    return null;
  }
}

/**
 * Update payment status in Supabase
 */
export async function updateSupabasePaymentStatus(
  id: string,
  status: 'paid' | 'pending'
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const query = supabase
      .from('invoices')
      .update({ payment_status: status === 'paid' ? 'Paid' : 'Pending' });

    const { error } = isUuid ? await query.eq('id', id) : await query.eq('invoice_no', id);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete an invoice from Supabase
 */
export async function deleteSupabaseInvoice(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  try {
    const supabase = createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    const { error } = isUuid
      ? await supabase.from('invoices').delete().eq('id', id)
      : await supabase.from('invoices').delete().eq('invoice_no', id);

    return !error;
  } catch (err) {
    console.error('Supabase delete error:', err);
    return false;
  }
}
