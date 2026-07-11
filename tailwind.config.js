/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Tajawal',
          'Cairo',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: ['Cairo', 'Tajawal', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Cascadia Code', 'Consolas', 'monospace'],
      },
      colors: {
        /* ── New palette: Crimson & White (Bold) ──
         * Primary      #B61E24  — brand, buttons, accents
         * Hover        #8F171C  — primary hover
         * Background   #FFFFFF  — page
         * Section      #F8F9FA  — card/section surfaces
         * Text         #222222  — primary text
         * Accent       #D4A017  — signature accent (badges, highlights)
         */
        primary: '#B61E24',
        hover: '#8F171C',
        background: '#FFFFFF',
        section: '#F8F9FA',
        text: '#222222',
        accent: '#D4A017',

        /* Semantic tokens backed by CSS vars for dark-mode swap */
        'bg-body': 'var(--bg-body)',
        'bg-surface': 'var(--bg-surface)',
        'bg-surface-elevated': 'var(--bg-surface-elevated)',
        'bg-chrome': 'var(--bg-chrome)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'on-chrome': 'var(--text-on-chrome)',
        'muted-chrome': 'var(--text-muted-chrome)',
        'border-default': 'var(--border-default)',
        'ring-focus': 'var(--ring-focus)',

        /* ── Legacy token aliases ──
         * These are mapped to the new palette so any component still
         * referencing an old token name renders the new colors instead.
         * Do NOT use these in new code — prefer the semantic tokens above.
         */
        paper: 'var(--bg-body)',
        cream: {
          DEFAULT: 'var(--bg-surface)',
          2: 'var(--bg-surface-elevated)',
          3: '#E9EAEC',
        },
        espresso: {
          DEFAULT: '#1F1F1F', // chrome bg — always dark (both modes)
          light: '#2E2E2E',
          lighter: '#3D3D3D',
        },
        ink: 'var(--text-primary)',
        latte: 'var(--text-secondary)',
        hairline: '#E5E7EB',
        brass: '#D4A017',
        copper: {
          50: '#FDF3F3',
          100: '#FAE1E2',
          200: '#F4C2C3',
          300: '#EE9EA0',
          400: '#E47477',
          500: '#B61E24',
          600: '#9E1A20',
          700: '#8F171C',
          800: '#6E1116',
          900: '#4A0B0F',
        },
        leaf: {
          50: '#f0f7f0',
          100: '#d6ecd6',
          200: '#b0d9b0',
          300: '#82be82',
          400: '#5fa55f',
          500: '#4F7A52',
          600: '#3f6241',
          700: '#314e33',
          800: '#243a25',
          900: '#172817',
        },
        ember: {
          50: '#fdf0ee',
          100: '#f8d7d2',
          200: '#f0afa6',
          300: '#e28377',
          400: '#d35a4c',
          500: '#C0392B',
          600: '#a62e22',
          700: '#87231a',
          800: '#6a1c14',
          900: '#4c1310',
        },
        midnight: '#222222',
        deep: '#3A3A3A',
        sea: '#5C5C5C',
        onyx: '#F8F9FA',
        sage: '#6B6B6B',
        lava: {
          50: '#FDF3F3',
          100: '#FAE1E2',
          200: '#F4C2C3',
          300: '#EE9EA0',
          400: '#E47477',
          500: '#B61E24',
          600: '#9E1A20',
          700: '#8F171C',
          800: '#6E1116',
          900: '#4A0B0F',
        },
        brand: {
          red: '#B61E24',
          'red-dark': '#8F171C',
          'red-light': '#E47477',
          cream: '#F8F9FA',
          'cream-dark': '#E9EAEC',
          espresso: '#222222',
          'espresso-light': '#5C5C5C',
        },
        success: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        midoe: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },

        /* ── Dark mode helpers ── */
        'dark-bg': '#1A1A1A',
        'dark-surface': '#262626',
        'dark-elevated': '#333333',
        'dark-border': '#404040',
        'dark-text': '#F8F9FA',
        'dark-muted': '#A0A0A0',

        /* Old crimson tokens, kept for back-compat, mapped to new values */
        'brand-red': '#B61E24',
        'brand-red-light': '#E47477',
        'brand-offwhite': '#FFFFFF',
        'brand-espresso': '#222222',
      },
      padding: {
        safe: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      },
    },
  },
  plugins: [],
};
