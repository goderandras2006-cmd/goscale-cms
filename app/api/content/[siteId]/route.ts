import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';
import { sanitizeContent } from '@/lib/guardian';
import { revalidatePath } from 'next/cache';
import { buildSiteFiles } from '@/lib/html-build';
import { deployToCloudflare } from '@/lib/cloudflare-deploy';
import { resolveTemplateFiles } from '@/lib/template-storage';
import { hasImageAssets } from '@/lib/persist-template';
import Product from '@/models/Product';
import type { EditableField } from '@/lib/editable-fields';

// GET /api/content/[siteId] — Draft tartalom lekérése (kliens szerkesztőnek)
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  // Auth: agency VAGY site auth
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  const siteAuth = req.cookies.get(`site_auth_${siteId}`)?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD && !siteAuth) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();

  // Ha site auth van, ellenőrizzük a jelszót
  if (siteAuth && agencyAuth !== process.env.AGENCY_PASSWORD) {
    const site = await Site.findById(siteId);
    if (!site || siteAuth !== site.password) {
      return NextResponse.json({ error: 'Érvénytelen jelszó' }, { status: 401 });
    }
  }

  const draft = await Content.findOne({ siteId, status: 'draft' });
  const published = await Content.findOne({ siteId, status: 'published' });
  const site = await Site.findById(siteId).lean();

  return NextResponse.json({
    draft: draft?.data || {},
    published: published?.data || {},
    draftVersion: draft?.version || 1,
    publishedVersion: published?.version || 1,
    site,
  });
}

// PUT /api/content/[siteId] — Draft mentése
export async function PUT(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  const agencyAuth = req.cookies.get('agency_auth')?.value;
  const siteAuth = req.cookies.get(`site_auth_${siteId}`)?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD && !siteAuth) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();

  let site;
  if (siteAuth && agencyAuth !== process.env.AGENCY_PASSWORD) {
    site = await Site.findById(siteId);
    if (!site || siteAuth !== site.password) {
      return NextResponse.json({ error: 'Érvénytelen jelszó' }, { status: 401 });
    }
  }

  const body = await req.json();
  const siteDoc = site || (await Site.findById(siteId).lean());
  const editableFields = (siteDoc as { editableFields?: EditableField[] } | null)?.editableFields;
  const sanitized = sanitizeContent(body.data, body.type || 'landing', editableFields);

  const draft = await Content.findOneAndUpdate(
    { siteId, status: 'draft' },
    { $set: { data: sanitized }, $inc: { version: 1 } },
    { new: true, upsert: true }
  );

  return NextResponse.json({ ok: true, version: draft.version });
}

// POST /api/content/[siteId] — Publish (draft → published)
export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;

  const agencyAuth = req.cookies.get('agency_auth')?.value;
  const siteAuth = req.cookies.get(`site_auth_${siteId}`)?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD && !siteAuth) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();

  let site: any = null;
  if (siteAuth && agencyAuth !== process.env.AGENCY_PASSWORD) {
    site = await Site.findById(siteId).lean();
    if (!site || siteAuth !== site.password) {
      return NextResponse.json({ error: 'Érvénytelen jelszó' }, { status: 401 });
    }
  } else {
    site = await Site.findById(siteId).lean();
  }

  // Draft másolása published-be
  const draft = await Content.findOne({ siteId, status: 'draft' });
  if (!draft) {
    return NextResponse.json({ error: 'Nincs piszkozat' }, { status: 404 });
  }

  await Content.findOneAndUpdate(
    { siteId, status: 'published' },
    { $set: { data: draft.data, version: draft.version } },
    { upsert: true }
  );

  // Ha html_cloudflare mód: deploy Cloudflare-re
  if (site.siteMode === 'html_cloudflare') {
    if (!site.templateFiles && !site.templateDir) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Nincs sablonfájl a site-hoz. Importálj egy HTML mappát vagy ZIP-et az Agency Dashboardon!' 
      }, { status: 400 });
    }
    
    if (!site.cloudflareProjectName) {
      // Ha nincs Cloudflare project name beállítva, hibaüzenetet adunk (nem félrevezető "sikeres" üzenetet)
      return NextResponse.json({ 
        ok: false, 
        error: 'Nincs Cloudflare projekt név beállítva! Az Agency Dashboardon add meg a Cloudflare projekt nevét a weboldalhoz, hogy élesíteni tudj.'
      }, { status: 400 });
    }

    if (!process.env.CLOUDFLARE_API_TOKEN) {
      return NextResponse.json({ 
        ok: false, 
        error: '⚠️ Hiányzó CLOUDFLARE_API_TOKEN környezeti változó! Állítsd be a Vercel projekt beállításaiban.' 
      }, { status: 500 });
    }

    const templateFilesObj = resolveTemplateFiles(site);

    if (!hasImageAssets(templateFilesObj)) {
      return NextResponse.json({
        ok: false,
        error: 'Hiányzó képek — importáld újra a teljes mappát (img/ mappa kötelező). Az élesítés letiltva, hogy ne törjön az oldal.',
      }, { status: 400 });
    }

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

    const outputFiles = buildSiteFiles(templateFilesObj, draft.data, products);
    
    const deployResult = await deployToCloudflare(site.cloudflareProjectName, outputFiles, site.cloudflareAccountId);
    
    if (deployResult.ok) {
      await Site.findByIdAndUpdate(siteId, { lastDeployedAt: new Date() });
      return NextResponse.json({ ok: true, message: '🚀 Sikeresen élesítve a Cloudflare-en!', deploymentUrl: deployResult.url });
    } else {
      return NextResponse.json({ ok: false, error: 'Cloudflare deploy sikertelen: ' + deployResult.error }, { status: 500 });
    }
  }


  // Cache invalidálás Vercel fallback/demo esetén
  revalidatePath(`/site/${siteId}`);
  if (site?.pages) {
    site.pages.forEach((p: any) => {
      if (p.slug) {
        revalidatePath(`/site/${siteId}/${p.slug}`);
      }
    });
  }
  if (site?.customDomain) {
    revalidatePath('/');
    if (site?.pages) {
      site.pages.forEach((p: any) => {
        if (p.slug) revalidatePath(`/${p.slug}`);
      });
    }
  }

  return NextResponse.json({ ok: true, message: 'Sikeresen élesítve!' });
}
