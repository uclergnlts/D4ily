import { create } from 'zustand';

export type CountryCode = 'tr' | 'us' | 'de' | 'uk' | 'fr' | 'es' | 'it' | 'ru';

interface AppState {
    selectedCountry: CountryCode;
    setSelectedCountry: (country: CountryCode) => void;
    isSideMenuOpen: boolean;
    toggleSideMenu: () => void;
}

export const useAppStore = create<AppState>((set) => ({
    selectedCountry: 'tr',
    setSelectedCountry: (country) => set({ selectedCountry: country }),
    isSideMenuOpen: false,
    toggleSideMenu: () => set((state) => ({ isSideMenuOpen: !state.isSideMenuOpen })),
}));
