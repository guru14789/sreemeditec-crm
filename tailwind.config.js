/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          900: '#064e3b',
        },
        mint: {
          50: '#f0fafa',
          100: '#dff5f4',
          200: '#81D7D3',
          300: '#6ac9c4',
          400: '#4fb6b0',
          500: '#34a39b',
        },
        tally: {
          bg: '#1C2B3A',
          panel: '#0F1B2A',
          highlight: '#2196F3',
          'highlight-alt': '#1565C0',
          'header-bg': '#0D47A1',
          'text-primary': '#E3F2FD',
          'text-secondary': '#90CAF9',
          'text-dim': '#546E7A',
          'accent-green': '#00C853',
          'accent-red': '#FF5252',
          'accent-yellow': '#FFD600',
          border: '#1E3A52',
          'row-alt': '#162535',
          'input-bg': '#0A1929',
          'input-border': '#2196F3',
        }
      },
      fontFamily: {
        'playfair': ['Playfair Display', 'Georgia', 'serif'],
        'tally': ['JetBrains Mono', 'Courier New', 'monospace'],
        'ui': ['Inter', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        'tally-xs': '11px',
        'tally-sm': '12px',
        'tally-base': '13px',
        'tally-md': '14px',
        'tally-lg': '16px',
        'tally-xl': '18px',
        'tally-2xl': '22px',
      }
    },
  },
  plugins: [],
}
