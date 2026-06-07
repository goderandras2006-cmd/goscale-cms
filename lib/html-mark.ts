import * as cheerio from 'cheerio';
import path from 'path';

/**
 * html-mark.ts
 * Automatikusan `data-cms` attribútumokat ad a feltöltött sablonhoz,
 * hogy a CMS tudja, hol vannak a szerkeszthető szövegek és képek.
 */

/**
 * Egy képfájl src-jéből biztonságos data-cms kulcsot generál.
 * pl. "img/hero-bg.jpg" → "image.hero_bg_jpg"
 */
export function imagePathToKey(src: string): string {
  const basename = path.basename(src);
  // Speciális karakterek underscore-ra, kiterjesztés pontja is underscore
  const safe = basename.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return `image.${safe || 'img'}`;
}

export function addCmsMarkers(htmlString: string): string {
  const $ = cheerio.load(htmlString);

  // SEO mezők
  if (!$('title[data-cms]').length) {
    $('title').attr('data-cms', 'seo.title');
  }

  const metaDesc = $('meta[name="description"]');
  if (metaDesc.length && !metaDesc.attr('data-cms-attr')) {
    metaDesc.attr('data-cms-attr', 'content:seo.description');
  }

  // Keresünk egy Hero szekciót. Ez projektfüggő lehet, de próbálunk általánosak lenni.
  // Tipikusan egy <section> amiben van valami nagy szöveg, vagy .hero class.
  // MVP-hez nézzük az első <h1>-et és az utána következő lead szöveget.
  if (!$('[data-cms="hero.h1"]').length) {
    $('h1').first().attr('data-cms', 'hero.h1');
  }

  // Keresünk egy "lead" paragrafust, ami a h1 környékén van
  if (!$('[data-cms="hero.lead"]').length) {
    const lead = $('h1').first().parent().find('p').first();
    if (lead.length) {
      lead.attr('data-cms', 'hero.lead');
    }
  }

  // Képek: minden <img> kap data-cms markert, ha még nincs
  const usedKeys = new Map<string, number>();
  $('img').each((_, node) => {
    const el = $(node);
    // Ha már van data-cms, ne írjuk felül
    if (el.attr('data-cms')) return;

    const src = el.attr('src') || '';
    // Kihagyjuk a data: URI-kat és az üres src-ket
    if (!src || src.startsWith('data:') || src.startsWith('http') || src.startsWith('//')) return;

    let key = imagePathToKey(src);

    // Ütközés kezelés: ha ugyanaz a kulcs már van, hozzáfűzünk egy sorszámot
    const count = usedKeys.get(key) || 0;
    usedKeys.set(key, count + 1);
    if (count > 0) {
      key = `${key}_${count}`;
    }

    el.attr('data-cms', key);
    el.attr('data-cms-attr', `src:${key}`);
  });

  return $.html();
}

/**
 * Speciális feldolgozó a shared.js fájlhoz
 * Kicseréli a konstansokat úgy, hogy később módosítható legyen, vagy
 * egy reguláris kifejezéssel megjelöli a szerkeszthető adatokat.
 * MVP: egyelőre csak egyszerű csere Regex-szel.
 */
export function markSharedJs(jsString: string): string {
  // A feladat szerint a CONTACT objektum van a shared.js-ben
  // /* CMS_MARK: sharedContact */
  if (!jsString.includes('/* CMS_MARK: sharedContact */')) {
    // Ezt majd a parser okosan kezeli, de jelölhetjük egy kommenttel
    return jsString.replace('const CONTACT = {', '/* CMS_MARK: sharedContact */\nconst CONTACT = {');
  }
  return jsString;
}
