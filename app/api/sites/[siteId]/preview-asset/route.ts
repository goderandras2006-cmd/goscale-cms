import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import { BINARY_PREFIX } from '@/lib/template-files';
import { resolveTemplateFiles } from '@/lib/template-storage';
import path from 'path';
import { checkSiteAccess } from '@/lib/site-access';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.pdf': 'application/pdf',
};

/**
 * GET /api/sites/[siteId]/preview-asset?path=img/logo.png
 *
 * Visszaadja az adott templateFile-ból a statikus fájlt (kép, CSS, font, stb.)
 * Szükséges a preview iframe-hez, mert a relatív hivatkozások erre mutatnak.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  if (!(await checkSiteAccess(req, siteId))) {
    return new NextResponse('401 Jogosulatlan', { status: 401 });
  }

  const assetPath = req.nextUrl.searchParams.get('path');
  if (!assetPath) {
    return new NextResponse('Hiányzó path paraméter', { status: 400 });
  }

  // Biztonsági ellenőrzés: path traversal tiltása
  const normalized = path.normalize(assetPath).replace(/\\/g, '/');

  // Ha véletlenül .html oldal jön ide, irányítsuk a preview route-ra
  if (/\.html?$/i.test(normalized)) {
    const slug = /^index\.html?$/i.test(path.basename(normalized))
      ? ''
      : path.basename(normalized).replace(/\.html?$/i, '');
    const previewUrl = new URL(req.url);
    previewUrl.pathname = `/api/sites/${siteId}/preview`;
    previewUrl.search = `slug=${encodeURIComponent(slug)}`;
    return NextResponse.redirect(previewUrl);
  }
  if (normalized.startsWith('..') || normalized.startsWith('/')) {
    return new NextResponse('Érvénytelen elérési út', { status: 400 });
  }

  await connectDB();

  const site = await Site.findById(siteId).lean() as any;
  if (!site) {
    return new NextResponse('Site nem található', { status: 404 });
  }

  const templateFiles = resolveTemplateFiles(site);

  // Keresés a templateFiles-ban (normalizált path-szal)
  let content: string | undefined = templateFiles[normalized];
  if (content === undefined) {
    const found = Object.keys(templateFiles).find(
      (k) => k.toLowerCase() === normalized.toLowerCase()
    );
    content = found ? templateFiles[found] : undefined;
  }

  if (content === undefined) {
    return new NextResponse(`Asset nem található: ${normalized}`, { status: 404 });
  }

  const ext = path.extname(normalized).toLowerCase();
  const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

  if (content.startsWith(BINARY_PREFIX)) {
    // Bináris fájl (kép, font)
    const buffer = Buffer.from(content.slice(BINARY_PREFIX.length), 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  } else {
    // Szöveges fájl (CSS, JS, SVG)
    return new NextResponse(content, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'private, max-age=300',
      },
    });
  }
}
