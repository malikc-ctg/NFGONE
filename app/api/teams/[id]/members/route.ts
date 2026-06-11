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
    const { contractor_id, role } = await request.json();

    if (!contractor_id) {
      return NextResponse.json({ error: 'contractor_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('contractor_team_members')
      .insert({ team_id: params.id, contractor_id, role: role ?? 'member' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
