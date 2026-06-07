/** Éles CMS alap URL — GHL Custom Menu Linkhez (NEXT_PUBLIC_APP_URL). */
export function getCmsBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return window.location.origin.replace(/\/$/, '');
  return 'http://localhost:3000';
}

/** GHL Custom Menu Link URL ({{location.id}} placeholder vagy konkrét loc). */
export function ghlMenuAuthUrl(loc: string = '{{location.id}}'): string {
  const base = getCmsBaseUrl();
  const locParam = loc === '{{location.id}}' ? '{{location.id}}' : encodeURIComponent(loc);
  return `${base}/api/ghl/auth?loc=${locParam}&embed=1`;
}

export function isLocalCmsUrl(): boolean {
  const base = getCmsBaseUrl();
  return base.includes('localhost') || base.includes('127.0.0.1');
}
