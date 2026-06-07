/** Élő oldal URL egy HTML oldal slugjához (pl. ipari → /ipari.html) */
export function livePageUrl(liveUrl: string, slug: string): string {
  const base = liveUrl.replace(/\/$/, '');
  if (!slug) {
    return `${base}/`;
  }
  return `${base}/${slug}.html`;
}

/** shared.js lehetséges útvonalai (projektfüggő) */
export const SHARED_JS_PATHS = ['shared.js', 'js/shared.js'];

export function sharedJsUrls(liveUrl: string): string[] {
  const base = liveUrl.replace(/\/$/, '');
  return SHARED_JS_PATHS.map((p) => `${base}/${p}`);
}
