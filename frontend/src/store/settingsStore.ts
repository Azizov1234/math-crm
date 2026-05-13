import { create } from 'zustand';

interface Settings {
  academyName: string;
  logoUrl: string;
  phone: string;
  address: string;
  description: string;
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  academyName: 'Matematika Academy',
  logoUrl: '',
  phone: '+998 90 123 45 67',
  address: 'Toshkent, Chilonzor tumani, 7-kvartal',
  description: 'Premium matematika ta\'lim markazi',
};

export const useSettingsStore = create<SettingsStore>((set) => ({
  settings: defaultSettings,
  updateSettings: (updates) =>
    set((state) => ({ settings: { ...state.settings, ...updates } })),
}));
