import { updateSession } from '@/lib/supabase/middleware';
import { type NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  // Rewrite seaofblue.xyz requests to the /customer-site folder
  // Also support localhost testing with a specific subdomain/host (e.g., customer.localhost:3000)
  if (hostname.includes('seaofblue.xyz') || hostname.includes('customer.localhost')) {
    // Do not prefix API routes
    if (!url.pathname.startsWith('/api')) {
      if (!url.pathname.startsWith('/customer-site')) {
        url.pathname = `/customer-site${url.pathname === '/' ? '' : url.pathname}`;
      }
      return NextResponse.rewrite(url);
    }
  }

  // Otherwise, default to standard app routing (seaofblue.app) and update session
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
