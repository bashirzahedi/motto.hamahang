/**
 * Calculate the duration in seconds for a slang to be chanted once.
 * Chanting is slower than normal reading - crowds need time to sync.
 *
 * Formula:
 * - Base time: 2 seconds
 * - Per word: ~0.8 seconds (chanting pace)
 * - Minimum: 3 seconds
 * - Maximum: 15 seconds
 */
export function calculateChantDuration(text: string): number {
  if (!text.trim()) return 5; // default

  // Split by spaces and filter empty strings
  const words = text.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Base 2 seconds + 0.8 seconds per word
  const calculatedSeconds = 2 + wordCount * 0.8;

  // Clamp between 3 and 15 seconds
  return Math.round(Math.min(15, Math.max(3, calculatedSeconds)));
}
