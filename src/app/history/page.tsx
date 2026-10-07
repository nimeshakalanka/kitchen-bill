'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Invoice } from '@/lib/types';
import {
  getAllInvoices,
  deleteInvoice as deleteLocalInvoice,
  updateInvoiceStatus as updateLocalStatus,
  setCurrentInvoice,
} from '@/lib/storage';
import {
  fetchAllInvoicesFromSupabase,
  deleteSupabaseInvoice,
  updateSupabasePaymentStatus,
} from '@/lib/supabase/invoices';
import {
  formatCurrency,
  formatDateDDMMYYYY,
} from '@/lib/calculations';
import { useToast } from '@/context/ToastContext';

const ITEMS_PER_PAGE = 20;

export default function HistoryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Status update loading state
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Load invoices on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const dbInvoices = await fetchAllInvoicesFromSupabase();
        if (dbInvoices && dbInvoices.length > 0) {
          setInvoices(dbInvoices);
          setLoading(false);
          return;
        }
      } catch (err) {
        console.warn('Failed to load from Supabase, checking local cache:', err);
      }

      setInvoices(getAllInvoices());
      setLoading(false);
    }

    loadData();
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (status: 'all' | 'paid' | 'pending') => {
    setFilterStatus(status);
    setCurrentPage(1);
  };

  // Filtered & searched invoices
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customer.name.toLowerCase().includes(q) ||
        (inv.customer.country && inv.customer.country.toLowerCase().includes(q)) ||
        (inv.customer.phone && inv.customer.phone.toLowerCase().includes(q));

      const isPaid = inv.paymentStatus === 'paid' || inv.status === 'paid';
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'paid' && isPaid) ||
        (filterStatus === 'pending' && !isPaid);

      return matchesSearch && matchesStatus;
    });
  }, [invoices, searchTerm, filterStatus]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedInvoices = useMemo(() => {
    const start = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredInvoices.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredInvoices, safeCurrentPage]);

  // Summary stats
  const totalPaidRevenue = useMemo(() => {
    return invoices
      .filter((inv) => inv.paymentStatus === 'paid' || inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [invoices]);

  const pendingCount = useMemo(() => {
    return invoices.filter((inv) => inv.paymentStatus !== 'paid' && inv.status !== 'paid').length;
  }, [invoices]);

  // Quick Action: Mark as Paid
  const handleMarkAsPaid = async (inv: Invoice) => {
    setUpdatingId(inv.id);
    try {
      // 1. Update Supabase
      await updateSupabasePaymentStatus(inv.id, 'paid');
      // 2. Update local storage
      updateLocalStatus(inv.id, 'paid');

      // 3. Update local state
      setInvoices((prev) =>
        prev.map((item) =>
          item.id === inv.id
            ? { ...item, status: 'paid', paymentStatus: 'paid' }
            : item
        )
      );
      toast.success(`Invoice ${inv.invoiceNumber} marked as Paid!`);
    } catch (err) {
      console.error('Error marking as paid:', err);
      toast.error(err, 'Failed to update payment status');
    } finally {
      setUpdatingId(null);
    }
  };

  // Action: Delete confirmed
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      // 1. Delete from Supabase
      await deleteSupabaseInvoice(deleteTarget.id);
      // 2. Delete from local storage
      deleteLocalInvoice(deleteTarget.id);

      // 3. Remove from UI
      setInvoices((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      toast.success(`Invoice ${deleteTarget.invoiceNumber} deleted successfully.`);
      setDeleteTarget(null);
    } catch (err) {
      console.error('Error deleting invoice:', err);
      toast.error(err, 'Failed to delete invoice');
    } finally {
      setDeleting(false);
    }
  };

  // Action: Export CSV for all invoices
  const handleExportCSV = () => {
    if (invoices.length === 0) {
      toast.info('No invoices available to export.');
      return;
    }

    const headers = [
      'Invoice No',
      'Invoice Date',
      'Customer Name',
      'Country',
      'Phone',
      'Guests',
      'Booking Date',
      'Booking Time',
      'Cooking Class Items',
      'Subtotal (USD)',
      'Discount (USD)',
      'Discount Type',
      'Total (USD)',
      'Payment Method',
      'Payment Status',
      'Notes',
      'Created At',
    ];

    const escapeCsv = (str: string | number | null | undefined): string => {
      if (str === null || str === undefined) return '""';
      const s = String(str).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = invoices.map((inv) => {
      const itemsList = inv.items
        .map((i) => `${i.description} (x${i.quantity} @ $${i.unitPrice})`)
        .join('; ');

      return [
        escapeCsv(inv.invoiceNumber),
        escapeCsv(inv.date),
        escapeCsv(inv.customer.name),
        escapeCsv(inv.customer.country),
        escapeCsv(inv.customer.phone),
        escapeCsv(inv.customer.numberOfGuests),
        escapeCsv(inv.customer.bookingDate),
        escapeCsv(inv.customer.bookingTime),
        escapeCsv(itemsList),
        escapeCsv(inv.subtotal.toFixed(2)),
        escapeCsv(inv.discountAmount.toFixed(2)),
        escapeCsv(inv.discountType),
        escapeCsv(inv.grandTotal.toFixed(2)),
        escapeCsv(inv.paymentMethod),
        escapeCsv(inv.paymentStatus === 'paid' || inv.status === 'paid' ? 'Paid' : 'Pending'),
        escapeCsv(inv.notes),
        escapeCsv(inv.createdAt),
      ].join(',');
    });

    // Add UTF-8 BOM so Excel opens accents and symbols correctly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `Priya_Dream_Kitchen_Invoices_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    toast.success('Invoices exported to CSV successfully!');
  };

  const handleOpen = (inv: Invoice) => {
    setCurrentInvoice(inv);
    router.push(`/invoice/${inv.id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-9 h-9 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#8D6E63] font-medium tracking-wide">Loading invoices…</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* ── Page Header & Top Actions ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1B5E20] mb-1">Invoice History</h2>
          <p className="text-xs sm:text-sm text-[#8D6E63]">
            {invoices.length} total invoice{invoices.length !== 1 ? 's' : ''} stored in database
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl border border-emerald-600/30 bg-emerald-50 text-emerald-800 text-xs sm:text-sm font-semibold hover:bg-emerald-100 hover:border-emerald-600/50 transition-all shadow-sm active:scale-95"
            title="Download CSV for monthly accounting"
          >
            <span>📊</span>
            <span>Export CSV</span>
          </button>

          {/* New Invoice button */}
          <Link
            href="/"
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-xs sm:text-sm font-semibold shadow-md shadow-[#1B5E20]/25 hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span>+</span>
            <span>New Invoice</span>
          </Link>
        </div>
      </div>

      {/* ── Stats Summary Bar ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#8D6E63] font-medium mb-0.5">Total Invoices</p>
          <p className="text-lg sm:text-xl font-bold text-[#3E2723]">{invoices.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#8D6E63] font-medium mb-0.5">Paid Invoices</p>
          <p className="text-lg sm:text-xl font-bold text-emerald-600">
            {invoices.filter((i) => i.paymentStatus === 'paid' || i.status === 'paid').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#8D6E63] font-medium mb-0.5">Pending Invoices</p>
          <p className="text-lg sm:text-xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-3.5 sm:p-4">
          <p className="text-[11px] sm:text-xs text-[#8D6E63] font-medium mb-0.5">Total Collected</p>
          <p className="text-lg sm:text-xl font-bold text-[#1B5E20] truncate">
            {formatCurrency(totalPaidRevenue, 'USD')}
          </p>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-3.5 sm:p-4 mb-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by customer name or invoice number (e.g. PDK-0001)…"
            className="w-full pl-10 pr-8 py-2 rounded-xl bg-[#FBF7F0]/60 border border-[#1B5E20]/15 text-xs sm:text-sm text-[#3E2723] placeholder:text-gray-400 focus:bg-white transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 text-sm"
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 self-stretch sm:self-auto bg-[#F5F0E6] p-1 rounded-xl">
          {(['all', 'paid', 'pending'] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleFilterChange(st)}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filterStatus === st
                  ? 'bg-white text-[#1B5E20] shadow-sm'
                  : 'text-[#8D6E63] hover:text-[#3E2723]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table & Cards View ── */}
      {filteredInvoices.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-[#1B5E20]/8 p-8 sm:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FBF7F0] flex items-center justify-center text-3xl mx-auto mb-3 shadow-inner">
            🔍
          </div>
          <h3 className="text-base sm:text-lg font-bold text-[#3E2723] mb-1">No invoices found</h3>
          <p className="text-xs sm:text-sm text-[#8D6E63] max-w-sm mx-auto mb-5 leading-relaxed">
            {searchTerm || filterStatus !== 'all'
              ? 'Try adjusting your search query or status filter to find what you are looking for.'
              : 'Create your first invoice to view billing records here.'}
          </p>
          {(searchTerm || filterStatus !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setFilterStatus('all');
                setCurrentPage(1);
              }}
              className="px-4 py-2 rounded-xl bg-[#F5F0E6] text-[#3E2723] text-xs font-semibold hover:bg-[#EFE7D8] transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-[#1B5E20]/8 overflow-hidden">
          {/* Mobile Card List (sm:hidden) */}
          <div className="block sm:hidden divide-y divide-gray-100">
            {paginatedInvoices.map((inv) => {
              const isPaid = inv.paymentStatus === 'paid' || inv.status === 'paid';
              return (
                <div key={inv.id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleOpen(inv)}
                      className="font-mono font-bold text-[#1B5E20] text-sm hover:underline"
                    >
                      {inv.invoiceNumber}
                    </button>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isPaid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      <span>{isPaid ? '✓' : '⏳'}</span>
                      <span>{isPaid ? 'Paid' : 'Pending'}</span>
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{inv.customer.name}</div>
                      <div className="text-[11px] text-gray-500">
                        {inv.customer.country ? `${inv.customer.country} • ` : ''}
                        {inv.customer.numberOfGuests} guest{inv.customer.numberOfGuests > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-gray-900">
                        {formatCurrency(inv.grandTotal, inv.currency)}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {formatDateDDMMYYYY(inv.date)}
                      </div>
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex items-center gap-1.5 pt-1">
                    {!isPaid && (
                      <button
                        type="button"
                        onClick={() => handleMarkAsPaid(inv)}
                        disabled={updatingId === inv.id}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 text-center transition-colors disabled:opacity-50"
                      >
                        {updatingId === inv.id ? '…' : '✓ Paid'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOpen(inv)}
                      className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200 text-center transition-colors"
                    >
                      View
                    </button>
                    <Link
                      href={`/?edit=${encodeURIComponent(inv.id)}`}
                      className="flex-1 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200 text-center transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/?duplicate=${encodeURIComponent(inv.id)}`}
                      className="flex-1 py-1.5 rounded-lg bg-[#E8A317]/10 hover:bg-[#E8A317]/20 text-[#9A6700] text-xs font-medium border border-[#E8A317]/30 text-center transition-colors"
                    >
                      Copy
                    </Link>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(inv)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 text-xs font-medium transition-colors"
                      aria-label="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (hidden sm:block) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#1B5E20]/10 bg-[#FBF7F0]/80">
                  <th className="py-3.5 px-4 text-xs font-bold text-[#6D4C41] uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-[#6D4C41] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-[#6D4C41] uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-[#6D4C41] uppercase tracking-wider text-right">
                    Total
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-[#6D4C41] uppercase tracking-wider text-center">
                    Status
                  </th>
                  <th className="py-3.5 px-4 text-xs font-bold text-[#6D4C41] uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedInvoices.map((inv) => {
                  const isPaid = inv.paymentStatus === 'paid' || inv.status === 'paid';

                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#FBF7F0]/50 transition-colors group"
                    >
                      {/* Invoice No */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleOpen(inv)}
                          className="font-mono font-bold text-[#1B5E20] hover:underline flex items-center gap-1.5"
                        >
                          <span>{inv.invoiceNumber}</span>
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 text-gray-700 whitespace-nowrap">
                        {formatDateDDMMYYYY(inv.date)}
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 leading-tight">
                          {inv.customer.name}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          {inv.customer.country ? `${inv.customer.country} • ` : ''}
                          {inv.customer.numberOfGuests} guest{inv.customer.numberOfGuests > 1 ? 's' : ''}
                        </div>
                      </td>

                      {/* Total */}
                      <td className="py-3.5 px-4 text-right font-bold text-gray-900 tabular-nums">
                        {formatCurrency(inv.grandTotal, inv.currency)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            isPaid
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          <span>{isPaid ? '✓' : '⏳'}</span>
                          <span>{isPaid ? 'Paid' : 'Pending'}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark as Paid quick action (if pending) */}
                          {!isPaid && (
                            <button
                              type="button"
                              onClick={() => handleMarkAsPaid(inv)}
                              disabled={updatingId === inv.id}
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors disabled:opacity-50"
                              title="Mark as Paid in Supabase"
                            >
                              {updatingId === inv.id ? '…' : '✓ Paid'}
                            </button>
                          )}

                          {/* Open */}
                          <button
                            type="button"
                            onClick={() => handleOpen(inv)}
                            className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200 transition-colors"
                            title="Open invoice preview"
                          >
                            Open
                          </button>

                          {/* Edit */}
                          <Link
                            href={`/?edit=${encodeURIComponent(inv.id)}`}
                            className="px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-medium border border-gray-200 transition-colors"
                            title="Edit invoice"
                          >
                            Edit
                          </Link>

                          {/* Duplicate */}
                          <Link
                            href={`/?duplicate=${encodeURIComponent(inv.id)}`}
                            className="px-2.5 py-1 rounded-lg bg-[#E8A317]/10 hover:bg-[#E8A317]/20 text-[#9A6700] text-xs font-medium border border-[#E8A317]/30 transition-colors"
                            title="Duplicate as new invoice"
                          >
                            Copy
                          </Link>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(inv)}
                            className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                            title="Delete invoice"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination (20 per page) ── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-gray-100 bg-[#FBF7F0]/40 text-xs text-gray-600">
            <div>
              Showing{' '}
              <span className="font-semibold text-gray-900">
                {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-gray-900">
                {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filteredInvoices.length)}
              </span>{' '}
              of <span className="font-semibold text-gray-900">{filteredInvoices.length}</span>{' '}
              invoices
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 font-medium"
                >
                  ← Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${
                      safeCurrentPage === pg
                        ? 'bg-[#1B5E20] text-white shadow-sm'
                        : 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 font-medium"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
            onClick={() => !deleting && setDeleteTarget(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-scale-in">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto mb-4">
              🗑️
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">Delete Invoice?</h3>
            <p className="text-xs text-gray-600 text-center mb-6 leading-relaxed">
              Are you sure you want to delete{' '}
              <span className="font-mono font-bold text-gray-900">
                {deleteTarget.invoiceNumber}
              </span>{' '}
              for <span className="font-semibold">{deleteTarget.customer.name}</span>? This action cannot be undone.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-semibold hover:bg-red-700 shadow-md shadow-red-600/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Deleting…</span>
                  </>
                ) : (
                  <span>Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
