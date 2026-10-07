'use client';

import { useState, useEffect } from 'react';
import {
  AppSettings,
  PresetConfigItem,
  fetchAppSettings,
  saveAppSettings,
} from '@/lib/supabase/settings';
import { useToast } from '@/context/ToastContext';

export default function SettingsPage() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await fetchAppSettings();
        setSettings(data);
      } catch (err) {
        console.error('Error loading settings:', err);
        toast.error(err, 'Failed to Load Settings');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const ok = await saveAppSettings(settings);
      if (ok) {
        setSaveSuccess(true);
        toast.success('Settings and preset prices saved successfully!');
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        const msg = 'Failed to save to Supabase. Saved locally as fallback.';
        setErrorMessage(msg);
        toast.warning(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while saving.';
      setErrorMessage(msg);
      toast.error(err, 'Save Failed');
    } finally {
      setSaving(false);
    }
  };

  const updatePresetItem = (
    index: number,
    field: keyof PresetConfigItem,
    value: string | number
  ) => {
    if (!settings) return;
    const updated = [...settings.preset_items];
    updated[index] = {
      ...updated[index],
      [field]: field === 'price' ? Math.max(0, Number(value) || 0) : value,
    };
    setSettings({ ...settings, preset_items: updated });
  };

  const addPresetItem = () => {
    if (!settings) return;
    const newItem: PresetConfigItem = {
      id: `preset-${Date.now()}`,
      label: 'New Class Preset',
      description: 'Cooking class description',
      price: 25,
    };
    setSettings({
      ...settings,
      preset_items: [...settings.preset_items, newItem],
    });
  };

  const removePresetItem = (index: number) => {
    if (!settings || settings.preset_items.length <= 1) return;
    setSettings({
      ...settings,
      preset_items: settings.preset_items.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-3 border-[#1B5E20] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fade-in">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-[#1B5E20] mb-1">Settings</h2>
        <p className="text-sm text-[#8D6E63]">
          Configure your business WhatsApp, cooking class presets, currency, and invoice prefix in Supabase.
        </p>
      </div>

      {/* Notifications */}
      {saveSuccess && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span className="font-medium">Settings successfully saved to Supabase!</span>
          </div>
          <button onClick={() => setSaveSuccess(false)} className="text-emerald-600 hover:text-emerald-900 font-bold">
            ×
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-amber-600 hover:text-amber-900 font-bold">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Business Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
          <h3 className="text-base font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#25D366]/15 text-[#128C7E] flex items-center justify-center text-sm">
              📱
            </span>
            Business WhatsApp & Contact
          </h3>
          <div className="max-w-md">
            <label className="block text-xs font-semibold text-[#6D4C41] mb-1.5 uppercase tracking-wide">
              Business WhatsApp Number
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📱</span>
              <input
                type="text"
                value={settings.business_whatsapp}
                onChange={(e) => setSettings({ ...settings, business_whatsapp: e.target.value })}
                placeholder="+94 77 123 4567"
                required
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] font-mono focus:border-[#1B5E20]"
              />
            </div>
            <p className="text-xs text-[#8D6E63] mt-1.5">
              This number is displayed on invoice footers and used for quick business communication.
            </p>
          </div>
        </div>

        {/* Section 2: Invoice & Currency Formatting */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
          <h3 className="text-base font-semibold text-[#3E2723] mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#E8A317]/15 text-[#D4860B] flex items-center justify-center text-sm">
              ⚙️
            </span>
            Invoice Prefix & Currency
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
            <div>
              <label className="block text-xs font-semibold text-[#6D4C41] mb-1.5 uppercase tracking-wide">
                Invoice Prefix
              </label>
              <input
                type="text"
                value={settings.invoice_prefix}
                onChange={(e) => setSettings({ ...settings, invoice_prefix: e.target.value.toUpperCase() })}
                placeholder="PDK"
                maxLength={6}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] font-mono font-bold uppercase"
              />
              <p className="text-xs text-[#8D6E63] mt-1">
                E.g. &ldquo;PDK&rdquo; produces PDK-0001
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#6D4C41] mb-1.5 uppercase tracking-wide">
                Currency Symbol
              </label>
              <input
                type="text"
                value={settings.currency_symbol}
                onChange={(e) => setSettings({ ...settings, currency_symbol: e.target.value })}
                placeholder="$"
                maxLength={4}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#1B5E20]/15 text-sm text-[#3E2723] font-semibold"
              />
              <p className="text-xs text-[#8D6E63] mt-1">
                Currency display (e.g. $, USD, LKR)
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Preset Items & Prices */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#1B5E20]/8 p-5 sm:p-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-[#3E2723] flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[#1B5E20]/10 text-[#1B5E20] flex items-center justify-center text-sm">
                  🍛
                </span>
                Cooking Class Preset Items
              </h3>
              <p className="text-xs text-[#8D6E63] mt-0.5">
                Quick-add dropdown items on the new invoice form.
              </p>
            </div>
            <button
              type="button"
              onClick={addPresetItem}
              className="px-3 py-1.5 rounded-lg border border-[#1B5E20]/25 text-[#1B5E20] text-xs font-semibold hover:bg-[#1B5E20]/5 transition-all"
            >
              + Add Preset
            </button>
          </div>

          <div className="space-y-3">
            {settings.preset_items.map((preset, index) => (
              <div
                key={preset.id || index}
                className="p-3.5 rounded-xl bg-[#FBF7F0] border border-[#1B5E20]/10 grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_100px_36px] gap-2.5 items-center"
              >
                <div>
                  <label className="block sm:hidden text-[10px] font-bold text-gray-500 uppercase">Label</label>
                  <input
                    type="text"
                    value={preset.label}
                    onChange={(e) => updatePresetItem(index, 'label', e.target.value)}
                    placeholder="Class Name"
                    required
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#1B5E20]/15 text-xs text-[#3E2723] font-medium"
                  />
                </div>

                <div>
                  <label className="block sm:hidden text-[10px] font-bold text-gray-500 uppercase">Description</label>
                  <input
                    type="text"
                    value={preset.description}
                    onChange={(e) => updatePresetItem(index, 'description', e.target.value)}
                    placeholder="Class Description"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-[#1B5E20]/15 text-xs text-[#3E2723]"
                  />
                </div>

                <div>
                  <label className="block sm:hidden text-[10px] font-bold text-gray-500 uppercase">Price</label>
                  <div className="flex items-center gap-1 bg-white border border-[#1B5E20]/15 rounded-lg px-2 py-1">
                    <span className="text-xs text-[#8D6E63] font-semibold">{settings.currency_symbol}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={preset.price}
                      onChange={(e) => updatePresetItem(index, 'price', e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full text-xs text-[#3E2723] text-right font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end sm:justify-center">
                  <button
                    type="button"
                    onClick={() => removePresetItem(index)}
                    disabled={settings.preset_items.length <= 1}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-sm disabled:opacity-20"
                    title="Remove Preset"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-sm font-bold shadow-lg shadow-[#1B5E20]/25 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving Settings…' : 'Save Settings to Supabase'}
          </button>
        </div>
      </form>
    </div>
  );
}
