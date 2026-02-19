import { create } from 'zustand';
import { Appearance } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
    mode: ThemeMode;
    setMode: (mode: ThemeMode) => void;
    // Helper to get the actual active color scheme e.g. 'light' or 'dark'
    activeScheme: 'light' | 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
    mode: 'light',
    setMode: (mode) => set({ mode }),
    get activeScheme() {
        const { mode } = get();
        if (mode === 'system') {
            return Appearance.getColorScheme() || 'light';
        }
        return mode;
    },
}));
