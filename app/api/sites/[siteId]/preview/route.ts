import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';
import { buildSiteFiles } from '@/lib/html-build';
import { resolveTemplateFiles } from '@/lib/template-storage';
import { getPickerScript, getEditScript } from '@/lib/preview-scripts';
import type { EditableField } from '@/lib/editable-fields';
import Product from '@/models/Product';

/**
 * GET /api/sites/[siteId]/preview?slug=&t=
 *
 * Lokális HTML előnézet a szerkesztőhöz.
 * A templateFiles-ból + draft content-ből HTML-t generál,
 * a relatív linkeket pedig /api/sites/[siteId]/preview-asset?path=... formátumra írja át.
 *
 * FONTOS: Soha nem liveUrl-t mutat (X-Frame-Options blokkolhat).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  // Auth: agency VAGY site auth
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  const siteAuth = req.cookies.get(`site_auth_${siteId}`)?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD && !siteAuth) {
    return new NextResponse('401 Jogosulatlan', { status: 401 });
  }

  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  const mode = req.nextUrl.searchParams.get('mode') ?? '';

  await connectDB();

  // Site auth ellenőrzés
  const site = await Site.findById(siteId).lean() as any;
  if (!site) {
    return new NextResponse('404 Site nem található', { status: 404 });
  }

  if (siteAuth && agencyAuth !== process.env.AGENCY_PASSWORD) {
    if (siteAuth !== site.password) {
      return new NextResponse('401 Érvénytelen jelszó', { status: 401 });
    }
  }

  if (site.siteMode !== 'html_cloudflare' || (!site.templateFiles && !site.templateDir)) {
    return new NextResponse('Ez a site nem HTML Cloudflare módban van.', {
      status: 400,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // Draft tartalom betöltése
  const draft = await Content.findOne({ siteId, status: 'draft' }).lean() as any;
  const contentData = draft?.data || { pages: {}, sharedContact: {} };

  const templateFilesObj = resolveTemplateFiles(site);

  let products: { _id: string; name: string; description: string; priceHuf: number; imageUrl: string; active: boolean; slug: string }[] = [];
  if (site.type === 'shop' || site.type === 'hybrid') {
    const prods = await Product.find({ siteId, active: true }).sort({ order: 1 }).lean();
    products = prods.map((p) => ({
      _id: String(p._id),
      name: p.name,
      description: p.description,
      priceHuf: p.priceHuf,
      imageUrl: p.imageUrl,
      active: p.active,
      slug: p.slug,
    }));
  }

  const outputFiles = buildSiteFiles(templateFilesObj, contentData, products);

  // Megfelelő HTML fájl kiválasztása
  const htmlFilename = slug === '' ? 'index.html' : `${slug}.html`;
  let html: string | undefined = outputFiles[htmlFilename];

  if (!html) {
    // Keresés case-insensitive
    const found = Object.keys(outputFiles).find(
      (k) => k.toLowerCase() === htmlFilename.toLowerCase()
    );
    html = found ? outputFiles[found] : undefined;
  }

  if (!html) {
    return new NextResponse(`404 - ${htmlFilename} nem található a sablonban.`, {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  html = rewriteRelativeLinks(html, siteId);

  if (mode === 'picker' && agencyAuth === process.env.AGENCY_PASSWORD) {
    html = injectBeforeBodyEnd(html, `<script>${getPickerScript()}</script>`);
  } else if (mode === 'edit') {
    const fields: EditableField[] = site.editableFields || [];
    const keys = fields.map((f) => f.dataCmsKey);
    html = injectBeforeBodyEnd(html, `<script>${getEditScript(JSON.stringify(keys))}</script>`);
  }

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      // Engedélyezzük az iframe-be töltést a saját origin-ről
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}

function isSkippableUrl(url: string): boolean {
  return (
    url.startsWith('http') ||
    url.startsWith('//') ||
    url.startsWith('data:') ||
    url.startsWith('#') ||
    url.startsWith('/') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:') ||
    url.startsWith('javascript:')
  );
}

function htmlHrefToPreviewSlug(url: string): string | null {
  const clean = url.replace(/^\.\//, '');
  if (!/\.html?$/i.test(clean)) return null;
  if (/^index\.html?$/i.test(clean)) return '';
  return clean.replace(/\.html?$/i, '');
}

/**
 * Relatív linkek átírása az előnézet API-kra:
 * - .html oldalak → /preview?slug=...
 * - képek, css, js → /preview-asset?path=...
 */
function injectBeforeBodyEnd(html: string, snippet: string): string {
  if (/<\/body>/i.test(html)) {
    return html.replace(/<\/body>/i, `${snippet}</body>`);
  }
  return html + snippet;
}

function rewriteRelativeLinks(html: string, siteId: string): string {
  const assetBase = `/api/sites/${siteId}/preview-asset?path=`;
  const previewBase = `/api/sites/${siteId}/preview?slug=`;

  return html.replace(
    /(href|src)=["']([^"']+)["']/gi,
    (match, attr, url: string) => {
      if (isSkippableUrl(url)) return match;

      const normalized = url.replace(/^\.\//, '');

      if (attr.toLowerCase() === 'href') {
        const slug = htmlHrefToPreviewSlug(normalized);
        if (slug !== null) {
          return `href="${previewBase}${encodeURIComponent(slug)}"`;
        }
      }

      return `${attr}="${assetBase}${encodeURIComponent(normalized)}"`;
    }
  );
}
