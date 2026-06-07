import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';

// GET /api/sites — Összes site listája (agency)
export async function GET(req: NextRequest) {
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();
  const sites = await Site.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(sites);
}

// POST /api/sites — Új site létrehozása
export async function POST(req: NextRequest) {
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, type, password, checkoutEmail, ghlLocationId, customDomain, theme, isDemo, pages } = body;

  if (!id || !name || !password) {
    return NextResponse.json({ error: 'Az ID, név és jelszó kötelező!' }, { status: 400 });
  }

  // ID ellenőrzés (csak kisbetű, szám, kötőjel)
  if (!/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: 'Az ID csak kisbetűket, számokat és kötőjelet tartalmazhat' }, { status: 400 });
  }

  await connectDB();

  // Duplikáció ellenőrzés
  const existing = await Site.findById(id);
  if (existing) {
    return NextResponse.json({ error: 'Ez az ID már foglalt' }, { status: 409 });
  }

  // GHL Location ID egyediség ellenőrzés
  if (ghlLocationId) {
    const ghlConflict = await Site.findOne({ ghlLocationId });
    if (ghlConflict) {
      return NextResponse.json(
        { error: `Ez a GHL Location ID már párosítva van a(z) "${(ghlConflict as unknown as { name: string }).name}" site-hoz` },
        { status: 409 }
      );
    }
  }

  // Custom domain egyediség ellenőrzés
  if (customDomain) {
    const domainConflict = await Site.findOne({ customDomain });
    if (domainConflict) {
      return NextResponse.json(
        { error: `Ez a domain már párosítva van a(z) "${(domainConflict as unknown as { name: string }).name}" site-hoz` },
        { status: 409 }
      );
    }
  }

  const site = await Site.create({
    _id: id, name, type: type || 'landing', password, checkoutEmail,
    ...(ghlLocationId ? { ghlLocationId } : {}),
    ...(customDomain ? { customDomain } : {}),
    ...(theme ? { theme } : {}),
    isDemo: !!isDemo,
    ...(pages ? { pages } : {}),
  });

  if (customDomain) {
    const { updateDomainMap } = await import('@/lib/domain');
    updateDomainMap(customDomain, id);
  }

  // Üres draft és published tartalom létrehozása
  const defaultContent = {
    hero: { title: name, subtitle: '', cta: 'Kapcsolat', imageUrl: '' },
    about: { title: 'Rólunk', text: '' },
    services: [],
    contact: { phone: '', email: checkoutEmail || '', address: '' },
    seo: { title: name, description: '', keywords: '' },
  };

  const initialData = pages && pages.length > 0 
    ? { pages: Object.fromEntries(pages.map((p: any) => [p.slug, defaultContent])) } 
    : defaultContent;

  await Content.create({ siteId: id, status: 'draft', version: 1, data: initialData });
  await Content.create({ siteId: id, status: 'published', version: 1, data: initialData });

  return NextResponse.json(site, { status: 201 });
}
