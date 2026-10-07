import { jsPDF } from 'jspdf';
import { Invoice } from './types';
import { BUSINESS_CONFIG } from './config';
import { BUSINESS_LOGO } from './logo-data';
import { formatCurrency, formatDateDDMMYYYY, formatTime } from './calculations';

/**
 * Generates a vector PDF that EXACTLY mirrors the on-screen invoice preview:
 * - Letterhead with centered logo, serif title, and brown tagline
 * - Bill / Invoice No & Date strip
 * - Customer / Hotel Details grid
 * - Cooking Class line items table with clean borders
 * - Subtotal, Discount & Total block
 * - Payment checkboxes (Cash, Bank Transfer, Online Payment | Paid, Pending)
 * - Compact notes & thank you message
 * - Centered business contact footer
 */
export function generateInvoicePdf(invoice: Invoice): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const isHotel =
    invoice.customer.customerType === 'hotel' ||
    (!invoice.customer.country && !invoice.customer.phone);

  const formattedDate = formatDateDDMMYYYY(invoice.date);
  const bookingDate = invoice.customer.bookingDate
    ? formatDateDDMMYYYY(invoice.customer.bookingDate)
    : '—';
  const bookingTime = invoice.customer.bookingTime
    ? formatTime(invoice.customer.bookingTime) || invoice.customer.bookingTime
    : '—';

  // Margins (matching sheet padding on A4: 18mm left & right, width = 174mm)
  const marginL = 18;
  const marginR = 192;
  const pageWidth = 210;
  let curY = 14;

  // ─────────────────────────────────────────────────────────────
  // 1. Header (Centered logo, business name, tagline, divider)
  // ─────────────────────────────────────────────────────────────
  try {
    if (BUSINESS_LOGO && BUSINESS_LOGO.startsWith('data:image')) {
      doc.addImage(BUSINESS_LOGO, 'PNG', 94, curY, 22, 22, undefined, 'FAST');
      curY += 25;
    } else {
      curY += 6;
    }
  } catch {
    curY += 6;
  }

  // Business Name: Serif bold green (#1B5E20)
  doc.setFont('times', 'bold');
  doc.setFontSize(19);
  doc.setTextColor(27, 94, 32); // #1B5E20
  doc.text(BUSINESS_CONFIG.name.toUpperCase(), pageWidth / 2, curY, { align: 'center' });
  curY += 5;

  // Tagline: Sans-serif medium brown (#8D6E63)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(141, 110, 99); // #8D6E63
  doc.text(BUSINESS_CONFIG.tagline.toUpperCase(), pageWidth / 2, curY, { align: 'center' });
  curY += 5;

  // Header bottom border (gray-200)
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.4);
  doc.line(marginL, curY, marginR, curY);
  curY += 5;

  // ─────────────────────────────────────────────────────────────
  // 2. Bill / Invoice No & Date Strip
  // ─────────────────────────────────────────────────────────────
  // Left: Bill / Invoice No: PDK-0001
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128); // gray-500
  doc.text('BILL / INVOICE NO:', marginL, curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(27, 94, 32); // #1B5E20
  doc.text(invoice.invoiceNumber, marginL + 34, curY);

  // Right: Date: DD/MM/YYYY
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text('DATE:', marginR - 35, curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(31, 41, 55); // gray-800
  doc.text(formattedDate, marginR, curY, { align: 'right' });
  curY += 3.5;

  // Strip bottom border (gray-200)
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginL, curY, marginR, curY);
  curY += 5.5;

  // ─────────────────────────────────────────────────────────────
  // 3. Customer Details / Hotel Details
  // ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(27, 94, 32);
  doc.text(isHotel ? 'HOTEL DETAILS' : 'CUSTOMER DETAILS', marginL, curY);
  curY += 2;

  doc.setDrawColor(243, 244, 246); // gray-100
  doc.setLineWidth(0.2);
  doc.line(marginL, curY, marginR, curY);
  curY += 4.5;

  if (isHotel) {
    // 4 Columns: Hotel Name | Number of Guests | Booking Date | Booking Time
    const colW = (marginR - marginL) / 4;

    // Labels
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text('HOTEL NAME', marginL, curY);
    doc.text('NUMBER OF GUESTS', marginL + colW, curY);
    doc.text('BOOKING DATE', marginL + colW * 2, curY);
    doc.text('BOOKING TIME', marginL + colW * 3, curY);

    // Values
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39); // gray-900
    const hotelName = invoice.customer.name || '—';
    doc.text(hotelName.length > 24 ? hotelName.substring(0, 22) + '…' : hotelName, marginL, curY + 4.5);
    doc.text(String(invoice.customer.numberOfGuests || 1), marginL + colW, curY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(bookingDate, marginL + colW * 2, curY + 4.5);
    doc.text(bookingTime, marginL + colW * 3, curY + 4.5);

    curY += 10;
  } else {
    // Guest Mode: 3 Columns x 2 Rows
    const colW = (marginR - marginL) / 3;

    // Row 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text('NAME', marginL, curY);
    doc.text('COUNTRY', marginL + colW, curY);
    doc.text('WHATSAPP / PHONE', marginL + colW * 2, curY);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    const guestName = invoice.customer.name || '—';
    doc.text(guestName.length > 25 ? guestName.substring(0, 23) + '…' : guestName, marginL, curY + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(invoice.customer.country || '—', marginL + colW, curY + 4.2);
    doc.text(invoice.customer.phone || '—', marginL + colW * 2, curY + 4.2);

    // Row 2
    const row2Y = curY + 9;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(107, 114, 128);
    doc.text('NUMBER OF GUESTS', marginL, row2Y);
    doc.text('BOOKING DATE', marginL + colW, row2Y);
    doc.text('BOOKING TIME', marginL + colW * 2, row2Y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(17, 24, 39);
    doc.text(String(invoice.customer.numberOfGuests || 1), marginL, row2Y + 4.2);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(31, 41, 55);
    doc.text(bookingDate, marginL + colW, row2Y + 4.2);
    doc.text(bookingTime, marginL + colW * 2, row2Y + 4.2);

    curY = row2Y + 10;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. Cooking Class (Table)
  // ─────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(27, 94, 32);
  doc.text('COOKING CLASS', marginL, curY);
  curY += 2;

  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.2);
  doc.line(marginL, curY, marginR, curY);
  curY += 4.5;

  // Table Columns
  const colDesc = marginL + 2;
  const colQty = marginL + 115;
  const colPrice = marginL + 145;
  const colAmount = marginR - 2;

  // Table Header Row
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99); // gray-600
  doc.text('DESCRIPTION', colDesc, curY);
  doc.text('QTY', colQty, curY, { align: 'center' });
  doc.text('PRICE', colPrice, curY, { align: 'right' });
  doc.text('AMOUNT', colAmount, curY, { align: 'right' });
  curY += 2.5;

  // Table Header border-b (gray-300, 0.4mm)
  doc.setDrawColor(209, 213, 219);
  doc.setLineWidth(0.4);
  doc.line(marginL, curY, marginR, curY);
  curY += 1.5;

  // Table Body Rows
  invoice.items.forEach(item => {
    const rowH = 7.5;
    const textY = curY + 4.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(31, 41, 55);
    const desc = item.description || 'Item';
    doc.text(desc.length > 55 ? desc.substring(0, 52) + '…' : desc, colDesc, textY);

    doc.setTextColor(55, 65, 81);
    doc.text(String(item.quantity), colQty, textY, { align: 'center' });
    doc.text(formatCurrency(item.unitPrice, invoice.currency), colPrice, textY, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(17, 24, 39);
    doc.text(formatCurrency(item.total, invoice.currency), colAmount, textY, { align: 'right' });

    curY += rowH;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(marginL, curY, marginR, curY);
  });

  curY += 4;

  // ─────────────────────────────────────────────────────────────
  // 5. Subtotal / Discount / Total (Right Block)
  // ─────────────────────────────────────────────────────────────
  const totalBoxW = 68;
  const totalBoxX = marginR - totalBoxW;

  // Subtotal
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text('Subtotal', totalBoxX, curY + 4);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text(formatCurrency(invoice.subtotal, invoice.currency), marginR, curY + 4, { align: 'right' });
  curY += 6.5;

  doc.setDrawColor(243, 244, 246);
  doc.setLineWidth(0.2);
  doc.line(totalBoxX, curY, marginR, curY);

  // Discount (if any)
  if (invoice.discountAmount > 0) {
    const discLabel = `Discount ${invoice.discountType === 'percentage' && invoice.discountValue ? `(${invoice.discountValue}%)` : ''}`;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(discLabel, totalBoxX, curY + 4);
    doc.setFont('helvetica', 'bold');
    doc.text(`-${formatCurrency(invoice.discountAmount, invoice.currency)}`, marginR, curY + 4, { align: 'right' });
    curY += 6.5;

    doc.setDrawColor(243, 244, 246);
    doc.setLineWidth(0.2);
    doc.line(totalBoxX, curY, marginR, curY);
  }

  // Total (Double Border)
  curY += 2;
  doc.setDrawColor(209, 213, 219); // border-gray-300
  doc.setLineWidth(0.5);
  doc.line(totalBoxX, curY, marginR, curY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(27, 94, 32);
  doc.text('TOTAL', totalBoxX, curY + 5.5);
  doc.setFontSize(12);
  doc.text(formatCurrency(invoice.grandTotal, invoice.currency), marginR, curY + 5.5, { align: 'right' });

  doc.setLineWidth(0.5);
  doc.line(totalBoxX, curY + 7.5, marginR, curY + 7.5);
  curY += 14;

  // ─────────────────────────────────────────────────────────────
  // 6. Payment Checkboxes
  // ─────────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginL, curY, marginR, curY);
  curY += 4.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(27, 94, 32);
  doc.text('PAYMENT', marginL, curY);
  curY += 4.5;

  const isCash = invoice.paymentMethod === 'cash';
  const isBankTransfer = invoice.paymentMethod === 'bank_transfer';
  const isOnline = invoice.paymentMethod === 'online';
  const isPaid = invoice.paymentStatus === 'paid' || invoice.status === 'paid';
  const isPending = !isPaid;

  // Method Row: ☑/☐ Cash    ☑/☐ Bank Transfer    ☑/☐ Online Payment
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);

  const drawCheckbox = (x: number, y: number, checked: boolean, label: string, color?: [number, number, number]) => {
    doc.setDrawColor(156, 163, 175);
    doc.setLineWidth(0.3);
    doc.rect(x, y - 2.8, 3.2, 3.2);
    if (checked) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(color ? color[0] : 17, color ? color[1] : 24, color ? color[2] : 39);
      doc.text('✓', x + 0.6, y - 0.3);
    }
    doc.setFont('helvetica', checked ? 'bold' : 'normal');
    doc.setTextColor(color ? color[0] : (checked ? 17 : 75), color ? color[1] : (checked ? 24 : 85), color ? color[2] : (checked ? 39 : 99));
    doc.text(label, x + 4.8, y);
  };

  drawCheckbox(marginL, curY, isCash, 'Cash');
  drawCheckbox(marginL + 35, curY, isBankTransfer, 'Bank Transfer');
  drawCheckbox(marginL + 75, curY, isOnline, 'Online Payment');
  curY += 5.5;

  // Status Row: ☑/☐ Paid    ☑/☐ Pending
  drawCheckbox(marginL, curY, isPaid, 'Paid', isPaid ? [21, 128, 61] : undefined);
  drawCheckbox(marginL + 35, curY, isPending, 'Pending', isPending ? [180, 83, 9] : undefined);
  curY += 7.5;

  // ─────────────────────────────────────────────────────────────
  // 7. Notes (Compact)
  // ─────────────────────────────────────────────────────────────
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginL, curY, marginR, curY);
  curY += 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(156, 163, 175); // gray-400
  doc.text('NOTES:', marginL, curY);
  curY += 3.5;

  if (invoice.notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(75, 85, 99); // gray-600
    const cleanNotes = invoice.notes.replace(/\r?\n/g, ' ');
    doc.text(cleanNotes.length > 115 ? cleanNotes.substring(0, 112) + '…' : cleanNotes, marginL, curY);
    curY += 4;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(27, 94, 32);
  doc.text('“Thank you for choosing Priya Dream Kitchen!”', marginL, curY);

  // ─────────────────────────────────────────────────────────────
  // 8. Footer (Anchored at sheet bottom)
  // ─────────────────────────────────────────────────────────────
  const footerY = 277;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginL, footerY, marginR, footerY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 41, 55);
  doc.text(BUSINESS_CONFIG.name, pageWidth / 2, footerY + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(107, 114, 128);
  doc.text(BUSINESS_CONFIG.location, pageWidth / 2, footerY + 8.5, { align: 'center' });

  doc.text(
    `WhatsApp: ${BUSINESS_CONFIG.whatsapp}   ·   Website: ${BUSINESS_CONFIG.website}`,
    pageWidth / 2,
    footerY + 12.5,
    { align: 'center' }
  );

  return doc;
}

export function downloadInvoicePdf(invoice: Invoice, fileName?: string): void {
  const safeFileName =
    fileName ||
    `${(invoice.invoiceNumber || 'PDK-0001').trim()}_${(invoice.customer.name || 'Customer').trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '') || 'Customer'}.pdf`;

  const doc = generateInvoicePdf(invoice);
  doc.save(safeFileName);
}
