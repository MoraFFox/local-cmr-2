import { describe, it, expect } from 'vitest';
import { sanitizeString } from '../utils/sanitization';

describe('sanitizeString', () => {
  it('encodes HTML entities', () => {
    expect(sanitizeString('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });
  
  it('removes javascript: protocols', () => {
    expect(sanitizeString('javascript:alert("xss")')).toBe('alert(&quot;xss&quot;)');
  });
  
  it('returns empty string for null or undefined', () => {
    expect(sanitizeString(null as any)).toBe('');
    expect(sanitizeString(undefined)).toBe('');
  });
});
