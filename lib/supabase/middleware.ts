import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Middleware: Missing Supabase environment variables');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    console.error('Middleware: Session refresh failed', e);
  }

  const pathname = request.nextUrl.pathname;

  // Public routes that don't need auth
  const publicRoutes = [
    '/contractor/login',
    '/admin/login',
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
    if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/admin/login';
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }
    if (pathname.startsWith('/partner')) {
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

  // Role-based access control for authenticated users
  if (user && (pathname.startsWith('/admin') || pathname.startsWith('/partner') || pathname.startsWith('/contractor'))) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;

      if (pathname.startsWith('/admin') && role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/contractor';
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith('/partner') && role !== 'partner' && role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/contractor';
        return NextResponse.redirect(url);
      }

      if (pathname.startsWith('/contractor') && pathname !== '/contractor/login' && role !== 'contractor' && role !== 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = '/contractor/login';
        return NextResponse.redirect(url);
      }
    } catch {
      // If profile lookup fails, allow through — API routes have their own auth
    }
  }

  return supabaseResponse;
}
