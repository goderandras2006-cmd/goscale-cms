import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import { resolveTemplateFiles } from '@/lib/template-storage';
import { htmlSlugFromFilename } from '@/lib/template-files';
import { checkSiteAccess } from '@/lib/site-access';

export interface SiteImage {
  path: string;
  label: string;
  previewUrl: string;
  /** Az oldal neve ahol ez a kép szerepel */
  pageLabel: string;
  pageSlug: string;
  /** A data-cms kulcs pl. "image.hero_bg_jpg" */
  dataCmsKey: string;
}

/**
 * GET /api/sites/[siteId]/images
 *
 * CSAK azokat a képeket adja vissza, amik ténylegesen rajta vannak
 * a weboldalon (data-cms markeres <img> tagek).
 * Oldalanként csoportosítva, az oldal nevével együtt.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;

  if (!(await checkSiteAccess(req, siteId))) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();
  const site = await Site.findById(siteId).lean() as any;
  if (!site) {
    return NextResponse.json({ error: 'Site nem található' }, { status: 404 });
  }

  const templateFiles = resolveTemplateFiles(site);
  const sitePages: { slug: string; title: string; navLabel: string }[] = site.pages || [];

  // Oldal-slug → cím leképezés
  const pageLabels: Record<string, string> = {};
  for (const p of sitePages) {
    pageLabels[p.slug] = p.navLabel || p.title || (p.slug === '' ? 'Főoldal' : p.slug);
  }

  const images: SiteImage[] = [];
  const seenKeys = new Set<string>(); // duplikáció kizárás (pl. logo minden oldalon)

  // Regex: data-cms="image.xxx" és közelben src="..."
  // Megkeressük az összes <img> taget ami data-cms-el rendelkezik
  const imgTagRe = /<img\b([^>]*)>/gi;
  const attrCmsRe = /data-cms="(image\.[^"]+)"/i;
  const attrSrcRe = /\bsrc="([^"]+)"/i;

  // HTML fájlok bejárása
  for (const [filename, content] of Object.entries(templateFiles)) {
    const normalized = filename.replace(/\\/g, '/');
    if (!normalized.endsWith('.html')) continue;

    const slug = htmlSlugFromFilename(normalized);
    const pageLabel = pageLabels[slug] ?? (slug === '' ? 'Főoldal' : slug);

    let imgMatch;
    while ((imgMatch = imgTagRe.exec(content)) !== null) {
      const tagAttrs = imgMatch[1];

      const cmsMatch = attrCmsRe.exec(tagAttrs);
      if (!cmsMatch) continue; // Nincs data-cms marker → kihagyjuk

      const dataCmsKey = cmsMatch[1]; // "image.hero_bg_jpg"
      const srcMatch = attrSrcRe.exec(tagAttrs);
      if (!srcMatch) continue;

      const rawSrc = srcMatch[1];
      // Kihagyjuk a külső URL-eket és data: URI-kat
      if (rawSrc.startsWith('http') || rawSrc.startsWith('//') || rawSrc.startsWith('data:')) continue;

      // Normalizálás: ./img/hero.jpg → img/hero.jpg
      const imagePath = rawSrc.replace(/^\.\//, '');

      // Emberi cím: fájlnévből, kiterjesztés nélkül, gondolatjel/underscore → szóköz
      const rawLabel = imagePath.split('/').pop() || imagePath;
      const friendlyLabel = rawLabel
        .replace(/\.[^.]+$/, '') // kiterjesztés levágás
        .replace(/[-_]+/g, ' ')  // gondolatjel/underscore → szóköz
        .replace(/\b\w/g, (c) => c.toUpperCase()); // capitalize

      const previewUrl = `/api/sites/${siteId}/preview-asset?path=${encodeURIComponent(imagePath)}`;

      // Ha ugyanaz a kép több oldalon is van (pl. logo), csak az első előfordulást vesszük fel
      if (seenKeys.has(dataCmsKey)) continue;
      seenKeys.add(dataCmsKey);

      images.push({
        path: imagePath,
        label: friendlyLabel,
        previewUrl,
        pageLabel,
        pageSlug: slug,
        dataCmsKey,
      });
    }
  }

  return NextResponse.json(images);
}
