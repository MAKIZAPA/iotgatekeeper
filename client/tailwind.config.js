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
        bg: '#0B0D10',
        surface: {
          DEFAULT: '#12151B',
          2: '#181C24',
          3: '#202530',
        },
        border: {
          DEFAULT: '#222733',
          strong: '#2E3545',
          subtle: 'rgba(255, 255, 255, 0.08)',
        },
        text: {
          DEFAULT: '#F2F4F7',
          2: '#9DA4B2',
          3: '#646C7C',
        },
        accent: {
          DEFAULT: '#3B82F6',
          soft: 'rgba(59, 130, 246, 0.15)',
          hover: '#2563EB',
          border: 'rgba(59, 130, 246, 0.3)',
        },
        grant: {
          DEFAULT: '#22C55E',
          soft: 'rgba(34, 197, 94, 0.15)',
          hover: '#16A34A',
          border: 'rgba(34, 197, 94, 0.3)',
        },
        deny: {
          DEFAULT: '#EF4444',
          soft: 'rgba(239, 68, 68, 0.15)',
          hover: '#DC2626',
          border: 'rgba(239, 68, 68, 0.3)',
        },
        warn: {
          DEFAULT: '#F59E0B',
          soft: 'rgba(245, 158, 11, 0.15)',
          hover: '#D97706',
          border: 'rgba(245, 158, 11, 0.3)',
        },
        revoke: {
          DEFAULT: '#A855F7',
          soft: 'rgba(168, 85, 247, 0.15)',
          hover: '#9333EA',
          border: 'rgba(168, 85, 247, 0.3)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        full: '9999px',
      },
      boxShadow: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.4), 0 1px 2px rgba(0, 0, 0, 0.2)',
        sm: '0 2px 6px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)',
        md: '0 4px 14px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4)',
        floating: '0 12px 32px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0, 0, 0, 0.4)',
        glowAccent: '0 0 20px rgba(59, 130, 246, 0.25)',
        glowGrant: '0 0 20px rgba(34, 197, 94, 0.25)',
        glowDeny: '0 0 20px rgba(239, 68, 68, 0.25)',
      }
    },
  },
  plugins: [],
}
