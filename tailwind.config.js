/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        finvora: {
          bg: 'var(--app-bg)',
          sidebar: 'var(--sidebar-bg)',
          card: 'var(--card-bg)',
          'card-hover': 'var(--card-hover)',
          'card-elevated': 'var(--card-bg-elevated)',
          border: 'var(--card-border)',
          divider: 'var(--divider)',
          text: {
            primary: 'var(--text-primary)',
            secondary: 'var(--text-secondary)',
            muted: 'var(--text-muted)',
          },
          accent: {
            DEFAULT: 'var(--accent)',
            hover: 'var(--accent-hover)',
            light: 'var(--accent-light)',
            border: 'var(--accent-border)',
          },
          positive: {
            DEFAULT: 'var(--positive)',
            light: 'var(--positive-light)',
            border: 'var(--positive-border)',
          },
          warning: {
            DEFAULT: 'var(--warning)',
            light: 'var(--warning-light)',
            border: 'var(--warning-border)',
          },
          critical: {
            DEFAULT: 'var(--critical)',
            light: 'var(--critical-light)',
            border: 'var(--critical-border)',
          },
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      borderRadius: {
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
