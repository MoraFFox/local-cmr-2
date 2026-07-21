/**
 * Rate limiting utilities
 * Prevents brute force attacks and abuse
 */

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
}

// 1 hour in milliseconds (user specified)
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
// Maximum attempts per window
const MAX_ATTEMPTS = 5;

// In-memory store for rate limits
// Note: This resets on page reload. For production, consider server-side rate limiting.
const rateLimits = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  remainingTime?: number;
  message?: string;
}

/**
 * Check if an action is allowed based on rate limiting
 * @param key - Unique identifier (e.g., email, IP, or user ID)
 * @returns RateLimitResult indicating if action is allowed
 */
export const checkRateLimit = (key: string): RateLimitResult => {
  const now = Date.now();
  const entry = rateLimits.get(key);
  
  if (!entry) {
    // First attempt
    rateLimits.set(key, { attempts: 1, firstAttempt: now });
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - 1,
    };
  }
  
  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    // Reset window
    rateLimits.set(key, { attempts: 1, firstAttempt: now });
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS - 1,
    };
  }
  
  // Check if limit exceeded
  if (entry.attempts >= MAX_ATTEMPTS) {
    const remainingTime = RATE_LIMIT_WINDOW - (now - entry.firstAttempt);
    const remainingMinutes = Math.ceil(remainingTime / 60000);
    
    return {
      allowed: false,
      remainingAttempts: 0,
      remainingTime,
      message: `لقد تجاوزت الحد الأقصى للمحاولات. يرجى المحاولة بعد ${remainingMinutes} دقيقة`,
    };
  }
  
  // Increment attempts
  entry.attempts++;
  
  return {
    allowed: true,
    remainingAttempts: MAX_ATTEMPTS - entry.attempts,
  };
};

/**
 * Reset rate limit for a specific key
 * Useful for successful logins (reset on success)
 */
export const resetRateLimit = (key: string): void => {
  rateLimits.delete(key);
};

/**
 * Get current rate limit status without incrementing
 */
export const getRateLimitStatus = (key: string): RateLimitResult => {
  const now = Date.now();
  const entry = rateLimits.get(key);
  
  if (!entry) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }
  
  // Check if window has expired
  if (now - entry.firstAttempt > RATE_LIMIT_WINDOW) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }
  
  const remainingAttempts = MAX_ATTEMPTS - entry.attempts;
  
  if (remainingAttempts <= 0) {
    const remainingTime = RATE_LIMIT_WINDOW - (now - entry.firstAttempt);
    return {
      allowed: false,
      remainingAttempts: 0,
      remainingTime,
    };
  }
  
  return {
    allowed: true,
    remainingAttempts,
  };
};

/**
 * Create a rate limiter for a specific action type
 * Returns functions bound to that action type
 */
export const createRateLimiter = (actionType: string) => {
  const prefix = `${actionType}:`;
  
  return {
    check: (identifier: string) => checkRateLimit(`${prefix}${identifier}`),
    reset: (identifier: string) => resetRateLimit(`${prefix}${identifier}`),
    getStatus: (identifier: string) => getRateLimitStatus(`${prefix}${identifier}`),
  };
};

// Predefined rate limiters for common actions
export const authRateLimiter = createRateLimiter('auth');
export const inviteRateLimiter = createRateLimiter('invite');
export const signupRateLimiter = createRateLimiter('signup');
