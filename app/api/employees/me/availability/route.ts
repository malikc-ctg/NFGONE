import { createClient, createServiceClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth';

async function getEmployeeId(userId: string) {
  const serviceClient = await createServiceClient();
  const { data } = await serviceClient
    .from('employees')
    .select('id')
    .eq('profile_id', userId)
    .single();
  return data?.id;
}

// GET: Fetch weekly grid + date blocks
export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employeeId = await getEmployeeId(user.id);
    if (!employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const serviceClient = await createServiceClient();

    // Get availability settings (weekly grid stored as JSONB in employee notes or a dedicated field)
    const { data: employee } = await serviceClient
      .from('employees')
      .select('notes')
      .eq('id', employeeId)
      .single();

    let weekly_grid = null;
    try {
      const parsed = JSON.parse(employee?.notes || '{}');
      weekly_grid = parsed.availability_grid || null;
    } catch {}

    // Get date blocks
    const { data: blocks } = await serviceClient
      .from('employee_availability_blocks')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true });

    return NextResponse.json({
      weekly_grid,
      blocks: blocks || [],
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PUT: Save weekly grid
export async function PUT(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const employeeId = await getEmployeeId(user.id);
    if (!employeeId) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });

    const serviceClient = await createServiceClient();
    const { weekly_grid } = await request.json();

    // Get existing notes
    const { data: employee } = await serviceClient
      .from('employees')
      .select('notes')
      .eq('id', employeeId)
      .single();

    let existingNotes: Record<string, any> = {};
    try {
      existingNotes = JSON.parse(employee?.notes || '{}');
    } catch {}

    existingNotes.availability_grid = weekly_grid;

    await serviceClient
      .from('employees')
      .update({ notes: JSON.stringify(existingNotes) })
      .eq('id', employeeId);

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
