import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';

// POST /api/auth/agency — Agency bejelentkezés
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password } = body;

  if (password !== process.env.AGENCY_PASSWORD) {
    return NextResponse.json({ error: 'Hibás jelszó' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set('agency_auth', password, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7 nap
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
