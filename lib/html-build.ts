import * as cheerio from 'cheerio';
import { ContentData } from '@/models/Content';
import { htmlSlugFromFilename } from '@/lib/template-files';
import { getNestedValue } from '@/lib/editable-fields';

export interface BuildProduct {
  _id?: string;
  name: string;
  description?: string;
  priceHuf: number;
  imageUrl?: string;
  slug?: string;
  active?: boolean;
}

function formatFieldValue(value: unknown, type: string): string {
  if (value == null) return '';
  const str = String(value);
  if (type === 'richtext') {
    if (str.includes('<')) return str;
    return str.replace(/\n/g, '<br>');
  }
  return str;
}

function applyTextOrHtml(
  el: cheerio.Cheerio<any>,
  value: unknown,
  type: string
): void {
  if (value == null || value === '') return;
  const formatted = formatFieldValue(value, type);
  if (type === 'richtext' || formatted.includes('<')) {
    el.html(formatted);
  } else {
    el.text(String(value));
  }
}

/**
 * Egy HTML oldal tartalmának beépítése a data-cms jelölések alapján.
 */
export function buildHtml(htmlString: string, pageData: Record<string, unknown>): string {
  const $ = cheerio.load(htmlString);

  $('[data-cms]').each((_, node) => {
    const el = $(node);
    const key = el.attr('data-cms');
    if (!key || key === 'shop.productCard') return;

    const attrSpec = el.attr('data-cms-attr');
    const value = getNestedValue(pageData, key);

    if (attrSpec) {
      const [attrName, attrKey] = attrSpec.split(':');
      const attrValue = attrKey ? getNestedValue(pageData, attrKey) : value;
      if (attrValue != null && attrValue !== '') {
        el.attr(attrName, String(attrValue));
      }
      return;
    }

    const tag = el.prop('tagName')?.toLowerCase();
    if (tag === 'img' || key.includes('image') || key.includes('Image')) {
      if (value != null && value !== '') el.attr('src', String(value));
      return;
    }

    if (key.startsWith('seo.') && tag === 'title') {
      if (value != null) el.text(String(value));
      return;
    }

    const fieldType = key === 'hero.h1' ? 'richtext' : 'text';
    applyTextOrHtml(el, value, fieldType);
  });

  $('[data-cms-attr]').each((_, node) => {
    const el = $(node);
    if (el.attr('data-cms')) return;
    const attrSpec = el.attr('data-cms-attr');
    if (!attrSpec) return;
    const [attrName, attrKey] = attrSpec.split(':');
    const value = getNestedValue(pageData, attrKey);
    if (value != null && value !== '') {
      el.attr(attrName, String(value));
    }
  });

  return $.html();
}

/** Termék kártya sablon klónozása minden aktív termékre */
export function expandProductCards(html: string, products: BuildProduct[]): string {
  if (!products.length) return html;

  const $ = cheerio.load(html);
  const template = $('[data-cms="shop.productCard"]').first();
  if (!template.length) return html;

  const parent = template.parent();
  const activeProducts = products.filter((p) => p.active !== false);
  if (!activeProducts.length) {
    template.remove();
    return $.html();
  }

  template.remove();

  for (const product of activeProducts) {
    const card = template.clone();
    card.removeAttr('data-cms');
    card.attr('data-cms-product-id', product._id || product.slug || '');

    card.find('[data-cms]').each((_, node) => {
      const el = $(node);
      const key = el.attr('data-cms');
      if (!key) return;

      const attrSpec = el.attr('data-cms-attr');
      if (attrSpec?.startsWith('src:')) {
        if (product.imageUrl) el.attr('src', product.imageUrl);
        return;
      }

      if (key === 'product.name' || key.endsWith('.name')) {
        applyTextOrHtml(el, product.name, 'text');
      } else if (key === 'product.description' || key.endsWith('.description')) {
        applyTextOrHtml(el, product.description || '', 'text');
      } else if (key === 'product.price' || key === 'product.priceHuf' || key.endsWith('.price')) {
        const price = `${product.priceHuf.toLocaleString('hu-HU')} Ft`;
        applyTextOrHtml(el, price, 'text');
      } else if (key === 'product.image' || key.endsWith('.image')) {
        if (product.imageUrl) el.attr('src', product.imageUrl);
      }
    });

    parent.append(card);
  }

  return $.html();
}

export function buildSharedJs(jsString: string, sharedContact: Record<string, string> | undefined): string {
  if (!sharedContact) return jsString;

  const tel = (sharedContact.tel || '').replace(/'/g, "\\'");
  const phoneLabel = (sharedContact.phoneLabel || '').replace(/'/g, "\\'");
  const email = (sharedContact.email || '').replace(/'/g, "\\'");

  const replacement = `/* CMS_MARK: sharedContact */\nconst CONTACT = {
  tel: '${tel}',
  phoneLabel: '${phoneLabel}',
  email: '${email}'
};`;

  const regex = /\/\*\s*CMS_MARK:\s*sharedContact\s*\*\/\s*const\s+CONTACT\s*=\s*{[^}]+};/g;
  if (regex.test(jsString)) {
    return jsString.replace(regex, replacement);
  }

  const fallbackRegex = /const\s+CONTACT\s*=\s*{[^}]+}/;
  if (fallbackRegex.test(jsString)) {
    return jsString.replace(fallbackRegex, replacement.replace(/\/\*\s*CMS_MARK:\s*sharedContact\s*\*\/\s*/, ''));
  }

  return jsString;
}

export function buildSiteFiles(
  templateFiles: Record<string, string>,
  content: ContentData,
  products?: BuildProduct[]
): Record<string, string> {
  const outputFiles: Record<string, string> = {};

  for (const [filename, fileContent] of Object.entries(templateFiles)) {
    if (filename.endsWith('.html')) {
      const slug = htmlSlugFromFilename(filename);
      const pageData = (content.pages?.[slug] || {}) as Record<string, unknown>;
      let html = buildHtml(fileContent, pageData);
      if (products?.length) {
        html = expandProductCards(html, products);
      }
      outputFiles[filename] = html;
    } else if (filename.endsWith('.js') && filename.includes('shared.js')) {
      outputFiles[filename] = buildSharedJs(fileContent, content.sharedContact);
    } else {
      outputFiles[filename] = fileContent;
    }
  }

  return outputFiles;
}
