import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Content from '@/models/Content';
import { checkSiteAccess } from '@/lib/site-access';

/** POST /api/content/[siteId]/restore — published → draft visszaállítás */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;

  if (!(await checkSiteAccess(req, siteId))) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();

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
