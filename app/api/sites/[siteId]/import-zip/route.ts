import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';
import { processTemplateFiles } from '@/lib/process-import';
import { loadFromImportFormData } from '@/lib/template-files';
import { persistSiteTemplate, pickTextFiles } from '@/lib/template-storage';
import { defaultEditableFieldsFromImport } from '@/lib/editable-fields';

export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const agencyAuth = req.cookies.get('agency_auth')?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const updateContent = formData.get('updateContent') !== 'false';

    await connectDB();
    const site = await Site.findById(siteId);

    if (!site) {
      return NextResponse.json({ error: 'Érvénytelen site' }, { status: 404 });
    }

    const rawFiles = await loadFromImportFormData(formData);
    if (!rawFiles || Object.keys(rawFiles).length === 0) {
      return NextResponse.json({ error: 'ZIP fájl vagy mappa szükséges' }, { status: 400 });
    }

    const htmlCount = Object.keys(rawFiles).filter((f) => f.endsWith('.html')).length;
    if (htmlCount === 0) {
      return NextResponse.json({ error: 'Nem található HTML fájl' }, { status: 400 });
    }

    const { templateFiles, sitePages, contentData, imageFields } = processTemplateFiles(rawFiles);
    const templateDir = persistSiteTemplate(siteId, templateFiles);

    site.siteMode = 'html_cloudflare';
    site.templateDir = templateDir;
    site.templateFiles = pickTextFiles(templateFiles);
    site.pages = sitePages;
    site.templateVersion = (site.templateVersion || 1) + 1;
    // editableFields frissítése: alap mezők + kép mezők (duplikáció kizárva)
    const existingNonImageFields = (site.editableFields || []).filter(
      (f: any) => f.type !== 'image'
    );
    site.editableFields = [...existingNonImageFields, ...imageFields];
    await site.save();

    if (updateContent) {
      await Content.findOneAndUpdate(
        { siteId, status: 'draft' },
        { $set: { data: contentData }, $inc: { version: 1 } },
        { upsert: true }
      );
      await Content.findOneAndUpdate(
        { siteId, status: 'published' },
        { $set: { data: contentData } },
        { upsert: true }
      );
    }

    const imageCount = Object.keys(rawFiles).filter((f) =>
      /\.(png|jpe?g|gif|webp|ico|avif)$/i.test(f)
    ).length;

    return NextResponse.json({
      ok: true,
      message: 'Import sikeres — sablon és tartalom frissítve.',
      pagesCount: sitePages.length,
      fileCount: Object.keys(rawFiles).length,
      imageCount,
      warning: imageCount === 0
        ? 'Nem található kép — az élesítés letiltva marad, amíg nincs img/ mappa. Importáld újra a teljes projektet!'
        : undefined,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: 'Szerver hiba az importálás során' }, { status: 500 });
  }
}
