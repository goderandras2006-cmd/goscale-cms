import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import { saveSiteUpload } from '@/lib/image-upload';
import { checkSiteAccess } from '@/lib/site-access';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  const { siteId } = await params;

  if (!(await checkSiteAccess(req, siteId))) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  await connectDB();
  const site = await Site.findById(siteId);
  if (!site) {
    return NextResponse.json({ error: 'Site nem található' }, { status: 404 });
  }

  if (site.siteMode !== 'html_cloudflare') {
    return NextResponse.json({ error: 'Feltöltés csak HTML site-okon' }, { status: 400 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file || !file.size) {
      return NextResponse.json({ error: 'Nincs fájl' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Max. 5 MB kép tölthető fel' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = saveSiteUpload(siteId, buffer, file.name);

    return NextResponse.json({
      ok: true,
      url: result.relativePath,
      previewUrl: result.previewUrl,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
