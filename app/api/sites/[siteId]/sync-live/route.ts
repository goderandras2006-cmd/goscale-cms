import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import Content from '@/models/Content';
import { parseHtml, parseSharedJs } from '@/lib/html-parse';
import { livePageUrl, sharedJsUrls } from '@/lib/live-url';

export async function POST(req: NextRequest, { params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const agencyAuth = req.cookies.get('agency_auth')?.value;

  if (agencyAuth !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Jogosulatlan hozzáférés' }, { status: 401 });
  }

  const confirm = req.nextUrl.searchParams.get('confirm') === 'true';

  await connectDB();
  const site = await Site.findById(siteId).lean();

  if (!site || site.siteMode !== 'html_cloudflare' || !site.liveUrl) {
    return NextResponse.json({ error: 'Érvénytelen site vagy hiányzó élő URL (liveUrl)' }, { status: 400 });
  }

  try {
    const parsedData: { pages: Record<string, unknown>; sharedContact: Record<string, string> } = {
      pages: {},
      sharedContact: {},
    };

    if (site.pages && site.pages.length > 0) {
      for (const page of site.pages) {
        const url = livePageUrl(site.liveUrl, page.slug);
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const html = await res.text();
          parsedData.pages[page.slug] = parseHtml(html);
        } else {
          console.warn(`Szinkron: nem érhető el ${url} (${res.status})`);
        }
      }
    }

    for (const jsUrl of sharedJsUrls(site.liveUrl)) {
      const jsRes = await fetch(jsUrl, { cache: 'no-store' });
      if (jsRes.ok) {
        const js = await jsRes.text();
        const contact = parseSharedJs(js);
        if (contact) {
          parsedData.sharedContact = contact as Record<string, string>;
          break;
        }
      }
    }

    if (!confirm) {
      const published = await Content.findOne({ siteId, status: 'published' }).lean();
      const isDifferent = JSON.stringify(parsedData) !== JSON.stringify(published?.data || {});

      if (isDifferent) {
        return NextResponse.json({
          needsConfirm: true,
          message: 'Az élő weboldalon más tartalmat találtunk. Beolvassuk a szerkesztőbe?',
        });
      }
    }

    await Content.findOneAndUpdate(
      { siteId, status: 'draft' },
      { $set: { data: parsedData }, $inc: { version: 1 } },
      { new: true, upsert: true }
    );

    await Site.findByIdAndUpdate(siteId, { lastSyncedAt: new Date() });

    return NextResponse.json({ ok: true, message: 'Sikeresen szinkronizálva az élő weboldalról!' });
  } catch (error) {
    console.error('Sync live error:', error);
    return NextResponse.json({ error: 'Szerver hiba a szinkronizálás során' }, { status: 500 });
  }
}
