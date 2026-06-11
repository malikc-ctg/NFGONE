import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Middleware: Missing Supabase environment variables');
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
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

  // Refresh the session — this is critical for keeping cookies in sync
  // between the browser and the server.
  const { data: { user } } = await supabase.auth.getUser();

  // Protect admin routes: redirect unauthenticated users to admin login
  const pathname = request.nextUrl.pathname;
  const isAdminRoute = pathname.startsWith('/wegettinmoneynga');
  const isAdminLogin = pathname === '/wegettinmoneynga/login';
  const isAdminApi = pathname.startsWith('/api/wegettinmoneynga');

  if (isAdminRoute && !isAdminLogin && !isAdminApi && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/wegettinmoneynga/login';
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
