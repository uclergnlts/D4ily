export const MAP_VIEWBOX = {
    // Equirectangular projection: x=longitude, y=-latitude
    // Not used by Globe but kept for reference
    x: -130,
    y: -72,
    width: 185,
    height: 45,
};

export interface CountryMeta {
    code: string;
    name: string;
    flag: string;
    labelX: number; // longitude
    labelY: number; // -latitude (or latitude for 3D globe usage)
}

export const COUNTRIES: CountryMeta[] = [
    { code: 'us', name: 'ABD', flag: '🇺🇸', labelX: -98, labelY: 39 },
    { code: 'uk', name: 'İngiltere', flag: '🇬🇧', labelX: -2, labelY: 54 },
    { code: 'fr', name: 'Fransa', flag: '🇫🇷', labelX: 2.5, labelY: 46.5 },
    { code: 'de', name: 'Almanya', flag: '🇩🇪', labelX: 10.5, labelY: 51 },
    { code: 'es', name: 'İspanya', flag: '🇪🇸', labelX: -3.5, labelY: 40 },
    { code: 'it', name: 'İtalya', flag: '🇮🇹', labelX: 12, labelY: 42.5 },
    { code: 'tr', name: 'Türkiye', flag: '🇹🇷', labelX: 35, labelY: 39 },
    { code: 'ru', name: 'Rusya', flag: '🇷🇺', labelX: 90, labelY: 60 }, // Adjusted Center
    { code: 'cn', name: 'Çin', flag: '🇨🇳', labelX: 105, labelY: 35 },
    { code: 'br', name: 'Brezilya', flag: '🇧🇷', labelX: -52, labelY: -10 },
    { code: 'in', name: 'Hindistan', flag: '🇮🇳', labelX: 77, labelY: 22 },
    { code: 'au', name: 'Avustralya', flag: '🇦🇺', labelX: 133, labelY: -25 },
    { code: 'jp', name: 'Japonya', flag: '🇯🇵', labelX: 138, labelY: 36 },
    { code: 'ca', name: 'Kanada', flag: '🇨🇦', labelX: -106, labelY: 56 },
    { code: 'mx', name: 'Meksika', flag: '🇲🇽', labelX: -102, labelY: 23 },
    { code: 'kr', name: 'Güney Kore', flag: '🇰🇷', labelX: 128, labelY: 36 },
];

export const THEME = {
    light: {
        bg: '#f8fafc',
        countryStroke: '#94a3b8',
        labelColor: '#334155',
    },
    dark: {
        bg: '#09090b',
        countryStroke: '#3f3f46',
        labelColor: '#d4d4d8',
    },
};

export const MARKER_THEME = {
    light: {
        bg: '#6366f1',         // indigo-500
        text: '#ffffff',
        ring: '#818cf8',       // indigo-400
        selectedBg: '#4f46e5', // indigo-600
        selectedRing: '#a5b4fc', // indigo-300
    },
    dark: {
        bg: '#818cf8',         // indigo-400
        text: '#1e1b4b',       // indigo-950
        ring: '#6366f1',       // indigo-500
        selectedBg: '#a5b4fc', // indigo-300
        selectedRing: '#c7d2fe', // indigo-200
    },
};

export function getCIIColor(level?: 'low' | 'medium' | 'high'): string {
    switch (level) {
        case 'low': return '#10b981';
        case 'medium': return '#f59e0b';
        case 'high': return '#ef4444';
        default: return '#a1a1aa';
    }
}

export function getCIIFillTint(level?: 'low' | 'medium' | 'high', isDark = false): string {
    if (isDark) {
        switch (level) {
            case 'low': return '#065f46';
            case 'medium': return '#78350f';
            case 'high': return '#7f1d1d';
            default: return '#27272a';
        }
    }
    switch (level) {
        case 'low': return '#d1fae5';
        case 'medium': return '#fef3c7';
        case 'high': return '#fee2e2';
        default: return '#e2e8f0';
    }
}
