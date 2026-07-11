import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // GrowEasy primary = orange.
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Teal accent used by the logo + secondary actions.
        accent: {
          50: '#effcf6',
          100: '#d3f5e5',
          200: '#aae9cf',
          300: '#72d6b3',
          400: '#3bbd93',
          500: '#1aa179',
          600: '#0f8163',
          700: '#0e6751',
          800: '#0e5242',
          900: '#0c4437',
          950: '#052e26',
        },
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
