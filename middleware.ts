import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import domainMap from './lib/domain-map.json';

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Get hostname of request (e.g. demo.vercel.app, www.lg-klimatech.hu)
  const hostname = request.headers.get('host') || '';
  
  // Exclude localhost in dev
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return NextResponse.next();
  }

  // Check if hostname exists in domain map
  const siteId = (domainMap as Record<string, string>)[hostname];
  
  // Feature flag check: If SITE_TEMPLATE_ENABLED is false or not set, don't rewrite
  const isTemplateEnabled = process.env.SITE_TEMPLATE_ENABLED === 'true';

  // If it's a mapped custom domain, rewrite the request
  if (siteId && isTemplateEnabled) {
    // If accessing root, rewrite to /site/[siteId]
    if (url.pathname === '/') {
      url.pathname = `/site/${siteId}`;
      return NextResponse.rewrite(url);
    }
    
    // For other paths, ensure they are prefixed with /site/[siteId]
    // Only rewrite if it doesn't already start with /site or /api or /agency or /edit etc.
    // To be safe, any path requested on a custom domain should map to its site context,
    // but we don't want to break assets.
    if (!url.pathname.startsWith('/api') && 
        !url.pathname.startsWith('/_next') &&
        !url.pathname.match(/\.(.*)$/)) // don't rewrite files
    {
      url.pathname = `/site/${siteId}${url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
