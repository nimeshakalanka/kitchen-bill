'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Invoice, InvoiceItem, CustomerInfo } from '@/lib/types';
import { generateInvoiceNumber, generateId } from '@/lib/invoice-number';
import {
  calculateItemTotal,
  calculateSubtotal,
  calculateTax,
  calculateGrandTotal,
  formatCurrency,
} from '@/lib/calculations';
import { setCurrentInvoice, saveInvoice } from '@/lib/storage';

function createEmptyItem(): InvoiceItem {
  return {
    id: generateId(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  };
}

export default function InvoiceFormPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');

  const [customer, setCustomer] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const [items, setItems] = useState<InvoiceItem[]>([createEmptyItem()]);
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);

  useEffect(() => {
    setMounted(true);
    setInvoiceNumber(generateInvoiceNumber());
    const today = new Date();
    setDate(today.toISOString().split('T')[0]);
    const due = new Date(today);
    due.setDate(due.getDate() + 7);
    setDueDate(due.toISOString().split('T')[0]);
  }, []);

  // Derived calculations
  const subtotal = calculateSubtotal(items);
  const taxAmount = calculateTax(subtotal, taxRate);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount, discount);

  const updateCustomer = (field: keyof CustomerInfo, value: string) => {
    setCustomer((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'description') {
        item.description = value as string;
      } else if (field === 'quantity') {
        item.quantity = Number(value) || 0;
      } else if (field === 'unitPrice') {
        item.unitPrice = Number(value) || 0;
      }

      item.total = calculateItemTotal(item.quantity, item.unitPrice);
      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyItem()]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePreview = () => {
    const invoice: Invoice = {
      id: generateId(),
      invoiceNumber,
      date,
      dueDate,
      customer,
      items,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      grandTotal,
      notes,
      status: 'draft',
      createdAt: new Date().toISOString(),
      currency,
    };

    saveInvoice(invoice);
    setCurrentInvoice(invoice);
    router.push(`/invoice?id=${invoice.id}`);
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1B5E20] mb-1">Create New Invoice</h2>
        <p className="text-sm text-[#8D6E63]">Fill in the details below to generate a professional invoice</p>
      </div>

      <div className="space-y-6">
        {/* Invoice Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
          <h3 className="text-base font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#1B5E20]/10 flex items-center justify-center text-sm">📄</span>
            Invoice Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                readOnly
                className="w-full px-3 py-2.5 rounded-xl bg-[#F5F0E6] border border-[#1B5E20]/10 text-sm font-mono text-[#3E2723] cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Invoice Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723]"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="LKR">LKR (Rs)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
          <h3 className="text-base font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#E8A317]/15 flex items-center justify-center text-sm">👤</span>
            Customer Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Customer Name *</label>
              <input
                type="text"
                placeholder="e.g., John Smith"
                value={customer.name}
                onChange={(e) => updateCustomer('name', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Email</label>
              <input
                type="email"
                placeholder="john@example.com"
                value={customer.email}
                onChange={(e) => updateCustomer('email', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Phone</label>
              <input
                type="tel"
                placeholder="+94 77 123 4567"
                value={customer.phone}
                onChange={(e) => updateCustomer('phone', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/50"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#6D4C41] mb-1.5">Address</label>
              <input
                type="text"
                placeholder="123 Main Street, City"
                value={customer.address}
                onChange={(e) => updateCustomer('address', e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/50"
              />
            </div>
          </div>
        </div>

        {/* Line Items Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
          <h3 className="text-base font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#1B5E20]/10 flex items-center justify-center text-sm">🧾</span>
            Invoice Items
          </h3>

          {/* Table Header */}
          <div className="hidden sm:grid grid-cols-[1fr_100px_120px_120px_40px] gap-3 mb-3 px-1">
            <span className="text-xs font-semibold text-[#6D4C41] uppercase tracking-wider">Description</span>
            <span className="text-xs font-semibold text-[#6D4C41] uppercase tracking-wider">Qty</span>
            <span className="text-xs font-semibold text-[#6D4C41] uppercase tracking-wider">Unit Price</span>
            <span className="text-xs font-semibold text-[#6D4C41] uppercase tracking-wider text-right">Total</span>
            <span></span>
          </div>

          {/* Items */}
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_100px_120px_120px_40px] gap-3 p-3 sm:p-2 rounded-xl bg-[#FBF7F0]/80 border border-[#1B5E20]/5 hover:border-[#1B5E20]/15 transition-colors"
              >
                <div>
                  <label className="sm:hidden block text-xs font-medium text-[#6D4C41] mb-1">Description</label>
                  <input
                    type="text"
                    placeholder="e.g., Sri Lankan Cooking Class (Full Day)"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/40"
                  />
                </div>
                <div>
                  <label className="sm:hidden block text-xs font-medium text-[#6D4C41] mb-1">Qty</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-[#3E2723] text-center"
                  />
                </div>
                <div>
                  <label className="sm:hidden block text-xs font-medium text-[#6D4C41] mb-1">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-[#3E2723]"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center">
                  <label className="sm:hidden block text-xs font-medium text-[#6D4C41] mb-1 mr-2">Total</label>
                  <span className="text-sm font-semibold text-[#1B5E20] sm:text-right sm:w-full sm:block">
                    {formatCurrency(item.total, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-end sm:justify-center">
                  <button
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-lg"
                    title="Remove item"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addItem}
            className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[#1B5E20]/20 text-[#1B5E20] text-sm font-medium hover:border-[#1B5E20]/40 hover:bg-[#1B5E20]/5 transition-all duration-200"
          >
            <span className="text-lg leading-none">+</span>
            Add Item
          </button>
        </div>

        {/* Summary & Notes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Notes */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
            <h3 className="text-base font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#E8A317]/15 flex items-center justify-center text-sm">💬</span>
              Notes
            </h3>
            <textarea
              rows={4}
              placeholder="Thank you for choosing Priya Dream Kitchen! We hope you enjoyed the experience."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] placeholder:text-[#8D6E63]/40 resize-none"
            />
          </div>

          {/* Totals */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
            <h3 className="text-base font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-[#1B5E20]/10 flex items-center justify-center text-sm">💰</span>
              Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6D4C41]">Subtotal</span>
                <span className="font-medium text-[#3E2723]">{formatCurrency(subtotal, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="text-[#6D4C41]">Tax Rate (%)</span>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={taxRate || ''}
                  onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-right text-[#3E2723]"
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#6D4C41]">Tax Amount</span>
                <span className="font-medium text-[#3E2723]">{formatCurrency(taxAmount, currency)}</span>
              </div>
              <div className="flex items-center justify-between text-sm gap-3">
                <span className="text-[#6D4C41]">Discount</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 rounded-lg bg-white border border-[#1B5E20]/10 text-sm text-right text-[#3E2723]"
                  placeholder="0.00"
                />
              </div>
              <div className="border-t border-[#1B5E20]/10 pt-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-[#1B5E20]">Grand Total</span>
                  <span className="text-xl font-bold text-[#1B5E20]">{formatCurrency(grandTotal, currency)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 pb-4">
          <button
            onClick={() => {
              setCustomer({ name: '', email: '', phone: '', address: '' });
              setItems([createEmptyItem()]);
              setTaxRate(0);
              setDiscount(0);
              setNotes('');
              setInvoiceNumber(generateInvoiceNumber());
            }}
            className="px-6 py-3 rounded-xl border-2 border-[#1B5E20]/20 text-[#4E342E] text-sm font-semibold hover:bg-[#F5F0E6] transition-all duration-200"
          >
            Clear Form
          </button>
          <button
            onClick={handlePreview}
            disabled={!customer.name || items.every((i) => !i.description)}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-sm font-semibold shadow-lg shadow-[#1B5E20]/25 hover:shadow-xl hover:shadow-[#1B5E20]/30 hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
          >
            Preview & Generate Invoice →
          </button>
        </div>
      </div>
    </div>
  );
}
