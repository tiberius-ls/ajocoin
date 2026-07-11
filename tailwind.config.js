import defaultTheme from 'tailwindcss/defaultTheme'

/** Nimiq sets html { font-size: 8px } (1rem = 8px). Tailwind defaults assume 16px — scale 2×. */
function scaleRem(value, factor = 2) {
  if (Array.isArray(value)) {
    return value.map((entry) => scaleRem(entry, factor))
  }
  if (typeof value === 'string' && value.endsWith('rem')) {
    const n = parseFloat(value)
    return Number.isFinite(n) ? `${n * factor}rem` : value
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, scaleRem(v, factor)])
    )
  }
  return value
}

function scaleThemeSection(section) {
  return Object.fromEntries(
    Object.entries(section).map(([key, value]) => [key, scaleRem(value)])
  )
}

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: scaleThemeSection(defaultTheme.spacing),
      fontSize: scaleThemeSection(defaultTheme.fontSize),
      borderRadius: scaleThemeSection(defaultTheme.borderRadius),
      maxWidth: scaleThemeSection(defaultTheme.maxWidth),
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
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}