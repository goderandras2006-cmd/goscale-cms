export type EditableFieldType =
  | 'text'
  | 'richtext'
  | 'image'
  | 'link'
  | 'phone'
  | 'email'
  | 'price';

export interface EditableField {
  id: string;
  label: string;
  type: EditableFieldType;
  pages: string[];
  dataCmsKey: string;
  scope: 'page' | 'global';
  productSlot?: boolean;
  selector?: string;
  htmlFile?: string;
}

export const PICKABLE_TAGS = new Set([
  'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'P', 'SPAN', 'A', 'BUTTON', 'IMG', 'LI', 'TD', 'TH', 'LABEL', 'STRONG', 'EM',
]);

export function fieldAppliesToPage(field: EditableField, slug: string): boolean {
  if (field.pages.includes('*')) return true;
  return field.pages.includes(slug);
}

export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== 'object') {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]] as Record<string, unknown>;
  }
  cur[parts[parts.length - 1]] = value;
}

export function defaultEditableFieldsFromImport(pages: { slug: string }[]): EditableField[] {
  const slugs = pages.map((p) => p.slug);
  const pageList = slugs.length ? slugs : [''];
  return [
    {
      id: 'seo.title',
      label: 'SEO cím (böngésző fül)',
      type: 'text',
      pages: ['*'],
      dataCmsKey: 'seo.title',
      scope: 'page',
    },
    {
      id: 'seo.description',
      label: 'SEO leírás',
      type: 'text',
      pages: ['*'],
      dataCmsKey: 'seo.description',
      scope: 'page',
    },
    {
      id: 'hero.h1',
      label: 'Főcím (H1)',
      type: 'richtext',
      pages: pageList,
      dataCmsKey: 'hero.h1',
      scope: 'page',
    },
    {
      id: 'hero.lead',
      label: 'Bevezető szöveg',
      type: 'text',
      pages: pageList,
      dataCmsKey: 'hero.lead',
      scope: 'page',
    },
    {
      id: 'sharedContact',
      label: 'Kapcsolat (telefon, email)',
      type: 'text',
      pages: ['*'],
      dataCmsKey: 'sharedContact',
      scope: 'global',
    },
  ];
}

/**
 * Bejárja a HTML-t és minden data-cms markeres <img> elemből létrehoz egy EditableField-et.
 * Az import folyamat során hívjuk meg minden egyes HTML fájlra.
 */
export function extractImageFieldsFromHtml(
  htmlString: string,
  pageSlug: string
): EditableField[] {
  // Egyszerű regex-alapú kinyerés a cheerio import elkerüléséhez (lib-ben nem mindig elérhető)
  // Keresünk minden data-cms="image.xxx" attribútumot img tagokon
  const fields: EditableField[] = [];
  const seen = new Set<string>();

  // data-cms értéke "image." előtaggal kezdődik
  const re = /data-cms="(image\.[^"]+)"/gi;
  let match;
  while ((match = re.exec(htmlString)) !== null) {
    const key = match[1];
    if (seen.has(key)) continue;
    seen.add(key);

    // Emberi olvashatóság: "image.hero_bg_jpg" → "Kép: hero bg jpg"
    const labelSuffix = key
      .replace(/^image\./, '')
      .replace(/_+/g, ' ')
      .replace(/\bjpg\b|\bpng\b|\bwebp\b|\bavif\b|\bgif\b/gi, '')
      .trim();
    const label = `Kép: ${labelSuffix || key}`;

    fields.push({
      id: key,
      label,
      type: 'image',
      pages: pageSlug === '' ? ['*'] : [pageSlug],
      dataCmsKey: key,
      scope: 'page',
    });
  }

  return fields;
}

export function editableFieldToContentPath(
  field: EditableField,
  slug: string
): string[] {
  if (field.scope === 'global' || field.dataCmsKey === 'sharedContact') {
    return ['sharedContact'];
  }
  const parts = field.dataCmsKey.split('.');
  if (slug === '' && parts[0] === 'seo') {
    return ['pages', '', ...parts];
  }
  return ['pages', slug, ...parts];
}
