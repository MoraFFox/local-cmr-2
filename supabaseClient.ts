import { createClient } from '@supabase/supabase-js';
import { logger } from './utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase URL or Anon Key');
}

// 30 second timeout (user specified)
const REQUEST_TIMEOUT = 30000;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
      
      const method = (options?.method || 'GET').toUpperCase();
      const urlStr = typeof url === 'string' ? url : url.toString();
      const logId = logger.logNetworkRequest(method, urlStr);
      const startTime = performance.now();

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
        });

        const duration = Math.round(performance.now() - startTime);
        
        // For error responses, try to capture the body for debugging
        if (!response.ok) {
          try {
            const cloned = response.clone();
            const errorBody = await cloned.text();
            logger.logNetworkResponse(logId, response.status, duration, errorBody);
          } catch {
            logger.logNetworkResponse(logId, response.status, duration, 'Could not read error body');
          }
        } else {
          logger.logNetworkResponse(logId, response.status, duration);
        }

        return response;
      } catch (err: any) {
        const duration = Math.round(performance.now() - startTime);
        const errMsg = err?.name === 'AbortError' 
          ? `Request timed out after ${REQUEST_TIMEOUT}ms` 
          : err?.message || String(err);
        logger.logNetworkError(logId, duration, errMsg);
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
    },
  },
});