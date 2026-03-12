/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // TailAdmin core palette
        primary: {
          DEFAULT: '#313161',
          50: '#EEF0FB',
          100: '#D5DAF5',
          200: '#ABB4EC',
          300: '#808FE2',
          400: '#5669D9',
          500: '#313161',
          600: '#2D3EB5',
          700: '#1E2D8A',
          800: '#101C5F',
          900: '#030C35',
        },
        boxdark: '#24303F',
        'boxdark-2': '#1A222C',
        body: '#64748B',
        bodydark: '#AEB7C0',
        bodydark2: '#8A99AF',
        stroke: '#E2E8F0',
        strokedark: '#2E3A47',
        whiten: '#F1F5F9',
        whiter: '#F5F7FD',
        black: '#1C2434',
        'black-2': '#010101',
        meta: {
          1: '#DC3545', 2: '#EFF2F7', 3: '#10B981',
          4: '#313D4A', 5: '#259AE6', 6: '#FFBA00',
          7: '#FF6766', 8: '#F0950C', 9: '#CCE0FF', 10: '#80CAEE',
        },
        // Electoral accent
        accent: { DEFAULT: '#F59E0B', light: '#FEF3C7' },

        // Compatibility aliases — brand-* maps to primary-*
        brand: {
          DEFAULT: '#313161',
          50: '#EEF0FB',
          100: '#D5DAF5',
          200: '#ABB4EC',
          300: '#808FE2',
          400: '#5669D9',
          500: '#313161',
          600: '#2D3EB5',
          700: '#1E2D8A',
          800: '#101C5F',
          900: '#030C35',
        },
      },
      fontFamily: {
        sans: ['Satoshi', 'system-ui', 'sans-serif'],
        display: ['Satoshi', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        default: '0px 8px 13px -3px rgba(0, 0, 0, 0.07)',
        card: '0px 1px 3px rgba(0, 0, 0, 0.12)',
        'card-2': '0px 1px 6px -4px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.08)',
        'drop-3': '0 0 0 3px rgba(60, 80, 224, 0.35)',
      },
      borderRadius: {
        sm: '0.125rem',
      },
    },
  },
  plugins: [],
};
