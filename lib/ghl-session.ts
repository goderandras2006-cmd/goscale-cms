import jwt from 'jsonwebtoken';

const GHL_SESSION_TTL = '8h';

export interface GhlSessionPayload {
  siteId: string;
  typ: 'ghl';
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET nincs beállítva');
  return secret;
}

/** GHL belépés után: iframe-ben is működő, aláírt session token. */
export function createGhlSessionToken(siteId: string): string {
  return jwt.sign({ siteId, typ: 'ghl' } satisfies GhlSessionPayload, getJwtSecret(), {
    expiresIn: GHL_SESSION_TTL,
  });
}

export function verifyGhlSessionToken(token: string): GhlSessionPayload | null {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as GhlSessionPayload;
    if (payload.typ !== 'ghl' || !payload.siteId) return null;
    return payload;
  } catch {
    return null;
  }
}
