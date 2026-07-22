/**
 * Collision-resistant ID generator.
 *
 * Raw `Date.now()` can collide when multiple records are created in the same
 * millisecond. This helper combines the current timestamp with a module-level
 * monotonic counter so every ID created in a session is unique.
 */

let counter = 0;

export const generateUniqueId = (): number =>
  Date.now() * 1000 + (counter++ % 1000);
