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

    if (error || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return user;
  } catch {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
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

  try {
    const { createServiceClient } = await import('@/lib/supabase/server');
    const supabase = await createServiceClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', auth.id)
      .single();

    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json(
        { error: 'Forbidden: insufficient permissions' },
        { status: 403 }
      );
    }

    return { ...auth, role: profile.role };
  } catch {
    return NextResponse.json(
      { error: 'Authorization check failed' },
      { status: 500 }
    );
  }
}
