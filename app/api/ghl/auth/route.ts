import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';

/**
 * GET /api/ghl/auth?loc=GHL_LOCATION_ID
 *
 * GoHighLevel Custom Menu Link belépési pont.
 * A GHL {{location.id}} placeholder-t a tényleges location ID-re cseréli.
 *
 * Munkafolyamat:
 *   1. GHL Custom Menu Link URL: https://app.example.com/api/ghl/auth?loc={{location.id}}
 *   2. GHL megnyitja az URL-t az iframe-ben (location.id behelyettesítve)
 *   3. Ez a route megkeresi a site-ot ghlLocationId alapján
 *   4. Beállítja a session cookie-t (jelszó nélkül — a GHL login már azonosított)
 *   5. Átirányít a /edit/[siteId] szerkesztőre
 *
 * Biztonsági megfontolás:
 *   Az URL csak GHL-en belül érhető el (GHL bejelentkezés szükséges).
 *   A ghlLocationId nem publikus, csak az ügynökség és a GHL ismeri.
 */
export async function GET(req: NextRequest) {
  const loc = req.nextUrl.searchParams.get('loc');

  if (!loc) {
    return NextResponse.json(
      { error: 'Hiányzó GHL Location ID (?loc= paraméter)' },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const site = await Site.findOne({ ghlLocationId: loc }).lean() as {
      _id: string;
      name: string;
      password: string;
    } | null;

    if (!site) {
      // Nem található site ehhez a GHL location-höz
      return new NextResponse(
        `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <title>GHL integráció — Nincs párosítva</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; background: #0a0a0f; color: #f0f0ff; flex-direction: column; gap: 16px; }
    code { background: #1a1a26; padding: 4px 12px; border-radius: 6px; font-size: 13px; color: #818cf8; }
    .card { background: #1a1a26; border: 1px solid #2a2a40; border-radius: 12px; padding: 32px; max-width: 420px; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:40px;margin-bottom:16px">🔗</div>
    <h2>GHL Location nincs párosítva</h2>
    <p style="color:#9090b0;font-size:14px;line-height:1.6">
      A GHL Location ID <code>${loc}</code> nem tartozik egyetlen site-hoz sem.
    </p>
    <p style="color:#9090b0;font-size:13px;margin-top:16px">
      Az ügynökség dashboardon párosítsd a site-ot ezzel a GHL Location ID-vel,
      majd frissítsd az oldalt.
    </p>
  </div>
</body>
</html>`,
        {
          status: 404,
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        }
      );
    }

    // Session cookie beállítása (ugyanaz a mechanizmus mint a normál belépésnél)
    const embed = req.nextUrl.searchParams.get('embed') !== '0';
    const redirectUrl = new URL(`/edit/${site._id}${embed ? '?embed=1' : ''}`, req.nextUrl.origin);
    const response = NextResponse.redirect(redirectUrl, { status: 302 });

    const isHttps = req.nextUrl.protocol === 'https:';
    const cookieSecure = isHttps || process.env.NODE_ENV === 'production';
    const cookieOpts = {
      httpOnly: true as const,
      secure: cookieSecure,
      maxAge: 60 * 60 * 8,
      sameSite: 'none' as const,
      path: '/',
    };

    response.cookies.set(`site_auth_${site._id}`, site.password, cookieOpts);

    if (embed) {
      response.cookies.set('cms_embed', '1', {
        httpOnly: false,
        secure: cookieSecure,
        maxAge: 60 * 60 * 8,
        sameSite: 'none',
        path: '/',
      });
    }

    return response;
  } catch (err) {
    console.error('GHL auth hiba:', err);
    return NextResponse.json(
      { error: 'Szerver hiba. Próbáld újra.' },
      { status: 500 }
    );
  }
}
