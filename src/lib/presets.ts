// Cooking class item presets for quick-add functionality
// Prices can be customized via the Settings panel (stored in localStorage)

export interface PresetItem {
  id: string;
  label: string;
  description: string;
  defaultPrice: number;
}

export const DEFAULT_PRESETS: PresetItem[] = [
  {
    id: 'rice-7-curries',
    label: 'Rice + 7 Curries',
    description: 'Sri Lankan Rice & 7 Curries Cooking Class',
    defaultPrice: 35,
  },
  {
    id: 'chicken-kottu',
    label: 'Chicken Kottu Class',
    description: 'Chicken Kottu Roti Cooking Class',
    defaultPrice: 30,
  },
  {
    id: 'extra-guest',
    label: 'Extra Guest',
    description: 'Additional Guest Fee',
    defaultPrice: 15,
  },
];

const PRESET_SETTINGS_KEY = 'pdk_preset_settings';

export interface PresetSettings {
  [presetId: string]: number; // presetId -> custom price
}

/**
 * Get the current preset prices (defaults merged with user overrides)
 */
export function getPresetPrices(): PresetSettings {
  const defaults: PresetSettings = {};
  DEFAULT_PRESETS.forEach((p) => {
    defaults[p.id] = p.defaultPrice;
  });

  if (typeof window === 'undefined') return defaults;

  try {
    const stored = localStorage.getItem(PRESET_SETTINGS_KEY);
    if (stored) {
      const overrides = JSON.parse(stored) as PresetSettings;
      return { ...defaults, ...overrides };
    }
  } catch {
    // ignore parse errors
  }

  return defaults;
}

/**
 * Save custom preset prices
 */
export function savePresetPrices(prices: PresetSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PRESET_SETTINGS_KEY, JSON.stringify(prices));
}

/**
 * Get the price for a specific preset
 */
export function getPresetPrice(presetId: string): number {
  const prices = getPresetPrices();
  return prices[presetId] ?? 0;
}
