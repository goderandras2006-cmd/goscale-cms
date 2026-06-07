import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import { resolveTemplateFiles, getSiteTemplateDir, pickTextFiles } from '@/lib/template-storage';
import { BINARY_PREFIX, writeFilesToDir } from '@/lib/template-files';
import path from 'path';
import fs from 'fs';

/**
 * POST /api/sites/[siteId]/replace-image
 * Body: { oldPath: "img/hero.jpg", newPath: "img/uploads/timestamp-new.jpg" }
 *
 * Lecseréli az `oldPath` alatti képet az `newPath` tartalmával a templateFiles-ban.
 * Az oldPath kulcs megmarad (a HTML template src-jei nem változnak),
 * csak a tartalom cserélődik az újra feltöltött képre.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;

  const agencyAuth = req.cookies.get('agency_auth')?.value;
  const siteAuth = req.cookies.get(`site_auth_${siteId}`)?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD && !siteAuth) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();
  const site = await Site.findById(siteId);
  if (!site) {
    return NextResponse.json({ error: 'Site nem található' }, { status: 404 });
  }

  if (siteAuth && agencyAuth !== process.env.AGENCY_PASSWORD) {
    if (siteAuth !== (site as any).password) {
      return NextResponse.json({ error: 'Érvénytelen jelszó' }, { status: 401 });
    }
  }

  if ((site as any).siteMode !== 'html_cloudflare') {
    return NextResponse.json({ error: 'Képcsere csak HTML site-okon elérhető' }, { status: 400 });
  }

  let body: { oldPath: string; newPath: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Érvénytelen kérés törzs' }, { status: 400 });
  }

  const { oldPath, newPath } = body;

  if (!oldPath || !newPath) {
    return NextResponse.json({ error: 'oldPath és newPath megadása kötelező' }, { status: 400 });
  }

  // Biztonsági ellenőrzés: path traversal tiltása
  const normalizedOld = path.normalize(oldPath).replace(/\\/g, '/');
  const normalizedNew = path.normalize(newPath).replace(/\\/g, '/');
  if (normalizedOld.startsWith('..') || normalizedNew.startsWith('..')) {
    return NextResponse.json({ error: 'Érvénytelen elérési út' }, { status: 400 });
  }

  const templateFiles = resolveTemplateFiles(site as any);

  // Az oldPath keresése (case-insensitive fallback)
  let resolvedOldKey = normalizedOld;
  if (templateFiles[normalizedOld] === undefined) {
    const found = Object.keys(templateFiles).find(
      (k) => k.toLowerCase() === normalizedOld.toLowerCase()
    );
    if (found) resolvedOldKey = found;
    else {
      return NextResponse.json({ error: `Kép nem található: ${oldPath}` }, { status: 404 });
    }
  }

  // Az új kép tartalmának kiolvasása a templateFiles-ból (ahol az upload mentette)
  let newContent: string | undefined = templateFiles[normalizedNew];
  if (newContent === undefined) {
    const found = Object.keys(templateFiles).find(
      (k) => k.toLowerCase() === normalizedNew.toLowerCase()
    );
    newContent = found ? templateFiles[found] : undefined;
  }

  // Ha a templateFiles-ban nincs (pl. lokális fájlrendszerből töltötte be), próbáljuk a disk-ről
  if (newContent === undefined) {
    const templateDir = getSiteTemplateDir(siteId);
    const newFilePath = path.join(templateDir, normalizedNew);
    if (fs.existsSync(newFilePath)) {
      const buf = fs.readFileSync(newFilePath);
      newContent = BINARY_PREFIX + buf.toString('base64');
    }
  }

  if (newContent === undefined) {
    return NextResponse.json({ error: `Az új kép nem található: ${newPath}` }, { status: 404 });
  }

  // Csere: az oldPath kulcs alá írjuk az új tartalmat
  const updatedFiles = { ...templateFiles, [resolvedOldKey]: newContent };

  // Lemezre mentés
  const templateDir = getSiteTemplateDir(siteId);
  const targetPath = path.join(templateDir, resolvedOldKey);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  if (newContent.startsWith(BINARY_PREFIX)) {
    fs.writeFileSync(targetPath, Buffer.from(newContent.slice(BINARY_PREFIX.length), 'base64'));
  } else {
    fs.writeFileSync(targetPath, newContent, 'utf8');
  }

  // MongoDB frissítés (csak szöveges fájlok kerülnek DB-be, képek a disken maradnak)
  const textOnly = pickTextFiles(updatedFiles);
  (site as any).templateFiles = textOnly;
  (site as any).templateVersion = ((site as any).templateVersion || 1) + 1;
  await (site as any).save();

  const previewUrl = `/api/sites/${siteId}/preview-asset?path=${encodeURIComponent(resolvedOldKey)}`;

  return NextResponse.json({
    ok: true,
    replacedPath: resolvedOldKey,
    previewUrl,
  });
}
