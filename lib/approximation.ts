// Privacy-preserving count approximation and Persian number formatting

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Bucket a raw device count into an approximate number.
 * This prevents precise tracking of individuals joining/leaving.
 */
export function approximateCount(raw: number): number {
  if (raw <= 0) return 0;
  if (raw <= 10) return 10;
  if (raw <= 50) return Math.round(raw / 10) * 10;
  if (raw <= 200) return Math.round(raw / 25) * 25;
  if (raw <= 500) return Math.round(raw / 50) * 50;
  return Math.round(raw / 100) * 100;
}

/**
 * Convert a number to a string with Persian/Farsi digits.
 */
export function formatPersianCount(n: number): string {
  return String(n)
    .split('')
    .map((ch) => {
      const digit = parseInt(ch, 10);
      return isNaN(digit) ? ch : PERSIAN_DIGITS[digit];
    })
    .join('');
}

/**
 * Format a count based on current language.
 * Returns Persian digits for fa, regular digits for en.
 */
export function formatCount(n: number): string {
  try {
    const i18n = require('./i18n').default;
    if (i18n.language === 'en') return String(n);
  } catch {}
  return formatPersianCount(n);
}
