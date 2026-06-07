import path from 'path';
import { addCmsMarkers, markSharedJs } from '@/lib/html-mark';
import { parseHtml, parseSharedJs } from '@/lib/html-parse';
import { htmlSlugFromFilename } from '@/lib/template-files';
import { extractImageFieldsFromHtml } from '@/lib/editable-fields';
import type { EditableField } from '@/lib/editable-fields';

export interface ProcessedImport {
  templateFiles: Record<string, string>;
  sitePages: { slug: string; title: string; navLabel: string; order: number }[];
  contentData: { pages: Record<string, unknown>; sharedContact: Record<string, string> };
  imageFields: EditableField[];
}

export function processTemplateFiles(rawFiles: Record<string, string>): ProcessedImport {
  const templateFiles = { ...rawFiles };
  const sitePages: ProcessedImport['sitePages'] = [];
  const contentPages: Record<string, unknown> = {};
  let sharedContact: Record<string, string> = {};
  const allImageFields: EditableField[] = [];
  const seenImageKeys = new Set<string>();

  let order = 0;
  for (const [filename, content] of Object.entries(templateFiles)) {
    const normalizedName = filename.replace(/\\/g, '/');

    if (normalizedName.endsWith('.html')) {
      const processedHtml = addCmsMarkers(content);
      templateFiles[filename] = processedHtml;

      const slug = htmlSlugFromFilename(normalizedName);
      const parsedData = parseHtml(processedHtml);
      contentPages[slug] = parsedData;

      const title = parsedData.seo?.title || slug || 'Főoldal';
      let navLabel = title.split(' – ')[0].split(' - ')[0] || title;
      if (slug === '') navLabel = 'Főoldal';
      else navLabel = slug.charAt(0).toUpperCase() + slug.slice(1);

      sitePages.push({ slug, title, navLabel, order: order++ });

      // Képmezők kinyerése a már megjelölt HTML-ből
      const imgFields = extractImageFieldsFromHtml(processedHtml, slug);
      for (const f of imgFields) {
        if (!seenImageKeys.has(f.dataCmsKey)) {
          seenImageKeys.add(f.dataCmsKey);
          allImageFields.push(f);
        } else {
          // Ha több oldalon is szerepel ugyanaz a kép kulcs (pl. logo), adjuk hozzá az oldalhoz
          const existing = allImageFields.find((x) => x.dataCmsKey === f.dataCmsKey);
          if (existing && slug !== '' && !existing.pages.includes(slug) && !existing.pages.includes('*')) {
            existing.pages.push(slug);
          }
        }
      }
    } else if (normalizedName.endsWith('.js') && path.basename(normalizedName) === 'shared.js') {
      const processedJs = markSharedJs(content);
      templateFiles[filename] = processedJs;
      const parsedContact = parseSharedJs(processedJs);
      if (parsedContact) sharedContact = parsedContact as Record<string, string>;
    }
  }

  sitePages.sort((a, b) => (a.slug === '' ? -1 : b.slug === '' ? 1 : a.order - b.order));

  return {
    templateFiles,
    sitePages,
    contentData: { pages: contentPages, sharedContact },
    imageFields: allImageFields,
  };
}
