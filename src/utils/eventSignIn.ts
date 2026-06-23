const DEFAULT_ORIGIN = 'https://concernedcitizensofmc.com/';

function baseUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${window.location.pathname || '/'}`;
  }
  return DEFAULT_ORIGIN;
}

export function signInUrl(slug: string): string {
  return `${baseUrl()}?signin=${encodeURIComponent(slug)}`;
}

export function signInPrintUrl(slug: string): string {
  return `${signInUrl(slug)}&print=1`;
}
