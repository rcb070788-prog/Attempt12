/**
 * Safe auth storage for Supabase: tests localStorage before use and falls back
 * to in-memory storage when it's unavailable (e.g. private mode, quota, mobile quirks).
 * Used so the app never crashes on storage and session can persist where possible.
 */

const TEST_KEY = '_supabase_auth_storage_test';

function isLocalStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storage = window.localStorage;
    storage.setItem(TEST_KEY, '1');
    storage.getItem(TEST_KEY);
    storage.removeItem(TEST_KEY);
    return true;
  } catch {
    return false;
  }
}

function createMemoryStorage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  const map: Record<string, string> = {};
  return {
    getItem(key: string) {
      return map[key] ?? null;
    },
    setItem(key: string, value: string) {
      map[key] = value;
    },
    removeItem(key: string) {
      delete map[key];
    },
  };
}

function createSafeLocalStorageWrapper(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  const fallback = createMemoryStorage();
  return {
    getItem(key: string) {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return fallback.getItem(key);
      }
    },
    setItem(key: string, value: string) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        fallback.setItem(key, value);
      }
    },
    removeItem(key: string) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        fallback.removeItem(key);
      }
    },
  };
}

let storageAdapter: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };
let _isPersistent = false;

if (isLocalStorageAvailable()) {
  storageAdapter = createSafeLocalStorageWrapper();
  _isPersistent = true;
} else {
  storageAdapter = createMemoryStorage();
  _isPersistent = false;
}

/** Adapter to pass to Supabase auth.storage (getItem, setItem, removeItem). */
export const safeAuthStorage = storageAdapter;

/** True when session is stored in localStorage (persists across refresh). False when using in-memory fallback. */
export const isAuthStoragePersistent = _isPersistent;
