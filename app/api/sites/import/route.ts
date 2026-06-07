import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';
import { processTemplateFiles } from '@/lib/process-import';
import { loadFromDirectory, loadFromImportFormData } from '@/lib/template-files';
import { persistSiteTemplate, pickTextFiles } from '@/lib/template-storage';
import { defaultEditableFieldsFromImport } from '@/lib/editable-fields';
import { normalizeLiveUrl, resolveLocalImportPath } from '@/lib/resolve-local-path';
import path from 'path';
import fs from 'fs';

function importErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes('unable to verify the first certificate') || msg.includes('certificate')) {
    return 'MongoDB SSL hiba (tanúsítvány). Indítsd újra a CMS-t — dev módban ez automatikusan javítva van. Ha továbbra is fennáll: futtasd a MONGO-TELEPITES.bat fájlt.';
  }
  if (msg.includes('whitelist') || msg.includes('Could not connect to any servers')) {
    return 'MongoDB kapcsolat sikertelen — ellenőrizd a Network Access listát (0.0.0.0/0) és futtasd a MONGO-TELEPITES.bat fájlt.';
  }
  if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND') || msg.includes('MongoServerSelectionError')) {
    return 'Nem érhető el az adatbázis. Ellenőrizd, hogy fut-e a MongoDB és a MONGODB_URI helyes-e a .env.local-ban.';
  }
  if (msg.includes('EACCES') || msg.includes('EPERM')) {
    return `Nincs jogosultság a mappa olvasásához: ${msg}`;
  }
  if (msg.includes('ENOENT')) {
    return 'A megadott mappa útvonal nem található. Ellenőrizd a helyi mappa mezőt.';
  }

  if (process.env.NODE_ENV === 'development') {
    return `Import hiba: ${msg}`;
  }
  return 'Szerver hiba az importálás során';
}

export async function POST(req: NextRequest) {
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const id = formData.get('siteId') as string;
    const name = formData.get('name') as string;
    const password = formData.get('password') as string;
    const liveUrl = (formData.get('liveUrl') as string) || '';
    const cloudflareProjectName = ((formData.get('cloudflareProjectName') as string) || '').trim();
    const ghlLocationId = formData.get('ghlLocationId') as string;
    const localPath = (formData.get('localPath') as string)?.trim();

    if (!id || !name || !password) {
      return NextResponse.json({ error: 'ID, név és jelszó kötelező' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(id)) {
      return NextResponse.json({ error: 'Az ID csak kisbetűt, számot és kötőjelet tartalmazhat' }, { status: 400 });
    }

    await connectDB();
    const existing = await Site.findById(id);
    if (existing) {
      return NextResponse.json({ error: 'Ez az ID már foglalt' }, { status: 409 });
    }

    let rawFiles: Record<string, string> | null = null;

    if (localPath) {
      if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: 'Helyi mappa útvonal csak fejlesztői módban használható' }, { status: 400 });
      }
      const resolved = resolveLocalImportPath(localPath);
      if (!fs.existsSync(resolved)) {
        return NextResponse.json({
          error: `A mappa nem található: ${resolved}. Ellenőrizd az útvonalat (pl. C:\\Users\\K\\weboldal\\Aktív Klíma).`,
        }, { status: 400 });
      }
      rawFiles = loadFromDirectory(resolved);
      if (!rawFiles || Object.keys(rawFiles).length === 0) {
        return NextResponse.json({ error: `A mappa üres vagy nem olvasható: ${resolved}` }, { status: 400 });
      }
    } else {
      rawFiles = await loadFromImportFormData(formData);
    }

    if (!rawFiles || Object.keys(rawFiles).length === 0) {
      return NextResponse.json({
        error: 'Adj meg helyi mappa útvonalat (nagy oldalakhoz) vagy válassz kisebb mappát / ZIP-et',
      }, { status: 400 });
    }

    const htmlCount = Object.keys(rawFiles).filter((f) => f.endsWith('.html')).length;
    if (htmlCount === 0) {
      return NextResponse.json({ error: 'Nem található HTML fájl a mappában / ZIP-ben' }, { status: 400 });
    }

    const { templateFiles, sitePages, contentData, imageFields } = processTemplateFiles(rawFiles);
    const templateDir = persistSiteTemplate(id, templateFiles);
    const textFiles = pickTextFiles(templateFiles);

    const site = new Site({
      _id: id,
      name,
      password,
      type: 'landing',
      siteMode: 'html_cloudflare',
      liveUrl: normalizeLiveUrl(liveUrl) || undefined,
      cloudflareProjectName: cloudflareProjectName || undefined,
      ghlLocationId: ghlLocationId || undefined,
      pages: sitePages,
      templateDir,
      templateFiles: textFiles,
      templateVersion: 1,
      editableFields: [...defaultEditableFieldsFromImport(sitePages), ...imageFields],
      isDemo: false,
    });
    await site.save();

    await Content.create({ siteId: id, status: 'draft', version: 1, data: contentData });
    await Content.create({ siteId: id, status: 'published', version: 1, data: contentData });

    const imageCount = Object.keys(rawFiles).filter((f) =>
      /\.(png|jpe?g|gif|webp|ico|avif)$/i.test(f)
    ).length;

    return NextResponse.json({
      ok: true,
      siteId: id,
      pagesCount: sitePages.length,
      fileCount: Object.keys(rawFiles).length,
      imageCount,
      warning: imageCount === 0
        ? 'Nem található kép a mappában — az előnézet képek nélkül fog kinézni. Ellenőrizd az img mappát!'
        : undefined,
    });

  } catch (error) {
    console.error('Import hiba:', error);
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('ERR_OUT_OF_RANGE') || msg.includes('offset')) {
      return NextResponse.json({
        error: 'A feltöltött mappa túl nagy (~15 MB felett). Használd a helyi mappa útvonal mezőt!',
      }, { status: 413 });
    }
    if (msg.includes('BSON') || msg.includes('document too large')) {
      return NextResponse.json({
        error: 'A weboldal túl nagy az adatbázishoz. Használd a helyi mappa útvonal mezőt!',
      }, { status: 413 });
    }
    return NextResponse.json({ error: importErrorMessage(error) }, { status: 500 });
  }
}
