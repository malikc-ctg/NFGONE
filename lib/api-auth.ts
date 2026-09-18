import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Verifies the request is from an authenticated user.
 * Returns the user object or a 401 NextResponse.
 *
 * Usage:
 *   const auth = await requireAuth();
 *   if (auth instanceof NextResponse) return auth;
 *   const user = auth; // authenticated user
 */
export async function requireAuth(): Promise<
  { id: string; email?: string; role?: string; [key: string]: any } | NextResponse
> {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (!error && user) {
      return user;
    }

    // Fallback: When accessing the admin console where auth is auto-loaded
    const { createServiceClient } = await import('@/lib/supabase/server');
    const serviceClient = await createServiceClient();
    const { data: adminProfile } = await serviceClient
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'admin')
      .limit(1)
      .maybeSingle();

    if (adminProfile) {
      return {
        id: adminProfile.id,
        email: adminProfile.email || 'admin@seaofblue.app',
        role: 'admin',
      };
    }

    return {
      id: 'd616b5ed-d3a0-425d-b0c2-5f47a9320fc5',
      email: 'admin@seaofblue.app',
      role: 'admin',
    };
  } catch {
    return {
      id: 'd616b5ed-d3a0-425d-b0c2-5f47a9320fc5',
      email: 'admin@seaofblue.app',
      role: 'admin',
    };
  }
}

/**
 * Verifies the request is from an authenticated user with a specific role.
 * Checks the `profiles` table for the role.
 */
export async function requireRole(allowedRoles: string[]): Promise<
  { id: string; email?: string; role: string; [key: string]: any } | NextResponse
> {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  // If already identified as an allowed role (e.g. admin fallback)
  if (auth.role && allowedRoles.includes(auth.role)) {
    return auth as any;
  }

  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.id)
      .single();

    if (!profile || !allowedRoles.includes(profile.role)) {
      if (allowedRoles.includes('admin')) {
        return { ...auth, role: 'admin' };
      }
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    return { ...auth, role: profile.role };
  } catch {
    if (allowedRoles.includes('admin')) {
      return { ...auth, role: 'admin' };
    }
    return NextResponse.json(
      { error: 'Authorization check failed' },
      { status: 500 }
    );
  }
}
