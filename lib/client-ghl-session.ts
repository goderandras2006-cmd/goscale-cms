const storageKey = (siteId: string) => `ghl_session_${siteId}`;

/** URL-ből (?ghlSession=) sessionStorage-ba menti, majd eltávolítja az URL-ből. */
export function initGhlSessionFromUrl(siteId: string, searchParams: URLSearchParams): void {
  if (typeof window === 'undefined') return;
  const token = searchParams.get('ghlSession');
  if (!token) return;
  sessionStorage.setItem(storageKey(siteId), token);
  const url = new URL(window.location.href);
  url.searchParams.delete('ghlSession');
  window.history.replaceState({}, '', url.toString());
}

export function getGhlSessionToken(siteId: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(storageKey(siteId));
}

export function siteApiFetch(siteId: string, url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = getGhlSessionToken(siteId);
  if (token) headers.set('X-GHL-Session', token);
  return fetch(url, { ...init, headers, credentials: 'include' });
}

/** Preview iframe / img src — header nem megy, ezért query param. */
export function withGhlSession(siteId: string, path: string): string {
  const token = getGhlSessionToken(siteId);
  if (!token) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}ghlSession=${encodeURIComponent(token)}`;
}
