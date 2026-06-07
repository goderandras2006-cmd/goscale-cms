import * as cheerio from 'cheerio';
import { PageData } from '@/models/Content';

/**
 * html-parse.ts
 * Kinyeri a tartalmat a már megjelölt HTML fájlokból.
 */

export function parseHtml(htmlString: string): PageData {
  const $ = cheerio.load(htmlString);
  const data: PageData = { hero: {}, seo: {} };

  // SEO mezők (jelölt vagy fallback élő HTML-hez)
  const seoTitle = $('title[data-cms="seo.title"]').text() || $('title').first().text();
  if (seoTitle) data.seo!.title = seoTitle.trim();

  const seoDesc =
    $('meta[data-cms-attr="content:seo.description"]').attr('content') ||
    $('meta[name="description"]').attr('content');
  if (seoDesc) data.seo!.description = seoDesc.trim();

  // Hero (jelölt vagy első h1 + bekezdés)
  const heroH1 = $('[data-cms="hero.h1"]').text() || $('h1').first().text();
  if (heroH1) data.hero!.h1 = heroH1.trim();

  const heroLead =
    $('[data-cms="hero.lead"]').text() ||
    $('h1').first().parent().find('p').first().text() ||
    $('h1').first().next('p').text();
  if (heroLead) data.hero!.lead = heroLead.trim();

  // Cleanup if empty
  if (Object.keys(data.hero!).length === 0) delete data.hero;
  if (Object.keys(data.seo!).length === 0) delete data.seo;

  return data;
}

export function parseSharedJs(jsString: string): { tel?: string, phoneLabel?: string, email?: string } | null {
  // Regex extracting properties from:
  // const CONTACT = {
  //    tel: '+36301234567',
  //    phoneLabel: '+36 30 123 4567',
  //    email: 'info@domain.hu'
  // };
  const contactMatch = jsString.match(/const\s+CONTACT\s*=\s*({[^}]+})/);
  if (contactMatch && contactMatch[1]) {
    try {
      // Ez egy kis "hack" hogy JSON-ként parseljuk, ha single quote-ok vannak benne
      const objStr = contactMatch[1]
        .replace(/(\w+)\s*:/g, '"$1":') // keys to double quotes
        .replace(/'/g, '"'); // single quotes to double quotes
      
      // Tisztítás: utolsó vessző eltávolítása (trailing comma) ami JSON parse error-t okozna
      const cleanObjStr = objStr.replace(/,\s*}/, '}');
      
      return JSON.parse(cleanObjStr);
    } catch (e) {
      console.error('Failed to parse CONTACT obj in shared.js', e);
    }
  }
  return null;
}
