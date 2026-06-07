import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';

/** POST /api/content/[siteId]/restore — published → draft visszaállítás */
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

  if (siteAuth && agencyAuth !== process.env.AGENCY_PASSWORD) {
    const site = await Site.findById(siteId);
    if (!site || siteAuth !== site.password) {
      return NextResponse.json({ error: 'Érvénytelen jelszó' }, { status: 401 });
    }
  }

  const published = await Content.findOne({ siteId, status: 'published' });
  if (!published?.data) {
    return NextResponse.json({ error: 'Nincs éles verzió a visszaállításhoz' }, { status: 404 });
  }

  const draft = await Content.findOneAndUpdate(
    { siteId, status: 'draft' },
    { $set: { data: published.data, version: published.version } },
    { new: true, upsert: true }
  );

  return NextResponse.json({ ok: true, data: draft.data });
}
