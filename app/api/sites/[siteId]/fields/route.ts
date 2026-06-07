import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';
import { EditableField, defaultEditableFieldsFromImport, setNestedValue } from '@/lib/editable-fields';
import { applyFieldToTemplateFiles, slugToHtmlFile, extractInitialValue } from '@/lib/field-marker';
import { mergeTemplateUpdate, saveTemplateFilesForSite } from '@/lib/persist-template';
import { resolveTemplateFiles } from '@/lib/template-storage';

function requireAgency(req: NextRequest): boolean {
  return req.cookies.get('agency_auth')?.value === process.env.AGENCY_PASSWORD;
}

// GET /api/sites/[siteId]/fields
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  if (!requireAgency(req)) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const { siteId } = await params;
  await connectDB();
  const site = await Site.findById(siteId).lean() as { editableFields?: EditableField[] } | null;
  if (!site) return NextResponse.json({ error: 'Site nem található' }, { status: 404 });

  return NextResponse.json({ fields: site.editableFields || [] });
}

// POST /api/sites/[siteId]/fields — új szerkeszthető mező
export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  if (!requireAgency(req)) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const { siteId } = await params;
  const body = await req.json();

  const {
    label,
    type = 'text',
    pages = ['*'],
    dataCmsKey,
    scope = 'page',
    productSlot = false,
    selector,
    childPath,
    slug = '',
    htmlFile,
  } = body;

  if (!label || !dataCmsKey) {
    return NextResponse.json({ error: 'label és dataCmsKey kötelező' }, { status: 400 });
  }

  await connectDB();
  const site = await Site.findById(siteId);
  if (!site) return NextResponse.json({ error: 'Site nem található' }, { status: 404 });

  if (site.siteMode !== 'html_cloudflare') {
    return NextResponse.json({ error: 'Csak HTML Cloudflare site-on állíthatók be mezők' }, { status: 400 });
  }

  const id = body.id || `${slug || 'global'}.${dataCmsKey}`.replace(/\.+/g, '.');
  const fields: EditableField[] = [...(site.editableFields || [])];
  if (fields.some((f) => f.id === id || f.dataCmsKey === dataCmsKey)) {
    return NextResponse.json({ error: 'Ez a mező már létezik' }, { status: 409 });
  }

  const field: EditableField = {
    id,
    label,
    type,
    pages: Array.isArray(pages) ? pages : ['*'],
    dataCmsKey,
    scope,
    productSlot,
    selector,
    htmlFile: htmlFile || slugToHtmlFile(slug),
  };

  let templateFiles = resolveTemplateFiles(site.toObject());

  if (selector || (childPath && childPath.length)) {
    try {
      templateFiles = applyFieldToTemplateFiles(templateFiles, {
        htmlFile: field.htmlFile,
        dataCmsKey,
        type,
        selector,
        childPath,
      }, slug);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
  } else if (dataCmsKey === 'seo.title') {
    const file = field.htmlFile || 'index.html';
    const html = templateFiles[file];
    if (html && !html.includes('data-cms="seo.title"')) {
      const { markElementInHtml } = await import('@/lib/field-marker');
      templateFiles[file] = markElementInHtml(html, 'title', 'seo.title', 'text');
    }
  }

  fields.push(field);
  site.editableFields = fields;
  await site.save();

  await saveTemplateFilesForSite(siteId, templateFiles);

  const draft = await Content.findOne({ siteId, status: 'draft' });
  if (draft) {
    const file = field.htmlFile || slugToHtmlFile(slug);
    const html = templateFiles[file];
    if (html && scope === 'page') {
      const initial = extractInitialValue(html, dataCmsKey, type);
      if (initial) {
        const data = draft.data as Record<string, unknown>;
        if (!data.pages) data.pages = {};
        const pagesObj = data.pages as Record<string, Record<string, unknown>>;
        if (!pagesObj[slug]) pagesObj[slug] = {};
        setNestedValue(pagesObj[slug], dataCmsKey, initial);
        draft.data = data;
        draft.markModified('data');
        await draft.save();
      }
    }
  }

  return NextResponse.json({ ok: true, field, fields });
}

// PUT — alapértelmezett mezők inicializálása
export async function PUT(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  if (!requireAgency(req)) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const { siteId } = await params;
  await connectDB();
  const site = await Site.findById(siteId);
  if (!site) return NextResponse.json({ error: 'Site nem található' }, { status: 404 });

  const pages = (site.pages || []).map((p: { slug: string }) => ({ slug: p.slug }));
  site.editableFields = defaultEditableFieldsFromImport(pages);
  await site.save();

  return NextResponse.json({ ok: true, fields: site.editableFields });
}
