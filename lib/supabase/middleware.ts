import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session - important for Server Components
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't need auth
  const publicRoutes = [
    '/contractor/login',
    '/api/webhooks',
    '/tracking',
  ];

  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // API routes handle their own auth
  if (pathname.startsWith('/api/') && !pathname.startsWith('/api/webhooks')) {
    return supabaseResponse;
  }

  // Allow public routes
  if (isPublicRoute) {
    return supabaseResponse;
  }

  // Redirect unauthenticated users
  if (!user) {
    if (pathname.startsWith('/admin') || pathname.startsWith('/partner')) {
      const url = request.nextUrl.clone();
      url.pathname = '/contractor/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/contractor') && pathname !== '/contractor/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/contractor/login';
      return NextResponse.redirect(url);
    }
    // Booking pages use magic link - let them through for now
    // The page component will handle showing login state
  }

  return supabaseResponse;
}
