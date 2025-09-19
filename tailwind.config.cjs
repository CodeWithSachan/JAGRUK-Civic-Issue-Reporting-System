// tailwind.config.cjs
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'], // Inter as default
      },
      colors: {
        brand: {
          600: '#1f6feb', // matches --brand-600 in CSS
          700: '#1257c6', // matches --brand-700 in CSS
          DEFAULT: '#1f6feb',
          light: '#3b82f6',
          dark: '#1e40af',
        },
        accent: {
          DEFAULT: '#f59e0b',
        },
      },
      borderRadius: {
        'lg-2': '14px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.06)',
        'soft-md': '0 12px 30px rgba(12,18,35,0.08)',
      },
      spacing: {
        '9': '2.25rem'
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),      // better inputs, selects, textareas
    require('@tailwindcss/typography'), // better prose formatting
    // small helper utilities used by the design (optional)
    plugin(function ({ addUtilities }) {
      addUtilities({
        '.btn-primary': {
          '@apply inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-semibold text-sm text-white': {},
          background: 'linear-gradient(180deg, #1f6feb, #1257c6)',
          boxShadow: '0 8px 24px rgba(31,111,235,0.16)',
        },
        '.glass-bg': {
          background: 'rgba(255,255,255,0.6)',
          'backdrop-filter': 'saturate(120%) blur(6px)',
        },
      });
    }),
  ],
};
