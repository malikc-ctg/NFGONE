import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

// Helper to get employee ID for current user
async function getEmployeeId(userId: string, serviceClient: any) {
  const { data: employee } = await serviceClient
    .from('employees')
    .select('id')
    .eq('profile_id', userId)
    .single();
  return employee?.id;
}

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const employeeId = await getEmployeeId(user.id, serviceClient);

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    const { data: entries, error } = await serviceClient
      .from('employee_time_entries')
      .select('*')
      .eq('employee_id', employeeId)
      .order('clock_in', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json(entries || []);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const serviceClient = await createServiceClient();
    const employeeId = await getEmployeeId(user.id, serviceClient);

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    // Prevent clocking in twice
    const { data: activeEntry } = await serviceClient
      .from('employee_time_entries')
      .select('id')
      .eq('employee_id', employeeId)
      .is('clock_out', null)
      .maybeSingle();

    if (activeEntry) {
      return NextResponse.json({ error: 'You are already clocked in' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));

    const { data: entry, error } = await serviceClient
      .from('employee_time_entries')
      .insert({
        employee_id: employeeId,
        clock_in: new Date().toISOString(),
        notes: body?.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
