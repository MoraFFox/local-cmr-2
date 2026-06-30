import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
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
