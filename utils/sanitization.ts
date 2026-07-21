/**
 * Input sanitization utilities
 * Provides functions to sanitize and validate user inputs
 */

const MAX_STRING_LENGTH = 1000;

// Enhanced HTML entity encoding map
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Sanitize string input to prevent XSS attacks
 * Uses HTML entity encoding and removes dangerous patterns
 */
export const sanitizeString = (input: string | undefined | null): string => {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // First, encode HTML entities
  let sanitized = input;
  for (const [char, entity] of Object.entries(HTML_ENTITIES)) {
    sanitized = sanitized.split(char).join(entity);
  }
  
  // Remove any remaining dangerous patterns
  sanitized = sanitized
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers like onclick=
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();
  
  return sanitized.slice(0, MAX_STRING_LENGTH);
};

/**
 * Validate email format
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

/**
 * Validate phone number (supports international formats)
 * Returns true if 10-15 digits
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Sanitize and validate number input
 * Returns default value if input is invalid
 */
export const sanitizeNumber = (input: any, defaultValue: number = 0): number => {
  if (input === null || input === undefined) {
    return defaultValue;
  }
  
  const num = Number(input);
  return isNaN(num) ? defaultValue : num;
};

/**
 * Sanitize object recursively
 * Applies sanitizeString to all string properties
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Validate that a value is a non-empty string
 */
export const isNonEmptyString = (value: any): boolean => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Escape special regex characters in a string
 */
export const escapeRegExp = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$\u0026');
};
