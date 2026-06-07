import * as cheerio from 'cheerio';
import { EditableFieldType } from '@/lib/editable-fields';
import { htmlSlugFromFilename } from '@/lib/template-files';

export function slugToHtmlFile(slug: string): string {
  return slug === '' ? 'index.html' : `${slug}.html`;
}

export function markElementInHtml(
  html: string,
  selector: string,
  dataCmsKey: string,
  type: EditableFieldType
): string {
  const $ = cheerio.load(html);
  const el = $(selector).first();
  if (!el.length) {
    throw new Error(`Elem nem található a sablonban: ${selector}`);
  }

  const tag = el.prop('tagName')?.toLowerCase();
  if (tag === 'img' || type === 'image') {
    el.attr('data-cms', dataCmsKey);
    el.attr('data-cms-attr', `src:${dataCmsKey}`);
  } else if (dataCmsKey.startsWith('seo.') && tag === 'title') {
    el.attr('data-cms', dataCmsKey);
  } else if (dataCmsKey === 'seo.description') {
    el.attr('data-cms-attr', 'content:seo.description');
  } else {
    el.attr('data-cms', dataCmsKey);
  }

  return $.html();
}

export function markByChildPath(
  html: string,
  childPath: number[],
  dataCmsKey: string,
  type: EditableFieldType
): string {
  const $ = cheerio.load(html);
  let el: ReturnType<typeof $> = $('body');
  if (!el.length) el = $('html body');
  for (const idx of childPath) {
    el = el.children().eq(idx - 1);
    if (!el.length) throw new Error('Érvénytelen elem útvonal');
  }
  const tag = el.prop('tagName')?.toLowerCase();
  if (tag === 'img' || type === 'image') {
    el.attr('data-cms', dataCmsKey);
    el.attr('data-cms-attr', `src:${dataCmsKey}`);
  } else if (dataCmsKey === 'seo.description') {
    el.attr('data-cms-attr', 'content:seo.description');
  } else {
    el.attr('data-cms', dataCmsKey);
  }
  return $.html();
}

export function extractInitialValue(html: string, dataCmsKey: string, type: EditableFieldType): string {
  const $ = cheerio.load(html);
  const el = $(`[data-cms="${dataCmsKey}"]`).first();
  if (!el.length) return '';
  if (type === 'image') return el.attr('src') || '';
  if (type === 'richtext') return el.html() || el.text();
  return el.text().trim();
}

export function applyFieldToTemplateFiles(
  templateFiles: Record<string, string>,
  field: { htmlFile?: string; dataCmsKey: string; type: EditableFieldType; selector?: string; childPath?: number[] },
  slug: string
): Record<string, string> {
  const file = field.htmlFile || slugToHtmlFile(slug);
  const html = templateFiles[file];
  if (!html) throw new Error(`HTML fájl nem található: ${file}`);

  let updated: string;
  if (field.childPath?.length) {
    updated = markByChildPath(html, field.childPath, field.dataCmsKey, field.type);
  } else if (field.selector) {
    updated = markElementInHtml(html, field.selector, field.dataCmsKey, field.type);
  } else {
    throw new Error('selector vagy childPath kötelező');
  }

  return { ...templateFiles, [file]: updated };
}
