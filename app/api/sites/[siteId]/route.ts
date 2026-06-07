import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';
import Product from '@/models/Product';
import { updateDomainMap } from '@/lib/domain';
import { getSiteTemplateDir } from '@/lib/template-storage';
import fs from 'fs';

// GET /api/sites/[siteId]
export async function GET(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const { siteId } = await params;
  await connectDB();
  const site = await Site.findById(siteId).lean();
  if (!site) {
    return NextResponse.json({ error: 'Site nem található' }, { status: 404 });
  }
  return NextResponse.json(site);
}

// PATCH /api/sites/[siteId] — Site szerkesztése
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const { siteId } = await params;
  const updates = await req.json();

  await connectDB();

  if (updates.customDomain) {
    const domainConflict = await Site.findOne({ customDomain: updates.customDomain, _id: { $ne: siteId } });
    if (domainConflict) {
      return NextResponse.json(
        { error: `Ez a domain már párosítva van a(z) "${(domainConflict as unknown as { name: string }).name}" site-hoz` },
        { status: 409 }
      );
    }
  }

  if (updates.ghlLocationId !== undefined) {
    const nextGhlId = typeof updates.ghlLocationId === 'string'
      ? updates.ghlLocationId.trim()
      : '';
    if (!nextGhlId) {
      updates.ghlLocationId = undefined;
    } else {
      updates.ghlLocationId = nextGhlId;
      const ghlConflict = await Site.findOne({ ghlLocationId: nextGhlId, _id: { $ne: siteId } });
      if (ghlConflict) {
        return NextResponse.json(
          { error: `Ez a GHL Location ID már párosítva van a(z) "${(ghlConflict as unknown as { name: string }).name}" site-hoz` },
          { status: 409 }
        );
      }
    }
  }

  const mongoUpdate: { $set?: Record<string, unknown>; $unset?: Record<string, 1> } = { $set: { ...updates } };
  if (updates.ghlLocationId === undefined && 'ghlLocationId' in updates) {
    delete mongoUpdate.$set!.ghlLocationId;
    mongoUpdate.$unset = { ghlLocationId: 1 };
  }

  const updatedSite = await Site.findByIdAndUpdate(siteId, mongoUpdate, { new: true }).lean();

  if (!updatedSite) {
    return NextResponse.json({ error: 'Site nem található' }, { status: 404 });
  }

  if (updates.customDomain !== undefined) {
    updateDomainMap(updates.customDomain, siteId);
  }

  return NextResponse.json(updatedSite);
}

// DELETE /api/sites/[siteId] — Site + tartalom + termékek törlése
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const { siteId } = await params;
  await connectDB();

  const site = await Site.findById(siteId).lean() as any;
  if (!site) {
    return NextResponse.json({ error: 'Site nem található' }, { status: 404 });
  }

  // Töröljük a kapcsolódó adatokat
  await Content.deleteMany({ siteId });
  await Product.deleteMany({ siteId });
  await Site.findByIdAndDelete(siteId);

  // Domain map takarítás
  if (site.customDomain) {
    updateDomainMap(undefined, siteId);
  }

  const templateDir = getSiteTemplateDir(siteId);
  if (fs.existsSync(templateDir)) {
    fs.rmSync(templateDir, { recursive: true, force: true });
  }

  return NextResponse.json({ ok: true, message: `"${site.name}" sikeresen törölve.` });
}
