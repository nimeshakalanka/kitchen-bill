'use client';

import { useState } from 'react';
import { DEFAULT_PRESETS, getPresetPrices, savePresetPrices, PresetSettings } from '@/lib/presets';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function SettingsModalDialog({ onClose }: { onClose: () => void }) {
  const [prices, setPrices] = useState<PresetSettings>(() => getPresetPrices());

  const handleSave = () => {
    savePresetPrices(prices);
    onClose();
  };

  const updatePrice = (id: string, value: string) => {
    setPrices((prev) => ({
      ...prev,
      [id]: Number(value) || 0,
    }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-scale-in">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-[#E8A317]/15 flex items-center justify-center text-base">⚙️</span>
            <h3 className="text-lg font-bold text-[#3E2723]">Preset Prices</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-[#F5F0E6] flex items-center justify-center text-[#8D6E63] hover:text-[#3E2723] transition-colors text-lg"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-[#8D6E63] mb-5">
          Customize the default prices for your cooking class presets. These prices will be used when
          quick-adding items to an invoice.
        </p>

        <div className="space-y-3">
          {DEFAULT_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="flex items-center justify-between gap-4 p-3 rounded-xl bg-[#FBF7F0] border border-[#1B5E20]/5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#3E2723]">{preset.label}</p>
                <p className="text-xs text-[#8D6E63] truncate">{preset.description}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs text-[#8D6E63] font-medium">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={prices[preset.id] ?? preset.defaultPrice}
                  onChange={(e) => updatePrice(preset.id, e.target.value)}
                  className="w-20 px-2 py-1.5 rounded-lg bg-white border border-[#1B5E20]/15 text-sm text-right text-[#3E2723] font-medium"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border-2 border-[#1B5E20]/15 text-[#4E342E] text-sm font-medium hover:bg-[#F5F0E6] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#1B5E20] to-[#2E7D32] text-white text-sm font-semibold shadow-lg shadow-[#1B5E20]/20 hover:shadow-xl transition-all"
          >
            Save Prices
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  if (!isOpen) return null;
  return <SettingsModalDialog onClose={onClose} />;
}
