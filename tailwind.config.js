/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
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
      },
      colors: {
        midnight: '#081619',
        deep: '#102A30',
        sea: '#1A434C',
        onyx: '#EAF2F3',
        sage: '#829A9E',
        lava: {
          50: '#fdecea',
          100: '#f9c8c3',
          200: '#f5a39d',
          300: '#f07f77',
          400: '#ec5b51',
          500: '#E63923',
          600: '#c42b1a',
          700: '#9e1f12',
          800: '#77150d',
          900: '#500c08',
        },
        surface: {
          DEFAULT: '#102A30',
          elevated: '#1A434C',
          muted: '#081619',
        },
        // Midoe's brand palette derived from public/logo.svg
        brand: {
          red: '#AF2025',
          'red-dark': '#8E1A1E',
          'red-light': '#D6454A',
          cream: '#F5F0E8',
          'cream-dark': '#EBE5DA',
          espresso: '#3D2C24',
          'espresso-light': '#5C4639',
        },
        // Semantic: teal is now success/sync/complete, not the brand accent
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
        // Functional aliases for backward compatibility during migration
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
      },
      // Safe-area utilities for iOS notch / home indicator.
      padding: {
        safe: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      },
    },
  },
  plugins: [],
};
