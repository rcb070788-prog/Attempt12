/**
 * Safe auth storage for Supabase: tests localStorage before use, then sessionStorage,
 * then in-memory when both are unavailable (e.g. private mode, quota, mobile quirks).
 * Also mirrors auth data to a cookie so browser-tab contexts can restore session when
 * localStorage is partitioned or cleared (e.g. mobile browser tab vs PWA).
 */

const TEST_KEY = '_supabase_auth_storage_test';
const COOKIE_PREFIX = 'sb_auth_';
const COOKIE_MAX_AGE_DAYS = 7;
const COOKIE_VALUE_MAX_LENGTH = 4000;

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

function isSessionStorageAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storage = window.sessionStorage;
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

function createSafeSessionStorageWrapper(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  const fallback = createMemoryStorage();
  return {
    getItem(key: string) {
      try {
        return window.sessionStorage.getItem(key);
      } catch {
        return fallback.getItem(key);
      }
    },
    setItem(key: string, value: string) {
      try {
        window.sessionStorage.setItem(key, value);
      } catch {
        fallback.setItem(key, value);
      }
    },
    removeItem(key: string) {
      try {
        window.sessionStorage.removeItem(key);
      } catch {
        fallback.removeItem(key);
      }
    },
  };
}

// --- Cookie mirror (for browser-tab session restore when primary storage is cleared/partitioned) ---

function cookieNameFor(key: string): string {
  const sanitized = key.replace(/[^a-zA-Z0-9-]/g, '_');
  return COOKIE_PREFIX + sanitized;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeSeconds: number): void {
  if (typeof document === 'undefined') return;
  try {
    const encoded = encodeURIComponent(value);
    const useSecure = window.location.protocol === 'https:';
    const securePart = useSecure ? '; Secure' : '';
    document.cookie = name + '=' + encoded + '; Path=/; Max-Age=' + maxAgeSeconds + '; SameSite=Lax' + securePart;
  } catch {
    // ignore
  }
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  try {
    document.cookie = name + '=; Path=/; Max-Age=0';
  } catch {
    // ignore
  }
}

function wrapWithCookieMirror(
  primary: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void }
): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void } {
  return {
    getItem(key: string) {
      const value = primary.getItem(key);
      if (value != null && value !== '') return value;
      const cookieVal = getCookie(cookieNameFor(key));
      if (cookieVal != null && cookieVal !== '') return cookieVal;
      return null;
    },
    setItem(key: string, value: string) {
      primary.setItem(key, value);
      if (value.length < COOKIE_VALUE_MAX_LENGTH) {
        setCookie(cookieNameFor(key), value, COOKIE_MAX_AGE_DAYS * 24 * 3600);
      }
    },
    removeItem(key: string) {
      primary.removeItem(key);
      deleteCookie(cookieNameFor(key));
    },
  };
}

let storageAdapter: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void; removeItem: (k: string) => void };
let _isPersistent = false;

if (isLocalStorageAvailable()) {
  storageAdapter = wrapWithCookieMirror(createSafeLocalStorageWrapper());
  _isPersistent = true;
} else if (isSessionStorageAvailable()) {
  storageAdapter = wrapWithCookieMirror(createSafeSessionStorageWrapper());
  _isPersistent = true;
} else {
  storageAdapter = createMemoryStorage();
  _isPersistent = false;
}

/** Adapter to pass to Supabase auth.storage (getItem, setItem, removeItem). */
export const safeAuthStorage = storageAdapter;

/** True when session is stored in localStorage or sessionStorage (persists across refresh/tab). False when using in-memory fallback. */
export const isAuthStoragePersistent = _isPersistent;
