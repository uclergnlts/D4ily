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
      colors: {
        primary: {
          DEFAULT: '#006FFF', // User requested color
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
        // Editorial Stance Colors (Neutral/Safe Palette)
        stance: {
          critical: '#6366f1', // Indigo-500
          neutral: '#71717a',  // Zinc-500
          favorable: '#f59e0b', // Amber-500
        }
      },
    },
  },
  plugins: [],
}
