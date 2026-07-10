/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nimiq: {
          blue: '#1F2348',
          'light-blue': '#0582CA',
          gold: '#E9B213',
          green: '#21BCA5',
          orange: '#FC8702',
          red: '#D94432',
        },
      },
      fontFamily: {
        sans: ['Muli', 'system-ui', 'sans-serif'],
        mono: ['Fira Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s cubic-bezier(0.25, 0, 0, 1)',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.25, 0, 0, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}