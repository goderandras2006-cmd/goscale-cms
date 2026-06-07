import { cookies } from 'next/headers';

// Agency auth
export async function verifyAgencyAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get('agency_auth')?.value;
  return token === process.env.AGENCY_PASSWORD;
}

// Site client auth
export async function verifySiteAuth(siteId: string): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(`site_auth_${siteId}`)?.value;
  if (!token) return false;
  // Token = base64(siteId:password) — check against DB is done in API route
  return true;
}

export function getAuthCookieName(siteId: string) {
  return `site_auth_${siteId}`;
}
