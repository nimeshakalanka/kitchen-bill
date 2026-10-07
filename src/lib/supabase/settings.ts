import { createClient } from './client';
import { isSupabaseConfigured } from './invoices';
import { BUSINESS_CONFIG } from '@/lib/config';
import { DEFAULT_PRESETS } from '@/lib/presets';

export interface PresetConfigItem {
  id: string;
  label: string;
  description: string;
  price: number;
}

export interface AppSettings {
  business_whatsapp: string;
  preset_items: PresetConfigItem[];
  currency_symbol: string;
  invoice_prefix: string;
  next_invoice_number?: number;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  business_whatsapp: BUSINESS_CONFIG.whatsapp || '+94 77 123 4567',
  preset_items: DEFAULT_PRESETS.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    price: p.defaultPrice,
  })),
  currency_symbol: '$',
  invoice_prefix: 'PDK',
  next_invoice_number: 1,
};

const LOCAL_SETTINGS_KEY = 'pdk_app_settings';

/**
 * Fetch settings from Supabase (with localStorage fallback)
 */
export async function fetchAppSettings(): Promise<AppSettings> {
  // Check localStorage first as fast fallback
  let localFallback: AppSettings = DEFAULT_APP_SETTINGS;
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_SETTINGS_KEY);
      if (stored) {
        localFallback = { ...DEFAULT_APP_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      // ignore JSON parse error
    }
  }

  if (!isSupabaseConfigured()) {
    return localFallback;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      return localFallback;
    }

    const loadedSettings: AppSettings = {
      business_whatsapp: data.business_whatsapp || localFallback.business_whatsapp,
      preset_items: Array.isArray(data.preset_items) && data.preset_items.length > 0
        ? data.preset_items
        : localFallback.preset_items,
      currency_symbol: data.currency_symbol || '$',
      invoice_prefix: data.invoice_prefix || 'PDK',
      next_invoice_number: data.next_invoice_number ?? 1,
    };

    // Cache locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(loadedSettings));
    }

    return loadedSettings;
  } catch (err) {
    console.warn('Failed to fetch settings from Supabase, using fallback:', err);
    return localFallback;
  }
}

/**
 * Save settings to Supabase (and cache locally)
 */
export async function saveAppSettings(settings: AppSettings): Promise<boolean> {
  // Always update localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
    // Also update legacy preset prices in storage
    const presetOverrides: Record<string, number> = {};
    settings.preset_items.forEach((item) => {
      presetOverrides[item.id] = item.price;
    });
    localStorage.setItem('pdk_preset_settings', JSON.stringify(presetOverrides));
  }

  if (!isSupabaseConfigured()) {
    return true;
  }

  try {
    const supabase = createClient();
    const payload = {
      id: 1,
      business_whatsapp: settings.business_whatsapp,
      preset_items: settings.preset_items,
      currency_symbol: settings.currency_symbol,
      invoice_prefix: settings.invoice_prefix,
    };

    const { error } = await supabase
      .from('settings')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('Supabase settings update error:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Save settings error:', err);
    return false;
  }
}
