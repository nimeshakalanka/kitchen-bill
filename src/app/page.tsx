'use client';

import { useState, useEffect, Suspense, useSyncExternalStore } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Invoice,
  InvoiceItem,
  CustomerInfo,
  PaymentMethod,
  PaymentStatus,
  DiscountType,
} from '@/lib/types';
import { generateInvoiceNumber, generateId } from '@/lib/invoice-number';
import {
  calculateItemTotal,
  calculateSubtotal,
  calculateDiscount,
  calculateGrandTotal,
  formatCurrency,
} from '@/lib/calculations';
import { setCurrentInvoice, saveInvoice, getInvoiceById } from '@/lib/storage';
import {
  saveInvoiceToSupabase,
  getNextInvoiceNumberFromSupabase,
  fetchInvoiceFromSupabase,
  isSupabaseConfigured,
} from '@/lib/supabase/invoices';
import { DEFAULT_PRESETS } from '@/lib/presets';
import { fetchAppSettings, PresetConfigItem } from '@/lib/supabase/settings';
import { COUNTRIES } from '@/lib/countries';
import SearchableSelect from '@/components/SearchableSelect';
import SettingsModal from '@/components/SettingsModal';
import { useToast } from '@/context/ToastContext';

/* ──────────────────────────── helpers ──────────────────────────── */

const subscribeNoop = () => () => {};

function createEmptyItem(): InvoiceItem {
  return { id: generateId(), description: '', quantity: 1, unitPrice: 0, total: 0 };
}

/* ────────────────────────── shared styles ─────────────────────── */

const CARD = 'bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7';
const LABEL = 'block text-xs font-semibold text-[#6D4C41] mb-1.5 uppercase tracking-wide';
const INPUT =
  'w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/50 transition-colors';
const SECTION_ICON = 'w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0';

/* ──────────────────────────── component ─────────────────────────── */

function InvoiceFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const duplicateId = searchParams.get('duplicate');

  const isMounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const { toast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Invoice meta
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');

  // Section 1 – Customer Details
  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    customerType: 'guest',
    country: '',
    phone: '',
    numberOfGuests: 1,
    bookingDate: '',
    bookingTime: '',
  });

  // Section 2 – Line Items
  const [items, setItems] = useState<InvoiceItem[]>([createEmptyItem()]);

  // Section 3 – Discount / Totals
  const [discountType, setDiscountType] = useState<DiscountType>('fixed');
  const [discountValue, setDiscountValue] = useState(0);

  // Section 4 – Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [notes, setNotes] = useState('');

  // Validation touched state
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic presets and currency from Supabase settings
  const [presetItems, setPresetItems] = useState<PresetConfigItem[]>(
    DEFAULT_PRESETS.map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      price: p.defaultPrice,
    }))
  );
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    async function loadData() {
      // Load current settings from Supabase
      try {
        const appSettings = await fetchAppSettings();
        if (appSettings && appSettings.preset_items.length > 0) {
          setPresetItems(appSettings.preset_items);
          setCurrencySymbol(appSettings.currency_symbol || '$');
        }
      } catch (err) {
        console.warn('Could not load app settings in form:', err);
      }

      const sourceId = editId || duplicateId;
      if (sourceId) {
        // 1. Fetch from Supabase
        let found = await fetchInvoiceFromSupabase(sourceId);
        if (!found) {
          found = getInvoiceById(sourceId);
        }

        if (found) {
          if (editId) {
            setInvoiceNumber(found.invoiceNumber);
            setDate(found.date);
            setPaymentStatus(found.paymentStatus);
          } else {
            // Duplicating: fresh invoice number, current date, pending status
            setInvoiceNumber(generateInvoiceNumber());
            setDate(todayStr);
            setPaymentStatus('pending');
          }

          setCustomer(found.customer);
          setItems(found.items.length > 0 ? found.items.map((it) => ({ ...it, id: generateId() })) : [createEmptyItem()]);
          setDiscountType(found.discountType);
          setDiscountValue(found.discountValue);
          setPaymentMethod(found.paymentMethod);
          setNotes(found.notes);
          return;
        }
      }

      // Default new invoice
      setInvoiceNumber(generateInvoiceNumber());
      setDate(todayStr);
      setCustomer((prev) => ({
        ...prev,
        bookingDate: todayStr,
        bookingTime: '10:00',
      }));
    }

    loadData();
  }, [editId, duplicateId]);

  /* ── derived calculations ── */
  const subtotal = calculateSubtotal(items);
  const discountAmount = calculateDiscount(subtotal, discountType, discountValue);
  const grandTotal = calculateGrandTotal(subtotal, discountAmount);

  /* ── validation ── */
  const isHotel = customer.customerType === 'hotel';
  const errors: Record<string, string> = {};
  if (!customer.name.trim()) {
    errors.name = isHotel ? 'Hotel name is required' : 'Customer name is required';
  }
  if (!isHotel) {
    if (!customer.country) errors.country = 'Country is required';
    if (!customer.phone?.trim()) errors.phone = 'WhatsApp / Phone is required';
  }
  if (customer.numberOfGuests < 1) errors.guests = 'At least 1 guest';
  if (!customer.bookingDate) errors.bookingDate = 'Booking date is required';
  if (items.every((i) => !i.description.trim())) errors.items = 'Add at least one item';

  const isFormValid = Object.keys(errors).length === 0;

  const markTouched = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  /* ── customer updaters ── */
  const updateCustomer = <K extends keyof CustomerInfo>(field: K, value: CustomerInfo[K]) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  /* ── item updaters ── */
  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'description') item.description = value as string;
      else if (field === 'quantity') item.quantity = Math.max(Number(value) || 0, 0);
      else if (field === 'unitPrice') item.unitPrice = Math.max(Number(value) || 0, 0);
      item.total = calculateItemTotal(item.quantity, item.unitPrice);
      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => setItems((prev) => [...prev, createEmptyItem()]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addPresetItem = (presetId: string) => {
    if (presetId === 'custom') {
      addItem();
      return;
    }
    const preset = presetItems.find((p) => p.id === presetId);
    if (!preset) return;
    const newItem: InvoiceItem = {
      id: generateId(),
      description: preset.description || preset.label,
      quantity: 1,
      unitPrice: preset.price,
      total: preset.price,
    };
    setItems((prev) => [...prev, newItem]);
  };

  /* ── submit ── */
  const handleGenerate = async () => {
    // Touch relevant fields to show errors
    const isHotel = customer.customerType === 'hotel';
    if (isHotel) {
      setTouched({ name: true, guests: true, bookingDate: true, items: true });
    } else {
      setTouched({ name: true, country: true, phone: true, guests: true, bookingDate: true, items: true });
    }
    if (!isFormValid || isSubmitting) {
      toast.error(
        isHotel
          ? 'Please enter the hotel name, booking date, and at least one item.'
          : 'Please fill in all required customer details and at least one item.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Fetch next atomic invoice number from Supabase if connected (only for new invoices)
      let finalInvoiceNo = invoiceNumber;
      if (!editId && isSupabaseConfigured()) {
        const dbInvoiceNo = await getNextInvoiceNumberFromSupabase();
        if (dbInvoiceNo) {
          finalInvoiceNo = dbInvoiceNo;
        }
      }

      const invoice: Invoice = {
        id: editId || generateId(),
        invoiceNumber: finalInvoiceNo,
        date,
        customer,
        items: items.filter((i) => i.description.trim()),
        subtotal,
        discountType,
        discountValue,
        discountAmount,
        grandTotal,
        paymentMethod,
        paymentStatus,
        notes,
        status: paymentStatus === 'paid' ? 'paid' : 'draft',
        createdAt: new Date().toISOString(),
        currency: 'USD',
      };

      // 2. Save into Supabase
      const supabaseResult = await saveInvoiceToSupabase(invoice);

      let targetId = invoice.id;
      if (supabaseResult) {
        targetId = supabaseResult.id;
        invoice.id = supabaseResult.id;
        invoice.invoiceNumber = supabaseResult.invoiceNumber;
      }

      // Also save locally as cache/fallback
      saveInvoice(invoice);
      setCurrentInvoice(invoice);

      toast.success(editId ? `Invoice ${finalInvoiceNo} updated!` : `Invoice ${finalInvoiceNo} created!`);

      // 3. Redirect to /invoice/[id]
      router.push(`/invoice/${targetId}`);
    } catch (err) {
      console.error('Failed to generate invoice:', err);
      toast.error(err, 'Failed to save invoice');
      setIsSubmitting(false);
    }
  };

  /* ── clear form ── */
  const clearForm = () => {
    setCustomer({ name: '', country: '', phone: '', numberOfGuests: 1, bookingDate: date, bookingTime: '10:00' });
    setItems([createEmptyItem()]);
    setDiscountType('fixed');
    setDiscountValue(0);
    setPaymentMethod('cash');
    setPaymentStatus('pending');
    setNotes('');
    setTouched({});
    setInvoiceNumber(generateInvoiceNumber());
    toast.info('Form cleared to defaults.');
  };

  /* ── loading ── */
  if (!isMounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#1B5E20] mb-1">
            {editId ? 'Edit Invoice' : 'New Invoice'}
          </h2>
          <p className="text-sm text-[#8D6E63]">
            <span className="font-mono text-[#1B5E20] font-semibold">{invoiceNumber}</span>
            {' · '}
            {date ? new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today'}
          </p>
        </div>
        <Link
          href="/settings"
          className="self-start sm:self-auto flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E8A317]/30 text-[#D4860B] text-xs font-semibold hover:bg-[#E8A317]/5 transition-all"
        >
          ⚙️ Settings & Presets
        </Link>
      </div>

      <div className="space-y-6">
        {/* ══════════════════════════════════════════════════════
            SECTION 1: CUSTOMER / HOTEL DETAILS
        ══════════════════════════════════════════════════════ */}
        <section className={CARD}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-base font-semibold text-[#3E2723] flex items-center gap-2.5">
              <span className={`${SECTION_ICON} bg-[#E8A317]/12`}>
                {isHotel ? '🏨' : '👤'}
              </span>
              <span>{isHotel ? 'Hotel / Partner Details' : 'Customer Details'}</span>
            </h3>

            {/* Bill Type Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[#F5F0E6] rounded-xl border border-[#E8A317]/20 w-fit self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  updateCustomer('customerType', 'guest');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  !isHotel
                    ? 'bg-[#1B5E20] text-white shadow-sm'
                    : 'text-[#6D4C41] hover:text-[#1B5E20]'
                }`}
              >
                <span>👤</span>
                <span>Guest / Individual</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  updateCustomer('customerType', 'hotel');
                  updateCustomer('country', '');
                  updateCustomer('phone', '');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  isHotel
                    ? 'bg-[#1B5E20] text-white shadow-sm'
                    : 'text-[#6D4C41] hover:text-[#1B5E20]'
                }`}
              >
                <span>🏨</span>
                <span>Hotel Bill</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
            {/* Name or Hotel Name */}
            <div className={isHotel ? 'sm:col-span-2' : ''}>
              <label className={LABEL}>
                {isHotel ? 'Hotel Name' : 'Name'} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                placeholder={isHotel ? 'e.g., W15 Weligama, Cape Weligama, Marriott Resort' : 'e.g., John Smith'}
                value={customer.name}
                onChange={(e) => updateCustomer('name', e.target.value)}
                onBlur={() => markTouched('name')}
                className={`${INPUT} ${touched.name && errors.name ? 'border-red-400 bg-red-50/40' : ''}`}
              />
              {touched.name && errors.name && (
                <p className="text-xs text-red-500 mt-1">{errors.name}</p>
              )}
            </div>

            {/* Country (Only for Guest, omitted for Hotel) */}
            {!isHotel && (
              <div>
                <label className={LABEL}>
                  Country <span className="text-red-400">*</span>
                </label>
                <div onBlur={() => markTouched('country')}>
                  <SearchableSelect
                    options={COUNTRIES}
                    value={customer.country || ''}
                    onChange={(val) => updateCustomer('country', val)}
                    placeholder="Search country…"
                  />
                </div>
                {touched.country && errors.country && (
                  <p className="text-xs text-red-500 mt-1">{errors.country}</p>
                )}
              </div>
            )}

            {/* WhatsApp / Phone (Only for Guest, omitted for Hotel) */}
            {!isHotel && (
              <div>
                <label className={LABEL}>
                  WhatsApp / Phone <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D6E63] text-sm">📱</span>
                  <input
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={customer.phone || ''}
                    onChange={(e) => updateCustomer('phone', e.target.value)}
                    onBlur={() => markTouched('phone')}
                    className={`${INPUT} pl-9 ${touched.phone && errors.phone ? 'border-red-400 bg-red-50/40' : ''}`}
                  />
                </div>
                {touched.phone && errors.phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.phone}</p>
                )}
              </div>
            )}

            {/* Number of Guests */}
            <div>
              <label className={LABEL}>Number of Guests</label>
              <input
                type="number"
                min="1"
                value={customer.numberOfGuests}
                onChange={(e) => updateCustomer('numberOfGuests', Math.max(1, Number(e.target.value) || 1))}
                onBlur={() => markTouched('guests')}
                className={`${INPUT} ${touched.guests && errors.guests ? 'border-red-400 bg-red-50/40' : ''}`}
              />
              {touched.guests && errors.guests && (
                <p className="text-xs text-red-500 mt-1">{errors.guests}</p>
              )}
            </div>

            {/* Booking Date */}
            <div>
              <label className={LABEL}>
                Booking Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={customer.bookingDate}
                onChange={(e) => updateCustomer('bookingDate', e.target.value)}
                onBlur={() => markTouched('bookingDate')}
                className={`${INPUT} ${touched.bookingDate && errors.bookingDate ? 'border-red-400 bg-red-50/40' : ''}`}
              />
              {touched.bookingDate && errors.bookingDate && (
                <p className="text-xs text-red-500 mt-1">{errors.bookingDate}</p>
              )}
            </div>

            {/* Booking Time */}
            <div>
              <label className={LABEL}>Booking Time</label>
              <input
                type="time"
                value={customer.bookingTime}
                onChange={(e) => updateCustomer('bookingTime', e.target.value)}
                className={INPUT}
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 2: COOKING CLASS ITEMS
        ══════════════════════════════════════════════════════ */}
        <section className={CARD}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <h3 className="text-base font-semibold text-[#3E2723] flex items-center gap-2.5">
              <span className={`${SECTION_ICON} bg-[#1B5E20]/10`}>🍛</span>
              Cooking Class Items
            </h3>

            {/* Quick-add preset dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs text-[#8D6E63] font-medium whitespace-nowrap">Quick add:</label>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) addPresetItem(e.target.value);
                  e.target.value = '';
                }}
                className="px-3 py-2 rounded-xl bg-[#FBF7F0] border border-[#E8A317]/25 text-sm text-[#3E2723] cursor-pointer hover:border-[#E8A317]/50 transition-colors"
              >
                <option value="">Select preset…</option>
                {presetItems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} ({currencySymbol}{p.price})
                  </option>
                ))}
                <option value="custom">✏️ Custom item</option>
              </select>
            </div>
          </div>

          {touched.items && errors.items && (
            <p className="text-xs text-red-500 mb-3 -mt-2">{errors.items}</p>
          )}

          {/* Desktop table header */}
          <div className="hidden sm:grid grid-cols-[1fr_80px_110px_110px_36px] gap-3 mb-2 px-1">
            <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest">Description</span>
            <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest">Qty</span>
            <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest">Price (USD)</span>
            <span className="text-[10px] font-bold text-[#8D6E63] uppercase tracking-widest text-right">Amount</span>
            <span />
          </div>

          {/* Item rows */}
          <div className="space-y-2.5">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_80px_110px_110px_36px] gap-3 p-3 sm:p-2.5 rounded-xl bg-[#FBF7F0]/70 border border-[#1B5E20]/5 hover:border-[#1B5E20]/15 transition-all duration-200 group"
              >
                {/* Description */}
                <div>
                  <label className="sm:hidden block text-[10px] font-bold text-[#8D6E63] mb-1 uppercase tracking-widest">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Rice & Curries Class"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/40"
                  />
                </div>
                {/* Qty */}
                <div>
                  <label className="sm:hidden block text-[10px] font-bold text-[#8D6E63] mb-1 uppercase tracking-widest">
                    Qty
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-[#3E2723] text-center"
                  />
                </div>
                {/* Price */}
                <div>
                  <label className="sm:hidden block text-[10px] font-bold text-[#8D6E63] mb-1 uppercase tracking-widest">
                    Price (USD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                    className="w-full px-2 py-2 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-[#3E2723]"
                    placeholder="0.00"
                  />
                </div>
                {/* Amount */}
                <div className="flex items-center sm:justify-end">
                  <label className="sm:hidden block text-[10px] font-bold text-[#8D6E63] mr-2 uppercase tracking-widest">
                    Amount
                  </label>
                  <span className="text-sm font-bold text-[#1B5E20] tabular-nums">
                    {formatCurrency(item.total)}
                  </span>
                </div>
                {/* Remove */}
                <div className="flex items-center justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-20 disabled:cursor-not-allowed flex items-center justify-center text-base sm:opacity-0 sm:group-hover:opacity-100"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add item button */}
          <button
            type="button"
            onClick={addItem}
            className="mt-4 w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border-2 border-dashed border-[#1B5E20]/20 text-[#1B5E20] text-sm font-medium hover:border-[#1B5E20]/40 hover:bg-[#1B5E20]/5 transition-all duration-200"
          >
            <span className="text-lg leading-none">+</span>
            Add Custom Item
          </button>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 3: TOTALS
        ══════════════════════════════════════════════════════ */}
        <section className={CARD}>
          <h3 className="text-base font-semibold text-[#3E2723] mb-5 flex items-center gap-2.5">
            <span className={`${SECTION_ICON} bg-[#1B5E20]/10`}>💰</span>
            Totals
          </h3>

          <div className="max-w-sm ml-auto space-y-3">
            {/* Subtotal */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6D4C41] font-medium">Subtotal</span>
              <span className="font-semibold text-[#3E2723] tabular-nums">{formatCurrency(subtotal)}</span>
            </div>

            {/* Discount */}
            <div className="flex items-center justify-between text-sm gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[#6D4C41] font-medium">Discount</span>
                {/* Toggle: $ / % */}
                <div className="flex items-center rounded-lg bg-[#F5F0E6] p-0.5">
                  <button
                    type="button"
                    onClick={() => setDiscountType('fixed')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                      discountType === 'fixed'
                        ? 'bg-white text-[#1B5E20] shadow-sm'
                        : 'text-[#8D6E63] hover:text-[#3E2723]'
                    }`}
                  >
                    $
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('percentage')}
                    className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all ${
                      discountType === 'percentage'
                        ? 'bg-white text-[#1B5E20] shadow-sm'
                        : 'text-[#8D6E63] hover:text-[#3E2723]'
                    }`}
                  >
                    %
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {discountType === 'fixed' && (
                  <span className="text-xs text-[#8D6E63]">$</span>
                )}
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                  step={discountType === 'percentage' ? 1 : 0.01}
                  value={discountValue || ''}
                  onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
                  className="w-20 px-2 py-1.5 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-right text-[#3E2723] font-medium"
                  placeholder="0"
                />
                {discountType === 'percentage' && (
                  <span className="text-xs text-[#8D6E63]">%</span>
                )}
              </div>
            </div>

            {discountAmount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#8D6E63]">Discount amount</span>
                <span className="font-medium text-red-500 tabular-nums">-{formatCurrency(discountAmount)}</span>
              </div>
            )}

            {/* Grand Total */}
            <div className="border-t-2 border-[#1B5E20]/15 pt-3 mt-1">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-[#1B5E20]">Total</span>
                <span className="text-2xl font-extrabold text-[#1B5E20] tabular-nums">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            SECTION 4: PAYMENT
        ══════════════════════════════════════════════════════ */}
        <section className={CARD}>
          <h3 className="text-base font-semibold text-[#3E2723] mb-5 flex items-center gap-2.5">
            <span className={`${SECTION_ICON} bg-[#E8A317]/12`}>💳</span>
            Payment
          </h3>

          <div className="space-y-5">
            {/* Payment Method */}
            <div>
              <label className={LABEL}>Payment Method</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {(
                  [
                    { value: 'cash', label: 'Cash', icon: '💵' },
                    { value: 'bank_transfer', label: 'Bank Transfer', icon: '🏦' },
                    { value: 'online', label: 'Online Payment', icon: '🌐' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 text-sm font-medium ${
                      paymentMethod === opt.value
                        ? 'border-[#1B5E20] bg-[#1B5E20]/5 text-[#1B5E20]'
                        : 'border-[#1B5E20]/10 text-[#6D4C41] hover:border-[#1B5E20]/25 hover:bg-[#FBF7F0]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={opt.value}
                      checked={paymentMethod === opt.value}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="sr-only"
                    />
                    <span>{opt.icon}</span>
                    {opt.label}
                    {paymentMethod === opt.value && (
                      <svg className="w-4 h-4 text-[#1B5E20] ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Payment Status */}
            <div>
              <label className={LABEL}>Status</label>
              <div className="flex gap-2 mt-1">
                {(
                  [
                    { value: 'paid', label: 'Paid', color: 'emerald' },
                    { value: 'pending', label: 'Pending', color: 'amber' },
                  ] as const
                ).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 cursor-pointer transition-all duration-200 text-sm font-semibold ${
                      paymentStatus === opt.value
                        ? opt.value === 'paid'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'border-[#1B5E20]/10 text-[#8D6E63] hover:border-[#1B5E20]/20'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentStatus"
                      value={opt.value}
                      checked={paymentStatus === opt.value}
                      onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                      className="sr-only"
                    />
                    {paymentStatus === opt.value && (
                      <span className="text-xs">
                        {opt.value === 'paid' ? '✓' : '⏳'}
                      </span>
                    )}
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className={LABEL}>Notes</label>
              <textarea
                rows={3}
                placeholder="Thank you for choosing Priya Dream Kitchen! We hope you enjoy the cooking experience 🙏"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${INPUT} resize-none`}
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            ACTION BUTTONS
        ══════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 pb-6">
          <button
            type="button"
            onClick={clearForm}
            className="px-6 py-3 rounded-xl border-2 border-[#1B5E20]/15 text-[#6D4C41] text-sm font-semibold hover:bg-[#F5F0E6] hover:border-[#1B5E20]/25 transition-all duration-200"
          >
            Clear Form
          </button>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!isFormValid || isSubmitting}
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-sm font-bold shadow-lg shadow-[#1B5E20]/25 hover:shadow-xl hover:shadow-[#1B5E20]/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg flex items-center gap-2 justify-center"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <span>{editId ? 'Update Invoice' : 'Generate Invoice'}</span>
                <span className="text-base">→</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function InvoiceFormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InvoiceFormContent />
    </Suspense>
  );
}
