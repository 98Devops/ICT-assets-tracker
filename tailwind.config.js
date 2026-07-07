/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1A1714',
          soft: '#2A2622',
          muted: '#57504A',
        },
        surface: {
          DEFAULT: '#FBF8F4',
          panel: '#F4EFE9',
        },
        hairline: '#D9D2CA',
        ember: {
          DEFAULT: '#C1440E',
          hover: '#A83A0C',
          soft: '#F7E4DA',
        },
        status: {
          active: '#1B7F4B',
          faulty: '#C0392B',
          repair: '#B7791F',
          retired: '#6B7280',
          lost: '#C0392B',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Archivo', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      transitionDuration: {
        DEFAULT: '175ms',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
