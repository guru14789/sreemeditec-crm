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
        }
      }
    },
  },
  plugins: [],
}
