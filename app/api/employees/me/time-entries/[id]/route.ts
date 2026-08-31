import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

async function getEmployeeId(userId: string, serviceClient: any) {
  const { data: employee } = await serviceClient
    .from('employees')
    .select('id')
    .eq('profile_id', userId)
    .single();
  return employee?.id;
}

// Clock out (or update notes) on an existing time entry
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

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

    const { data: existing, error: fetchError } = await serviceClient
      .from('employee_time_entries')
      .select('id, clock_in, clock_out')
      .eq('id', id)
      .eq('employee_id', employeeId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Time entry not found' }, { status: 404 });
    }

    if (existing.clock_out) {
      return NextResponse.json({ error: 'This shift is already clocked out' }, { status: 409 });
    }

    const body = await request.json().catch(() => ({}));

    const { data: entry, error } = await serviceClient
      .from('employee_time_entries')
      .update({
        clock_out: new Date().toISOString(),
        notes: body?.notes !== undefined ? body.notes : undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('employee_id', employeeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(entry);
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
