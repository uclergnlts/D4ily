/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DMSans_400Regular'],
        'sans-medium': ['DMSans_500Medium'],
        'sans-semibold': ['DMSans_600SemiBold'],
        'sans-bold': ['DMSans_700Bold'],
        'sans-black': ['DMSans_900Black'],
        display: ['Syne_700Bold'],
        'display-extrabold': ['Syne_800ExtraBold'],
      },
      fontSize: {
        'display-2xl': ['34px', { lineHeight: '42px', letterSpacing: '-0.7' }], // Article Titles
        'display-xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.56' }],  // Section Headers
        'display-lg': ['24px', { lineHeight: '30px', letterSpacing: '-0.24' }],  // Card Titles
        'body-lg': ['16px', { lineHeight: '24px' }],   // Main Content
        'body-md': ['14px', { lineHeight: '21px' }],   // Secondary Content
        'body-sm': ['13px', { lineHeight: '18px' }],   // Meta / Captions
        'body-xs': ['11px', { lineHeight: '14px' }],   // Labels / Tags
      },
      colors: {
        primary: {
          DEFAULT: '#006FFF',
          50: '#E6F0FF',
          100: '#CCE2FF',
          200: '#99C4FF',
          300: '#66A7FF',
          400: '#3389FF',
          500: '#006FFF',
          600: '#0059CC',
          700: '#004399',
          800: '#002C66',
          900: '#001633',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#18181b', // Zinc-900
          subtle: '#f4f4f5', // Zinc-100
          'subtle-dark': '#27272a', // Zinc-800
        },
        // Editorial Stance Colors
        stance: {
          critical: '#6366f1', // Indigo-500
          neutral: '#71717a',  // Zinc-500
          favorable: '#f59e0b', // Amber-500
        }
      },
      spacing: {
        // Standard 4px grid
        '4.5': '18px',
      },
    },
  },
  plugins: [],
}
