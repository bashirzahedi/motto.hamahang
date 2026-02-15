import AsyncStorage from '@react-native-async-storage/async-storage';

const ANONYMOUS_ID_KEY = 'hamahang_anonymous_id';

let cachedId: string | null = null;

/**
 * Generate a random UUID v4.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get or create the anonymous sender ID.
 * Persisted in AsyncStorage so it stays the same across sessions.
 */
export async function getAnonymousId(): Promise<string> {
  if (cachedId) return cachedId;

  try {
    const stored = await AsyncStorage.getItem(ANONYMOUS_ID_KEY);
    if (stored) {
      cachedId = stored;
      return stored;
    }
  } catch {
    // Storage read failed — generate new
  }

  const newId = generateUUID();
  cachedId = newId;

  try {
    await AsyncStorage.setItem(ANONYMOUS_ID_KEY, newId);
  } catch {
    // Storage write failed — ID still works in memory
  }

  return newId;
}

/**
 * Deterministic display name from a sender ID.
 * Uses i18n to produce localized names: "کاربر ۱" (fa) or "User 1" (en).
 */
export function getDisplayName(senderId: string): string {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) {
    hash = ((hash << 5) - hash + senderId.charCodeAt(i)) | 0;
  }
  const num = (Math.abs(hash) % 99) + 1;

  try {
    const i18n = require('./i18n').default;
    if (i18n.language === 'fa') {
      const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      const persianNum = String(num)
        .split('')
        .map((ch: string) => persianDigits[parseInt(ch, 10)])
        .join('');
      return i18n.t('user.display_name', { number: persianNum });
    }
    return i18n.t('user.display_name', { number: num });
  } catch {
    return `User ${num}`;
  }
}
