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
        display: ['DMSans_700Bold'],
        'display-extrabold': ['DMSans_900Black'],
      },
      fontSize: {
        // Relaxed letter spacing for better mobile readability
        'display-3xl': ['40px', { lineHeight: '48px', letterSpacing: '-0.5px' }],
        'display-2xl': ['34px', { lineHeight: '42px', letterSpacing: '-0.4px' }],
        'display-xl': ['28px', { lineHeight: '34px', letterSpacing: '-0.3px' }],
        'display-lg': ['24px', { lineHeight: '30px', letterSpacing: '-0.2px' }],
        'body-xl': ['18px', { lineHeight: '26px', letterSpacing: '-0.1px' }],
        'body-lg': ['16px', { lineHeight: '24px', letterSpacing: '0px' }],
        'body-md': ['14px', { lineHeight: '21px', letterSpacing: '0px' }],
        'body-sm': ['13px', { lineHeight: '18px', letterSpacing: '0.1px' }],
        'body-xs': ['11px', { lineHeight: '14px', letterSpacing: '0.2px' }],
      },
      colors: {
        primary: {
          DEFAULT: '#0A66C2', // More modern vibrant blue
          50: '#F0F6FC',
          100: '#E0EEFA',
          200: '#C2DCF5',
          300: '#94C5EE',
          400: '#60A8E5',
          500: '#348CDB',
          600: '#0A66C2',
          700: '#0852A1',
          800: '#074586',
          900: '#0A3A6D',
        },
        surface: {
          // Layered surfaces for light mode
          light: '#F9FAFB', // Base Background (Gray 50)
          'light-elevated': '#FFFFFF', // Card/Modal
          'light-floating': 'rgba(255, 255, 255, 0.85)', // Glassmorphism
          'light-subtle': '#F3F4F6', // Secondary actions (Gray 100)

          // Layered surfaces for dark mode
          dark: '#09090B', // Base Background (Zinc 950)
          'dark-elevated': '#18181B', // Card/Modal (Zinc 900)
          'dark-floating': 'rgba(39, 39, 42, 0.85)', // Glassmorphism (Zinc 800)
          'dark-subtle': '#27272A', // Secondary actions (Zinc 800)
        },
        border: {
          light: '#E5E7EB', // Gray 200
          dark: '#27272A', // Zinc 800
        },
        // Editorial Stance Colors
        stance: {
          critical: '#818CF8', // Indigo-400
          neutral: '#A1A1AA',  // Zinc-400
          favorable: '#FBBF24', // Amber-400
        }
      },
      spacing: {
        '4.5': '18px',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px', // Modern softer cards
        '4xl': '32px',
      }
    },
  },
  plugins: [],
}
