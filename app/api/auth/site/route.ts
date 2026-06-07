import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';

// POST /api/auth/site — Ügyfél site bejelentkezés
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { siteId, password } = body;

  if (!siteId || !password) {
    return NextResponse.json({ error: 'Site ID és jelszó szükséges' }, { status: 400 });
  }

  await connectDB();
  const site = await Site.findById(siteId);

  if (!site) {
    return NextResponse.json({ error: 'Site nem található' }, { status: 404 });
  }

  if (site.password !== password) {
    return NextResponse.json({ error: 'Hibás jelszó' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, siteName: site.name, siteType: site.type });
  response.cookies.set(`site_auth_${siteId}`, password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 nap
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
