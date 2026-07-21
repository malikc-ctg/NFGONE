import { createServiceClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/api-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
  // Admin-only
  const auth = await requireRole(['admin']);
  if (auth instanceof NextResponse) return auth;

    const supabase = await createServiceClient();
    const { employee_id, role } = await request.json();

    if (!employee_id) {
      return NextResponse.json({ error: 'employee_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('employee_team_members')
      .insert({ team_id: params.id, employee_id, role: role ?? 'member' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
