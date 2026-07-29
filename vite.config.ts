import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['logo.png', 'logo.svg', 'manifest.webmanifest'],
          manifest: {
            name: 'ميدوز - نظام إدارة الصيانة',
            short_name: 'ميدوز',
            lang: 'ar',
            dir: 'rtl',
            description: 'نظام إدارة صيانة القهوة لميدوز',
            start_url: '/',
            scope: '/',
            display: 'standalone',
	            background_color: '#FAF6EF',
	            theme_color: '#241B16',
            orientation: 'portrait-primary',
            icons: [
              // ponytail:logo.png is 1392x768, not 192/512 maskable. Add sized
              // square raster icons when provided; until then `purpose: any` works.
              { src: '/logo.png', sizes: '1392x768', type: 'image/png', purpose: 'any' },
              { src: '/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
            ],
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
            runtimeCaching: [
              {
                // Supabase REST + auth endpoints.
                urlPattern: /^https:\/\/.*\.supabase\.co\//,
                handler: 'NetworkFirst',
                options: {
                  cacheName: 'supabase-api',
                  networkTimeoutSeconds: 8,
                  expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
                },
              },
              {
                // Google Fonts static assets.
                urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\//,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'google-fonts',
                  expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
                },
              },
            ],
          },
        }),
        {
          name: 'spa-fallback',
          configureServer(server) {
            server.middlewares.use((req, res, next) => {
              // SPA fallback for client-side routes
              // Handle /technician and all /technician/* routes
              // Handle /admin/invite, /technician/invite, /admin/recovery/* routes
              // Handle /reset-password route
              if (req.url?.startsWith('/technician') ||
                  req.url === '/admin/invite' ||
                  req.url?.startsWith('/admin/recovery') ||
                  req.url?.match(/^\/admin\/invite(\?.*)?$/) ||
                  req.url === '/reset-password' ||
                  req.url?.match(/^\/reset-password(\?.*)?$/)) {
                req.url = '/index.html';
              }
              next();
            });
          }
        }
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          // FIX: __dirname is not available in ES modules. Use import.meta.url to get the current file's directory.
          '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.'),
          'react': 'react', // Force single React instance to prevent hooks context errors
        }
      },
      test: {
      include: ['tests/**/*.test.{ts,tsx}'],
      exclude: ['e2e/**', 'tests/**/*.spec.ts'],
      environment: 'jsdom',
      setupFiles: ['./vitest.setup.ts'],
      globals: true
    },
    build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'pdf': ['jspdf', 'jspdf-autotable', 'html2canvas'],
              'supabase': ['@supabase/supabase-js'],
              'icons': ['@heroicons/react'],
            }
          }
        },
        chunkSizeWarningLimit: 650,
      }
    };
});
