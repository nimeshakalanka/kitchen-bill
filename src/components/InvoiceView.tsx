'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Invoice } from '@/lib/types';
import { getInvoiceById, getCurrentInvoice } from '@/lib/storage';
import { fetchInvoiceFromSupabase } from '@/lib/supabase/invoices';
import {
  formatCurrency,
  formatDateDDMMYYYY,
  formatTime,
} from '@/lib/calculations';
import { BUSINESS_CONFIG } from '@/lib/config';
import { BUSINESS_LOGO } from '@/lib/logo-data';
import { downloadInvoicePdf } from '@/lib/pdfGenerator';
import { useToast } from '@/context/ToastContext';

interface InvoiceViewProps {
  invoiceId?: string;
}

export default function InvoiceView({ invoiceId }: InvoiceViewProps) {
  const { toast } = useToast();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadInvoice() {
      setLoading(true);

      // 1. Try fetching from Supabase if an ID was provided
      if (invoiceId) {
        try {
          const supabaseInvoice = await fetchInvoiceFromSupabase(invoiceId);
          if (supabaseInvoice && !isCancelled) {
            setInvoice(supabaseInvoice);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to local fallback
        }
      }

      // 2. Fallback to localStorage by ID
      if (invoiceId) {
        const localInvoice = getInvoiceById(invoiceId);
        if (localInvoice && !isCancelled) {
          setInvoice(localInvoice);
          setLoading(false);
          return;
        }
      }

      // 3. Fallback to current session invoice
      const current = getCurrentInvoice();
      if (!isCancelled) {
        setInvoice(current);
        setLoading(false);
      }
    }

    loadInvoice();

    return () => {
      isCancelled = true;
    };
  }, [invoiceId]);

  // Generate safe filename: PDK-0001_CustomerName.pdf
  const getPdfFileName = (): string => {
    if (!invoice) return 'invoice.pdf';
    const cleanInvoiceNo = (invoice.invoiceNumber || 'PDK-0001').trim();
    const cleanCustomerName = (invoice.customer.name || 'Customer')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '') || 'Customer';
    return `${cleanInvoiceNo}_${cleanCustomerName}.pdf`;
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloading(true);

    const fileName = getPdfFileName();

    try {
      // High-precision compressed vector PDF (exact replica of preview, ~40 KB size)
      downloadInvoicePdf(invoice, fileName);
      toast.success(`Invoice PDF downloaded: ${fileName}`);
    } catch (err) {
      console.error('Direct PDF generation error:', err);
      toast.error('Direct download failed, opening print window...');
      handlePrint();
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!invoice) return;

    try {
      const isHotel =
        invoice.customer.customerType === 'hotel' ||
        (!invoice.customer.country && !invoice.customer.phone);

      const printWindow = window.open('', '', 'width=900,height=1200');
      if (!printWindow) {
        window.print();
        return;
      }

      const formattedDate = formatDateDDMMYYYY(invoice.date);
      const bookingDate = invoice.customer.bookingDate
        ? formatDateDDMMYYYY(invoice.customer.bookingDate)
        : '—';
      const bookingTime = invoice.customer.bookingTime
        ? formatTime(invoice.customer.bookingTime) || invoice.customer.bookingTime
        : '—';

      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice - ${invoice.invoiceNumber}</title>
          <style>
            @page { size: A4; margin: 10mm 12mm 10mm 12mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              color: #1a202c;
              background: #fff;
              width: 100%;
            }

            .letterhead { text-align: center; padding-bottom: 6px; margin-bottom: 6px; }
            .letterhead img.logo { width: 68px; height: 68px; object-fit: contain; display: block; margin: 0 auto 4px auto; }
            .letterhead h1 { font-size: 18px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 2px; color: #1B5E20; font-family: Georgia, serif; }
            .letterhead .tagline { font-size: 9.5px; color: #8D6E63; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; margin-bottom: 2px; }
            .header-rule { border: none; border-top: 2px double #1B5E20; margin: 5px 0 8px 0; }

            .invoice-title-bar {
              display: flex; justify-content: space-between; align-items: center;
              background: #1B5E20; color: white;
              padding: 6px 12px; border-radius: 4px; margin-bottom: 8px;
            }
            .invoice-title-bar .inv-label { font-size: 12px; font-weight: bold; letter-spacing: 1px; }
            .invoice-title-bar .inv-meta { font-size: 10px; text-align: right; line-height: 1.4; }

            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
            .info-box { background: #f0fdf4; border-left: 3px solid #1B5E20; padding: 6px 9px; border-radius: 3px; }
            .info-box .box-title { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #1B5E20; margin-bottom: 4px; letter-spacing: 0.5px; }
            .info-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; border-bottom: 1px solid #dcfce7; }
            .info-row:last-child { border-bottom: none; }
            .info-row .lbl { color: #555; font-weight: 600; }
            .info-row .val { color: #111; font-weight: 600; }

            table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
            table thead tr { background: #1B5E20; color: white; }
            table th { padding: 5px 7px; text-align: left; font-weight: 700; font-size: 9.5px; }
            table td { padding: 5px 7px; border-bottom: 1px solid #e5e7eb; color: #111; }
            table tbody tr:last-child td { border-bottom: none; }
            table tbody tr:nth-child(even) { background: #f9fafb; }

            .totals-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; padding: 7px 11px; margin-bottom: 8px; margin-left: auto; width: 280px; }
            .total-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; border-bottom: 1px solid #e2e8f0; }
            .total-row:last-child { border-bottom: none; }
            .total-row .t-lbl { color: #555; font-weight: 600; }
            .total-row .t-val { font-weight: 600; color: #111; }
            .total-row.discount .t-val { color: #dc2626; }
            .grand-row { display: flex; justify-content: space-between; font-size: 13px; font-weight: 900; color: #1B5E20; border-top: 2px solid #1B5E20; margin-top: 4px; padding-top: 4px; }

            .payment-block { display: flex; justify-content: space-between; font-size: 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 3px; padding: 5px 10px; margin-bottom: 8px; }
            .payment-block span { font-weight: 600; }

            .notes-block { background: #fbf7f0; border-left: 3px solid #E8A317; padding: 5px 8px; border-radius: 3px; margin-bottom: 8px; font-size: 10px; }
            .notes-block .notes-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; color: #8D6E63; margin-bottom: 1px; }
            .notes-block p { color: #4E342E; margin: 1px 0; font-size: 9.5px; font-style: italic; }

            .page-footer { margin-top: 8px; padding-top: 6px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: flex-end; font-size: 9px; color: #6b7280; }
            .page-footer .biz-info strong { color: #1B5E20; font-size: 9.5px; display: block; }
            .page-footer .thank-you { text-align: right; }
            .page-footer .thank-you strong { color: #1B5E20; font-size: 9.5px; display: block; }

            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              * { border-radius: 0 !important; }
              html { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="letterhead">
            <img src="${BUSINESS_LOGO}" alt="Logo" class="logo" />
            <h1>${BUSINESS_CONFIG.name}</h1>
            <p class="tagline">${BUSINESS_CONFIG.tagline}</p>
          </div>
          <hr class="header-rule" />

          <div class="invoice-title-bar">
            <span class="inv-label">${isHotel ? 'HOTEL INVOICE' : 'OFFICIAL INVOICE'}</span>
            <div class="inv-meta">
              <div>Bill / Invoice No: <strong>${invoice.invoiceNumber}</strong></div>
              <div>Date: ${formattedDate}</div>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-box">
              <div class="box-title">Invoice Details</div>
              <div class="info-row"><span class="lbl">Invoice No:</span><span class="val">${invoice.invoiceNumber}</span></div>
              <div class="info-row"><span class="lbl">Date:</span><span class="val">${formattedDate}</span></div>
              <div class="info-row"><span class="lbl">Category:</span><span class="val">${isHotel ? 'Hotel Partner' : 'Cooking Class'}</span></div>
            </div>
            <div class="info-box">
              <div class="box-title">${isHotel ? 'Hotel Information' : 'Customer Information'}</div>
              <div class="info-row"><span class="lbl">${isHotel ? 'Hotel Name' : 'Name'}:</span><span class="val">${invoice.customer.name || '—'}</span></div>
              ${!isHotel && invoice.customer.country ? `<div class="info-row"><span class="lbl">Country:</span><span class="val">${invoice.customer.country}</span></div>` : ''}
              ${!isHotel && invoice.customer.phone ? `<div class="info-row"><span class="lbl">WhatsApp / Phone:</span><span class="val">${invoice.customer.phone}</span></div>` : ''}
              <div class="info-row"><span class="lbl">Guests:</span><span class="val">${invoice.customer.numberOfGuests || 1}</span></div>
              <div class="info-row"><span class="lbl">Booking Date:</span><span class="val">${bookingDate} ${bookingTime !== '—' ? 'at ' + bookingTime : ''}</span></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align:center;width:45px;">Qty</th>
                <th style="text-align:right;width:80px;">Unit Price</th>
                <th style="text-align:right;width:85px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td style="text-align:center;">${item.quantity}</td>
                  <td style="text-align:right;">${formatCurrency(item.unitPrice, invoice.currency)}</td>
                  <td style="text-align:right;font-weight:700;">${formatCurrency(item.total, invoice.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-block">
            <div class="total-row"><span class="t-lbl">Subtotal:</span><span class="t-val">${formatCurrency(invoice.subtotal, invoice.currency)}</span></div>
            ${invoice.discountAmount > 0 ? `
              <div class="total-row discount">
                <span class="t-lbl">Discount${invoice.discountType === 'percentage' && invoice.discountValue ? ' (' + invoice.discountValue + '%)' : ''}:</span>
                <span class="t-val">-${formatCurrency(invoice.discountAmount, invoice.currency)}</span>
              </div>
            ` : ''}
            <div class="grand-row">
              <span>TOTAL AMOUNT:</span>
              <span>${formatCurrency(invoice.grandTotal, invoice.currency)}</span>
            </div>
          </div>

          <div class="payment-block">
            <div>Payment Method: <span>${(invoice.paymentMethod || 'cash').toUpperCase().replace('_', ' ')}</span></div>
            <div>Payment Status: <span>${(invoice.paymentStatus || 'pending').toUpperCase()}</span></div>
          </div>

          ${invoice.notes ? `
            <div class="notes-block">
              <div class="notes-title">Notes</div>
              <p>${invoice.notes}</p>
            </div>
          ` : ''}

          <div class="page-footer">
            <div class="biz-info">
              <strong>${BUSINESS_CONFIG.name}</strong>
              ${BUSINESS_CONFIG.location} · WhatsApp: ${BUSINESS_CONFIG.whatsapp}
            </div>
            <div class="thank-you">
              <strong>Thank you for choosing Priya Dream Kitchen!</strong>
              We look forward to cooking with you in Weligama 🍛
            </div>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 300);
    } catch {
      window.print();
    }
  };

  const handleWhatsAppShare = () => {
    if (!invoice) return;

    const customerName = invoice.customer.name?.trim() || 'Guest';
    const invoiceNo = invoice.invoiceNumber;
    const total = formatCurrency(invoice.grandTotal, invoice.currency);
    const bookingDate = invoice.customer.bookingDate ? formatDateDDMMYYYY(invoice.customer.bookingDate) : '';
    const fileName = getPdfFileName();

    // Extract digits from customer phone if available
    const rawPhone = (invoice.customer.phone || '').replace(/[^0-9]/g, '');

    const message = `Hello ${customerName}! 🙏\n\nHere are your booking invoice details from Priya Dream Kitchen:\n• Invoice No: ${invoiceNo}\n• Total: ${total}${bookingDate ? `\n• Booking Date: ${bookingDate}` : ''}\n\n📎 Please find your official invoice attached (${fileName}).\n\nThank you for choosing Priya Dream Kitchen! We look forward to cooking with you in Weligama 🍛`;

    const encodedText = encodeURIComponent(message);

    // If customer has a valid phone number with country code, open chat directly with them
    const waUrl = rawPhone.length >= 8
      ? `https://wa.me/${rawPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');

    setShareFeedback('💬 WhatsApp opened! Don’t forget to attach the downloaded PDF.');
    toast.info('WhatsApp opened! Don’t forget to attach your downloaded PDF.');
    setTimeout(() => setShareFeedback(null), 5000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">📄</div>
        <h2 className="text-xl font-bold text-[#3E2723] mb-2">No Invoice Found</h2>
        <p className="text-sm text-[#8D6E63] mb-6">Create a new invoice to get started.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-sm font-semibold shadow-lg"
        >
          ← Create New Invoice
        </Link>
      </div>
    );
  }

  // Checkbox helpers
  const isCash = invoice.paymentMethod === 'cash';
  const isBankTransfer = invoice.paymentMethod === 'bank_transfer';
  const isOnline = invoice.paymentMethod === 'online';
  const isPaid = invoice.paymentStatus === 'paid' || invoice.status === 'paid';
  const isPending = !isPaid;
  const isHotel =
    invoice.customer.customerType === 'hotel' ||
    (!invoice.customer.country && !invoice.customer.phone);

  const editUrl = `/?edit=${encodeURIComponent(invoice.id)}`;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 animate-fade-in">
      {/* ─────────────────────────────────────────────────────────────
          ACTION BUTTONS BAR (above the sheet, hidden when printing)
      ───────────────────────────────────────────────────────────── */}
      <div className="no-print mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pb-3 border-b border-gray-200">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Invoice Preview</span>
            <h2 className="text-xl sm:text-2xl font-bold text-[#1B5E20] font-mono leading-tight">
              {invoice.invoiceNumber}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Edit button */}
            <Link
              href={editUrl}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all"
            >
              <span>✏️</span>
              <span>Edit</span>
            </Link>

            {/* Download PDF button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloading}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B5E20] text-white text-xs sm:text-sm font-semibold hover:bg-[#2E7D32] shadow-md shadow-[#1B5E20]/20 hover:shadow-lg transition-all disabled:opacity-60"
            >
              {downloading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Generating…</span>
                </>
              ) : (
                <>
                  <span>⬇</span>
                  <span>Download PDF</span>
                </>
              )}
            </button>

            {/* Share on WhatsApp button */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] text-white text-xs sm:text-sm font-semibold hover:bg-[#1EBE5D] shadow-md shadow-[#25D366]/25 hover:shadow-lg transition-all"
              title="Share invoice details on WhatsApp and attach PDF"
            >
              <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Share on WhatsApp</span>
            </button>

            {/* Print button */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 shadow-sm transition-all"
            >
              <span>🖨️</span>
              <span>Print</span>
            </button>

            {/* New Invoice button */}
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#E8A317]/50 bg-[#FBF7F0] text-[#9A6700] text-xs sm:text-sm font-semibold hover:bg-[#F5F0E6] hover:border-[#E8A317] shadow-sm transition-all"
            >
              <span>+</span>
              <span>New Invoice</span>
            </Link>
          </div>
        </div>

        {/* Feedback message banner */}
        {shareFeedback && (
          <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-emerald-800 flex items-center justify-between animate-fade-in">
            <span>{shareFeedback}</span>
            <button
              onClick={() => setShareFeedback(null)}
              className="text-emerald-600 hover:text-emerald-900 font-bold ml-2"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          WHITE A4-PROPORTIONED SHEET
      ───────────────────────────────────────────────────────────── */}
      <div className="flex justify-center overflow-x-auto pb-4">
        <div
          ref={invoiceRef}
          id="invoice-sheet"
          className="print-sheet w-full max-w-[794px] min-h-[1123px] bg-white text-gray-800 p-6 sm:p-12 md:p-16 shadow-2xl border border-gray-200/80 rounded-2xl flex flex-col justify-between shrink-0"
          style={{ backgroundColor: '#ffffff', color: '#1a202c' }}
        >
          {/* Top content wrapper */}
          <div className="space-y-6">
            {/* 1. Header */}
            <div className="text-center pb-5 border-b-2 border-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={BUSINESS_LOGO}
                alt="Priya Dream Kitchen Logo"
                className="mx-auto mb-3"
                style={{ width: '90px', height: '90px', objectFit: 'contain' }}
              />
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wider text-[#1B5E20] uppercase font-serif">
                {BUSINESS_CONFIG.name}
              </h1>
              <p className="text-xs sm:text-sm font-medium text-[#8D6E63] tracking-widest uppercase mt-1">
                {BUSINESS_CONFIG.tagline}
              </p>
            </div>

            {/* 2. Bill / Invoice No & Date */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 px-1 text-sm border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Bill / Invoice No:
                </span>
                <span className="font-mono font-bold text-[#1B5E20] text-base">
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 sm:mt-0">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Date:
                </span>
                <span className="font-semibold text-gray-800">
                  {formatDateDDMMYYYY(invoice.date)}
                </span>
              </div>
            </div>

            {/* 3. Customer / Hotel Details */}
            <div className="py-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] mb-3 pb-1 border-b border-gray-100">
                {isHotel ? 'Hotel Details' : 'Customer Details'}
              </h2>
              <div className={`grid ${isHotel ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'} gap-y-3.5 gap-x-6 text-sm`}>
                <div className={isHotel ? 'sm:col-span-1' : ''}>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {isHotel ? 'Hotel Name' : 'Name'}
                  </span>
                  <span className="font-semibold text-gray-900 block mt-0.5">
                    {invoice.customer.name || '—'}
                  </span>
                </div>
                {!isHotel && (
                  <div>
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      Country
                    </span>
                    <span className="text-gray-800 block mt-0.5">
                      {invoice.customer.country || '—'}
                    </span>
                  </div>
                )}
                {!isHotel && (
                  <div>
                    <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      WhatsApp / Phone
                    </span>
                    <span className="font-mono text-gray-800 block mt-0.5">
                      {invoice.customer.phone || '—'}
                    </span>
                  </div>
                )}
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Number of Guests
                  </span>
                  <span className="font-semibold text-gray-900 block mt-0.5">
                    {invoice.customer.numberOfGuests || 1}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Booking Date
                  </span>
                  <span className="text-gray-800 block mt-0.5">
                    {formatDateDDMMYYYY(invoice.customer.bookingDate) || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    Booking Time
                  </span>
                  <span className="text-gray-800 block mt-0.5">
                    {invoice.customer.bookingTime
                      ? formatTime(invoice.customer.bookingTime) || invoice.customer.bookingTime
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Cooking Class (table) */}
            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] mb-3 pb-1 border-b border-gray-100">
                Cooking Class
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="py-2.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="py-2.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center w-16">
                        Qty
                      </th>
                      <th className="py-2.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-right w-28">
                        Price
                      </th>
                      <th className="py-2.5 px-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-right w-28">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={item.id || idx} className="border-b border-gray-200">
                        <td className="py-3 px-3 text-gray-800 font-medium">
                          {item.description}
                        </td>
                        <td className="py-3 px-3 text-gray-700 text-center">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-gray-700 text-right tabular-nums">
                          {formatCurrency(item.unitPrice, invoice.currency)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-gray-900 text-right tabular-nums">
                          {formatCurrency(item.total, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. Subtotal / Discount / Total */}
            <div className="flex justify-end pt-2">
              <div className="w-full sm:w-64 space-y-2 text-sm">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-600 font-medium">Subtotal</span>
                  <span className="font-semibold text-gray-800 tabular-nums">
                    {formatCurrency(invoice.subtotal, invoice.currency)}
                  </span>
                </div>

                {invoice.discountAmount > 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 text-red-600">
                    <span className="font-medium">
                      Discount{' '}
                      {invoice.discountType === 'percentage' && invoice.discountValue
                        ? `(${invoice.discountValue}%)`
                        : ''}
                    </span>
                    <span className="font-semibold tabular-nums">
                      -{formatCurrency(invoice.discountAmount, invoice.currency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between py-2 border-t-2 border-b-2 border-gray-300 font-bold">
                  <span className="text-[#1B5E20] text-base uppercase tracking-wider">Total</span>
                  <span className="text-[#1B5E20] text-lg tabular-nums">
                    {formatCurrency(invoice.grandTotal, invoice.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* 6. Payment Checkboxes */}
            <div className="pt-4 border-t border-gray-200">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#1B5E20] mb-2.5">
                Payment
              </h2>
              <div className="space-y-2 text-sm text-gray-800">
                {/* Payment Method */}
                <div className="flex flex-wrap items-center gap-6">
                  <span className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-gray-900">{isCash ? '☑' : '☐'}</span>
                    <span className={isCash ? 'font-semibold text-gray-900' : 'text-gray-600'}>Cash</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-gray-900">{isBankTransfer ? '☑' : '☐'}</span>
                    <span className={isBankTransfer ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                      Bank Transfer
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-gray-900">{isOnline ? '☑' : '☐'}</span>
                    <span className={isOnline ? 'font-semibold text-gray-900' : 'text-gray-600'}>
                      Online Payment
                    </span>
                  </span>
                </div>

                {/* Payment Status */}
                <div className="flex items-center gap-6 pt-1">
                  <span className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-gray-900">{isPaid ? '☑' : '☐'}</span>
                    <span className={isPaid ? 'font-semibold text-emerald-700' : 'text-gray-600'}>Paid</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-base font-bold text-gray-900">{isPending ? '☑' : '☐'}</span>
                    <span className={isPending ? 'font-semibold text-amber-700' : 'text-gray-600'}>Pending</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 7. Notes (compact) */}
            <div className="pt-2 border-t border-gray-200">
              <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                Notes:
              </span>
              {invoice.notes && (
                <p className="text-gray-600 text-[11px] leading-tight whitespace-pre-line mb-1 italic">
                  {invoice.notes}
                </p>
              )}
              <p className="text-[#1B5E20] text-[11px] font-medium italic">
                &ldquo;Thank you for choosing Priya Dream Kitchen!&rdquo;
              </p>
            </div>
          </div>

          {/* 8. Footer (anchored at bottom of A4 sheet) */}
          <div className="pt-4 mt-4 border-t border-gray-200 text-center text-[11px] text-gray-500 space-y-1">
            <p className="font-bold text-gray-800 text-xs tracking-wide">
              {BUSINESS_CONFIG.name}
            </p>
            <p>{BUSINESS_CONFIG.location}</p>
            <p>
              WhatsApp: <span className="font-mono text-gray-800">{BUSINESS_CONFIG.whatsapp}</span>
              {' · '}
              Website:{' '}
              <span className="text-[#1B5E20] font-semibold underline-offset-2">
                {BUSINESS_CONFIG.website}
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
