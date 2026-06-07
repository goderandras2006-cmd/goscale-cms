import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Site from '@/models/Site';
import { verifyGhlSessionToken } from '@/lib/ghl-session';

export function getGhlSessionToken(req: NextRequest): string | null {
  return (
    req.headers.get('x-ghl-session') ||
    req.nextUrl.searchParams.get('ghlSession')
  );
}

/** Site API hozzáférés: ügynökség jelszó, site cookie, vagy GHL session token. */
export async function checkSiteAccess(req: NextRequest, siteId: string): Promise<boolean> {
  const agencyAuth = req.cookies.get('agency_auth')?.value;
  if (agencyAuth === process.env.AGENCY_PASSWORD) return true;

  const ghlToken = getGhlSessionToken(req);
  if (ghlToken) {
    const payload = verifyGhlSessionToken(ghlToken);
    if (payload?.siteId === siteId) return true;
  }

  const siteAuth = req.cookies.get(`site_auth_${siteId}`)?.value;
  if (!siteAuth) return false;

  await connectDB();
  const site = await Site.findById(siteId);
  return !!(site && siteAuth === site.password);
}
